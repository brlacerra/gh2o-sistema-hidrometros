"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { formatDateBR, tempoToDate } from "@/lib/utils";

type StationListItem = {
  codSta: string;
  nomeSta: string;
  aliasSta: string | null;
  is_public: boolean;
  hasImage: boolean;
};

type StationDetail = {
  station: {
    codSta: string;
    nomeSta: string;
    aliasSta: string | null;
    latSta: string | number | null;
    longSta: string | number | null;
    resSta: string | number | null;
    perSta: number | null;
    is_public: boolean;
    isActive: boolean;

    hasPulsos: boolean;
    hasTemp: boolean;
    hasPressao: boolean;
    hasUmidade: boolean;
    hasLum: boolean;
    hasVent: boolean;
    hasDv: boolean;

    hasImage: boolean;
    codUsr: string;

    created_at: string;
    updated_at: string;
  };
  latestData: null | {
    ts: string;
    tempAvg: number | null;
    preAvg: number | null;
    umiAvg: number | null;
    lumAvg: number | null;
    vvAvg: number | null;
    dv: number | null;
  };
};

type Rain24hState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; mm: number }
  | { status: "error"; message: string };

async function fetchRain24hMm(codSta: string): Promise<number> {
  const qs = new URLSearchParams({
    last: "24h",
    bucket: "1h",
  });

  const res = await fetch(`/api/stations/${codSta}/series/rain24h`, {
    cache: "no-store",
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${txt}`);
  }

  const json = await res.json();
  return Number(json?.accumMm ?? 0);
}

export function StationsAdminClient() {
  const router = useRouter();

  const [stations, setStations] = useState<StationListItem[]>([]);
  const [loadingStations, setLoadingStations] = useState(true);
  const [stationsError, setStationsError] = useState<string | null>(null);

  const [selectedCodSta, setSelectedCodSta] = useState<string | null>(null);

  const [detail, setDetail] = useState<StationDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [rain24h, setRain24h] = useState<Rain24hState>({ status: "idle" });
  const reqIdRef = useRef(0);

  // ...existing code...

  useEffect(() => {
    let cancelled = false;

    async function loadList() {
      setLoadingStations(true);
      setStationsError(null);
      try {
        const res = await fetch("/api/stations", { method: "GET", credentials: "include" });
        const json = await res.json().catch(() => null);

        if (!res.ok) throw new Error(json?.error ?? `Erro ao carregar estações (${res.status})`);
        if (cancelled) return;

        const list = json?.stations ?? json?.data ?? [];
        setStations(Array.isArray(list) ? list : []);
      } catch (e) {
        setStationsError(e instanceof Error ? e.message : "Erro ao carregar estações.");
      } finally {
        setLoadingStations(false);
      }
    }

    loadList();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadDetail(codSta: string) {
      setLoadingDetail(true);
      setDetailError(null);
      try {
        const res = await fetch(`/api/stations/${codSta}?view=allDataWithLatest`, {
          method: "GET",
          credentials: "include",
        });
        const json = await res.json().catch(() => null);

        if (res.status === 404) throw new Error("Estação Não Encontrada");
        if (res.status === 403) throw new Error("Acesso Negado");
        if (!res.ok) throw new Error(json?.error ?? `Erro ao carregar estação (${res.status})`);

        if (cancelled) return;
        setDetail(json as StationDetail);
      } catch (e) {
        setDetail(null);
        setDetailError(e instanceof Error ? e.message : "Erro ao carregar estação.");
      } finally {
        setLoadingDetail(false);
      }
    }

    if (selectedCodSta) loadDetail(selectedCodSta);
    else {
      setDetail(null);
      setDetailError(null);
    }

    return () => { cancelled = true; };
  }, [selectedCodSta]);

  // Buscar chuva de 24h
  useEffect(() => {
    if (!detail || !detail.station) {
      setRain24h({ status: "idle" });
      return;
    }

    const codSta = detail.station.codSta;
    const myReqId = ++reqIdRef.current;
    setRain24h({ status: "loading" });

    fetchRain24hMm(codSta)
      .then((mm) => {
        if (reqIdRef.current !== myReqId) return;
        setRain24h({ status: "ready", mm });
      })
      .catch((err) => {
        if (reqIdRef.current !== myReqId) return;
        setRain24h({ status: "error", message: err?.message ?? "Erro ao buscar chuva 24h" });
      });
  }, [detail?.station.codSta]);

  const selected = useMemo(
    () => stations.find(s => s.codSta === selectedCodSta) ?? null,
    [stations, selectedCodSta],
  );

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col md:flex-row gap-6">
      <div className="w-full md:w-1/3 border shadow-md border-slate-200">
        <div className="p-3 border-b border-slate-200 font-semibold">Estações</div>

        {loadingStations ? (
          <div className="p-3 text-sm text-slate-600">Carregando...</div>
        ) : stationsError ? (
          <div className="p-3 text-sm text-red-600">{stationsError}</div>
        ) : (
          <div
            className="
            p-3
            max-h-[45vh] md:max-h-[80vh]
            overflow-y-auto
          "
          >
            {stations.map((s) => {
              const active = s.codSta === selectedCodSta;
              return (
                <button
                  key={s.codSta}
                  type="button"
                  className={[
                    "w-full text-left px-3 py-2 mb-2 border border-slate-200",
                    "bg-slate-50 hover:bg-slate-200",
                    active ? "bg-slate-100" : "",
                  ].join(" ")}
                  onClick={() => setSelectedCodSta(s.codSta)}
                >
                  <div className="font-medium leading-snug">{s.nomeSta}</div>
                  <div className="text-xs text-slate-600 leading-snug">
                    {s.codSta}
                    {s.aliasSta ? ` • ${s.aliasSta}` : ""} •{" "}
                    {s.is_public ? "Pública" : "Privada"}
                  </div>
                </button>
              );
            })}

            {stations.length === 0 ? (
              <div className="text-sm text-slate-600">Nenhuma estação encontrada.</div>
            ) : null}
          </div>
        )}
      </div>

      {/* RIGHT */}
      <div
        className="
        w-full md:w-2/3
        border border-slate-200
        shadow-md
        md:h-[80vh]
        overflow-hidden
      "
      >
        {!selectedCodSta ? (
          <div className="p-6 text-slate-700">Selecione uma estação para visualizar.</div>
        ) : loadingDetail ? (
          <div className="p-6 text-slate-700">Carregando detalhes...</div>
        ) : detailError ? (
          <div className="p-6">
            <h1 className="text-2xl font-bold">{detailError}</h1>
          </div>
        ) : detail ? (
          <div className="h-full overflow-y-auto p-4 space-y-4">
            {/* TOP: header */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xl font-semibold break-words">
                  {detail.station.nomeSta}{" "}
                  <span className="text-slate-500 text-sm">
                    ({detail.station.codSta})
                  </span>
                </div>
                <div className="text-sm text-slate-700 break-words">
                  Proprietário:{" "}
                  <span className="font-mono">{detail.station.codUsr}</span> •{" "}
                  {detail.station.is_public ? "Pública" : "Privada"}
                </div>
              </div>

              <button
                type="button"
                className="px-4 py-2 bg-slate-900 text-white w-full sm:w-auto"
                onClick={() =>
                  router.push(`/admin/stations/edit/${encodeURIComponent(detail.station.codSta)}/edit`)
                }
              >
                Editar estação
              </button>
            </div>

            {/* Dados da estação */}
            <div className="border border-slate-200 p-3">
              <div className="font-semibold mb-2">Dados da estação</div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="text-sm space-y-1">
                  <div className="font-semibold">Dados básicos</div>
                  <div>
                    <span className="text-slate-600">ID da estação:</span>{" "}
                    {detail.station.codSta}
                  </div>
                  <div>
                    <span className="text-slate-600">Nome:</span>{" "}
                    {detail.station.nomeSta}
                  </div>
                  <div>
                    <span className="text-slate-600">Alias:</span>{" "}
                    {detail.station.aliasSta ?? "-"}
                  </div>

                  {detail.station.is_public ? (
                    <div className="text-[var(--color-gh2ogreen)] font-medium">
                      Esta estação é pública
                    </div>
                  ) : (
                    <div className="text-[var(--color-gh2oblue)] font-medium">
                      Esta estação é privada
                    </div>
                  )}
                  {detail.station.isActive ? (
                    <div className="text-[var(--color-gh2ogreen)] font-medium">
                      Esta estação está ativa
                    </div>
                  ) : (
                    <div className="text-[var(--color-gh2oblue)] font-medium">
                      Esta estação não está ativa
                    </div>
                  )}

                  <div>
                    <span className="text-slate-600">Latitude:</span>{" "}
                    {detail.station.latSta ?? "-"}
                  </div>
                  <div>
                    <span className="text-slate-600">Longitude:</span>{" "}
                    {detail.station.longSta ?? "-"}
                  </div>
                </div>

                <div className="text-sm space-y-1">
                  <div className="font-semibold">Sensores</div>
                  <div>
                    <span className="text-slate-600">Pluviometro:</span>{" "}
                    {detail.station.hasPulsos ? "Sim" : "Não"}
                  </div>
                  <div>
                    <span className="text-slate-600">Temperatura:</span>{" "}
                    {detail.station.hasTemp ? "Sim" : "Não"}
                  </div>
                  <div>
                    <span className="text-slate-600">Pressão:</span>{" "}
                    {detail.station.hasPressao ? "Sim" : "Não"}
                  </div>
                  <div>
                    <span className="text-slate-600">Umidade:</span>{" "}
                    {detail.station.hasUmidade ? "Sim" : "Não"}
                  </div>
                  <div>
                    <span className="text-slate-600">Luminosidade:</span>{" "}
                    {detail.station.hasLum ? "Sim" : "Não"}
                  </div>
                  <div>
                    <span className="text-slate-600">Vento:</span>{" "}
                    {detail.station.hasVent ? "Sim" : "Não"}
                  </div>
                  <div>
                    <span className="text-slate-600">
                      Direção do Vento (DV):
                    </span>{" "}
                    {detail.station.hasDv ? "Sim" : "Não"}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom: última leitura + imagem */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="border border-slate-200 p-3">
                <div className="font-semibold mb-2">Última leitura</div>

                <div className="text-sm space-y-1">
                  <div className="break-words">
                    <span className="text-slate-600">Data:</span>{" "}
                    {detail.latestData?.ts
                      ? formatDateBR(tempoToDate(detail.latestData.ts))
                      : "-"}
                  </div>

                  {detail.latestData ? (
                    <>
                      <div>
                        <span className="text-slate-600">chuva (24h):</span>{" "}
                        {rain24h.status === "loading"
                          ? "Carregando..."
                          : rain24h.status === "ready"
                            ? `${rain24h.mm.toFixed(2)}mm`
                            : rain24h.status === "error"
                              ? "Erro"
                              : "-"}
                      </div>
                      <div>
                        <span className="text-slate-600">Temperatura:</span>{" "}
                        {detail.latestData.tempAvg?.toFixed(1) ?? "-"}°C
                      </div>
                      <div>
                        <span className="text-slate-600">Pressão Atmosférica:</span>{" "}
                        {detail.latestData.preAvg?.toFixed(1) ?? "-"}hPa
                      </div>
                      <div>
                        <span className="text-slate-600">Umidade:</span>{" "}
                        {detail.latestData.umiAvg?.toFixed(1) ?? "-"}%
                      </div>
                      <div>
                        <span className="text-slate-600">Luminosidade:</span>{" "}
                        {detail.latestData.lumAvg?.toFixed(1) ?? "-"}%
                      </div>

                      {detail.station.hasDv && (
                        <>
                          <div>
                            <span className="text-slate-600">Velocidade do Vento:</span>{" "}
                            {detail.latestData.vvAvg?.toFixed(1) ?? "-"}
                          </div>
                          <div>
                            <span className="text-slate-600">Direção do Vento:</span>{" "}
                            {detail.latestData.dv?.toFixed(1) ?? "-"}
                          </div>
                        </>
                      )}
                    </>
                  ) : (
                    <div className="text-sm text-slate-600">
                      Sem leituras para esta estação.
                    </div>
                  )}
                </div>
              </div>

              <div className="border border-slate-200 p-3">
                <div className="font-semibold mb-2">Imagem</div>

                {detail.station.hasImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/stations/${detail.station.codSta}.jpg`}
                    alt={`Estação ${detail.station.codSta}`}
                    className="w-full max-h-[320px] md:max-h-[360px] object-cover border"
                  />
                ) : (
                  <div className="w-full h-[240px] md:h-[320px] border flex items-center justify-center text-slate-600">
                    <span>essa estação não possui imagem</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 text-slate-700">Selecione uma estação à esquerda.</div>
        )}
      </div>
    </div>
  );
}