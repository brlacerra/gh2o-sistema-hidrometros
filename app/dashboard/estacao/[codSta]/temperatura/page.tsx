import "server-only";
import { Suspense } from "react";

import { DashboardCard } from "@/app/components/dashboard/shell/DashBoardCard";
import { TempAvgChart } from "@/app/components/dashboard/charts/temp/tempAvgChart";
import { TempMinAvgMaxChart } from "@/app/components/dashboard/charts/temp/TempMinAvgMaxChart";
import { TempBoxPlotChart } from "@/app/components/dashboard/charts/temp/TempBoxPlotChart";
import { fetchJson } from "../_fetchGraphics";

type Bucket = "15m" | "1d" | "1mo";
type TempPointAvg = { tMs: number; avg: number | null };
type TempPointMinAvgMax = { tMs: number; min: number | null; avg: number | null; max: number | null; std?: number | null };

type AllPayload = {
  meta: {
    codSta: string;
    tz: string;
    tsUnit: "s";
    buckets: Record<"day" | "last24h" | "month" | "last30d" | "year" | "hydroYear", Bucket>;
  };
  day: TempPointAvg[]; // 15m averages
  last24h: TempPointAvg[];
  month: TempPointMinAvgMax[]; // daily min/avg/max
  last30d: TempPointMinAvgMax[];
  year: TempPointMinAvgMax[]; // monthly min/avg/max
  hydroYear: TempPointMinAvgMax[];
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

/** Skeleton usado como fallback do Suspense */
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
          <CardSkeleton title="Dados do dia" subtitle="Temperatura média (15min)" />
        </div>
        <div className="w-full md:w-1/2">
          <CardSkeleton title="Últimas 24h" subtitle="Temperatura média (15min)" />
        </div>
      </div>

      <div className="space-y-1 flex flex-col md:flex-row md:space-x-6 md:space-y-0">
        <div className="w-full md:w-1/2">
          <CardSkeleton title="Dados do mês" subtitle="Min / Méd / Máx (por dia)" />
        </div>
        <div className="w-full md:w-1/2">
          <CardSkeleton title="Últimos 30 dias" subtitle="Min / Méd / Máx (por dia)" />
        </div>
      </div>

      <div className="space-y-1 flex flex-col md:flex-row md:space-x-6 md:space-y-0">
        <div className="w-full md:w-1/2">
          <CardSkeleton title="Dados do ano" subtitle="Min / Méd / Máx (por mês)" />
        </div>
        <div className="w-full md:w-1/2">
          <CardSkeleton title="Ano hidrológico" subtitle="Min / Méd / Máx (por mês)" />
        </div>
      </div>
    </div>
  );
}

/** Componente server-side que chama a API e renderiza os cards */
async function TempAll({ codSta }: { codSta: string }) {
  const payload = await fetchJson<AllPayload>(`/api/graphics/${encodeURIComponent(codSta)}/temp/all`);

  const dayAvg = avgOfPoints(payload.day) ?? undefined;
  const last24hAvg = avgOfPoints(payload.last24h) ?? undefined;
  const monthAvg = avgOfPoints(payload.month) ?? undefined;
  const last30dAvg = avgOfPoints(payload.last30d) ?? undefined;
  const yearAvg = avgOfPoints(payload.year) ?? undefined;
  const hydroYearAvg = avgOfPoints(payload.hydroYear) ?? undefined;

  return (
    <div className="space-y-6">
      <div className="space-y-1 flex flex-col md:flex-row md:space-x-6 md:space-y-0">
        <div className="w-full md:w-1/2">
          <DashboardCard title="Dados do dia" subtitle={`Média: ${dayAvg != null ? dayAvg.toFixed(1) + " °C" : "—"}`}>
            <TempAvgChart points={payload.day} bucket="15m" />
          </DashboardCard>
        </div>

        <div className="w-full md:w-1/2">
          <DashboardCard title="Últimas 24h" subtitle={`Média: ${last24hAvg != null ? last24hAvg.toFixed(1) + " °C" : "—"}`}>
            <TempAvgChart points={payload.last24h} bucket="15m" />
          </DashboardCard>
        </div>
      </div>

      <div className="space-y-1 flex flex-col md:flex-row md:space-x-6 md:space-y-0">
        <div className="w-full md:w-1/2">
          <DashboardCard title="Dados do mês" subtitle={`Média (dia): ${monthAvg != null ? monthAvg.toFixed(1) + " °C" : "—"}`}>
            <TempMinAvgMaxChart points={payload.month} bucket="1d" chartType="line" />
          </DashboardCard>
        </div>

        <div className="w-full md:w-1/2">
          <DashboardCard title="Últimos 30 dias" subtitle={`Média (dia): ${last30dAvg != null ? last30dAvg.toFixed(1) + " °C" : "—"}`}>
            <TempMinAvgMaxChart points={payload.last30d} bucket="1d" chartType="line" />
          </DashboardCard>
        </div>
      </div>

      <div className="space-y-1 flex flex-col md:flex-row md:space-x-6 md:space-y-0">
        <div className="w-full md:w-1/2">
          <DashboardCard title="Dados do ano" subtitle={`Média (mês): ${yearAvg != null ? yearAvg.toFixed(1) + " °C" : "—"}`}>
            <TempMinAvgMaxChart points={payload.year} bucket="1mo" chartType="bar" />
          </DashboardCard>
        </div>

        <div className="w-full md:w-1/2">
          <DashboardCard title="Ano hidrológico" subtitle={`Média (mês): ${hydroYearAvg != null ? hydroYearAvg.toFixed(1) + " °C" : "—"}`}>
            <TempMinAvgMaxChart points={payload.hydroYear} bucket="1mo" chartType="bar" />
          </DashboardCard>
        </div>
      </div>

      {/* --- INICIO LABORATÓRIO DE GRÁFICOS --- */}
      <h2 className="text-xl mt-8 font-bold text-slate-700 pt-8 border-b border-slate-200 pb-2">
        Gráficos de teste
      </h2>

      <div className="space-y-1 flex flex-col md:flex-row md:space-x-6 md:space-y-0">
        <div className="w-full md:w-1/2">
          <DashboardCard title="Box Plot" subtitle="Últimos 30 dias">
            <TempBoxPlotChart points={payload.last30d} bucket="1d" />
          </DashboardCard>
        </div>

        <div className="w-full md:w-1/2">
          <DashboardCard title="Box Plot" subtitle="Dados do ano">
            <TempBoxPlotChart points={payload.year} bucket="1mo" />
          </DashboardCard>
        </div>
      </div>
      {/* --- FIM LABORATÓRIO DE GRÁFICOS --- */}
    </div>
  );
}

export default async function TemperaturaPage({
  params,
}: {
  params: Promise<{ codSta: string }>;
}) {
  const { codSta } = await params;

  return (
    <>
      <div className="block md:hidden w-full mb-2 font-semibold p-4 border border-slate-200 shadow-sm bg-white text-center md:text-left">
        <h1 className="text-2xl text-slate-700">Página de Temperatura</h1>
      </div>
      <Suspense fallback={<PageSkeleton />}>
        <TempAll codSta={codSta} />
      </Suspense>
    </>
  );
}