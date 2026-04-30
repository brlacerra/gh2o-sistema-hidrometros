"use client";

import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faPlay, faTrash } from "@fortawesome/free-solid-svg-icons";
import StationSelectorModal from "./StationSelectorModal";
import OverviewKiosk from "./OverviewKiosk";

export type StationPermitted = {
    codSta: string;
    nomeSta: string;
    is_public: boolean;
    codUsr: string;
    isActive: boolean;
}

interface OverviewClientProps {
    targetCodUsr: string;
}

export default function OverviewClient({ targetCodUsr }: OverviewClientProps) {
    const [availableStations, setAvailableStations] = useState<StationPermitted[]>([]);
    const [selectedStations, setSelectedStations] = useState<StationPermitted[]>([]);
    const [loading, setLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isKioskOpen, setIsKioskOpen] = useState(false);

    const fetchStations = async () => {
        try {
            const res = await fetch(`/api/overview/${targetCodUsr}`);
            if (!res.ok) throw new Error("Falha ao buscar estações disponíveis");
            const data = await res.json();
            setAvailableStations(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStations();
    }, [targetCodUsr]);

    const toggleStation = (station: StationPermitted) => {
        setSelectedStations(prev => {
            const isInside = prev.some(s => s.codSta === station.codSta);
            if (isInside) {
                return prev.filter(s => s.codSta !== station.codSta);
            } else {
                if (prev.length >= 6) return prev; // limit to 6
                return [...prev, station];
            }
        });
    };

    const removeStation = (codSta: string) => {
        setSelectedStations(prev => prev.filter(s => s.codSta !== codSta));
    };

    if (loading) {
        return <div className="text-slate-500 animate-pulse text-lg mt-6">Carregando permissões da rede...</div>;
    }

    return (
        <div>
            {/* Builder Toolbar */}
            <div className="flex bg-white p-4 border border-slate-200 shadow-sm justify-between items-center mb-8">
                <div>
                    <h2 className="font-semibold text-slate-800">Selecione até 6 estações para compor o seu painel</h2>
                    <p className="text-xs text-slate-500 mt-1">Essas estações dividirão a tela principal do Kiosk dinamicamente.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="bg-gray-200 hover:bg-gray-300 text-slate-700 border border-slate-300 font-medium px-4 py-2 transition items-center gap-2 flex shadow-sm"
                    >
                        <FontAwesomeIcon icon={faPlus} />
                        Gerenciar
                    </button>
                    {selectedStations.length > 0 && (
                        <button
                            onClick={() => setIsKioskOpen(true)}
                            className="bg-[var(--color-gh2ogreen)] hover:bg-emerald-600 text-white font-semibold px-6 py-2 transition items-center gap-2 flex shadow-md"
                        >
                            <FontAwesomeIcon icon={faPlay} />
                            Iniciar Overview
                        </button>
                    )}
                </div>
            </div>

            {/* Layout Preview Grid */}
            {selectedStations.length > 0 ? (
                <div>
                    <div className="mb-4">
                        <span className="text-sm font-semibold uppercase tracking-wide text-slate-500">Amostra do Layout ({selectedStations.length}/6)</span>
                    </div>
                    {/* Exibe num formato que lembre o grid do Kiosk, aqui simplificado */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {selectedStations.map((sta, idx) => (
                            <div key={sta.codSta} className="border-2 border-dashed border-slate-300 bg-white/50 p-6 flex flex-col items-center justify-center relative group min-h-[150px]">
                                <span className="absolute top-3 left-4 text-slate-300 font-black text-xl">0{idx + 1}</span>
                                <h3 className="font-bold text-slate-700 text-center">{sta.nomeSta}</h3>
                                <p className="text-xs text-slate-400 mt-1">{sta.codSta}</p>

                                <button
                                    onClick={() => removeStation(sta.codSta)}
                                    className="absolute top-3 right-3 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"
                                    title="Remover"
                                >
                                    <FontAwesomeIcon icon={faTrash} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="border-2 border-dashed border-slate-300 h-64 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-300 text-2xl mb-4">
                        <FontAwesomeIcon icon={faPlus} />
                    </div>
                    <p className="font-medium text-slate-600">O seu painel está vazio</p>
                    <p className="text-sm text-slate-500 mt-1">Clique em Gerenciar para adicionar as estações</p>
                </div>
            )}

            <StationSelectorModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                availableStations={availableStations}
                selectedStations={selectedStations}
                onToggleStation={toggleStation}
            />

            {/* Renderiza o Kiosk Fullscreen por cima de tudo se ativo */}
            <OverviewKiosk
                open={isKioskOpen}
                onClose={() => setIsKioskOpen(false)}
                stations={selectedStations}
                siteUrl={typeof window !== "undefined" ? window.location.href : ""}
            />
        </div>
    );
}
