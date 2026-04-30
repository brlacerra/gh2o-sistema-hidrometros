"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes, faCheck, faPlus } from "@fortawesome/free-solid-svg-icons";
import { StationPermitted } from "./OverviewClient";

type Props = {
    isOpen: boolean;
    onClose: () => void;
    availableStations: StationPermitted[];
    selectedStations: StationPermitted[];
    onToggleStation: (station: StationPermitted) => void;
};

export default function StationSelectorModal({ isOpen, onClose, availableStations, selectedStations, onToggleStation }: Props) {
    if (!isOpen) return null;

    const isSelected = (codSta: string) => selectedStations.some(s => s.codSta === codSta);

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]">
                <div className="flex justify-between items-center p-5 border-b border-slate-100">
                    <h2 className="text-xl font-semibold text-slate-800">Selecionar Estações</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition">
                        <FontAwesomeIcon icon={faTimes} className="text-xl" />
                    </button>
                </div>

                <div className="p-2 overflow-y-auto flex-1 bg-slate-50">
                    {availableStations.length === 0 ? (
                        <div className="text-center p-8 text-slate-500">Nenhuma estação disponível.</div>
                    ) : (
                        <ul className="space-y-2 p-2">
                            {availableStations.map(sta => {
                                const selected = isSelected(sta.codSta);
                                return (
                                    <li
                                        key={sta.codSta}
                                        onClick={() => onToggleStation(sta)}
                                        className={`flex items-center justify-between p-4 border cursor-pointer transition ${selected ? 'border-[var(--color-gh2ogreen)] bg-sky-50' : 'border-slate-200 bg-white hover:border-[var(--color-gh2oblue)]'
                                            }`}
                                    >
                                        <div>
                                            <p className="font-semibold text-slate-800">{sta.nomeSta}</p>
                                            <p className="text-xs text-slate-500">ID: {sta.codSta}</p>
                                        </div>
                                        <div className={`w-8 h-8 flex items-center justify-center ${selected ? 'bg-[var(--color-gh2ogreen)] text-white' : 'bg-slate-100 text-slate-400'
                                            }`}>
                                            <FontAwesomeIcon icon={selected ? faCheck : faPlus} />
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>

                <div className="p-5 border-t border-slate-100 bg-white flex justify-between items-center">
                    <span className="text-sm text-slate-500 font-medium">
                        {selectedStations.length} de máx 6 selecionadas
                    </span>
                    <button
                        onClick={onClose}
                        className="bg-sky-600 hover:bg-sky-700 text-white px-6 py-2  font-semibold transition"
                    >
                        Concluído
                    </button>
                </div>
            </div>
        </div>
    );
}
