export type Bucket = "auto" | "5m" | "15m" | "30m" | "1h" | "1d" | "1mo";

const MIN = 60_000;

export function bucketToMs(bucket: Exclude<Bucket, "auto" | "1mo">): number {
  switch (bucket) {
    case "5m":
      return 5 * MIN;
    case "15m":
      return 15 * MIN;
    case "30m":
      return 30 * MIN;
    case "1h":
      return 60 * MIN;
    case "1d":
      return 24 * 60 * MIN;
  }
}

export function autoBucketMs(fromMs: number, toMs: number): number {
  const rangeMs = Math.max(0, toMs - fromMs);
  const rangeHours = rangeMs / (60 * MIN);

  if (rangeHours <= 12) return bucketToMs("5m");
  if (rangeHours <= 48) return bucketToMs("15m");
  if (rangeHours <= 24 * 14) return bucketToMs("1h");
  return bucketToMs("1d");
}