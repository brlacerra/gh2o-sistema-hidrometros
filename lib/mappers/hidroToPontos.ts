import type { Ponto } from "@/lib/utils";
import { tempoToDate } from "@/lib/utils"

export type ReadingHealth = "ok" | "warn" | "offline" | "unActive" | "unknown";

export type HidroApiItem = {
  codHidr: string;
  descricao: string | null;
  latHidr: number | null;
  longHidr: number | null;
  is_public: boolean;
  isActive: boolean;
  propriedade?: {
    nomeProp: string;
  } | null;
  outorga?: {
    numeroPortaria: string | null;
    dataVencimento: Date | string | null;
    lim_accum_diario: number | null;
  }[] | null;
};

export type HidroApiResponse = { data: HidroApiItem[] };

export function hidrometrosToPontos(hidrometros: HidroApiItem[]): Ponto[] {
  return hidrometros
    .filter(h => h.latHidr != null && h.longHidr != null)
    .map(h => {
      const activeOutorga = h.outorga?.find(o => o.numeroPortaria) || h.outorga?.[0];
      return {
        id: h.codHidr,
        tipo: "hidrometro",
        latitude: h.latHidr as number,
        longitude: h.longHidr as number,
        descricao: h.descricao,
        is_public: h.is_public,
        isActive: h.isActive,
        nomePropriedade: h.propriedade?.nomeProp ?? null,
        outorgaNumero: activeOutorga?.numeroPortaria ?? null,
        outorgaVencimento: activeOutorga?.dataVencimento ? new Date(activeOutorga.dataVencimento) : null,
        limiteDiario: activeOutorga?.lim_accum_diario ?? null,
      };
    });
}

export function healthFromLastReading(
  active?: boolean
): ReadingHealth {
  if (active === undefined) return "unknown";
  return active ? "ok" : "unActive";
}