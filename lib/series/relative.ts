export function parseRelativeToMs(last: string): number | null {
  // formatos: 24h, 7d, 30d
  const m = /^(\d+)([hd])$/.exec(last.trim());
  if (!m) return null;

  const value = Number(m[1]);
  if (!Number.isFinite(value) || value <= 0) return null;

  const unit = m[2];
  if (unit === "h") return value * 60 * 60 * 1000;
  if (unit === "d") return value * 24 * 60 * 60 * 1000;

  return null;
}