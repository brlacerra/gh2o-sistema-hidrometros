import "server-only";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canAccessStationWithRes } from "@/lib/auth/canAccessStationWithRes";
import { startOfMonthMs, startOfTodayMs, startOfYearMs, startOfHydroYearMs } from "@/lib/time/range";
import { parseRelativeToMs } from "@/lib/series/relative";
import { dayBucketStartMs, dayRangeBoundsMs } from "@/lib/series/dayBucket";

const TZ = "America/Sao_Paulo";
// offset fixo UTC-3 (sem depender de timezone tables)
const SP_OFFSET_S = -3 * 3600;

const BUCKET_15M_S = 15 * 60;
const BUCKET_1D_S = 86400;

type LumPointAvg = { tMs: number; avg: number | null };
type LumPointMinAvgMax = { tMs: number; min: number | null; avg: number | null; max: number | null };

type LumSeries =
  | { points: LumPointAvg[] } // for 15m (avg)
  | { points: LumPointMinAvgMax[] }; // for 1d / 1mo (min/avg/max)

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

// month bucket helpers (similar approach used in rain route)
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

function build15mSeriesFromRows(rows: Array<{ bucket_s: bigint; avg: any }>) {
  let acc = 0; 
  const points: LumPointAvg[] = rows.map((r) => {
    const bucketS = Number(r.bucket_s);
    const avg = numOrNull(r.avg);
    return { tMs: bucketS * 1000, avg };
  });
  return points;
}

function build1dSeriesFromRows(rows: Array<{ bucket_s: bigint; min: any; avg: any; max: any }>) {
  const points: LumPointMinAvgMax[] = rows.map((r) => {
    const bucketS = Number(r.bucket_s);
    return {
      tMs: bucketS * 1000,
      min: numOrNull(r.min),
      avg: numOrNull(r.avg),
      max: numOrNull(r.max),
    };
  });
  return points;
}


function buildDailySeriesFilled(opts: {
  rows: Array<{ bucket_s: bigint; min: any; avg: any; max: any }>;
  startMs: number;
  endMs: number;
  minPoints?: number;
  tz?: string;
}) {
  const { rows, startMs, endMs, minPoints = 0, tz = "America/Sao_Paulo" } = opts;

  // monta mapa por bucket em segundos (o SQL devolve bucket_s em segundos)
  const byBucket = new Map<number, { min: number | null; avg: number | null; max: number | null }>();
  for (const r of rows) {
    const b = Number(r.bucket_s); // seconds
    byBucket.set(b, { min: numOrNull(r.min), avg: numOrNull(r.avg), max: numOrNull(r.max) });
  }

  // calcula start/end alinhados ao dia no timezone (mesma lógica do resto do projeto)
  const { start: alignedStartMs, end: alignedEndMs } = (() => {
    // dayRangeBoundsMs espera fromMs/toMs em ms e retorna start/end em ms (início do dia no tz)
    const dr = dayRangeBoundsMs(startMs, endMs, tz);
    return { start: dr.start, end: dr.end };
  })();

  // minPoints em dias
  const DAY_MS = 24 * 60 * 60_000;
  let count = Math.floor((alignedEndMs - alignedStartMs) / DAY_MS) + 1;
  let endMsAdjusted = alignedEndMs;
  if (minPoints > 0 && count < minPoints) {
    endMsAdjusted = alignedEndMs + (minPoints - count) * DAY_MS;
  }

  const points: LumPointMinAvgMax[] = [];
  let iters = 0;
  const maxIters = Math.max(31, (minPoints || 0) + 31);

  // percorre dia-a-dia usando passos em ms a partir do alignedStartMs (ambos ms)
  for (let tMs = alignedStartMs; tMs <= endMsAdjusted; tMs += DAY_MS) {
    iters++;
    if (iters > maxIters) break;

    // bucketS em segundos é o que a SQL usou => deverá bater com keys do byBucket
    // usamos dayBucketStartMs para garantir o mesmo ancoramento do SQL (em segundos->ms)
    const bucketStartMs = dayBucketStartMs(tMs, tz); // ms
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

function buildMonthlySeriesFromRows(opts: {
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

  const points: LumPointMinAvgMax[] = [];
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

  // three aggregated queries:
  //  - 15m average (for day / last24h)
  //  - 1d min/avg/max (for month / last30d)
  //  - 1mo min/avg/max (for year / hydroYear)
  const [rows15m24h, rows1d30d, rows1moHydroYear] = await Promise.all([
    prisma.$queryRaw<Array<{ bucket_s: bigint; avg: any }>>`
      SELECT
        (FLOOR((ts + ${SP_OFFSET_S}) / ${BUCKET_15M_S}) * ${BUCKET_15M_S} - ${SP_OFFSET_S}) AS bucket_s,
        AVG(lumAvg) AS avg
      FROM data
      WHERE codSta = ${codSta}
        AND ts BETWEEN ${from24hTs} AND ${toTs}
      GROUP BY bucket_s
      ORDER BY bucket_s ASC
    `,
    prisma.$queryRaw<Array<{ bucket_s: bigint; min: any; avg: any; max: any }>>`
      SELECT
        (FLOOR((ts + ${SP_OFFSET_S}) / ${BUCKET_1D_S}) * ${BUCKET_1D_S} - ${SP_OFFSET_S}) AS bucket_s,
        MIN(lumAvg) AS min,
        AVG(lumAvg) AS avg,
        MAX(lumAvg) AS max
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
        MIN(lumAvg) AS min,
        AVG(lumAvg) AS avg,
        MAX(lumAvg) AS max
      FROM data
      WHERE codSta = ${codSta}
        AND ts BETWEEN ${fromHydroYearTs} AND ${toTs}
      GROUP BY bucket_s
      ORDER BY bucket_s ASC
    `,
  ]);

  // build series
  const points15m24h = build15mSeriesFromRows(rows15m24h);
  const points1d30d = build1dSeriesFromRows(rows1d30d);
  const points1moHydroYear = rows1moHydroYear; // we'll use rows directly for monthly filling

  // day / last24h (15m average)
  const day = points15m24h.filter((p) => p.tMs >= fromDayMs);
  const last24h = points15m24h;

  // month / last30d (daily min/avg/max) -> month should be filled day-by-day
  const month = buildDailySeriesFilled({
    rows: rows1d30d,
    startMs: fromMonthMs,
    endMs: nowMs,
    // if you want a guaranteed number of days (ex: 31) you can pass minPoints
    // minPoints: 31,
  });

  const last30d = points1d30d;

  // year / last365d (monthly min/avg/max) -> fill months and respect minPoints for aesthetics
  const year = buildMonthlySeriesFromRows({
    rows: rows1moHydroYear,
    startMs: fromYearMs,
    endMs: nowMs,
    minPoints: 10, // preserve same aesthetic as rain
  });

  const hydroYear = buildMonthlySeriesFromRows({
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