import { epochBigIntToMs } from "@/lib/utils";
import { dayBucketStartMs, dayRangeBoundsMs } from "./dayBucket";
import {
  addMonthsMs,
  monthBucketStartMs,
  monthRangeBoundsMs,
  subMonthsMs,
} from "./monthBucket";

export type TempStatsMode = "avg" | "minavgmax";

export type TempPoint = {
  tMs?: number;
  avg?: number | null;
  min?: number | null;
  max?: number | null;
};

export function buildTempSeries(opts: {
  fromMs: number;
  toMs: number;
  bucketMs: number; // para 1mo pode ser -1 (igual você fez no rain)
  readings: Array<{ ts: bigint; tempAvg: number | null }>;
  tz?: string;
  bucketKind?: "fixed" | "day" | "month";
  stats?: TempStatsMode;
  minPoints?: number; // opcional: estender end (igual você fez)
}): { points: TempPoint[] } {
  const { fromMs, toMs, bucketMs, readings } = opts;
  const tz = opts.tz ?? "America/Sao_Paulo";
  const bucketKind = opts.bucketKind ?? "fixed";
  const stats: TempStatsMode = opts.stats ?? "avg";
  const minPoints = opts.minPoints ?? 0;

  // por bucket: min/max/sum/count
  const agg = new Map<
    number,
    { min: number; max: number; sum: number; count: number }
  >();

  for (const r of readings) {
    const tMs = epochBigIntToMs(r.ts);
    const v = r.tempAvg;

    if (!Number.isFinite(tMs)) continue;
    if (tMs < fromMs || tMs > toMs) continue;
    if (v == null || !Number.isFinite(v)) continue;

    let b: number;
    if (bucketKind === "month") b = monthBucketStartMs(tMs, tz);
    else if (bucketKind === "day") b = dayBucketStartMs(tMs, tz);
    else b = Math.floor(tMs / bucketMs) * bucketMs;

    const cur = agg.get(b);
    if (!cur) {
      agg.set(b, { min: v, max: v, sum: v, count: 1 });
    } else {
      cur.min = Math.min(cur.min, v);
      cur.max = Math.max(cur.max, v);
      cur.sum += v;
      cur.count += 1;
    }
  }

  const points: TempPoint[] = [];

  if (bucketKind === "month") {
    let { start, end } = monthRangeBoundsMs(fromMs, toMs, tz);

    // minPoints: você disse que gostou de estender pra frente.
    if (minPoints > 0) {
      let count = 0;
      for (let t = start; t <= end; t = addMonthsMs(t, tz, 1)) count++;
      if (count < minPoints) {
        const missing = minPoints - count;
        end = addMonthsMs(end, tz, missing);
      }
    }

    for (let t = start; t <= end; t = addMonthsMs(t, tz, 1)) {
      const a = agg.get(t);
      const avg = a ? a.sum / a.count : null;

      if (stats === "avg") {
        points.push({ tMs: t, avg });
      } else {
        points.push({
          tMs: t,
          avg,
          min: a ? a.min : null,
          max: a ? a.max : null,
        });
      }
    }

    return { points };
  }

  // day/fixed
  const isDayBucket = bucketKind === "day";
  let { start, end } = isDayBucket
    ? dayRangeBoundsMs(fromMs, toMs, tz)
    : {
        start: Math.floor(fromMs / bucketMs) * bucketMs,
        end: Math.floor((toMs - 1) / bucketMs) * bucketMs,
      };

  // minPoints (estender end pra frente)
  if (minPoints > 0) {
    const count = Math.floor((end - start) / bucketMs) + 1;
    if (count < minPoints) {
      const missing = minPoints - count;
      end = end + missing * bucketMs;
    }
  }

  for (let t = start; t <= end; t += bucketMs) {
    const a = agg.get(t);
    const avg = a ? a.sum / a.count : null;

    if (stats === "avg") {
      points.push({ tMs: t, avg });
    } else {
      points.push({
        tMs: t,
        avg,
        min: a ? a.min : null,
        max: a ? a.max : null,
      });
    }
  }

  return { points };
}