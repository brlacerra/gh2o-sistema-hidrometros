"use client";

import { useMemo, useState } from "react";
import type { Ponto } from "@/lib/utils";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFilter, faSearch } from "@fortawesome/free-solid-svg-icons";

interface LeftFiltersProps {
  allPoints: Ponto[];
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  onSelectPonto: (p: Ponto | null) => void;
}

export function LeftFilters({
  allPoints,
  searchTerm,
  onSearchTermChange,
  onSelectPonto,
}: LeftFiltersProps) {
  const [open, setOpen] = useState(false);

  const results = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return [];
    return allPoints.filter(p =>
      `${p.descricao || ""}_${p.id}`.toLowerCase().includes(term),
    );
  }, [allPoints, searchTerm]);

  const handleResultClick = (ponto: Ponto) => {
    onSelectPonto(ponto);
  };

  return (
    <aside className="absolute left-4 top-38 z-10">
      {/* Botão hamburguer */}
      <button
        className="mb-2 flex items-center gap-2 px-3 py-2 bg-slate-900/80
                   text-white text-xs shadow hover:bg-slate-800 transition"
        onClick={() => setOpen(o => !o)}
      >
        <FontAwesomeIcon icon={faFilter} className="text-xs" />
        <span>Filtros</span>
      </button>

      {open && (
        <div className="w-72 bg-white/95 shadow-lg border border-slate-200 p-4 text-sm text-black">
          {/* Busca */}
          <div className="mb-2">
            <label className="block text-[11px] text-slate-500 mb-1">
              Buscar sensor
            </label>
            <div className="relative">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
                <FontAwesomeIcon icon={faSearch} />
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={e => onSearchTermChange(e.target.value)}
                placeholder="Nome ou ID do sensor..."
                className="w-full pl-7 pr-2 py-1.5 border border-slate-300
                           text-xs focus:outline-none focus:ring-1 focus:ring-[var(--color-gh2ogreen)]"
              />
            </div>
          </div>

          {searchTerm && (
            <div className="max-h-40 overflow-y-auto mt-2 border-t border-slate-200 pt-2">
              {results.length === 0 ? (
                <p className="text-[11px] text-slate-500">
                  Nenhum sensor encontrado.
                </p>
              ) : (
                <ul className="space-y-1 text-xs">
                  {results.map(p => (
                    <li key={p.id}>
                      <button
                        className="w-full text-left px-2 py-1 hover:bg-slate-100"
                        onClick={() => handleResultClick(p)}
                      >
                        <div className="flex justify-between items-center gap-2">
                          <span className="font-semibold truncate">
                            {p.descricao || "Sem descrição"}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {p.tipo}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500">
                          ID: <span className="font-mono">{p.id}</span>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </aside>
  );
}