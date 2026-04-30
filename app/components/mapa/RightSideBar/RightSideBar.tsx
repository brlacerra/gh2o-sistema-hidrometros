"use client";

import React, { useEffect, useRef, useState } from "react";
import { type Ponto, formatDateBR } from "@/lib/utils";
import { useRouter } from "next/navigation";



type Rain24hState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; mm: number }
  | { status: "error"; message: string };

async function fetchRain24hMm(codSta: string): Promise<number> {
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

interface RightSidebarProps {
  pontoSelecionado: Ponto | null;
  onClearSelection: () => void;
}

export function RightSidebar({ pontoSelecionado, onClearSelection }: RightSidebarProps) {
  const [rain24h, setRain24h] = useState<Rain24hState>({ status: "idle" });
  const [isAdmin, setIsAdmin] = useState(false);
  const reqIdRef = useRef(0);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then(res => res.json())
      .then((data: any) => {
        if (data?.user?.role === "admin") {
          setIsAdmin(true);
        }
      })
      .catch(() => { });
  }, []);

  useEffect(() => {
    const p = pontoSelecionado;

    if (!p) {
      setRain24h({ status: "idle" });
      return;
    }

    const codSta = p.id;

    const myReqId = ++reqIdRef.current;
    setRain24h({ status: "loading" });

    fetchRain24hMm(codSta)
      .then((mm) => {
        if (reqIdRef.current !== myReqId) return; // evita race condition
        setRain24h({ status: "ready", mm });
      })
      .catch((err) => {
        if (reqIdRef.current !== myReqId) return;
        setRain24h({ status: "error", message: err?.message ?? "Erro ao buscar chuva 24h" });
      });
  }, [pontoSelecionado?.id]);
  return (
    <>
      <DesktopSidebar pontoSelecionado={pontoSelecionado} rain24h={rain24h} onClearSelection={onClearSelection} isAdmin={isAdmin} />
      <MobileBottomSheet pontoSelecionado={pontoSelecionado} rain24h={rain24h} onClearSelection={onClearSelection} isAdmin={isAdmin} />
    </>
  );
}


function DesktopSidebar({
  pontoSelecionado,
  rain24h,
  onClearSelection,
  isAdmin,
}: {
  pontoSelecionado: Ponto | null;
  onClearSelection: () => void;
  rain24h?: Rain24hState;
  isAdmin: boolean;
}) {
  const router = useRouter();

  if (!pontoSelecionado) {
    return (
      <></>
    );
  }

  const p = pontoSelecionado;
  const isBlocked = !p.isActive && !isAdmin;

  return (
    <aside className="hidden md:block absolute right-4 top-38 w-80 bg-white/95 shadow-lg p-4 z-10 border border-slate-200">
      <Header ponto={p} />
      <BasicInfo ponto={p} />
      <DetailsByTipo ponto={p} rain24h={rain24h} isAdmin={isAdmin} />

      <div className="mt-3 flex items-center justify-end gap-2">
        {!isBlocked && (
          <button
            className="flex-1 bg-[var(--color-gh2ogreen)] hover:bg-emerald-600
                     text-white text-xs font-semibold py-1.5 transition"
            onClick={() => router.push(`/dashboard/estacao/${encodeURIComponent(p.id)}`)}
          >
            Ver dashboard
          </button>
        )}

        <button
          className="px-2 py-1 border border-slate-300 text-[11px]
                     text-slate-600 hover:bg-slate-100 transition"
          onClick={onClearSelection}
        >
          Limpar
        </button>
      </div>
    </aside>
  );
}

/* ----------------------------- Mobile bottom sheet (<md) ----------------------------- */

