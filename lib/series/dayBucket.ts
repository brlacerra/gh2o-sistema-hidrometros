import { DateTime } from "luxon";

const DAY_MS = 86_400_000;

export function dayBucketStartMs(tMs: number, tz: string): number {
  // offset em minutos naquele instante no tz (ex.: -180)
  const offsetMin = DateTime.fromMillis(tMs, { zone: tz }).offset;
  const offsetMs = offsetMin * 60_000;

  // ancora o "dia" no 00:00 do tz
  return Math.floor((tMs + offsetMs) / DAY_MS) * DAY_MS - offsetMs;
}

export function dayRangeBoundsMs(fromMs: number, toMs: number, tz: string) {
  const start = dayBucketStartMs(fromMs, tz);
  const end = dayBucketStartMs(toMs - 1, tz);
  return { start, end };
}