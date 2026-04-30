"use client";

import { useEffect, useMemo, useState } from "react";
import FullScreenMap from "./components/mapa/FullScreenMap";
import { Ponto } from "@/lib/utils";
import { NavbarClient } from "@/app/components/Navbar/NavbarClient";
import { LeftFilters } from "@/app/components/mapa/LeftFilters/LeftFilters";
import { RightSidebar } from "@/app/components/mapa/RightSideBar/RightSideBar";
import { stationsToPontos, type StationsApiResponse } from "@/lib/mappers/stationToPonto";



export default function HomePage() {
  const [selectedPonto, setSelectedPonto] = useState<Ponto | null>(null);
  const [focusPonto, setFocusPonto] = useState<Ponto | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [pontos, setPontos] = useState<Ponto[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadStations() {
      const res = await fetch("/api/stations", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch /api/stations");
      const json = (await res.json()) as StationsApiResponse;

      if (cancelled) return;
      setPontos(stationsToPontos(json.data));
    }

    loadStations().catch(console.error);

    return () => {
      cancelled = true;
    };
  }, []);

  const pontosFiltrados = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return pontos.filter(p => {
      if (!term) return true;
      return p.nome.toLowerCase().includes(term) || p.id.toLowerCase().includes(term);
    });
  }, [pontos, searchTerm]);

  return (
    <main className="w-screen h-screen relative">
      <FullScreenMap
        pontos={pontosFiltrados}
        selectedPonto={selectedPonto}
        onSelectPonto={ponto => {
          setSelectedPonto(ponto);
        }}
        focusPonto={focusPonto}
      />

      <NavbarClient title="Sistema de gerenciamento" />

      <LeftFilters
        allPoints={pontos} // aqui antes era PONTOS_MOCK
        searchTerm={searchTerm}
        onSearchTermChange={setSearchTerm}
        onSelectPonto={ponto => {
          setSelectedPonto(ponto);
          setFocusPonto(ponto ?? null);
        }}
      />

      <RightSidebar
        pontoSelecionado={selectedPonto}
        onClearSelection={() => {
          setSelectedPonto(null);
          setFocusPonto(null);
        }}
      />
    </main>
  );
}