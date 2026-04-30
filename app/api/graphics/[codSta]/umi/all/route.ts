import "server-only";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canAccessStationWithRes } from "@/lib/auth/canAccessStationWithRes";
import { startOfMonthMs, startOfTodayMs, startOfYearMs, startOfHydroYearMs } from "@/lib/time/range";
import { parseRelativeToMs } from "@/lib/series/relative";
import { dayBucketStartMs, dayRangeBoundsMs } from "@/lib/series/dayBucket";

const TZ = "America/Sao_Paulo";
const SP_OFFSET_S = -3 * 3600;
const BUCKET_15M_S = 15 * 60;
const BUCKET_1D_S = 86400;

type UmiPointAvg = { tMs: number; avg: number | null };
type UmiPointMinAvgMax = { tMs: number; min: number | null; avg: number | null; max: number | null };

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function toBigIntSec(ms: number): bigint {
  return BigInt(Math.floor(ms / 1000));
}

function numOrNull(v: any): number | null {
  if (v == null) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "bigint") return Number(v);
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// month helpers (anchor using fixed offset like other endpoints)
function monthStartBucketS(tsS: number): number {
  const localMs = (tsS + SP_OFFSET_S) * 1000;
  const d = new Date(localMs);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const startLocalMs = Date.UTC(y, m, 1, 0, 0, 0, 0);
  const startUtcMs = startLocalMs - SP_OFFSET_S * 1000;
  return Math.floor(startUtcMs / 1000);
}
function addMonthsBucketS(bucketS: number, months: number): number {
  const localMs = (bucketS + SP_OFFSET_S) * 1000;
  const d = new Date(localMs);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const nextLocalMs = Date.UTC(y, m + months, 1, 0, 0, 0, 0);
  const nextUtcMs = nextLocalMs - SP_OFFSET_S * 1000;
  return Math.floor(nextUtcMs / 1000);
}

// build 15m avg series
function build15mFromRows(rows: Array<{ bucket_s: bigint; avg: any }>) {
  return rows.map((r) => ({ tMs: Number(r.bucket_s) * 1000, avg: numOrNull(r.avg) }));
}

// build 1d min/avg/max series (no filling)
function build1dFromRows(rows: Array<{ bucket_s: bigint; min: any; avg: any; max: any }>) {
  return rows.map((r) => ({
    tMs: Number(r.bucket_s) * 1000,
    min: numOrNull(r.min),
    avg: numOrNull(r.avg),
    max: numOrNull(r.max),
  }));
}

// fill daily buckets aligned with dayBucketStartMs/dayRangeBoundsMs
function buildDailyFilled(opts: {
  rows: Array<{ bucket_s: bigint; min: any; avg: any; max: any }>;
  startMs: number;
  endMs: number;
  minPoints?: number;
  tz?: string;
}) {
  const { rows, startMs, endMs, minPoints = 0, tz = TZ } = opts;
  const byBucket = new Map<number, { min: number | null; avg: number | null; max: number | null }>();
  for (const r of rows) {
    const b = Number(r.bucket_s);
    byBucket.set(b, { min: numOrNull(r.min), avg: numOrNull(r.avg), max: numOrNull(r.max) });
  }

  const { start: alignedStartMs, end: alignedEndMs } = dayRangeBoundsMs(startMs, endMs, tz);

  const DAY_MS = 24 * 60 * 60_000;
  let count = Math.floor((alignedEndMs - alignedStartMs) / DAY_MS) + 1;
  let endAdjustedMs = alignedEndMs;
  if (minPoints > 0 && count < minPoints) {
    endAdjustedMs = alignedEndMs + (minPoints - count) * DAY_MS;
  }

  const points: UmiPointMinAvgMax[] = [];
  let iters = 0;
  const maxIters = Math.max(31, (minPoints || 0) + 31);
  for (let t = alignedStartMs; t <= endAdjustedMs; t += DAY_MS) {
    iters++;
    if (iters > maxIters) break;

    const bucketStartMs = dayBucketStartMs(t, tz); // ms
    const bucketS = Math.floor(bucketStartMs / 1000);

    const v = byBucket.get(bucketS);
    points.push({
      tMs: bucketStartMs,
      min: v?.min ?? null,
      avg: v?.avg ?? null,
      max: v?.max ?? null,
    });
  }
  return points;
}

// fill monthly min/avg/max series (with minPoints)
function buildMonthlyFromRows(opts: {
  rows: Array<{ bucket_s: bigint; min: any; avg: any; max: any }>;
  startMs: number;
  endMs: number;
  minPoints?: number;
}) {
  const { rows, startMs, endMs, minPoints = 0 } = opts;
  const byBucket = new Map<number, { min: number | null; avg: number | null; max: number | null }>();
  for (const r of rows) {
    const b = Number(r.bucket_s);
    byBucket.set(b, { min: numOrNull(r.min), avg: numOrNull(r.avg), max: numOrNull(r.max) });
  }

  let startS = monthStartBucketS(Math.floor(startMs / 1000));
  let endS = monthStartBucketS(Math.floor((endMs - 1) / 1000));

  // count months
  let count = 0;
  for (let t = startS; t <= endS; t = addMonthsBucketS(t, 1)) count++;
  if (minPoints > 0 && count < minPoints) {
    endS = addMonthsBucketS(endS, minPoints - count);
  }

  const points: UmiPointMinAvgMax[] = [];
  let iters = 0;
  const maxIters = Math.max(24, (minPoints || 0) + 24);
  for (let t = startS; t <= endS; t = addMonthsBucketS(t, 1)) {
    iters++;
    if (iters > maxIters) break;
    const v = byBucket.get(t);
    points.push({
      tMs: t * 1000,
      min: v?.min ?? null,
      avg: v?.avg ?? null,
      max: v?.max ?? null,
    });
  }
  return points;
}

