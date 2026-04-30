import { epochBigIntToMs } from "@/lib/utils";
import { dayBucketStartMs, dayRangeBoundsMs } from "./dayBucket";
import { addMonthsMs, monthBucketStartMs, monthRangeBoundsMs, subMonthsMs } from "./monthBucket";

export type RainPoint = {
  tMs: number;
  pulses: number;
  mm: number;
  mmAccum: number;
};

export function buildRainSeries(opts: {
  fromMs: number;
  toMs: number;
  bucketMs: number;
  resSta: number;
  readings: Array<{ ts: bigint; pulsos: number }>;
  tz?: string;
  bucketKind?: "fixed" | "day" | "month";
  minPoints?: number; 
}): { points: RainPoint[]; totals: { pulses: number; mm: number } } {
  const { fromMs, toMs, bucketMs, resSta, readings } = opts;
  const tz = opts.tz ?? "America/Sao_Paulo";
  const bucketKind = opts.bucketKind ?? "fixed";

  const pulsesByBucket = new Map<number, number>();

  // --- Agrupamento
  for (const r of readings) {
    const tMs = epochBigIntToMs(r.ts);
    if (!Number.isFinite(tMs)) continue;
    if (tMs < fromMs || tMs > toMs) continue;

    let b: number;
    if (bucketKind === "month") {
      b = monthBucketStartMs(tMs, tz);
    } else if (bucketKind === "day") {
      b = dayBucketStartMs(tMs, tz);
    } else {
      b = Math.floor(tMs / bucketMs) * bucketMs;
    }

    pulsesByBucket.set(b, (pulsesByBucket.get(b) ?? 0) + (r.pulsos ?? 0));
  }

  const points: RainPoint[] = [];
  let acc = 0;
  let totalPulses = 0;
  if (bucketKind === "month") {
    const minPoints = opts.minPoints ?? 0;
    let { start, end } = monthRangeBoundsMs(fromMs, toMs, tz);
    let count = 0;

    for (let t = start; t <= end; t = addMonthsMs(t, tz, 1)) count ++;
    if (minPoints > 0 && count < minPoints) {
      const missing = minPoints - count;
      end = addMonthsMs(end, tz, missing);
    }
    for (let t = start; t <= end; t = addMonthsMs(t, tz, 1)) {
      const pulses = pulsesByBucket.get(t) ?? 0;
      const mm = pulses * resSta;
      acc += mm;
      totalPulses += pulses;
      points.push({ tMs: t, pulses, mm, mmAccum: acc });
    }

    return { points, totals: { pulses: totalPulses, mm: acc } };
  }

  const isDayBucket = bucketKind === "day";
  let { start, end } = isDayBucket
    ? dayRangeBoundsMs(fromMs, toMs, tz)
    : {
        start: Math.floor(fromMs / bucketMs) * bucketMs,
        end: Math.floor((toMs - 1) / bucketMs) * bucketMs,
      };
  const minPoints = opts.minPoints ?? 0;
  if (minPoints > 0) {
    const count = Math.floor((end - start) / bucketMs) + 1;
    if (count < minPoints) {
      const missing = minPoints - count;
      end = end + missing * bucketMs;
    }
  }
  for (let t = start; t <= end; t += bucketMs) {
    const pulses = pulsesByBucket.get(t) ?? 0;
    const mm = pulses * resSta;
    acc += mm;
    totalPulses += pulses;
    points.push({ tMs: t, pulses, mm, mmAccum: acc });
  }

  return { points, totals: { pulses: totalPulses, mm: acc } };
}