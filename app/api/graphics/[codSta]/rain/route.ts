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

export async function GET(
  req: Request,
  ctx: { params: Promise<{ codSta: string }> },
) {
  const { codSta } = await ctx.params;
  const url = new URL(req.url);

  const range = toRange(url.searchParams.get("range"));
  if (!range) return bad("missing_or_invalid_range. Use day|last24h|month|last30d|year|last365d");

  // Versão simples: apenas exige estar logado (barato).
  // Se quiser permitir público quando sta.is_public = true, dá pra ajustar depois.
  const access = await canAccessStation(codSta);
  if (!access) return bad("unauthorized", 401);

  const nowMs = Date.now();

  // ranges em ms (alinhados pelo Luxon do app)
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

  // precisa do resSta (mm por pulso)
  const station = await prisma.sta.findUnique({
    where: { codSta },
    select: { resSta: true },
  });

  const resSta = station?.resSta == null ? null : Number(station.resSta);
  if (!resSta || !Number.isFinite(resSta) || resSta <= 0) {
    return bad("resSta_invalid_for_rain");
  }

  // Define bucket fixo por range
  const bucket =
    range === "day" || range === "last24h"
      ? "15m"
      : range === "month" || range === "last30d"
        ? "1d"
        : "1mo";

  // Query agregada:
  // - day/last24h: bucket 15m (900s) via FLOOR((ts+offset)/900)*900 - offset
  // - month/last30d: bucket 1d (86400s)
  // - year/last365d: bucket 1mo (primeiro dia do mês 00:00 local)
  //
  // A saída é bucket_s (epoch segundos alinhado ao “início do bucket local”, expresso em UTC) + pulses.
  let rows: Array<{ bucket_s: bigint; pulses: bigint | number | null }> = [];

  if (bucket === "15m") {
    const BUCKET_S = 15 * 60;
    rows = await prisma.$queryRaw`
      SELECT
        (FLOOR((ts + ${SP_OFFSET_S}) / ${BUCKET_S}) * ${BUCKET_S} - ${SP_OFFSET_S}) AS bucket_s,
        SUM(pulsos) AS pulses
      FROM data
      WHERE codSta = ${codSta}
        AND ts BETWEEN ${fromTs} AND ${toTs}
      GROUP BY bucket_s
      ORDER BY bucket_s ASC
    `;
  } else if (bucket === "1d") {
    const DAY_S = 86400;
    rows = await prisma.$queryRaw`
      SELECT
        (FLOOR((ts + ${SP_OFFSET_S}) / ${DAY_S}) * ${DAY_S} - ${SP_OFFSET_S}) AS bucket_s,
        SUM(pulsos) AS pulses
      FROM data
      WHERE codSta = ${codSta}
        AND ts BETWEEN ${fromTs} AND ${toTs}
      GROUP BY bucket_s
      ORDER BY bucket_s ASC
    `;
  } else {
    // 1mo: pega "YYYY-MM-01 00:00:00" no relógio local (offset fixo)
    rows = await prisma.$queryRaw`
      SELECT
        (
          UNIX_TIMESTAMP(
            STR_TO_DATE(
              DATE_FORMAT(FROM_UNIXTIME(ts + ${SP_OFFSET_S}), '%Y-%m-01 00:00:00'),
              '%Y-%m-%d %H:%i:%s'
            )
          ) - ${SP_OFFSET_S}
        ) AS bucket_s,
        SUM(pulsos) AS pulses
      FROM data
      WHERE codSta = ${codSta}
        AND ts BETWEEN ${fromTs} AND ${toTs}
      GROUP BY bucket_s
      ORDER BY bucket_s ASC
    `;
  }

  // Monta points + acumulado no app (barato porque são poucos buckets)
  let accMm = 0;
  const points = rows.map((r) => {
    const bucketS = Number(r.bucket_s);
    const pulses =
      r.pulses == null ? null : typeof r.pulses === "bigint" ? Number(r.pulses) : Number(r.pulses);

    const mm = pulses == null ? null : pulses * resSta;
    if (mm != null) accMm += mm;

    return {
      tMs: bucketS * 1000,
      mm,
      mmAccum: mm == null ? null : accMm,
    };
  });

  return NextResponse.json({
    meta: { codSta, range, bucket, tz: TZ, resSta },
    points,
  });
}