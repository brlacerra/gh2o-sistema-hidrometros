import "server-only";
import { Suspense } from "react";

import { DashboardCard } from "@/app/components/dashboard/shell/DashBoardCard";
import { RainChart } from "@/app/components/dashboard/charts/chuva/RainChart";
import { fetchJson } from "../_fetchGraphics";

type Bucket = "15m" | "1d" | "1mo";
type RainPoint = { tMs: number; mm: number | null; mmAccum: number | null; pulses?: number };

type AllPayload = {
  meta: {
    codSta: string;
    tz: string;
    tsUnit: "s";
    resSta: number;
    buckets: Record<"day" | "last24h" | "month" | "last30d" | "year" | "hydroYear", Bucket>;
  };
  day: RainPoint[];
  last24h: RainPoint[];
  month: RainPoint[];
  last30d: RainPoint[];
  year: RainPoint[];
  hydroYear: RainPoint[];
};

function total(points: RainPoint[]) {
  return points.reduce((acc, p) => acc + (p.mm ?? 0), 0);
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
          <CardSkeleton title="Dados do dia" subtitle="Chuva acumulada (15min)" />
        </div>
        <div className="w-full md:w-1/2">
          <CardSkeleton title="Últimas 24h" subtitle="Chuva acumulada (15min)" />
        </div>
      </div>

      <div className="space-y-1 flex flex-col md:flex-row md:space-x-6 md:space-y-0">
        <div className="w-full md:w-1/2">
          <CardSkeleton title="Dados do mês" subtitle="Chuva acumulada (por dia)" />
        </div>
        <div className="w-full md:w-1/2">
          <CardSkeleton title="Últimos 30 dias" subtitle="Chuva acumulada (por dia)" />
        </div>
      </div>

      <div className="space-y-1 flex flex-col md:flex-row md:space-x-6 md:space-y-0">
        <div className="w-full md:w-1/2">
          <CardSkeleton title="Dados do ano" subtitle="Chuva acumulada (por mês)" />
        </div>
        <div className="w-full md:w-1/2">
          <CardSkeleton title="Últimos 365 dias" subtitle="Chuva acumulada (por mês)" />
        </div>
      </div>
    </div>
  );
}

/**
 * Componente server-side assíncrono que faz o fetch e renderiza os cards.
 * Suspense em volta permite renderizar fallback imediatamente enquanto
 * a API responde.
 */
async function RainAll({ codSta }: { codSta: string }) {
  const payload = await fetchJson<AllPayload>(`/api/graphics/${encodeURIComponent(codSta)}/rain/all`);

  return (
    <div className="space-y-6">
      <div className="space-y-1 flex flex-col md:flex-row md:space-x-6 md:space-y-0">
        <div className="w-full md:w-1/2">
          <DashboardCard
            title="Dados do dia"
            subtitle={`Total acumulado: ${total(payload.day).toFixed(2)} mm`}
          >
            <RainChart points={payload.day} bucket="15m" />
          </DashboardCard>
        </div>

        <div className="w-full md:w-1/2">
          <DashboardCard
            title="Últimas 24h"
            subtitle={`Total acumulado: ${total(payload.last24h).toFixed(2)} mm`}
          >
            <RainChart points={payload.last24h} bucket="15m" />
          </DashboardCard>
        </div>
      </div>

      <div className="space-y-1 flex flex-col md:flex-row md:space-x-6 md:space-y-0">
        <div className="w-full md:w-1/2">
          <DashboardCard
            title="Dados do mês"
            subtitle={`Total acumulado: ${total(payload.month).toFixed(2)} mm`}
          >
            <RainChart points={payload.month} bucket="1d" />
          </DashboardCard>
        </div>

        <div className="w-full md:w-1/2">
          <DashboardCard
            title="Últimos 30 dias"
            subtitle={`Total acumulado: ${total(payload.last30d).toFixed(2)} mm`}
          >
            <RainChart points={payload.last30d} bucket="1d" />
          </DashboardCard>
        </div>
      </div>

      <div className="space-y-1 flex flex-col md:flex-row md:space-x-6 md:space-y-0">
        <div className="w-full md:w-1/2">
          <DashboardCard
            title="Dados do ano"
            subtitle={`Total acumulado: ${total(payload.year).toFixed(2)} mm`}
          >
            <RainChart points={payload.year} bucket="1mo" />
          </DashboardCard>
        </div>

        <div className="w-full md:w-1/2">
          <DashboardCard
            title="Ano hidrológico"
            subtitle={`Total acumulado: ${total(payload.hydroYear).toFixed(2)} mm`}
          >
            <RainChart points={payload.hydroYear} bucket="1mo" />
          </DashboardCard>
        </div>
      </div>
    </div>
  );
}

export default async function PluviometriaPage({
  params,
}: {
  params: Promise<{ codSta: string }>;
}) {
  const { codSta } = await params;

  return (
    <>
      <div className="block md:hidden w-full mb-2 font-semibold p-4 border border-slate-200 shadow-sm bg-white text-center md:text-left">
        <h1 className="text-2xl text-slate-700">Página de Pluviometria</h1>
      </div>
      <Suspense fallback={<PageSkeleton />}>
        <RainAll codSta={codSta} />
      </Suspense>
    </>
  );
}