"use client";

import { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGripVertical, faCircleNotch, faEye, faDownload, faFileCsv, faFileCode, faTimes } from "@fortawesome/free-solid-svg-icons";

export type FieldDef = {
    id: string;
    label: string;
    enabled: boolean;
};

type DownloadConfigProps = {
    station: {
        codSta: string;
        hasPulsos: boolean | null;
        hasTemp: boolean | null;
        hasUmidade: boolean | null;
        hasLum: boolean | null;
        hasPressao: boolean | null;
        hasVent: boolean | null;
        hasDv: boolean | null;
    };
};

const getInitialFields = (station: DownloadConfigProps["station"]): FieldDef[] => {
    const fields: FieldDef[] = [
        { id: "ts", label: "Data/Hora", enabled: true }
    ];
    if (station.hasTemp) fields.push({ id: "tempAvg", label: "tempAvg", enabled: true });
    if (station.hasUmidade) fields.push({ id: "umiAvg", label: "umiAvg", enabled: true });
    if (station.hasPressao) fields.push({ id: "preAvg", label: "preAvg", enabled: true });
    if (station.hasLum) fields.push({ id: "lumAvg", label: "lumAvg", enabled: true });
    if (station.hasVent) fields.push({ id: "vvAvg", label: "vvAvg", enabled: true });
    if (station.hasDv) fields.push({ id: "dv", label: "dv", enabled: true });
    if (station.hasPulsos) fields.push({ id: "pulsos", label: "pulsos", enabled: true });
    return fields;
};

