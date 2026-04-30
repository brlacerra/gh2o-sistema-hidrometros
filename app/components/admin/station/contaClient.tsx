"use client";

import { useRouter } from "next/navigation";
import "maplibre-gl/dist/maplibre-gl.css";
import { formatDateBR } from "@/lib/utils";
import { StationMap } from "@/app/components/admin/station/StationMap";

type Station = {
    codSta: string | null;
    nomeSta: string | null;
    aliasSta: string | null;
}
type User = {
  codUsr: string;
  emailUsr: string;
  nomeUsr?: string | null;
  role: "admin" | "user";
  latMap?: number | null;
  longMap?: number | null;
  zoomMap?: number | null;
  created_at?: Date | null;
};

export function ContaClient(
    { stationsProperties, userProperties }:
        { stationsProperties: Station[]; userProperties: User }
) {
    const router = useRouter();
    return (
        <div className="w-full max-w-6xl mx-auto flex flex-col md:flex-row gap-6">
            <div className="w-full md:w-1/2 shadow-md p-6">
                <div className="text-xl font-semibold mb-2">Informações de conta</div>
                <div className="w-full flex flex-col gap-4 md:flex-row gap-6 pb-4">
                    <div className="w-full md:w-1/2 border border-slate-200 p-4 shadow-md">
                        <div className="mb-2"><span className="font-semibold text-lg">Informações de usuário</span></div>
                        <div className="mb-2"><span className="font-semibold">Nome:</span> {userProperties.nomeUsr || "N/A"}</div>
                        <div className="mb-2"><span className="font-semibold">Email:</span> {userProperties.emailUsr}</div>
                        <div className="mb-2"><span className="font-semibold">Role:</span> {userProperties.role}</div>
                        <div className="mb-2"><span className="font-semibold">Data de criação:</span> {userProperties.created_at ? formatDateBR(userProperties.created_at) : "N/A"}</div>
                    </div>
                    <div className="w-full md:w-1/2 border border-slate-200 p-4 shadow-md">
                        <div className="mb-2"><span className="font-semibold text-lg">Informações de mapa</span></div>
                        <div className="mb-2"><span className="font-semibold">Latitude:</span> {userProperties.latMap?.toString() || "N/A"}</div>
                        <div className="mb-2"><span className="font-semibold">Longitude:</span> {userProperties.longMap?.toString() || "N/A"}</div>
                        <div className="mb-2"><span className="font-semibold">Zoom:</span> {userProperties.zoomMap?.toString() || "N/A"}</div>
                    </div>
                </div>
                    <div className="w-full min-h-[340px] flex flex-col mt-4 md:mt-0">
                        <div className="text-xl font-semibold mb-2">Visualização Inicial</div> 
                        <div className="flex-1">
                            <StationMap
                                initialViewState={{
                                    latitude: userProperties.latMap ? Number(userProperties.latMap) : 0,
                                    longitude: userProperties.longMap ? Number(userProperties.longMap) : 0,
                                    zoom: userProperties.zoomMap ? Number(userProperties.zoomMap) : 2,
                                }}
                                position={null}
                                className="min-h-[300px] h-full"
                            />
                        </div>
                    </div>
            </div>
            <div className="w-full md:w-1/2 bg-white shadow-md p-6 overflow-auto">
                <div className="text-xl font-semibold mb-2">Estações associadas</div>
                <div className="w-full flex flex-col gap-4">
                    {stationsProperties.length === 0 ? (
                        <div className="text-gray-500">Nenhuma estação associada.</div>
                    ) : (
                        stationsProperties.map((sta) => (
                            <div
                                key={sta.codSta || undefined}
                                className="border border-slate-200 p-4 shadow-md cursor-pointer hover:bg-slate-50"
                                onClick={() => {
                                    if (!sta.codSta) return;
                                    router.push(`/dashboard/estacao/${encodeURIComponent(sta.codSta)}`);
                                }}
                            >
                                <div className="mb-1"><span className="font-semibold">Código:</span> {sta.codSta || "N/A"}</div>
                                <div className="mb-1"><span className="font-semibold">Nome:</span> {sta.nomeSta || "N/A"}</div>
                                <div className="mb-1"><span className="font-semibold">Alias:</span> {sta.aliasSta || "N/A"}</div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}