import { redirect } from "next/navigation";
import { canAccessStation } from "@/lib/auth/canAccessStation";
import { getStationMeta } from "@/app/dashboard/estacao/[codSta]/layout";
import { NavbarClient } from "@/app/components/Navbar/NavbarClient";
import { headers } from "next/headers";
import { formatDateBR } from "@/lib/utils";
import { DownloadConfig } from "@/app/components/download/DownloadConfig";


type StationMetaLatestData = {
    codSta: string;
    nomeSta: string | null;
    aliasSta: string | null;
    hasPulsos: boolean | null;
    hasTemp: boolean | null;
    hasUmidade: boolean | null;
    hasLum: boolean | null;
    hasPressao: boolean | null;
    hasVent: boolean | null;
    hasDv: boolean | null;
    is_public: boolean | null;
    resSta: number | null;
    perSta: number | null;
    hasImage: boolean | null;
    latSta: number | null;
    longSta: number | null;
    created_at: Date;
};

type StationLatestData = {
    ts: string | null;
    tempAvg: number | null;
    preAvg: number | null;
    umiAvg: number | null;
    lumAvg: number | null;
    vvAvg: number | null;
    dv: number | null;
};



export default async function DownloadPage({
    params,
}: {
    params: Promise<{ codSta: string }>;
}
) {
    const { codSta } = await params;
    const access = await canAccessStation(codSta);
    if (!access.allowed) {
        return (
            <div className="min-h-screen flex items-center justify-center flex-col gap-4">
                <h1 className="text-2xl font-bold">Acesso Negado</h1>
                <h2 className="text-lg">{access.reason}</h2>
            </div>
        );
    }

    async function getStationMeta(codSta: string): Promise<{ station: StationMetaLatestData | null; latestData: StationLatestData | null; qtd: number | null; error?: string }> {
        const h = await headers();
        const host = h.get("host");
        const proto = h.get("x-forwarded-proto") ?? "http";
        const cookie = h.get("cookie");

        if (!host) {
            return { station: null, latestData: null, qtd: null, error: "missing_host" };
        }
        const url = `${proto}://${host}/api/stations/${encodeURIComponent(codSta)}?view=stationAllDataWithQtdQuotes`;
        const res = await fetch(url, {
            method: "GET",
            credentials: "include",
            cache: "no-store",
            headers: cookie ? { cookie } : {},
        });

        if (!res.ok) {
            const body = await res.json().catch(() => null);
            return { station: null, latestData: null, qtd: null, error: body?.error ?? `http_${res.status}` };
        }

        const body = (await res.json()) as { station?: StationMetaLatestData; latestData?: StationLatestData | null; qtd?: number | null };
        return { station: body.station ?? null, latestData: body.latestData ?? null, qtd: body.qtd ?? null };
    }

    const { station, latestData, qtd, error } = await getStationMeta(codSta);
    if (!station) {
        return (
            <div className="min-h-screen flex items-center justify-center flex-col gap-4">
                <h1 className="text-2xl font-bold">Estação Não Encontrada</h1>
                <h2 className="text-lg">{error}</h2>
            </div>
        )
    }
    const data = new Date(station.created_at);
    return (
        <>
            <NavbarClient title={`Download - ${station.nomeSta ?? station.aliasSta ?? station.codSta}`} />
            <section className="mt-28 px-4 md:px-10">
                <div className="w-full max-w-6xl mx-auto flex flex-col md:flex-row gap-6">
                    <div className="w-full md:w-1/3 border shadow-md border-slate-200">
                        <div className="p-3 border-b border-slate-200 font-semibold">Dados da estação</div>
                        <div className="flex gap-2 flex-col p-3 border-b border-slate-200">
                            <div className="font-semibold mb-3">Dados Básicos</div>
                            <div className="font-semibold">ID: <span className="font-normal">{station.codSta ?? "-"}</span></div>
                            <div className="font-semibold">Nome: <span className="font-normal">{station.nomeSta ?? "-"}</span></div>
                            <div className="font-semibold">Alias: <span className="font-normal">{station.aliasSta ?? "-"}</span></div>
                            <div className="font-semibold">Latitude: <span className="font-normal">{station.latSta ?? "-"}</span></div>
                            <div className="font-semibold">Longitude: <span className="font-normal">{station.longSta ?? "-"}</span></div>
                            {station.is_public ? (
                                <div className="font-semibold text-[var(--color-gh2ogreen)]">Essa estação é pública</div>
                            ) : (
                                <div className="font-semibold text-[var(--color-gh2oblue)]">Essa estação é privada</div>
                            )}
                        </div>
                        <div className="flex gap-2 flex-col p-3 border-b border-slate-200">
                            <div className="font-semibold mb-3">Sensores</div>
                            <div className="font-semibold">Pluviometro: <span className="font-normal">{station.hasPulsos ? "Sim" : "Não"}</span></div>
                            <div className="font-semibold">Temperatura: <span className="font-normal">{station.hasTemp ? "Sim" : "Não"}</span></div>
                            <div className="font-semibold">Umidade: <span className="font-normal">{station.hasUmidade ? "Sim" : "Não"}</span></div>
                            <div className="font-semibold">Luminosidade: <span className="font-normal">{station.hasLum ? "Sim" : "Não"}</span></div>
                            <div className="font-semibold">Pressão: <span className="font-normal">{station.hasPressao ? "Sim" : "Não"}</span></div>
                            <div className="font-semibold">Velocidade do Vento: <span className="font-normal">{station.hasVent ? "Sim" : "Não"}</span></div>
                            <div className="font-semibold">Direção do Vento: <span className="font-normal">{station.hasDv ? "Sim" : "Não"}</span></div>
                        </div>
                        <div className="flex gap-2 flex-col p-3">
                            <div className="font-semibold mb-3">Coleta de Dados</div>
                            <div className="font-semibold">Frequencia de leitura: <span className="font-normal">{station.perSta ?? "-"}min</span></div>
                            <div className="font-semibold">Dados lidos: <span className="font-normal">{qtd ?? "-"}</span></div>
                            <div className="font-semibold">Data de Início: <span className="font-normal">{formatDateBR(data) ?? "-"}</span></div>
                        </div>

                    </div>

                    <div className="w-full md:w-2/3 md:h-[80vh] flex">
                        <DownloadConfig station={station} />
                    </div>
                </div>

            </section>
        </>
    );
}