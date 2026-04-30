"use client";

import { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTemperatureHalf, faDroplet, faCloudRain, faGaugeHigh, faSun } from "@fortawesome/free-solid-svg-icons";
import { formatDateBR, tempoToDate } from "@/lib/utils";

type Props = {
    codSta: string;
    nomeSta: string;
};

type LatestData = {
    ts: Date | string;
    tempAvg: number | null;
    umiAvg: number | null;
    preAvg: number | null;
    lumAvg: number | null;
    dv: number | null;
    vvAvg: number | null;
};

export default function OverviewStationCard({ codSta, nomeSta }: Props) {
    const [latest, setLatest] = useState<LatestData | null>(null);
    const [dailyRain, setDailyRain] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const fetchData = async () => {
        try {
            // Buscando o view 'allDataWithLatest'
            const res = await fetch(`/api/stations/${codSta}?view=stationAllDataWithQtdQuotes`);
            if (res.ok) {
                const data = await res.json();
                if (data.latestData) {
                    setLatest(data.latestData);
                }
            } else {
                throw new Error("Erro na requisição telemetria");
            }

            // Buscando pluvimetria do dia (24h)
            try {
                const resRain = await fetch(`/api/graphics/${encodeURIComponent(codSta)}/rain?range=day`);
                if (resRain.ok) {
                    const rainData = await resRain.json();
                    const points = rainData.points ?? [];
                    const accumulated = points.reduce((acc: number, p: any) => acc + (p.mm ?? 0), 0);
                    setDailyRain(accumulated);
                }
            } catch (err) {
                console.warn("Aviso: Falha ao carregar chuva do dia para", codSta);
            }

            setError(false);
        } catch (err) {
            console.error("Erro ao puxar station data para " + codSta, err);
            setError(true);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();

        let timeoutId: number;

        const scheduleNextRefresh = () => {
            const now = new Date();
            // Calcula arredondando para o próximo múltiplo de 15 min (900000 ms)
            const msUntilNext15Min = (15 * 60 * 1000) - (now.getTime() % (15 * 60 * 1000));
            // Adicional de segurança (10 a 30s) para garantir que a inserção de hardware no banco já tenha ocorrido
            const syncBuffer = 20000;

            timeoutId = window.setTimeout(() => {
                fetchData();
                scheduleNextRefresh();
            }, msUntilNext15Min + syncBuffer);
        };

        scheduleNextRefresh();

        return () => window.clearTimeout(timeoutId);
    }, [codSta]);

    // Função utilitária para formatação
    const formatNr = (val: number | null, unit: string) => val !== null ? `${val.toFixed(1)}${unit}` : '--';

    return (
        <div className="bg-white border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
            <div className="bg-slate-200 text-slate-800 px-5 py-3 flex justify-between items-center">
                <h3 className="font-bold text-lg truncate pr-4">{nomeSta}</h3>
                <div className="flex items-center gap-2 text-xs opacity-80">
                    <span
                        className={`w-2.5 h-2.5 rounded-full ${latest ? 'bg-green-400' : (loading ? 'bg-yellow-400' : 'bg-red-500 animate-pulse')}`}
                    ></span>
                </div>
            </div>

            <div className="p-6 flex-1 flex flex-col justify-center">
                {loading && !latest && (
                    <div className="text-center text-slate-400 animate-pulse">Carregando telemetria...</div>
                )}
                {error && !latest && (
                    <div className="text-center text-red-400">Falha na conexão</div>
                )}
                {!latest && (
                    <div className="text-center text-slate-400">Sem dados</div>
                )}

                {latest && (
                    <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                                <FontAwesomeIcon icon={faTemperatureHalf} className="text-lg" />
                            </div>
                            <div>
                                <div className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Temperatura</div>
                                <div className="text-2xl font-bold text-slate-800">{formatNr(latest.tempAvg, '°C')}</div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                <FontAwesomeIcon icon={faDroplet} className="text-lg" />
                            </div>
                            <div>
                                <div className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Umidade</div>
                                <div className="text-2xl font-bold text-slate-800">{formatNr(latest.umiAvg, '%')}</div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                                <FontAwesomeIcon icon={faCloudRain} className="text-lg" />
                            </div>
                            <div>
                                <div className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Precipitação</div>
                                <div className="text-2xl font-bold text-slate-800">{dailyRain !== null ? `${dailyRain.toFixed(1)}mm` : '--'}</div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-600">
                                <FontAwesomeIcon icon={faSun} className="text-lg" />
                            </div>
                            <div>
                                <div className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Luminosidade</div>
                                <div className="text-2xl font-bold text-slate-800">{latest.lumAvg !== null ? `${latest.lumAvg.toFixed(2)}%` : '--'}</div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 col-span-2 md:col-span-1">
                            <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-600">
                                <FontAwesomeIcon icon={faGaugeHigh} className="text-lg" />
                            </div>
                            <div>
                                <div className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Pressão</div>
                                <div className="text-2xl font-bold text-slate-800">{formatNr(latest.preAvg, 'hPa')}</div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {latest && (
                <div className="bg-slate-50 px-4 py-2 border-t border-slate-100 text-xs text-slate-500 text-right">
                    Última leitura: {formatDateBR(tempoToDate(latest.ts as string))}
                </div>
            )}
        </div>
    );
}
