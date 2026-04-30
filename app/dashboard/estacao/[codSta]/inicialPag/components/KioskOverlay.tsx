"use client";

import { useEffect, useMemo, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";

export type Slide = {
  node: React.ReactNode;
  title: string;
  subtitle?: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  rotateEveryMs?: number;

  slides: Slide[];

  aliasSta?: string;
  lat?: number | null;
  long?: number | null;

  siteUrl: string;
  tagline?: string;
  burnInShift?: boolean;
};

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

export function KioskOverlay({
  open,
  onClose,
  rotateEveryMs = 30_000,
  slides,

  aliasSta,
  siteUrl,
  tagline = "Acompanhe os dados em tempo real no QR Code",
  lat,
  long,

  burnInShift = true,
}: Props) {
  const safeSlides = useMemo(
    () => slides.filter((s) => Boolean(s?.node) && Boolean(s?.title)),
    [slides],
  );

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

  // troca seca + remount (animação do chart)
  const [idx, setIdx] = useState(0);
  const [enterToken, setEnterToken] = useState(0);

  useEffect(() => {
    if (!open) return;
    setIdx(0);
    setEnterToken((v) => v + 1);
  }, [open]);

  function goTo(newIdx: number) {
    if (!open) return;
    if (safeSlides.length === 0) return;
    if (newIdx === idx) return;
    setIdx(newIdx);
    setEnterToken((v) => v + 1);
  }

  useEffect(() => {
    if (!open) return;
    if (safeSlides.length <= 1) return;

    const id = window.setInterval(() => {
      goTo((idx + 1) % safeSlides.length);
    }, rotateEveryMs);

    return () => window.clearInterval(id);
  }, [open, rotateEveryMs, safeSlides.length, idx]);

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

  // UX ESC etc (mantive igual ao seu; omitido por brevidade)
  useEffect(() => {
    if (!open) return;

    const prevOverflow = document.body.style.overflow;
    const prevCursor = document.body.style.cursor;

    document.body.style.overflow = "hidden";
    document.body.style.cursor = "none";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.cursor = prevCursor;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!isMounted || safeSlides.length === 0) return null;

  const logoSrc = "/logoatg.png";
  const active = safeSlides[idx];

  return (
    <div
      className={[
        "fixed inset-0 z-[9999] bg-white text-slate-900",
        "transition-opacity duration-[250ms] ease-out",
        isVisible ? "opacity-100" : "opacity-0",
      ].join(" ")}
    >
      <button
        type="button"
        className="absolute inset-0 cursor-none"
        aria-label="Sair do modo tela cheia"
        onClick={onClose}
        onTouchStart={onClose}
      />

      <div className="relative h-full w-full" style={{ transform: `translate(${shift.x}px, ${shift.y}px)` }}>
        {/* Top */}
        <div className="flex items-center gap-4 px-4 md:px-8 py-3 border-b border-slate-200">
          <div className="flex items-center gap-3 min-w-0">
            <img src={logoSrc} alt="Logo" className="h-8 w-auto md:h-10" />
            <div className="min-w-0">
              <div className="truncate text-base md:text-lg font-semibold">{aliasSta}</div>
              <div className="truncate text-xs md:text-sm text-slate-500">
                Latitude: {lat ?? "—"} Long: {long ?? "—"}
              </div>
            </div>
          </div>

          <div className="ml-auto text-right">
            <div className="text-sm md:text-base font-semibold tabular-nums">{formatClock(now)}</div>
            <div className="text-xs text-slate-500">Atualização automática • modo painel</div>
          </div>
        </div>

        {/* Centro */}
        <div className="h-[calc(100vh-112px)] md:h-[calc(100vh-120px)] px-3 md:px-8 py-3 md:py-5">
          <div className="h-[75vh] w-full flex flex-col min-h-0">
            <div className="mb-2 shrink-0 flex gap-2 items-center">
              <h1 className="text-md md:text-lg font-semibold">{active.title}</h1>
              {active.subtitle ? (
                <h2 className="text-sm md:text-base text-slate-700">{active.subtitle}</h2>
              ) : null}
            </div>

            <div
              key={`slide-${idx}-${enterToken}`}
              className="w-full flex-1 [&>section]:h-full [&>section]:flex [&>section]:flex-col [&>section>div:last-child]:min-h-0 [&>section>div:last-child]:flex-1"
            >
              {active.node}
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-slate-200 bg-white/90 backdrop-blur px-4 md:px-8 py-3">
          <div className="flex items-center gap-4">
            <div className="min-w-0">
              <div className="text-xs md:text-sm text-slate-700">{tagline}</div>
              <div className="text-[11px] md:text-xs text-slate-500 truncate">{siteUrl}</div>
            </div>

            <div className="ml-auto flex items-center gap-3">
              {safeSlides.length > 1 ? (
                <div className="text-[11px] md:text-xs text-slate-500 tabular-nums">
                  {idx + 1}/{safeSlides.length}
                </div>
              ) : null}

              <div className="border border-slate-200 bg-white p-2">
                <QRCodeCanvas value={siteUrl} size={72} fgColor="#0f172a" bgColor="#ffffff" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}