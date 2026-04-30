import { DateTime } from "luxon";

const DEFAULT_TZ = "America/Sao_Paulo";

export function startOfTodayMs(tz = DEFAULT_TZ, now = Date.now()): number {
  return DateTime.fromMillis(now, { zone: tz }).startOf("day").toMillis();
}

export function startOfMonthMs(tz = DEFAULT_TZ, now = Date.now()): number {
  return DateTime.fromMillis(now, { zone: tz }).startOf("month").toMillis();
}

export function startOfYearMs(tz = DEFAULT_TZ, now = Date.now()): number {
  return DateTime.fromMillis(now, { zone: tz }).startOf("year").toMillis();
}

export function startOfHydroYearMs(tz = DEFAULT_TZ, now = Date.now()): number {
  const dt = DateTime.fromMillis(now, { zone: tz });
  let hydroYearStart = dt.set({ month: 10, day: 1 }).startOf("day");
  if (dt.month < 10) {
    hydroYearStart = hydroYearStart.minus({ years: 1 });
  }
  return hydroYearStart.toMillis();
}