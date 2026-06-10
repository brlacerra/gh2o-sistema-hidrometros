"use client";

import { useEffect, useMemo, useState } from "react";
import FullScreenMap from "./components/mapa/FullScreenMap";
import { Ponto } from "@/lib/utils";
import { NavbarClient } from "@/app/components/Navbar/NavbarClient";
import { LeftFilters } from "@/app/components/mapa/LeftFilters/LeftFilters";
import { RightSidebar } from "@/app/components/mapa/RightSideBar/RightSideBar";
import { hidrometrosToPontos, type HidroApiResponse } from "@/lib/mappers/hidroToPontos";



export default function HomePage() {
  const [selectedPonto, setSelectedPonto] = useState<Ponto | null>(null);
  const [focusPonto, setFocusPonto] = useState<Ponto | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [pontos, setPontos] = useState<Ponto[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadHidrometros() {
      const res = await fetch("/api/hidrometros", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch /api/hidrometros");
      const json = (await res.json()) as HidroApiResponse;

      if (cancelled) return;
      setPontos(hidrometrosToPontos(json.data));
    }

    loadHidrometros().catch(console.error);

    return () => {
      cancelled = true;
    };
  }, []);

  const pontosFiltrados = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return pontos.filter(p => {
      if (!term) return true;
      return p.descricao?.toLowerCase().includes(term) || p.id.toLowerCase().includes(term);
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

      <NavbarClient title="Sistema de Monitoramento de Hidrômetros" />

      <LeftFilters
        allPoints={pontos}
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