import "server-only";
import { Suspense } from "react";
import { headers } from "next/headers";

import { DashboardCard } from "@/app/components/dashboard/shell/DashBoardCard";
import { RainChart } from "@/app/components/dashboard/charts/chuva/RainChart";
import { TempAvgChart } from "@/app/components/dashboard/charts/temp/tempAvgChart";
import { fetchJson } from "../_fetchGraphics";
import { startOfMonthMs, startOfTodayMs } from "@/lib/time/range";
import { InicialPagKioskClient } from "./components/InicialPagKioskClient";
import { DayRainCardClient } from "@/app/components/inicialPag/DayRainCardClient";
import { MonthRainCardClient } from "@/app/components/inicialPag/MonthRainCardClient";
import { DayTempCardClient } from "@/app/components/inicialPag/DayTempCardClient";

type Bucket = "5m" | "15m" | "30m" | "1h" | "1d" | "1mo";

function bucketFromBucketMs(bucketMs: number): Bucket {
  const candidates: Array<{ ms: number; b: Bucket }> = [
    { ms: 5 * 60_000, b: "5m" },
    { ms: 15 * 60_000, b: "15m" },
    { ms: 30 * 60_000, b: "30m" },
    { ms: 60 * 60_000, b: "1h" },
    { ms: 24 * 60 * 60_000, b: "1d" },
  ];
  let best = candidates[0];
  let bestDiff = Math.abs(bucketMs - best.ms);

  for (const candidate of candidates.slice(1)) {
    const diff = Math.abs(bucketMs - candidate.ms);
    if (diff < bestDiff) {
      best = candidate;
      bestDiff = diff;
    }
  }
  return best.b;
}

function CardSkeleton({ title }: { title: string }) {
  return (
    <DashboardCard title={title} subtitle="Carregando...">
      <div className="h-64 w-full animate-pulse bg-slate-100" />
    </DashboardCard>
  );
}

type RainSeriesResponse = {
  meta: { bucket: string; bucketMs: number; tz: string; codSta?: string };
  points: Array<{ tMs: number; mm?: number | null; mmAccum?: number | null }>;
};

type TempSeriesResponse = {
  meta: { bucket: string; bucketMs: number; tz: string; codSta?: string };
  points: Array<{ tMs: number; avg?: number | null; min?: number | null; max?: number | null }>;
};

async function DayRainCard({ codSta, nowMs, chartHeight = 260 }: { codSta: string; nowMs: number; chartHeight?: number | string }) {
  // usa a API granular (apenas day)
  const res = await fetchJson<RainSeriesResponse>(`/api/graphics/${encodeURIComponent(codSta)}/rain?range=day`);
  const day = res.points ?? [];
  const dayBucket = bucketFromBucketMs(res.meta?.bucketMs ?? 15 * 60_000);

  return (
    <DashboardCard
      title="Pluviometria - Dados do dia"
      subtitle={`Total acumulado: ${day.reduce((acc, p) => acc + (p.mm ?? 0), 0).toFixed(2)} mm`}
    >
      <RainChart points={day} bucket={dayBucket} height={chartHeight} />
    </DashboardCard>
  );
}

async function MonthRainCard({ codSta, nowMs, chartHeight = 260 }: { codSta: string; nowMs: number; chartHeight?: number | string }) {
  const res = await fetchJson<RainSeriesResponse>(`/api/graphics/${encodeURIComponent(codSta)}/rain?range=month&minPoints=10`);
  const month = res.points ?? [];
  const monthBucket = bucketFromBucketMs(res.meta?.bucketMs ?? 24 * 60 * 60_000);

  return (
    <DashboardCard
      title="Pluviometria - Dados do mês"
      subtitle={`Total acumulado: ${month.reduce((acc, p) => acc + (p.mm ?? 0), 0).toFixed(2)} mm`}
    >
      <RainChart points={month} bucket={monthBucket} height={chartHeight} />
    </DashboardCard>
  );
}

async function DayTempCard({
  codSta,
  nowMs,
  tz,
  chartHeight = 260,
}: {
  codSta: string;
  nowMs: number;
  tz: string;
  chartHeight?: number | string;
}) {
  const res = await fetchJson<TempSeriesResponse>(`/api/graphics/${encodeURIComponent(codSta)}/temp?range=day`);
  const day = res.points ?? [];
  const dayBucket = bucketFromBucketMs(res.meta?.bucketMs ?? 15 * 60_000);

  return (
    <DashboardCard title="Temperatura - Dados do dia" subtitle="Temperatura média por período">
      <TempAvgChart points={day} bucket={dayBucket} height={chartHeight} />
    </DashboardCard>
  );
}

export default async function inicialPag({
  params,
}: {
  params: Promise<{ codSta: string; aliasSta: string | null }>;
}) {
  const { codSta, aliasSta } = await params;
  const nowMs = Date.now();
  const tz = "America/Sao_Paulo";

  const cards: React.ReactNode[] = [
    <Suspense key="rain-day" fallback={<CardSkeleton title="Chuva - hoje" />}>
      <DayRainCard codSta={codSta} nowMs={nowMs} />
    </Suspense>,

    <Suspense key="rain-month" fallback={<CardSkeleton title="Chuva - mês" />}>
      <MonthRainCard codSta={codSta} nowMs={nowMs} />
    </Suspense>,

    <Suspense key="temp-day" fallback={<CardSkeleton title="Temperatura - hoje" />}>
      <DayTempCard codSta={codSta} nowMs={nowMs} tz={tz} />
    </Suspense>,
  ];

  const overlaySlides = [
    {
      title: "Pluviometria — Hoje",
      subtitle: "Total por hora (mm) e acumulado",
      node: (
        <Suspense fallback={<CardSkeleton title="Chuva - hoje" />}>
          <DayRainCardClient codSta={codSta} chartHeight="40vh" />
        </Suspense>
      ),
    },
    {
      title: "Pluviometria — Mês",
      subtitle: "Acumulado diário (mm)",
      node: (
        <Suspense fallback={<CardSkeleton title="Chuva - mês" />}>
          <MonthRainCardClient codSta={codSta} chartHeight="40vh" />
        </Suspense>
      ),
    },
    {
      title: "Temperatura — Hoje",
      subtitle: "Média por período",
      node: (
        <Suspense fallback={<CardSkeleton title="Temperatura - hoje" />}>
          <DayTempCardClient codSta={codSta} chartHeight="40vh" />
        </Suspense>
      ),
    },
  ];

  return <InicialPagKioskClient cards={cards} aliasSta={aliasSta ?? "Estação"} overlaySlides={overlaySlides} idleMs={30_000} rotateEveryMs={30_000} />;
}