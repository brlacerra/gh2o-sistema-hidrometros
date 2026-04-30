import "server-only";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfMonthMs, startOfTodayMs, startOfYearMs } from "@/lib/time/range";
import { parseRelativeToMs } from "@/lib/series/relative";
import { canAccessStation } from "@/lib/auth/canAccessStation";

type Range =
  | "day"
  | "last24h"
  | "month"
  | "last30d"
  | "year"
  | "last365d";

const TZ = "America/Sao_Paulo";
// offset fixo -03:00 em segundos (UTC-3)
const SP_OFFSET_S = -3 * 3600; // -10800

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function toRange(v: string | null): Range | null {
  if (!v) return null;
  if (
    v === "day" ||
    v === "last24h" ||
    v === "month" ||
    v === "last30d" ||
    v === "year" ||
    v === "last365d"
  ) {
    return v;
  }
  return null;
}

function numOrNull(v: any): number | null {
  if (v == null) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "bigint") return Number(v);
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ codSta: string }> },
) {
  const { codSta } = await ctx.params;
  const url = new URL(req.url);

  const range = toRange(url.searchParams.get("range"));
  if (!range) return bad("missing_or_invalid_range. Use day|last24h|month|last30d|year|last365d");

  // simple auth similar to the example: require logged user
  const access = await canAccessStation(codSta);
  if (!access) return bad("unauthorized", 401);

  const nowMs = Date.now();

  // ranges in ms (aligned with your time helpers)
  let fromMs: number;
  let toMs: number = nowMs;

  if (range === "day") fromMs = startOfTodayMs(TZ, nowMs);
  else if (range === "month") fromMs = startOfMonthMs(TZ, nowMs);
  else if (range === "year") fromMs = startOfYearMs(TZ, nowMs);
  else if (range === "last24h") fromMs = nowMs - (parseRelativeToMs("24h") ?? 24 * 3600_000);
  else if (range === "last30d") fromMs = nowMs - (parseRelativeToMs("30d") ?? 30 * 24 * 3600_000);
  else fromMs = nowMs - (parseRelativeToMs("365d") ?? 365 * 24 * 3600_000);

  const fromTs = BigInt(Math.floor(fromMs / 1000));
  const toTs = BigInt(Math.ceil(toMs / 1000));

  // decide bucket
  const bucket =
    range === "day" || range === "last24h"
      ? "15m"
      : range === "month" || range === "last30d"
        ? "1d"
        : "1mo";

  // rows from DB
  // for 15m -> AVG(tempAvg) AS avg
  // for 1d/1mo -> MIN/AVG/MAX(tempAvg)
  let rows: Array<any> = [];

  if (bucket === "15m") {
    const BUCKET_S = 15 * 60;
    rows = await prisma.$queryRaw<Array<{ bucket_s: bigint; avg: any }>>`
      SELECT
        (FLOOR((ts + ${SP_OFFSET_S}) / ${BUCKET_S}) * ${BUCKET_S} - ${SP_OFFSET_S}) AS bucket_s,
        AVG(tempAvg) AS avg
      FROM data
      WHERE codSta = ${codSta}
        AND ts BETWEEN ${fromTs} AND ${toTs}
      GROUP BY bucket_s
      ORDER BY bucket_s ASC
    `;
  } else if (bucket === "1d") {
    const DAY_S = 86400;
    rows = await prisma.$queryRaw<Array<{ bucket_s: bigint; min: any; avg: any; max: any }>>`
      SELECT
        (FLOOR((ts + ${SP_OFFSET_S}) / ${DAY_S}) * ${DAY_S} - ${SP_OFFSET_S}) AS bucket_s,
        MIN(tempAvg) AS min,
        AVG(tempAvg) AS avg,
        MAX(tempAvg) AS max
      FROM data
      WHERE codSta = ${codSta}
        AND ts BETWEEN ${fromTs} AND ${toTs}
      GROUP BY bucket_s
      ORDER BY bucket_s ASC
    `;
  } else {
    // 1mo
    rows = await prisma.$queryRaw<Array<{ bucket_s: bigint; min: any; avg: any; max: any }>>`
      SELECT
        (
          UNIX_TIMESTAMP(
            STR_TO_DATE(
              DATE_FORMAT(FROM_UNIXTIME(ts + ${SP_OFFSET_S}), '%Y-%m-01 00:00:00'),
              '%Y-%m-%d %H:%i:%s'
            )
          ) - ${SP_OFFSET_S}
        ) AS bucket_s,
        MIN(tempAvg) AS min,
        AVG(tempAvg) AS avg,
        MAX(tempAvg) AS max
      FROM data
      WHERE codSta = ${codSta}
        AND ts BETWEEN ${fromTs} AND ${toTs}
      GROUP BY bucket_s
      ORDER BY bucket_s ASC
    `;
  }

  // map DB rows to points
  let points: Array<any> = [];
  if (bucket === "15m") {
    points = rows.map((r: any) => {
      const bS = Number(r.bucket_s);
      return { tMs: bS * 1000, avg: numOrNull(r.avg) };
    });
  } else {
    points = rows.map((r: any) => {
      const bS = Number(r.bucket_s);
      return {
        tMs: bS * 1000,
        min: numOrNull(r.min),
        avg: numOrNull(r.avg),
        max: numOrNull(r.max),
      };
    });
  }

  return NextResponse.json({
    meta: { codSta, range, bucket, tz: TZ },
    points,
  });
}