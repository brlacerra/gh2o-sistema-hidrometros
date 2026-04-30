import { formatDateBR, tempoToDate } from "@/lib/utils";
import Image from "next/image";
import React from "react";

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white shadow-sm border border-slate-200 p-5">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function DashBoardHeader({
  codSta,
  stationLabel,
  isPublic,
  resSta,
  perSta,
  hasImage,
  ts,
  tempAvg,
  preAvg,
  umiAvg,
  lumAvg,
  vvAvg,
  dv,
}: {
  codSta: string;
  stationLabel: string;
  isPublic: boolean;
  resSta: unknown;
  perSta: number;
  hasImage: boolean;
  ts: string | number | null;
  tempAvg: number | null;
  preAvg: number | null;
  umiAvg: number | null;
  lumAvg: number | null;
  vvAvg: number | null;
  dv: number | null;
}) {

  const lastReadingText = (() => {
    return formatDateBR(tempoToDate(String(ts))) || "-";
  })();



  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-10">
      <Card title="Estação">
        <div className="space-y-2">
          <div className="text-xl font-semibold text-slate-900 truncate">
            {stationLabel}
          </div>
          <div className="text-sm text-slate-600 font-mono">{codSta}</div>

          <div className="pt-2 grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-slate-500">Visibilidade</div>
              <div className="font-semibold text-slate-900">
                {isPublic ? "Pública" : "Privada"}
              </div>
            </div>

            <div>
              <div className="text-slate-500">Resolução chuva</div>
              <div className="font-semibold text-slate-900">
                {String(resSta)} mm/pulso
              </div>
            </div>

            <div>
              <div className="text-slate-500">Período (perSta)</div>
              <div className="font-semibold text-slate-900">{perSta} min</div>
            </div>

            <div>
              <div className="text-slate-500">Última leitura</div>
              <div className="font-semibold text-slate-900">
                {lastReadingText}
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card title="Download de Dados Históricos">
        {/* UI somente (sem ação real ainda) */}
        <form className="space-y-3">
          <div>
            <label className="block text-sm text-slate-600 mb-1">
              Data de início
            </label>
            <input
              type="date"
              className="w-full border px-3 py-2 text-sm"
              name="from"
              disabled
            />
          </div>

          <div>
            <label className="block text-sm text-slate-600 mb-1">
              Data de fim
            </label>
            <input
              type="date"
              className="w-full border px-3 py-2 text-sm"
              name="to"
              disabled
            />
          </div>

          <button
            type="button"
            disabled
            className="w-full bg-slate-900 text-white py-2 text-sm font-semibold opacity-60 cursor-not-allowed"
            title="Vamos habilitar depois quando definirmos o formato do export"
          >
            Download (em breve)
          </button>

          <div className="text-xs text-slate-500">
            Em breve: exportar leituras do período selecionado.
          </div>
        </form>
      </Card>

      <Card title={hasImage ? "Imagem da estação" : "Resumo rápido"}>
        {!hasImage ? (
          <div className="text-sm text-slate-700 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Temperatura (última)</span>
              <span className="font-semibold">
                {tempAvg?.toFixed(2) ?? "—"} Cº
              </span>
            </div>
            <section className="flex items-center justify-between">
              <span className="text-slate-500">Umidade (última)</span>
              <span className="font-semibold">
                {umiAvg?.toFixed(2) ?? "—"}%
              </span>
            </section>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Pressão (última)</span>
              <span className="font-semibold">
                {preAvg?.toFixed(2) ?? "—"}hPa
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Luminosidade (última)</span>
              <span className="font-semibold">
                {lumAvg?.toFixed(2) ?? "—"}%
              </span>
            </div>
          </div>) : (
          <div className="relative w-full overflow-hidden rounded" style={{ aspectRatio: "16 / 9" }}>
            <Image
              src={`/stations/${codSta}.jpg`}   // se você colocar em public/stations/images
              alt={`Imagem da estação ${codSta}`}
              fill
              className="object-fit-cover"
              sizes="(max-width: 1024px) 100vw, 400px"
              priority
            />
          </div>
        )}
      </Card>
    </div>
  );
}