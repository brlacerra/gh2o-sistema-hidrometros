export type PontoTipo = "estacao";

export interface Ponto {
  id: string;
  tipo: PontoTipo;
  latitude: number;
  longitude: number;
  nome: string;
  ultimaLeitura?: Date;
  is_public?: boolean;
  isActive?: boolean;

  codUsr?: string;
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