export async function GET(_req: Request, ctx: { params: Promise<{ codSta: string }> }) {
  const { codSta } = await ctx.params;

  const access = await canAccessStationWithRes(codSta);
  if (!access.allowed) {
    const status =
      access.reason === "unauthenticated" ? 401 : access.reason === "forbidden" ? 403 : 404;
    return bad("not_allowed", status);
  }

  const nowMs = Date.now();

  const fromDayMs = startOfTodayMs(TZ, nowMs);
  const fromMonthMs = startOfMonthMs(TZ, nowMs);
  const fromYearMs = startOfYearMs(TZ, nowMs);

  const from24hMs = nowMs - (parseRelativeToMs("24h") ?? 24 * 3600_000);
  const from30dMs = nowMs - (parseRelativeToMs("30d") ?? 30 * 24 * 3600_000);
  const fromHydroYearMs = startOfHydroYearMs(TZ, nowMs);

  const from24hTs = toBigIntSec(from24hMs);
  const from30dTs = toBigIntSec(from30dMs);
  const fromHydroYearTs = toBigIntSec(fromHydroYearMs);
  const toTs = toBigIntSec(nowMs);

  // 3 aggregated queries: 15m AVG, 1d MIN/AVG/MAX, 1mo MIN/AVG/MAX
  const [rows15m24h, rows1d30d, rows1moHydroYear] = await Promise.all([
    prisma.$queryRaw<Array<{ bucket_s: bigint; avg: any }>>`
      SELECT
        (FLOOR((ts + ${SP_OFFSET_S}) / ${BUCKET_15M_S}) * ${BUCKET_15M_S} - ${SP_OFFSET_S}) AS bucket_s,
        AVG(umiAvg) AS avg
      FROM data
      WHERE codSta = ${codSta}
        AND ts BETWEEN ${from24hTs} AND ${toTs}
      GROUP BY bucket_s
      ORDER BY bucket_s ASC
    `,
    prisma.$queryRaw<Array<{ bucket_s: bigint; min: any; avg: any; max: any }>>`
      SELECT
        (FLOOR((ts + ${SP_OFFSET_S}) / ${BUCKET_1D_S}) * ${BUCKET_1D_S} - ${SP_OFFSET_S}) AS bucket_s,
        MIN(umiAvg) AS min,
        AVG(umiAvg) AS avg,
        MAX(umiAvg) AS max
      FROM data
      WHERE codSta = ${codSta}
        AND ts BETWEEN ${from30dTs} AND ${toTs}
      GROUP BY bucket_s
      ORDER BY bucket_s ASC
    `,
    prisma.$queryRaw<Array<{ bucket_s: bigint; min: any; avg: any; max: any }>>`
      SELECT
        (
          UNIX_TIMESTAMP(
            STR_TO_DATE(
              DATE_FORMAT(FROM_UNIXTIME(ts + ${SP_OFFSET_S}), '%Y-%m-01 00:00:00'),
              '%Y-%m-%d %H:%i:%s'
            )
          ) - ${SP_OFFSET_S}
        ) AS bucket_s,
        MIN(umiAvg) AS min,
        AVG(umiAvg) AS avg,
        MAX(umiAvg) AS max
      FROM data
      WHERE codSta = ${codSta}
        AND ts BETWEEN ${fromHydroYearTs} AND ${toTs}
      GROUP BY bucket_s
      ORDER BY bucket_s ASC
    `,
  ]);

  // build series
  const points15m24h = build15mFromRows(rows15m24h);
  const points1d30d = build1dFromRows(rows1d30d);

  const day = points15m24h.filter((p) => p.tMs >= fromDayMs);
  const last24h = points15m24h;

  const month = buildDailyFilled({
    rows: rows1d30d,
    startMs: fromMonthMs,
    endMs: nowMs,
    // minPoints: 31, // optional
  });
  const last30d = points1d30d;

  const year = buildMonthlyFromRows({
    rows: rows1moHydroYear,
    startMs: fromYearMs,
    endMs: nowMs,
    minPoints: 10,
  });
  const hydroYear = buildMonthlyFromRows({
    rows: rows1moHydroYear,
    startMs: fromHydroYearMs,
    endMs: nowMs,
    minPoints: 6,
  });

  return NextResponse.json({
    meta: {
      codSta,
      tz: TZ,
      tsUnit: "s",
      buckets: {
        day: "15m",
        last24h: "15m",
        month: "1d",
        last30d: "1d",
        year: "1mo",
        hydroYear: "1mo",
      },
      ranges: {
        fromDayMs,
        fromMonthMs,
        fromYearMs,
        from24hMs,
        from30dMs,
        fromHydroYearMs,
        toMs: nowMs,
      },
      minPoints: {
        year: 10,
      },
    },
    day,
    last24h,
    month,
    last30d,
    year,
    hydroYear,
  });
}