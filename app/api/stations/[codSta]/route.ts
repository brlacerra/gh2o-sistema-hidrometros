import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canAccessStation } from "@/lib/auth/canAccessStation";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";

function jsonBigIntReplacer(_key: string, value: unknown) {
  return typeof value === "bigint" ? value.toString() : value;
}


const stationMeta = {
  codSta: true,
  codUsr: true,
  nomeSta: true,
  aliasSta: true,
  latSta: true,
  longSta: true,
  resSta: true,
  perSta: true,
  hasPulsos: true,
  hasTemp: true,
  hasPressao: true,
  hasUmidade: true,
  hasLum: true,
  hasVent: true,
  hasDv: true,
  hasImage: true,
  is_public: true,
  isActive: true,
} as const;

const stationAllData = {
  ...stationMeta,
  created_at: true,
  updated_at: true,
} as const;

const latestDataSelect = {
  codSta: true,
  ts: true,
  tempAvg: true,
  preAvg: true,
  umiAvg: true,
  lumAvg: true,
  vvAvg: true,
  dv: true,
  created_at: true,
} as const;

const stationAllDataWithLatest = {
  station: stationAllData,
  latestData: latestDataSelect,
} as const;

type StationView = "meta" | "allData" | "allDataWithLatest" | "stationAllDataWithQtdQuotes";
type AccessView = "access";

function normalizeView(raw: string | null): StationView | AccessView | null {
  if (!raw) return null;

  if (raw === "access") return "access";
  if (raw === "meta" || raw === "metaNoReadings") return "meta";
  if (raw === "allData") return "allData";
  if (raw === "allDataWithLatest" || raw === "full") return "allDataWithLatest";
  if (raw === "stationAllDataWithQtdQuotes") return "stationAllDataWithQtdQuotes";

  return null;
}


export async function GET(
  _req: Request,
  context: { params: Promise<{ codSta: string }> },
) {
  try {
    const { codSta } = await context.params;
    const { searchParams } = new URL(_req.url);

    const access = await canAccessStation(codSta);
    if (!access.allowed) {
      return NextResponse.json(
        { error: access.reason, station: access.station },
        { status: access.reason === "not_found" ? 404 : access.reason === "unauthenticated" ? 401 : 403 }
      );
    }


    if (!codSta) {
      return NextResponse.json({ error: "missing_codSta" }, { status: 400 });
    }

    const view = normalizeView(searchParams.get("view"));

    if (!view) {
      return NextResponse.json(
        {
          error: "invalid_view",
          allowed: ["access", "meta", "allData", "allDataWithLatest", "stationAllDataWithQtdQuotes"],
        },
        { status: 400 },
      );
    }

    if (view === "access") {
      const station = await prisma.sta.findUnique({
        where: { codSta },
        select: { codSta: true, codUsr: true, is_public: true },
      });

      return NextResponse.json({ station }, { status: 200 });
    }

    if (view === "stationAllDataWithQtdQuotes") {
      const station = await prisma.sta.findUnique({
        where: { codSta },
        select: stationAllData,
      });
      if (!station) return NextResponse.json({ error: "not_found" }, { status: 404 });

      const latestData = await prisma.data.findFirst({
        where: { codSta },
        orderBy: { ts: "desc" },
        select: stationAllDataWithLatest.latestData,
      });

      const qtd = await prisma.data.count({ where: { codSta } });

      return new NextResponse(
        JSON.stringify({ station, latestData, qtd }, jsonBigIntReplacer),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }


    const station = await prisma.sta.findUnique({
      where: { codSta },
      select: view === "meta" ? stationMeta : stationAllData,
    });

    if (!station) return NextResponse.json({ error: "not_found" }, { status: 404 });

    if (view === "meta" || view === "allData") {
      return NextResponse.json({ station }, { status: 200 });
    }

    const latestData = await prisma.data.findFirst({
      where: { codSta },
      orderBy: { ts: "desc" },
      select: stationAllDataWithLatest.latestData,
    });

    return new NextResponse(
      JSON.stringify({ station, latestData }, jsonBigIntReplacer),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}