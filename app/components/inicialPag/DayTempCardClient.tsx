"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DashboardCard } from "@/app/components/dashboard/shell/DashBoardCard";
import { TempAvgChart } from "@/app/components/dashboard/charts/temp/tempAvgChart";

type TempPoint = { tMs: number; avg?: number | null; min?: number | null; max?: number | null };

type TempSeriesResponse = {
  meta: { bucket: string; bucketMs: number; tz: string };
  points: TempPoint[];
};

export function DayTempCardClient({
  codSta,
  tz = "America/Sao_Paulo",
  chartHeight = "40vh",
  bucket = "15m",
}: {
  codSta: string;
  tz?: string;
  chartHeight?: number | string;
  bucket?: string;
}) {
  const [data, setData] = useState<TempSeriesResponse | null>(null);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const avg = useMemo(() => {
    const pts = data?.points ?? [];
    let sum = 0;
    let count = 0;
    for (const p of pts) {
      if (p.avg != null && Number.isFinite(p.avg)) {
        sum += p.avg;
        count++;
      }
    }
    return count === 0 ? null : sum / count;
  }, [data]);

  const load = useCallback(async () => {
    setUpdating(true);
    setError(null);

    try {
      const res = await fetch(`/api/graphics/${encodeURIComponent(codSta)}/temp?range=day`, { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as TempSeriesResponse | null;
      if (!res.ok || !json) throw new Error(`http_${res.status}`);

      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "unknown_error");
    } finally {
      setUpdating(false);
    }
  }, [codSta]);

  useEffect(() => {
    load();
  }, [load]);

  const points: TempPoint[] = Array.isArray(data?.points) ? data!.points : [];
  return (
    <DashboardCard
      title="Temperatura - Dados do dia"
      subtitle={
        error
          ? `Erro ao atualizar (${error})`
          : `Temperatura média por período${updating ? " (atualizando…)" : ""}`
      }
    >
      <TempAvgChart points={points} bucket={bucket as any} height={chartHeight} />
    </DashboardCard>
  );
}