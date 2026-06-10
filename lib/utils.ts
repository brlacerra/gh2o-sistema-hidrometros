export type PontoTipo = "estacao" | "hidrometro";

export interface Ponto {
  id: string;
  tipo: PontoTipo;
  descricao: string | null;
  latitude: number;
  longitude: number;
  is_public?: boolean;
  isActive?: boolean;
  nomePropriedade?: string | null;
  outorgaNumero?: string | null;
  outorgaVencimento?: Date | null;
  limiteDiario?: number | null;
}

export function tempoToDate(epochString?: string | null): Date | undefined {
  if (!epochString) return undefined;

  const n = Number(epochString);
  if (!Number.isFinite(n)) return undefined;

  const ms = n < 1e12 ? n * 1000 : n;

  const d = new Date(ms);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export function formatDateBR(d?: Date) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(d);
}

export function epochToMs(ts: bigint | number | string): number {
  const n = typeof ts === "bigint" ? Number(ts) : Number(ts);
  if (!Number.isFinite(n)) return NaN;
  return n < 1e12 ? n * 1000 : n;
}

export function epochBigIntToMs(n: bigint): number {
  // BigInt -> number (ok para epochs atuais)
  return epochToMs(Number(n));
}
