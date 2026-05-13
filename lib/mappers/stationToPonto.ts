import type { Ponto } from "@/lib/utils";
import { tempoToDate } from "@/lib/utils"

export type ReadingHealth = "ok" | "warn" | "offline" | "unActive" | "unknown";

export type StationApiItem = {
  codSta: string;
  nomeSta: string | null;
  aliasSta: string | null;
  latSta: number | null;
  longSta: number | null;
  resSta: number | null;
  perSta: number | null;
  is_public: boolean;
  isActive: boolean;
  latestData: null | {
    codSta: string;
    ts: string;
  };
};

export type StationsApiResponse = { data: StationApiItem[] };

export function stationsToPontos(stations: StationApiItem[]): Ponto[] {
  return stations
    .filter(s => s.latSta != null && s.longSta != null)
    .map(s => ({
      id: s.codSta,
      tipo: "estacao",
      latitude: s.latSta as number,
      longitude: s.longSta as number,
      nome: s.aliasSta ?? s.nomeSta ?? s.codSta,
      is_public: s.is_public,
      isActive: s.isActive,

      ultimaLeitura: tempoToDate(s.latestData?.ts),
    }));
}


export function healthFromLastReading(
  last?: Date | null,
  active?: boolean,
  now = new Date()
): ReadingHealth {
  if (!last) return "unknown";
  if (!active) return "unActive";

  const diffMs = now.getTime() - last.getTime();
  const diffMin = diffMs / 60000;

  if (diffMin <= 60) return "ok";     // até 15 min
  if (diffMin > 60) return "warn";   // 15-600 min

  return "offline";                      // > 600 min
}