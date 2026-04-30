"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { type EstacaoCapabilities, getEstacaoNavItems } from "./routes/estacaoNavItems";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

function classNames(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export function EstacaoSidebar({
  codSta,
  stationLabel,
  capabilities,
}: {
  codSta: string;
  stationLabel: string,
  capabilities: EstacaoCapabilities
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const items = useMemo(() => {
    const base = getEstacaoNavItems(capabilities);
    return base.map((it) => {
      const hrefResolved = it.href(codSta);
      const isActive = pathname === hrefResolved;
      return { ...it, hrefResolved, isActive };
    });
  }, [codSta, pathname, capabilities]);
  return (
    <>
      <div className="lg:hidden mt-24 z-30 w-full text-white bg-zinc-600 backdrop-blur px-4 py-3 flex items-center justify-between">
        <div className="min-w-0">
          <div className="text-sm font-semibold truncate">{stationLabel}</div>
          <div className="text-xs text-slate-200 font-mono truncate">
            {codSta}
          </div>
        </div>

        <button className="border px-3 py-1.5 text-sm" onClick={() => setOpen(true)}>
          Menu
        </button>
      </div>

      <aside className="hidden lg:block w-80 text-white h-screen shrink-0 bg-zinc-600">
        <div className="p-4 border-b border-zinc-500">
          <div className="text-2xl font-semibold truncate">Monitoramento</div>
          <div className="text-xl text-slate-100 font-mono truncate">{codSta}</div>
        </div>

        <nav className="p-2">
          {items.map((it) => {
            const baseClass =
              "block px-4 py-3 mb-2 text-sm 2xl:text- transition font-semibold";

            if (!it.enabled) {
              return (
                <div
                  key={it.key}
                  className={classNames(baseClass, "text-slate-400 cursor-not-allowed opacity-70")}
                  aria-disabled="true"
                  title="Sensor não disponível nesta estação"
                >
                  <FontAwesomeIcon icon={it.icon} className="mr-2" />
                  {it.label}
                  <span className="ml-2 text-xs font-normal">(indisponível)</span>
                </div>
              );
            }

            return (
              <Link
                key={it.key}
                href={it.hrefResolved}
                className={classNames(
                  baseClass,
                  it.isActive
                    ? "bg-slate-700 text-blue-200 font-semibold"
                    : "text-slate-300 hover:bg-zinc-500"
                )}
              >
                <FontAwesomeIcon icon={it.icon} className="mr-2" />
                {it.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {open && (
        <div className="lg:hidden mt-24 fixed inset-0 z-40">
          <button
            className="absolute inset-0 bg-black/30"
            aria-label="Fechar menu"
            onClick={() => setOpen(false)}
          />
          <div className="absolute text-white left-0 top-0 h-full w-80 max-w-[85vw] bg-zinc-600 shadow-xl">
            <div className="p-4 border-b flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-md font-semibold truncate">{stationLabel}</div>
                <div className="text-xs text-slate-200 font-mono truncate">{codSta}</div>
              </div>
              <button className="border px-3 py-1.5 text-sm" onClick={() => setOpen(false)}>
                Fechar
              </button>
            </div>

            <nav className="p-2">
              {items.map((it) => {
                const baseClass = "block px-3 py-2 text-md transition";

                if (!it.enabled) {
                  return (
                    <div
                      key={it.key}
                      className={classNames(baseClass, "text-slate-400 cursor-not-allowed opacity-70")}
                      aria-disabled="true"
                      title="Sensor não disponível nesta estação"
                    >
                      <FontAwesomeIcon icon={it.icon} className="mr-2" />
                      {it.label}
                      <span className="ml-2 text-xs font-normal">(indisponível)</span>
                    </div>
                  );
                }

                return (
                  <Link
                    key={it.key}
                    href={it.hrefResolved}
                    onClick={() => setOpen(false)}
                    className={classNames(
                      baseClass,
                      it.isActive
                        ? "bg-slate-700 text-blue-200 font-semibold"
                        : "text-white hover:bg-zinc-500"
                    )}
                  >
                    <FontAwesomeIcon icon={it.icon} className="mr-2" />
                    {it.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}