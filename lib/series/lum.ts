export type LumPoint =
  | { tMs: number; avg: number | null }
  | { tMs: number; avg: number | null; min: number | null; max: number | null };