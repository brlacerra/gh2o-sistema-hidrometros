import "server-only";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canAccessStationWithRes } from "@/lib/auth/canAccessStationWithRes";
import { startOfMonthMs, startOfTodayMs, startOfYearMs, startOfHydroYearMs } from "@/lib/time/range";
import { parseRelativeToMs } from "@/lib/series/relative";

const TZ = "America/Sao_Paulo";

// Offset fixo (sem timezone tables). UTC-3 => -10800s.
// Importante: isso é uma aproximação que ignora DST histórico.
const SP_OFFSET_S = -3 * 3600;

const BUCKET_15M_S = 15 * 60;
const BUCKET_1D_S = 86400;

type RainPoint = {
    tMs: number;
    mm: number | null;
    mmAccum: number | null;
    pulses?: number;
};

function bad(message: string, status = 400) {
    return NextResponse.json({ error: message }, { status });
}

function toBigIntSec(ms: number): bigint {
    return BigInt(Math.floor(ms / 1000));
}

// ---------- helpers: normalização do SUM(pulsos)
function pulsesToNumber(v: any): number | null {
    if (v == null) return null;
    if (typeof v === "bigint") return Number(v);
    if (typeof v === "number") return v;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
}

// ---------- helpers: bucket mensal contínuo + minPoints (server-side)
function monthStartBucketS(tsS: number): number {
    // Converte "UTC epoch" para "relógio local" via offset fixo
    const localMs = (tsS + SP_OFFSET_S) * 1000;
    const d = new Date(localMs);

    const y = d.getUTCFullYear();
    const m = d.getUTCMonth(); // 0-11

    // início do mês no relógio local (representado como UTC)
    const startLocalMs = Date.UTC(y, m, 1, 0, 0, 0, 0);

    // volta para UTC real removendo o offset
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

/**
 * rows: bucket_s (segundos) + pulses (sum)
 * startMs/endMs: janela desejada (alinhada com Luxon startOfYear/startOfMonth etc)
 * minPoints: se menor que a contagem atual, estende meses no futuro com mm=null
 */
function buildMonthlySeriesFromRows(opts: {
    rows: Array<{ bucket_s: bigint; pulses: any }>;
    startMs: number;
    endMs: number;
    minPoints?: number;
    resSta: number;
}): RainPoint[] {
    const { rows, startMs, endMs, minPoints = 0, resSta } = opts;

    const pulsesByBucketS = new Map<number, number>();
    for (const r of rows) {
        const bS = Number(r.bucket_s);
        const p = pulsesToNumber(r.pulses);
        if (!Number.isFinite(bS)) continue;
        if (p == null) continue;
        pulsesByBucketS.set(bS, (pulsesByBucketS.get(bS) ?? 0) + p);
    }

    // alinhar range para início de mês (no “modelo SP offset fixo”)
    let startS = monthStartBucketS(Math.floor(startMs / 1000));
    let endS = monthStartBucketS(Math.floor((endMs - 1) / 1000));

    // quantos buckets já existem nesse range
    let count = 0;
    for (let t = startS; t <= endS; t = addMonthsBucketS(t, 1)) count++;

    // estende meses no futuro até minPoints
    if (minPoints > 0 && count < minPoints) {
        endS = addMonthsBucketS(endS, minPoints - count);
    }

    // monta série contínua
    const points: RainPoint[] = [];
    let acc = 0;

    // segurança: não queremos criar 1000 pontos por bug
    const maxMonths = Math.max(24, minPoints + 24);
    let i = 0;

    for (let t = startS; t <= endS; t = addMonthsBucketS(t, 1)) {
        i++;
        if (i > maxMonths) break;

        const pulses = pulsesByBucketS.get(t);
        const mm = pulses == null ? null : pulses * resSta;
        if (mm != null) acc += mm;

        points.push({
            tMs: t * 1000,
            mm,
            mmAccum: mm == null ? null : acc,
            pulses,
        });
    }

    return points;
}
function recomputeAccum(points: RainPoint[]): RainPoint[] {
    let acc = 0;
    return points.map((p) => {
        const mm = p.mm;
        if (mm != null) acc += mm;
        return { ...p, mmAccum: mm == null ? null : acc };
    });
}

// ---------- helpers: builder simples (já existente no seu código) p/ 15m e 1d
function buildPointsFromPulsesRows(opts: {
    rows: Array<{ bucket_s: bigint; pulses: any }>;
    resSta: number;
}): RainPoint[] {
    const { rows, resSta } = opts;

    let accMm = 0;
    return rows.map((r) => {
        const bucketS = Number(r.bucket_s);
        const pulsesNum = pulsesToNumber(r.pulses);
        const mm = pulsesNum == null ? null : pulsesNum * resSta;

        if (mm != null) accMm += mm;

        return {
            tMs: bucketS * 1000,
            mm,
            mmAccum: mm == null ? null : accMm,
            pulses: pulsesNum ?? undefined,
        };
    });
}

export async function GET(_req: Request, ctx: { params: Promise<{ codSta: string }> }) {
    const { codSta } = await ctx.params;

    const access = await canAccessStationWithRes(codSta);
    if (!access.allowed) {
        const status =
            access.reason === "unauthenticated" ? 401 : access.reason === "forbidden" ? 403 : 404;
        return bad("not_allowed", status);
    }

    const resSta = access.station?.resSta == null ? NaN : Number(access.station.resSta);
    if (!Number.isFinite(resSta) || resSta <= 0) return bad("resSta_invalid_for_rain", 400);

    const nowMs = Date.now();

    // ranges alinhados no tz (Luxon)
    const fromDayMs = startOfTodayMs(TZ, nowMs);
    const fromMonthMs = startOfMonthMs(TZ, nowMs);
    const fromYearMs = startOfYearMs(TZ, nowMs);

    // “bases” para queries (3 famílias)
    const from24hMs = nowMs - (parseRelativeToMs("24h") ?? 24 * 3600_000);
    const from30dMs = nowMs - (parseRelativeToMs("30d") ?? 30 * 24 * 3600_000);
    const fromHydroYearMs = startOfHydroYearMs(TZ, nowMs);

    const from24hTs = toBigIntSec(from24hMs);
    const from30dTs = toBigIntSec(from30dMs);
    const fromHydroYearTs = toBigIntSec(fromHydroYearMs);
    const toTs = toBigIntSec(nowMs);

    // 3 queries agregadas (15m, 1d, 1mo)
    const [rows15m24h, rows1d30d, rows1moHydroYear] = await Promise.all([
        prisma.$queryRaw<Array<{ bucket_s: bigint; pulses: any }>>`
      SELECT
        (FLOOR((ts + ${SP_OFFSET_S}) / ${BUCKET_15M_S}) * ${BUCKET_15M_S} - ${SP_OFFSET_S}) AS bucket_s,
        SUM(pulsos) AS pulses
      FROM data
      WHERE codSta = ${codSta}
        AND ts BETWEEN ${from24hTs} AND ${toTs}
      GROUP BY bucket_s
      ORDER BY bucket_s ASC
    `,
        prisma.$queryRaw<Array<{ bucket_s: bigint; pulses: any }>>`
      SELECT
        (FLOOR((ts + ${SP_OFFSET_S}) / ${BUCKET_1D_S}) * ${BUCKET_1D_S} - ${SP_OFFSET_S}) AS bucket_s,
        SUM(pulsos) AS pulses
      FROM data
      WHERE codSta = ${codSta}
        AND ts BETWEEN ${from30dTs} AND ${toTs}
      GROUP BY bucket_s
      ORDER BY bucket_s ASC
    `,
        prisma.$queryRaw<Array<{ bucket_s: bigint; pulses: any }>>`
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
        AND ts BETWEEN ${fromHydroYearTs} AND ${toTs}
      GROUP BY bucket_s
      ORDER BY bucket_s ASC
    `,
    ]);

    // 15m / 1d: mantém comportamento atual (só buckets existentes)
    const points15m24h = buildPointsFromPulsesRows({ rows: rows15m24h, resSta });
    const points1d30d = buildPointsFromPulsesRows({ rows: rows1d30d, resSta });

    const day = recomputeAccum(points15m24h.filter((p) => p.tMs >= fromDayMs));
    const last24h = recomputeAccum(points15m24h);

    const month = recomputeAccum(points1d30d.filter((p) => p.tMs >= fromMonthMs));
    const last30d = recomputeAccum(points1d30d);

    // 1mo: série contínua + minPoints (resolve "não mostra janeiro" e melhora estética)
    const year = buildMonthlySeriesFromRows({
        rows: rows1moHydroYear,
        startMs: fromYearMs,
        endMs: nowMs,
        minPoints: 10, // <-- ajuste aqui (antes você usava minPoints=10)
        resSta,
    });

    const hydroYear = buildMonthlySeriesFromRows({
        rows: rows1moHydroYear,
        startMs: fromHydroYearMs,
        endMs: nowMs,
        minPoints: 6,
        resSta,
    });

    return NextResponse.json({
        meta: {
            codSta,
            tz: TZ,
            tsUnit: "s",
            resSta,
            buckets: {
                day: "15m",
                last24h: "15m",
                month: "1d",
                last30d: "1d",
                year: "1mo",
                hydroYear: "1mo",
            },
            minPoints: {
                year: 10,
                hydroYear: 6,
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
        },
        day,
        last24h,
        month,
        last30d,
        year,
        hydroYear,
    });
}