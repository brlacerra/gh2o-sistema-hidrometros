"use client";

import { useEffect, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { StationPermitted } from "./OverviewClient";
import OverviewStationCard from "./OverviewStationCard";

type Props = {
  open: boolean;
  onClose: () => void;
  stations: StationPermitted[];
  siteUrl: string;
  tagline?: string;
  burnInShift?: boolean;
};

// Utilidades do relógio
function pad2(n: number) {
  return String(n).padStart(2, "0");
}
function formatClock(d: Date) {
  const dd = pad2(d.getDate());
  const mm = pad2(d.getMonth() + 1);
  const yy = String(d.getFullYear()).slice(-2);
  const hh = pad2(d.getHours());
  const mi = pad2(d.getMinutes());
  const ss = pad2(d.getSeconds());
  return `${dd}/${mm}/${yy} ${hh}:${mi}:${ss}`;
}

// Utilitário para determinar as classes do grid no Tailwind
// 1 = cols-1
// 2 = cols-2
// 3 = cols-3
// 4 = cols-2, rows-2
// 5 = cols-3, rows-2
// 6 = cols-3, rows-2
function getGridClasses(count: number) {
  if (count === 1) return "grid-cols-1 grid-rows-1";
  if (count === 2) return "grid-cols-2 grid-rows-1";
  if (count === 3) return "grid-cols-3 grid-rows-1";
  if (count === 4) return "grid-cols-2 grid-rows-2";
  return "grid-cols-3 grid-rows-2";
}

export default function OverviewKiosk({
  open,
  onClose,
  stations,
  siteUrl,
  tagline = "Acompanhe os dados em tempo real no sistema",
  burnInShift = true,
}: Props) {
  // open/close fade
  const overlayFadeMs = 250;
  const [isMounted, setIsMounted] = useState(open);
  const [isVisible, setIsVisible] = useState(open);

  useEffect(() => {
    if (open) {
      setIsMounted(true);
      requestAnimationFrame(() => setIsVisible(true));
      return;
    }
    setIsVisible(false);
    const t = window.setTimeout(() => setIsMounted(false), overlayFadeMs);
    return () => window.clearTimeout(t);
  }, [open]);

  // relógio
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (!open) return;
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, [open]);

  // anti burn-in
  const [shift, setShift] = useState({ x: 0, y: 0 });
  useEffect(() => {
    if (!open) return;
    if (!burnInShift) return;

    const id = window.setInterval(() => {
      const rand = () => Math.floor(Math.random() * 9) - 4;
      setShift({ x: rand(), y: rand() });
    }, 120_000);

    return () => window.clearInterval(id);
  }, [open, burnInShift]);

  // UX ESC e Cursor Inteligente
  useEffect(() => {
    if (!open) return;

    const prevOverflow = document.body.style.overflow;
    const prevCursor = document.body.style.cursor;

    document.body.style.overflow = "hidden";

    // Lógica para esconder o cursor após inatividade
    let hideCursorTimeout: number;
    const resetCursor = () => {
      document.body.style.cursor = "default";
      window.clearTimeout(hideCursorTimeout);
      hideCursorTimeout = window.setTimeout(() => {
        document.body.style.cursor = "none";
      }, 5000); // esconde após 5s parado
    };

    window.addEventListener("mousemove", resetCursor);
    resetCursor(); // setup inicial

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.cursor = prevCursor;
      window.removeEventListener("mousemove", resetCursor);
      window.clearTimeout(hideCursorTimeout);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!isMounted) return null;

  const logoSrc = "/logoatg.png";

  return (
    <div
      className={`fixed inset-0 z-[9999] bg-white text-slate-900 transition-opacity duration-[250ms] ease-out ${isVisible ? "opacity-100" : "opacity-0"
        }`}
    >
      {/* Invisible overlay button to exit Kiosk by clicking anywhere empty */}
      <button
        type="button"
        className="absolute inset-0 cursor-none z-0"
        aria-label="Sair do modo tela cheia"
        onClick={onClose}
        onTouchStart={onClose}
      />

      <div className="relative h-full w-full flex flex-col pointer-events-none" style={{ transform: `translate(${shift.x}px, ${shift.y}px)` }}>
        {/* Top */}
        <div className="flex items-center gap-4 px-4 md:px-8 py-3 border-b border-slate-200 pointer-events-auto">
          <div className="flex items-center gap-3 min-w-0">
            <img src={logoSrc} alt="Logo" className="h-8 w-auto md:h-10" />
            <div className="min-w-0">
              <div className="truncate text-base md:text-lg font-semibold">Painel de Visão Geral</div>
              <div className="truncate text-xs md:text-sm text-slate-500">
                Frota global de monitoramento
              </div>
            </div>
          </div>

          <div className="ml-auto text-right">
            <div className="text-sm md:text-base font-semibold tabular-nums">{formatClock(now)}</div>
            <div className="text-xs text-slate-500">Atualização automática a cada 15 min</div>
          </div>
          <button
            onClick={onClose}
            className="ml-4 px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-medium border border-slate-200 transition"
          >
            Sair
          </button>
        </div>

        {/* Centro - Grid de Estações simultâneas */}
        <div className="flex-1 px-4 md:px-8 py-4 overflow-hidden bg-slate-100/50 pointer-events-auto">
          {stations.length > 0 ? (
            <div className={`grid gap-4 w-full h-full ${getGridClasses(stations.length)}`}>
              {stations.map(sta => (
                <div key={sta.codSta} className="w-full h-full min-h-0">
                  <OverviewStationCard codSta={sta.codSta} nomeSta={sta.nomeSta} />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center w-full h-full text-slate-400">
              Nenhuma estação no grid.
            </div>
          )}
        </div>

        {/* Bottom */}
        <div className="border-t border-slate-200 bg-white/90 backdrop-blur px-4 md:px-8 py-3 pointer-events-auto">
          <div className="flex items-center gap-4">
            <div className="min-w-0 flex-1">
              <div className="text-xs md:text-sm text-slate-700">{tagline}</div>
              <div className="text-[11px] md:text-xs text-slate-500 truncate">{"https://em.h2o.com.br/"}</div>
            </div>

            <div className="ml-auto flex items-center gap-3">
              <div className="border border-slate-200 bg-white p-2">
                <QRCodeCanvas value={"https://em.h2o.com.br/"} size={64} fgColor="#0f172a" bgColor="#ffffff" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
