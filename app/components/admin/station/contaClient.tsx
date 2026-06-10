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
    role: "admin" | "user" | "owner_no_login" | "viewer";
    latMap?: number | null;
    longMap?: number | null;
    zoomMap?: number | null;
    created_at?: Date | null;
};

type Property = {
    codProp: string;
    nomeProp: string;
    cidadeProp: string | null;
    ufProp: string | null;
    geojsonProp?: any;
    centroLng?: number | null;
    centroLat?: number | null;
    created_at: Date;
    updated_at: Date;
}

export function ContaClient(
    { stationsProperties, userProperties, propertyProperties }:
        { stationsProperties: Station[]; userProperties: User; propertyProperties: Property | null }
) {
    const router = useRouter();
    return (
        <div className="w-full max-w-6xl mx-auto flex flex-col md:flex-row gap-6">
            <div className="w-full md:w-1/2 shadow-md p-6">
                <div className="text-xl font-semibold mb-2">Informações de conta</div>
                <div className="w-full flex flex-col gap-4 md:flex-row gap-6 pb-4">
                    {userProperties?.latMap ?
                        <>
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
                        </>
                        :
                        <div className="w-full border border-slate-200 p-4 shadow-md">
                            <div className="mb-2"><span className="font-semibold text-lg">Informações de usuário</span></div>
                            <div className="mb-2"><span className="font-semibold">Nome:</span> {userProperties.nomeUsr || "N/A"}</div>
                            <div className="mb-2"><span className="font-semibold">Email:</span> {userProperties.emailUsr}</div>
                            <div className="mb-2"><span className="font-semibold">Role:</span> {userProperties.role}</div>
                            <div className="mb-2"><span className="font-semibold">Data de criação:</span> {userProperties.created_at ? formatDateBR(userProperties.created_at) : "N/A"}</div>
                        </div>
                    }
                </div>
                <div className="w-full min-h-[340px] flex flex-col mt-4 md:mt-0">
                    <div className="text-xl font-semibold mb-2">Detalhes do mapa</div>
                    <div className="flex-1">
                        {propertyProperties?.geojsonProp ?
                            <StationMap
                                initialViewState={{
                                    latitude: propertyProperties.centroLat ? Number(propertyProperties.centroLat) : 0,
                                    longitude: propertyProperties.centroLng ? Number(propertyProperties.centroLng) : 0,
                                    zoom: 10,
                                }}
                                position={null}
                                className="min-h-[300px] h-full"
                                propertyGeojson={propertyProperties.geojsonProp}
                                propertyPopupNode={
                                    <div className="text-xs text-slate-800 flex flex-col gap-1 min-w-[160px]">
                                        <div className="font-semibold text-sm mb-1 border-b pb-1">Informações da propriedade</div>
                                        <div><span className="font-semibold">Nome:</span> {propertyProperties?.nomeProp || "N/A"}</div>
                                        <div><span className="font-semibold">Cidade:</span> {propertyProperties?.cidadeProp || "N/A"}</div>
                                        <div><span className="font-semibold">UF:</span> {propertyProperties?.ufProp || "N/A"}</div>
                                        <div><span className="font-semibold">CentroLng:</span> {propertyProperties?.centroLng?.toString() || "N/A"}</div>
                                        <div><span className="font-semibold">CentroLat:</span> {propertyProperties?.centroLat?.toString() || "N/A"}</div>
                                    </div>
                                }
                            /> :
                            <div className="flex-1 min-h-[300px] h-full border border-slate-200 p-4 shadow-md">
                                <div className="text-xl font-semibold mb-2">Informações da propriedade</div>
                                <div className="flex-1">
                                    <div className="mb-2"><span className="font-semibold">Nome:</span> {propertyProperties?.nomeProp || "N/A"}</div>
                                    <div className="mb-2"><span className="font-semibold">Cidade:</span> {propertyProperties?.cidadeProp || "N/A"}</div>
                                    <div className="mb-2"><span className="font-semibold">UF:</span> {propertyProperties?.ufProp || "N/A"}</div>
                                    <div className="mb-2"><span className="font-semibold">CentroLng:</span> {propertyProperties?.centroLng?.toString() || "N/A"}</div>
                                    <div className="mb-2"><span className="font-semibold">CentroLat:</span> {propertyProperties?.centroLat?.toString() || "N/A"}</div>
                                </div>
                            </div>
                        }
                    </div>
                </div>
            </div>
            <div className="w-full md:w-1/2 bg-white shadow-md p-6 overflow-auto">
                <div className="text-xl font-semibold mb-2">Hidrometros associados</div>
                <div className="w-full flex flex-col gap-4">
                    {stationsProperties.length === 0 ? (
                        <div className="text-gray-500">Nenhum hidrometro associado.</div>
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