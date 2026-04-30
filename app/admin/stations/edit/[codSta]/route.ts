import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

type StationPatchPayload = {
  codSta?: unknown;
  codUsr?: unknown;
  ownerCodUsr?: unknown;
  nomeSta?: unknown;
  aliasSta?: unknown;
  resSta?: unknown;
  perSta?: unknown;
  is_public?: unknown;
  isActive?: unknown;
  hasPulsos?: unknown;
  hasTemp?: unknown;
  hasPressao?: unknown;
  hasUmidade?: unknown;
  hasLum?: unknown;
  hasVent?: unknown;
  hasDv?: unknown;
  latSta?: unknown;
  longSta?: unknown;
};

function jsonBigIntReplacer(_key: string, value: unknown) {
  return typeof value === "bigint" ? value.toString() : value;
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ codSta: string }> },
) {
  try {
    const { codSta } = await context.params;

    if (!codSta) {
      return NextResponse.json({ error: "missing_codSta" }, { status: 400 });
    }

    const me = await getCurrentUser();
    if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (me.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const form = await req.formData();
    const payloadRaw = form.get("payload");
    const image = form.get("image");

    if (typeof payloadRaw !== "string") {
      return NextResponse.json({ error: "missing_payload" }, { status: 400 });
    }

    const payload = JSON.parse(payloadRaw) as StationPatchPayload;

    // ignore silently (read-only)
    delete payload.codSta;
    delete payload.codUsr;
    delete payload.ownerCodUsr;

    const stationExists = await prisma.sta.findUnique({
      where: { codSta },
      select: { codSta: true },
    });
    if (!stationExists) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const updated = await prisma.sta.update({
      where: { codSta },
      data: {
        nomeSta: typeof payload.nomeSta === "string" ? payload.nomeSta : undefined,
        aliasSta:
          payload.aliasSta === null || typeof payload.aliasSta === "string"
            ? payload.aliasSta
            : undefined,
        resSta: payload.resSta !== undefined ? Number(payload.resSta) : undefined,
        perSta: payload.perSta !== undefined ? Number(payload.perSta) : undefined,
        is_public: payload.is_public !== undefined ? Boolean(payload.is_public) : undefined,
        isActive: payload.isActive !== undefined ? Boolean(payload.isActive) : undefined,

        hasPulsos: payload.hasPulsos !== undefined ? Boolean(payload.hasPulsos) : undefined,
        hasTemp: payload.hasTemp !== undefined ? Boolean(payload.hasTemp) : undefined,
        hasPressao: payload.hasPressao !== undefined ? Boolean(payload.hasPressao) : undefined,
        hasUmidade: payload.hasUmidade !== undefined ? Boolean(payload.hasUmidade) : undefined,
        hasLum: payload.hasLum !== undefined ? Boolean(payload.hasLum) : undefined,
        hasVent: payload.hasVent !== undefined ? Boolean(payload.hasVent) : undefined,
        hasDv: payload.hasDv !== undefined ? Boolean(payload.hasDv) : undefined,

        latSta: payload.latSta !== undefined ? Number(payload.latSta) : undefined,
        longSta: payload.longSta !== undefined ? Number(payload.longSta) : undefined,
      },
      select: {
        codSta: true,
        nomeSta: true,
        aliasSta: true,
        latSta: true,
        longSta: true,
        resSta: true,
        perSta: true,
        is_public: true,
        isActive: true,
        hasPulsos: true,
        hasTemp: true,
        hasPressao: true,
        hasUmidade: true,
        hasLum: true,
        hasVent: true,
        hasDv: true,
        hasImage: true,
        codUsr: true,
        updated_at: true,
      },
    });

    let savedImage = false;
    if (image instanceof File && image.size > 0) {
      const bytes = await image.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const stationsDir = path.join(process.cwd(), "public", "stations");
      await mkdir(stationsDir, { recursive: true });

      const filePath = path.join(stationsDir, `${codSta}.jpg`);
      await writeFile(filePath, buffer);

      await prisma.sta.update({
        where: { codSta },
        data: { hasImage: true },
      });

      savedImage = true;
    }

    return new NextResponse(
      JSON.stringify({ station: updated, savedImage }, jsonBigIntReplacer),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}