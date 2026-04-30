import { DashBoardHeader } from "@/app/components/dashboard/shell/dashBoardHeader";
import { EstacaoSidebar } from "@/app/components/dashboard/shell/DashBoardNav";
import { NavbarClient } from "@/app/components/Navbar/NavbarClient";
import { notFound } from "next/navigation";
import { DashboardMain } from "@/app/components/dashboard/shell/DashBoardMain";
import { headers } from "next/headers";
import { StationPublicProvider } from "./StationPublicContext";
import { canAccessStation } from "@/lib/auth/canAccessStation";
import { DashBoardHeaderUnique } from "@/app/components/dashboard/shell/dashBoardHeaderUnique";

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




export async function getStationMeta(codSta: string): Promise<{ station: StationMetaLatestData | null; latestData: StationLatestData | null; error?: string }> {
  const h = await headers();
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  const cookie = h.get("cookie");

  if (!host) {
    return { station: null, latestData: null, error: "missing_host" };
  }
  // console.log(proto, host, codSta);
  const url = `${proto}://${host}/api/stations/${encodeURIComponent(codSta)}?view=allDataWithLatest`;
  // console.log(url);
  const res = await fetch(url, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    headers: cookie ? { cookie } : {},
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    return { station: null, latestData: null, error: body?.error ?? `http_${res.status}` };
  }

  const body = (await res.json()) as { station?: StationMetaLatestData; latestData?: StationLatestData | null };
  return { station: body.station ?? null, latestData: body.latestData ?? null };
}

export default async function EstacaoLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ codSta: string }>;
}) {
  const { codSta } = await params;
  const { station, latestData, error } = await getStationMeta(codSta);
  const  access  = await canAccessStation(codSta);
  if (!access.allowed) {
    return(
      <div className="min-h-screen flex items-center justify-center flex-col gap-4">
        <h1 className="text-2xl font-bold">Acesso Negado</h1>
        <h2 className="text-lg">{access.reason}</h2>
      </div>
    );
  }

  if (!station) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4">
        <h1 className="text-2xl font-bold">Estação Não Encontrada</h1>
        <h2 className="text-lg">{access.reason}</h2>
      </div>
    );
  }

  if (error === "forbidden" || error === "unauthenticated") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <h1 className="text-2xl font-bold">Acesso Negado</h1>
      </div>
    );
  }

  if (error) {
    notFound();
  }

  const stationLabel = station.aliasSta ?? station.nomeSta ?? station.codSta;


  return (
    <div className="min-h-screen bg-slate-50 overflow-hidden">
      <nav className="mb-0 lg:mb-24">
        <NavbarClient title={`Dashboard - ${stationLabel} ${station.codSta}`} />
      </nav>


      <div className="flex flex-col lg:flex-row min-h-[calc(100vh-96px)]">
        <div className="w-full lg:w-[320px] lg:shrink-0">
          <div className="lg:sticky lg:top-24 lg:h-[calc(100vh-96px)]">
            <EstacaoSidebar
              codSta={station.codSta}
              stationLabel={stationLabel}
              capabilities={{
                hasPulsos: !!station.hasPulsos,
                hasTemp: !!station.hasTemp,
                hasUmidade: !!station.hasUmidade,
                hasLum: !!station.hasLum,
                hasPressao: !!station.hasPressao,
                hasVent: !!station.hasVent,
                hasDv: !!station.hasDv,
              }}
            />
          </div>
        </div>

        <DashboardMain
        header={
          //DashBoardHeader - DashBoardHeaderUnique
          <DashBoardHeaderUnique
            codSta={station.codSta}
            stationLabel={stationLabel}
            isPublic={!!station.is_public}
            latSta={station.latSta}
            longSta={station.longSta}
            resSta={station.resSta}
            perSta={station.perSta ?? 15}
            hasImage={!!station.hasImage}
            ts={latestData?.ts ?? null}
            tempAvg={latestData?.tempAvg ?? null}
            preAvg={latestData?.preAvg ?? null}
            umiAvg={latestData?.umiAvg ?? null}
            lumAvg={latestData?.lumAvg ?? null}
            vvAvg={latestData?.vvAvg ?? null}
            dv={latestData?.dv ?? null}
          />
        }
      >
        <StationPublicProvider value={{ stationLabel, lat: station.latSta ?? null, long: station.longSta ?? null }}>
            {children}
        </StationPublicProvider>
      </DashboardMain>
      </div>
    </div>
  );
}