import "server-only";
import { Suspense } from "react";

import { DashboardCard } from "@/app/components/dashboard/shell/DashBoardCard";
import { LumAvgChart } from "@/app/components/dashboard/charts/lum/LumAvgChart";
import { LumMinAvgMaxChart } from "@/app/components/dashboard/charts/lum/LumMinAvgMaxChart";
import { fetchJson } from "../_fetchGraphics";

type Bucket = "15m" | "1d" | "1mo";

type LumPointAvg = { tMs: number; avg: number | null };
type LumPointMinAvgMax = { tMs: number; min: number | null; avg: number | null; max: number | null };

type AllPayload = {
  meta: {
    codSta: string;
    tz: string;
    tsUnit: "s";
    buckets: Record<"day" | "last24h" | "month" | "last30d" | "year" | "hydroYear", Bucket>;
    // other meta fields if present
  };
  day: LumPointAvg[];
  last24h: LumPointAvg[];
  month: LumPointMinAvgMax[];
  last30d: LumPointMinAvgMax[];
  year: LumPointMinAvgMax[];
  hydroYear: LumPointMinAvgMax[];
};

function avgOfPoints(points: Array<{ avg?: number | null }>) {
  let sum = 0;
  let count = 0;
  for (const p of points) {
    const v = p.avg;
    if (v != null && Number.isFinite(v)) {
      sum += v;
      count++;
    }
  }
  return count === 0 ? null : sum / count;
}

/** Skeletons usados como fallback do Suspense */
function CardSkeleton({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <DashboardCard title={title} subtitle={subtitle ?? "Carregando..."}>
      <div className="h-64 w-full animate-pulse bg-slate-100" />
    </DashboardCard>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-1 flex flex-col md:flex-row md:space-x-6 md:space-y-0">
        <div className="w-full md:w-1/2">
          <CardSkeleton title="Dados do dia" subtitle="Luminosidade média (15min)" />
        </div>
        <div className="w-full md:w-1/2">
          <CardSkeleton title="Últimas 24h" subtitle="Luminosidade média (15min)" />
        </div>
      </div>

      <div className="space-y-1 flex flex-col md:flex-row md:space-x-6 md:space-y-0">
        <div className="w-full md:w-1/2">
          <CardSkeleton title="Dados do mês" subtitle="Mín / Méd / Máx (por dia)" />
        </div>
        <div className="w-full md:w-1/2">
          <CardSkeleton title="Últimos 30 dias" subtitle="Mín / Méd / Máx (por dia)" />
        </div>
      </div>

      <div className="space-y-1 flex flex-col md:flex-row md:space-x-6 md:space-y-0">
        <div className="w-full md:w-1/2">
          <CardSkeleton title="Dados do ano" subtitle="Mín / Méd / Máx (por mês)" />
        </div>
        <div className="w-full md:w-1/2">
          <CardSkeleton title="Ano hidrológico" subtitle="Mín / Méd / Máx (por mês)" />
        </div>
      </div>
    </div>
  );
}

/**
 * Server component que carrega toda a série de uma só vez (API-like)
 * e renderiza os cards. Envolvido por Suspense no export default.
 */
async function LumAll({ codSta }: { codSta: string }) {
  const payload = await fetchJson<AllPayload>(`/api/graphics/${encodeURIComponent(codSta)}/lum/all`);

  const dayAvg = avgOfPoints(payload.day) ?? undefined;
  const last24hAvg = avgOfPoints(payload.last24h) ?? undefined;
  const monthAvg = avgOfPoints(payload.month) ?? undefined; // average of daily averages
  const last30dAvg = avgOfPoints(payload.last30d) ?? undefined;
  const yearAvg = avgOfPoints(payload.year) ?? undefined;
  const hydroYearAvg = avgOfPoints(payload.hydroYear) ?? undefined;

  return (
    <div className="space-y-6">
      <div className="space-y-1 flex flex-col md:flex-row md:space-x-6 md:space-y-0">
        <div className="w-full md:w-1/2">
          <DashboardCard title="Dados do dia" subtitle={`Média: ${dayAvg != null ? dayAvg.toFixed(1) + " %" : "—"}`}>
            <LumAvgChart points={payload.day} bucket="15m" />
          </DashboardCard>
        </div>

        <div className="w-full md:w-1/2">
          <DashboardCard title="Últimas 24h" subtitle={`Média: ${last24hAvg != null ? last24hAvg.toFixed(1) + " %" : "—"}`}>
            <LumAvgChart points={payload.last24h} bucket="15m" />
          </DashboardCard>
        </div>
      </div>

      <div className="space-y-1 flex flex-col md:flex-row md:space-x-6 md:space-y-0">
        <div className="w-full md:w-1/2">
          <DashboardCard title="Dados do mês" subtitle={`Média (dia): ${monthAvg != null ? monthAvg.toFixed(1) + " %" : "—"}`}>
            <LumMinAvgMaxChart points={payload.month} bucket="1d" chartType="line" />
          </DashboardCard>
        </div>

        <div className="w-full md:w-1/2">
          <DashboardCard title="Últimos 30 dias" subtitle={`Média (dia): ${last30dAvg != null ? last30dAvg.toFixed(1) + " %" : "—"}`}>
            <LumMinAvgMaxChart points={payload.last30d} bucket="1d" chartType="line" />
          </DashboardCard>
        </div>
      </div>

      <div className="space-y-1 flex flex-col md:flex-row md:space-x-6 md:space-y-0">
        <div className="w-full md:w-1/2">
          <DashboardCard title="Dados do ano" subtitle={`Média (mês): ${yearAvg != null ? yearAvg.toFixed(1) + " %" : "—"}`}>
            <LumMinAvgMaxChart points={payload.year} bucket="1mo" chartType="bar" />
          </DashboardCard>
        </div>

        <div className="w-full md:w-1/2">
          <DashboardCard title="Ano hidrológico" subtitle={`Média (mês): ${hydroYearAvg != null ? hydroYearAvg.toFixed(1) + " %" : "—"}`}>
            <LumMinAvgMaxChart points={payload.hydroYear} bucket="1mo" chartType="bar" />
          </DashboardCard>
        </div>
      </div>
    </div>
  );
}

export default async function LuminosidadePage({
  params,
}: {
  params: Promise<{ codSta: string }>;
}) {
  const { codSta } = await params;

  return (
    <>
      <div className="block md:hidden w-full mb-2 font-semibold p-4 border border-slate-200 shadow-sm bg-white text-center md:text-left">
        <h1 className="text-2xl text-slate-700">Página de Luminosidade</h1>
      </div>
      <Suspense fallback={<PageSkeleton />}>
        <LumAll codSta={codSta} />
      </Suspense>
    </>
  );
}