export function DownloadConfig({ station }: DownloadConfigProps) {
    const [isMounted, setIsMounted] = useState(false);
    const [fields, setFields] = useState<FieldDef[]>([]);
    const [format, setFormat] = useState<"csv" | "json">("csv");
    const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");
    const [showModal, setShowModal] = useState(false);
    const [previewData, setPreviewData] = useState<string>("");
    const [startDate, setStartDate] = useState<string>("");
    const [endDate, setEndDate] = useState<string>("");

    useEffect(() => {
        setIsMounted(true);
        setFields(getInitialFields(station));
    }, [station]);

    const handleDragEnd = (result: DropResult) => {
        if (!result.destination) return;
        const items = Array.from(fields);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);
        setFields(items);
        setStatus("idle"); // reset state if they change something
    };

    const toggleField = (id: string) => {
        setFields(fields.map(f => f.id === id ? { ...f, enabled: !f.enabled } : f));
        setStatus("idle");
    };

    const handleGenerate = async () => {
        setStatus("loading");

        try {
            const enabledFields = fields.filter(f => f.enabled);
            const reqBody = {
                stationId: station.codSta,
                format,
                fields: enabledFields.map(f => f.id),
                startDate,
                endDate
            };

            const res = await fetch(`/api/stations/${station.codSta}/download`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(reqBody)
            });

            if (!res.ok) {
                console.error("Failed to fetch data");
                setStatus("idle");
                return;
            }

            const jsonResponse = await res.json();

            let resultData = "";
            if (format === "csv") {
                const header = enabledFields.map(f => f.label).join(",");

                const rows = jsonResponse.map((row: any) => {
                    return enabledFields.map(f => {
                        if (f.id === "ts") {
                            const ms = Number(row[f.id]) * 1000;
                            const d = new Date(ms);
                            return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "medium" }).format(d);
                        }
                        return row[f.id] != null ? row[f.id] : "";
                    }).join(",");
                });

                resultData = [header, ...rows].join("\n");
            } else {
                const formattedJson = jsonResponse.map((row: any) => {
                    const newRow: any = {};
                    enabledFields.forEach(f => {
                        if (f.id === "ts") {
                            const ms = Number(row[f.id]) * 1000;
                            const d = new Date(ms);
                            newRow[f.label || f.id] = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "medium" }).format(d);
                        } else {
                            newRow[f.label || f.id] = row[f.id];
                        }
                    });
                    return newRow;
                });
                resultData = JSON.stringify(formattedJson, null, 2);
            }

            setPreviewData(resultData);
            setStatus("success");
        } catch (error) {
            console.error(error);
            setStatus("idle");
        }
    };

    const handleDownload = () => {
        const blob = new Blob([previewData], { type: format === "csv" ? "text/csv;charset=utf-8;" : "application/json;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `estacao_${station.codSta}_dados.${format}`);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (!isMounted) return <div className="p-8 w-full md:w-2/3 border shadow flex items-center justify-center text-slate-500">Montando UI...</div>;

    return (
        <div className="w-full h-full bg-white shadow-md border border-slate-200 flex flex-col relative overflow-hidden">
            <div className="p-4 border-b border-slate-200">
                <h2 className="text-xl font-bold">Configurar Download</h2>
                <p className="text-sm">Escolha o período, formato e arraste as colunas para reordená-las.</p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">

                {/* Período */}
                <div>
                    <h3 className="font-semibold mb-3">Período dos Dados</h3>
                    <div className="flex gap-4 flex-col md:flex-row">
                        <div className="flex-1">
                            <label className="block text-sm font-medium mb-1">Data/Hora Inicial</label>
                            <input
                                type="datetime-local"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full p-3 border border-slate-300 rounded focus:ring-2 focus:ring-[var(--color-gh2oblue)] focus:border-transparent outline-none"
                            />
                        </div>
                        <div className="flex-1">
                            <label className="block text-sm font-medium mb-1">Data/Hora Final</label>
                            <input
                                type="datetime-local"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full p-3 border border-slate-300 rounded focus:ring-2 focus:ring-[var(--color-gh2oblue)] focus:border-transparent outline-none"
                            />
                        </div>
                    </div>
                </div>

                <div>
                    <h3 className="font-semibold mb-3">Formato do Arquivo</h3>
                    <div className="flex gap-4">
                        <button
                            onClick={() => { setFormat("csv"); setStatus("idle"); }}
                            className={`flex-1 p-4 border flex items-center justify-center gap-2 transition-all ${format === "csv" ? "border-[var(--color-gh2oblue)] bg-[var(--color-gh2oblue)]/10 text-[var(--color-gh2oblue)] ring-2 ring-[var(--color-gh2oblue)]/30" : "border-slate-200 hover:border-slate-300"}`}
                        >
                            <FontAwesomeIcon icon={faFileCsv} className="text-xl" />
                            <span className="font-semibold">CSV</span>
                        </button>
                        <button
                            onClick={() => { setFormat("json"); setStatus("idle"); }}
                            className={`flex-1 p-4 border flex items-center justify-center gap-2 transition-all ${format === "json" ? "border-[var(--color-gh2oblue)] bg-[var(--color-gh2oblue)]/10 text-[var(--color-gh2oblue)] ring-2 ring-[var(--color-gh2oblue)]/30" : "border-slate-200 hover:border-slate-300"}`}
                        >
                            <FontAwesomeIcon icon={faFileCode} className="text-xl" />
                            <span className="font-semibold">JSON</span>
                        </button>
                    </div>
                </div>

                {/* Colunas DND */}
                <div>
                    <h3 className="font-semibold mb-3">Colunas e Ordenação</h3>
                    <DragDropContext onDragEnd={handleDragEnd}>
                        <Droppable droppableId="fieldsList" direction="horizontal">
                            {(provided) => (
                                <div
                                    className="bg-slate-50 border border-slate-200 p-4 min-h-[100px] flex gap-2 flex-wrap"
                                    {...provided.droppableProps}
                                    ref={provided.innerRef}
                                >
                                    {fields.map((field, index) => (
                                        <Draggable key={field.id} draggableId={field.id} index={index}>
                                            {(provided, snapshot) => (
                                                <div
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    className={`flex-shrink-0 flex items-center justify-between min-w-[160px] gap-2 p-3 border rounded transition-colors ${snapshot.isDragging ? "bg-white border-[var(--color-gh2oblue)] shadow-md ring-2 ring-[var(--color-gh2oblue)]/30" : "bg-white border-slate-200 hover:border-slate-300"}`}
                                                >
                                                    <div {...provided.dragHandleProps} className="opacity-50 hover:opacity-100 cursor-grab">
                                                        <FontAwesomeIcon icon={faGripVertical} />
                                                    </div>

                                                    <label htmlFor={`field-${field.id}`} className="flex-1 font-medium cursor-pointer select-none text-center">
                                                        {field.label}
                                                    </label>

                                                    <input
                                                        type="checkbox"
                                                        id={`field-${field.id}`}
                                                        checked={field.enabled}
                                                        onChange={() => toggleField(field.id)}
                                                        className="w-4 h-4 border-slate-300 text-[var(--color-gh2oblue)] focus:ring-[var(--color-gh2oblue)] cursor-pointer"
                                                    />
                                                </div>
                                            )}
                                        </Draggable>
                                    ))}
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>
                    </DragDropContext>
                </div>

            </div>

            {/* Footer / Ações */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-col gap-3">
                {status !== "success" ? (
                    <button
                        onClick={handleGenerate}
                        disabled={status === "loading" || fields.filter(f => f.enabled).length === 0}
                        className="w-full bg-[var(--color-gh2ogreen)] hover:opacity-90 text-white font-semibold py-3 px-4 transition-opacity flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-md"
                    >
                        {status === "loading" ? (
                            <>
                                <FontAwesomeIcon icon={faCircleNotch} className="animate-spin" />
                                <span>Gerando Arquivo...</span>
                            </>
                        ) : (
                            "Gerar Arquivo"
                        )}
                    </button>
                ) : (
                    <div className="flex gap-3">
                        <button
                            onClick={() => setShowModal(true)}
                            className="flex-1 bg-white border border-slate-300 hover:bg-slate-50 font-semibold py-3 px-4 transition-colors flex items-center justify-center gap-2 shadow-sm"
                        >
                            <FontAwesomeIcon icon={faEye} />
                            <span>Visualizar</span>
                        </button>
                        <button
                            onClick={handleDownload}
                            className="flex-1 bg-[var(--color-gh2ogreen)] hover:opacity-90 text-white font-semibold py-3 px-4 transition-opacity flex items-center justify-center gap-2 shadow-sm"
                        >
                            <FontAwesomeIcon icon={faDownload} />
                            <span>Download {format.toUpperCase()}</span>
                        </button>
                    </div>
                )}
            </div>

            {showModal && (
                <div className="absolute inset-0 z-50 flex items-start justify-center bg-black/50 p-4">
                    <div className="bg-white shadow-2xl w-full max-w-2xl max-h-[90%] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-4 border-b border-slate-200">
                            <h3 className="text-xl font-bold">Visualização Prévia ({format.toUpperCase()})</h3>
                            <button onClick={() => setShowModal(false)} className="opacity-50 hover:opacity-100 w-8 h-8 flex items-center justify-center hover:bg-slate-100 transition-colors">
                                <FontAwesomeIcon icon={faTimes} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-auto bg-slate-800 p-4">
                            <pre className="text-sm font-mono text-green-400 whitespace-pre-wrap break-all">
                                {previewData}
                            </pre>
                        </div>
                        <div className="p-4 border-t border-slate-200 flex justify-end">
                            <button onClick={() => setShowModal(false)} className="bg-slate-200 hover:bg-slate-300 font-semibold py-2 px-6 transition-colors rounded">
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
