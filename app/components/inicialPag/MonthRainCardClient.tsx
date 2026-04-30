"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DashboardCard } from "@/app/components/dashboard/shell/DashBoardCard";
import { RainChart } from "@/app/components/dashboard/charts/chuva/RainChart";

type RainPoint = { tMs: number; mm: number | null; mmAccum: number | null };

type RainSeriesResponse = {
  meta: { bucket: string; bucketMs: number; tz: string };
  points: RainPoint[];
};

export function MonthRainCardClient({
  codSta,
  tz = "America/Sao_Paulo",
  chartHeight = "40vh",
  bucket = "1d",
  minPoints = 10,
}: {
  codSta: string;
  tz?: string;
  chartHeight?: number | string;
  bucket?: string;
  minPoints?: number;
}) {
  const [data, setData] = useState<RainSeriesResponse | null>(null);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalMm = useMemo(() => {
    const pts = data?.points ?? [];
    const total = pts.reduce((acc, p) => acc + (p.mm ?? 0), 0);
    return Number.isFinite(total) ? total : null;
  }, [data]);

  const load = useCallback(async () => {
    setUpdating(true);
    setError(null);

    try {
      const res = await fetch(`/api/graphics/${encodeURIComponent(codSta)}/rain?range=month&minPoints=${minPoints}`, { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as RainSeriesResponse | null;
      if (!res.ok || !json) throw new Error(`http_${res.status}`);

      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "unknown_error");
    } finally {
      setUpdating(false);
    }
  }, [codSta, minPoints]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <DashboardCard
      title="Pluviometria - Dados do mês"
      subtitle={
        error
          ? `Erro ao atualizar (${error})`
          : `Total acumulado: ${totalMm !== null ? totalMm.toFixed(2) : "—"} mm${
              updating ? " (atualizando…)" : ""
            }`
      }
    >
      <RainChart points={data?.points ?? []} bucket={bucket as any} height={chartHeight} />
    </DashboardCard>
  );
}