function MobileBottomSheet({
  pontoSelecionado,
  rain24h,
  onClearSelection,
  isAdmin,
}: {
  pontoSelecionado: Ponto | null;
  rain24h?: Rain24hState;
  onClearSelection: () => void;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const open = !!pontoSelecionado;

  const COLLAPSED_VH = 34; // ~1/3
  const EXPANDED_VH = 90;  // quase tela toda

  const [expanded, setExpanded] = useState(false);
  const [dragging, setDragging] = useState(false);

  const [topPx, setTopPx] = useState<number>(99999);

  const metricsRef = useRef<{
    viewportH: number;
    collapsedTop: number;
    expandedTop: number;
    closedTop: number;
  } | null>(null);

  const startYRef = useRef<number | null>(null);
  const startTopRef = useRef<number>(0);

  const recomputeMetrics = () => {
    const vh = window.innerHeight;
    const collapsedH = (vh * COLLAPSED_VH) / 100;
    const expandedH = (vh * EXPANDED_VH) / 100;

    metricsRef.current = {
      viewportH: vh,
      collapsedTop: vh - collapsedH,
      expandedTop: vh - expandedH,
      closedTop: vh,
    };
  };

  useEffect(() => {
    recomputeMetrics();

    const onResize = () => {
      recomputeMetrics();
      const m = metricsRef.current!;
      if (!open) setTopPx(m.closedTop);
      else setTopPx(expanded ? m.expandedTop : m.collapsedTop);
    };

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [open, expanded]);

  useEffect(() => {
    if (!metricsRef.current && typeof window !== "undefined") {
      recomputeMetrics();
    }
    const m = metricsRef.current;
    if (!m) return;

    if (open) {
      setExpanded(false);
      setTopPx(m.collapsedTop);
    } else {
      setTopPx(m.closedTop);
    }
  }, [open]);

  const clamp = (value: number, min: number, max: number) =>
    Math.min(max, Math.max(min, value));

  const onPointerDown = (e: React.PointerEvent) => {
    if (!metricsRef.current) return;

    {/* Evita bloquear click de links/botões. Se iniciado em cima de um deles, não arrasta */}
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("a")) {
      return;
    }

    setDragging(true);
    startYRef.current = e.clientY;
    startTopRef.current = topPx;

    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging || startYRef.current == null || !metricsRef.current) return;

    const m = metricsRef.current;
    const delta = e.clientY - startYRef.current;
    const nextTop = startTopRef.current + delta;

    const clamped = clamp(nextTop, m.expandedTop, m.closedTop);
    setTopPx(clamped);
  };

  const snapTo = (target: "expanded" | "collapsed" | "closed") => {
    const m = metricsRef.current;
    if (!m) return;

    if (target === "expanded") {
      setExpanded(true);
      setTopPx(m.expandedTop);
      return;
    }
    if (target === "collapsed") {
      setExpanded(false);
      setTopPx(m.collapsedTop);
      return;
    }
    // closed
    setExpanded(false);
    setTopPx(m.closedTop);
  };

  const onPointerUp = () => {
    if (!metricsRef.current) return;

    setDragging(false);
    startYRef.current = null;

    const m = metricsRef.current;

    const CLOSE_THRESHOLD_PX = 30;
    const EXPAND_THRESHOLD_PX = 15;

    const deltaFromStart = topPx - startTopRef.current;

    if (deltaFromStart < -EXPAND_THRESHOLD_PX) {
      snapTo("expanded");
      return;
    }

    if (deltaFromStart > CLOSE_THRESHOLD_PX) {
      if (expanded) {
        snapTo("collapsed");
      } else {
        onClearSelection();
        snapTo("closed");
      }
      return;
    }

    const distToExpanded = Math.abs(topPx - m.expandedTop);
    const distToCollapsed = Math.abs(topPx - m.collapsedTop);

    if (distToExpanded < distToCollapsed) snapTo("expanded");
    else snapTo("collapsed");
  };

  const p = pontoSelecionado;
  const isBlocked = !p?.isActive && !isAdmin;

  return (
    <div className="md:hidden">
      {open && (
        <button
          className="fixed inset-0 bg-black/30 z-20"
          onClick={() => {
            onClearSelection();
            snapTo("closed");
          }}
          aria-label="Fechar detalhes"
        />
      )}

      <div
        className="fixed left-0 right-0 z-30 bg-white shadow-2xl border-t border-slate-200"
        style={{
          top: topPx,
          height: "100vh",
          transition: dragging ? "none" : "top 180ms ease-out",
          touchAction: "none",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div
          className="h-10 flex items-center justify-center"
        >
          <div className="w-12 h-1.5 bg-slate-300 " />
        </div>

        <div className="px-4 pb-6 overflow-hidden max-h-[90vh] text-slate-900 touch-none select-none">
          {!p ? (
            <p className="text-xs text-slate-600">
              Selecione um sensor no mapa para ver os detalhes.
            </p>
          ) : (
            <>
              <Header ponto={p} />
              <BasicInfo ponto={p} />
              <DetailsByTipo ponto={p} rain24h={rain24h} isAdmin={isAdmin} />

              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  className="bg-[var(--color-gh2ogreen)] hover:bg-emerald-600 text-white text-sm font-semibold py-2 transition"
                  onClick={() => router.push(`/dashboard/estacao/${encodeURIComponent(p.id)}`)}
                >
                  Dashboard
                </button>
                <button
                  className="border border-slate-300 text-sm font-semibold py-2 text-slate-700"
                  onClick={() => {
                    onClearSelection();
                    snapTo("closed");
                  }}
                >
                  Fechar
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- Shared content ----------------------------- */

function Header({ ponto }: { ponto: Ponto }) {
  return (
    <div className="mb-2 flex items-start justify-between gap-2">
      <div className="min-w-0">
        <h3 className="font-semibold text-slate-900 truncate">{ponto.nome}</h3>
        <p className="text-[11px] text-slate-500">
          ID: <span className="font-mono">{ponto.id}</span>
        </p>
        <p className="text-[11px] text-slate-500">
          {
            ponto.is_public ? "Sensor público" : "Sensor privado"
          }
        </p>
      </div>

      <span className="shrink-0 px-2 py-0.5 text-[11px] font-medium capitalize bg-slate-100 text-slate-700">
        Estação
      </span>
    </div>
  );
}

function BasicInfo({ ponto }: { ponto: Ponto }) {
  return (
    <div className="space-y-0.5 text-xs text-slate-600">
      <p>
        Lat: <span className="font-mono">{ponto.latitude}</span>
      </p>
      <p>
        Lng: <span className="font-mono">{ponto.longitude}</span>
      </p>
      <p>
        Última leitura: <span className="font-mono">{formatDateBR(ponto.ultimaLeitura)}</span>
      </p>
    </div>
  );
}

function DetailsByTipo({ ponto, rain24h, isAdmin }: { ponto: Ponto; rain24h?: Rain24hState; isAdmin: boolean }) {
  let chuvaLabel: string | null = null;
  if (rain24h) {
    if (rain24h.status === "loading") {
      chuvaLabel = "Carregando...";
    } else if (rain24h.status === "ready") {
      chuvaLabel = `${rain24h.mm.toFixed(2)}mm`;
    } else if (rain24h.status === "error") {
      chuvaLabel = "Erro";
    }
  }

  const isBlocked = !ponto.isActive && !isAdmin;

  if (isBlocked) {
    const wppMessage = encodeURIComponent(`Olá Uelson! Gostaria de regularizar a situação da minha estação ${ponto.id} (${ponto.nome}).`);

    return (
      <div className="mt-3 bg-slate-50 border border-slate-200 p-3 text-xs text-slate-700">
        <div className="font-semibold text-slate-800 mb-2">Resumo (Estação)</div>
        <div className="text-red-500 mb-1">Estação Bloqueada por pendências comerciais</div>
        <div className="">
          Entre em contato com <a href={`https://wa.me/553488103718?text=${wppMessage}`} target="_blank" rel="noopener noreferrer" className="text-blue-500">55 34 8810-3718</a> (Uelson Filho) e regularize sua estação
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 bg-slate-50 border border-slate-200 p-3 text-xs text-slate-700">
      <div className="font-semibold text-slate-800 mb-2">Resumo (Estacao)</div>
      <ul className="space-y-1">
        <li>Temperatura: {ponto.temperatura?.toFixed(1) ?? "-"}°C</li>
        <li>Umidade: {ponto.umidade?.toFixed(1) ?? "-"}%</li>
        <li>Chuva (24h): {chuvaLabel ?? "-"}</li>
        <li>Luminosidade: {ponto.luminosidade?.toFixed(1) ?? "-"}</li>
        <li>Pressao Atm.: {ponto.pressaoAt?.toFixed(1) ?? "-"} hPa</li>
      </ul>
    </div>
  );
}