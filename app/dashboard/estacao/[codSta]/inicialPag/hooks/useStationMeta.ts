"use client";

import { useEffect, useState } from "react";

type StationMeta = {
  codSta: string;
  perSta?: number | null; // minutos (ex.: 15)
  resSta?: string | number | null; // depende do prisma (Decimal pode virar string)
  hasTemp?: boolean;
  hasPulsos?: boolean;
  hasPressao?: boolean;
  hasUmidade?: boolean;
  hasLum?: boolean;
  hasVent?: boolean;
  hasDv?: boolean;
};

export function useStationMeta(codSta: string) {
  const [meta, setMeta] = useState<StationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/stations/${encodeURIComponent(codSta)}?view=meta`,
          { method: "GET", credentials: "include" },
        );
        const json = await res.json().catch(() => null);

        if (!res.ok) {
          throw new Error(json?.error ?? `meta_fetch_failed_${res.status}`);
        }

        if (!cancelled) setMeta(json.station as StationMeta);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "unknown_error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [codSta]);

  return { meta, loading, error };
}