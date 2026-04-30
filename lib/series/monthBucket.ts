import { DateTime } from "luxon";

/**
 * Retorna o início do mês (00:00 do dia 1) no timezone informado.
 * O retorno é epoch ms.
 */
export function monthBucketStartMs(tMs: number, tz: string): number {
  return DateTime.fromMillis(tMs, { zone: tz }).startOf("month").toMillis();
}

/**
 * Retorna o início do mês para from/to, alinhado no tz.
 */
export function monthRangeBoundsMs(fromMs: number, toMs: number, tz: string) {
  const start = DateTime.fromMillis(fromMs, { zone: tz })
    .startOf("month")
    .toMillis();

  const end = DateTime.fromMillis(toMs - 1, { zone: tz })
    .startOf("month")
    .toMillis();

  return { start, end };
}


export function addMonthsMs(tMs: number, tz: string, months: number): number {
  return DateTime.fromMillis(tMs, { zone: tz }).plus({ months }).toMillis();
}

export function subMonthsMs(tMs: number, tz: string, months: number): number {
  return DateTime.fromMillis(tMs, { zone: tz }).minus({ months }).toMillis();
}