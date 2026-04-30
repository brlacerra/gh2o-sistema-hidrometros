import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canAccessStation } from "@/lib/auth/canAccessStation";

function jsonBigIntReplacer(_key: string, value: unknown) {
  return typeof value === "bigint" ? value.toString() : value;
}

export async function POST(
  req: Request,
  context: { params: Promise<{ codSta: string }> }
) {
  try {
    const { codSta } = await context.params;

    // Permissions check
    const access = await canAccessStation(codSta);
    if (!access.allowed) {
      return NextResponse.json(
        { error: access.reason, station: access.station },
        { status: access.reason === "not_found" ? 404 : access.reason === "unauthenticated" ? 401 : 403 }
      );
    }

    const body = await req.json();
    const { startDate, endDate, fields } = body;

    const whereClause: any = { codSta };

    if (startDate || endDate) {
      whereClause.ts = {};
      if (startDate) {
        whereClause.ts.gte = BigInt(Math.floor(new Date(startDate).getTime() / 1000));
      }
      if (endDate) {
        // use lte or lt. For endDate, if it's "2024-03-27T12:00", it means up to that minute.
        whereClause.ts.lte = BigInt(Math.floor(new Date(endDate).getTime() / 1000));
      }
    }

    const selectClause: any = {};
    if (Array.isArray(fields) && fields.length > 0) {
      const allowedFields = ['ts', 'tempAvg', 'umiAvg', 'preAvg', 'lumAvg', 'vvAvg', 'dv', 'pulsos'];
      fields.forEach((field: string) => {
        if (allowedFields.includes(field)) {
          selectClause[field] = true;
        }
      });
    }

    const queryOpts: any = {
      where: whereClause,
      orderBy: { ts: 'asc' }
    };

    if (Object.keys(selectClause).length > 0) {
      queryOpts.select = selectClause;
    }

    const data = await prisma.data.findMany(queryOpts);

    return new NextResponse(
      JSON.stringify(data, jsonBigIntReplacer),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Download API Error:", error);
    return NextResponse.json({ error: "internal_server_error" }, { status: 500 });
  }
}
