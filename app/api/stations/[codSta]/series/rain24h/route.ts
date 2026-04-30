import "server-only";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canAccessStation } from "@/lib/auth/canAccessStation";

export async function GET(_req: Request, ctx: { params: Promise<{ codSta: string }> }) {
	try {
		const { codSta } = await ctx.params;

		const access = await canAccessStation(codSta);
		if (!access.allowed) {
			const status =
				access.reason === "unauthenticated" ? 401 :
					access.reason === "forbidden" ? 403 :
						404;

			return NextResponse.json({ error: "Not allowed", reason: access.reason }, { status });
		}


		const station = await prisma.sta.findUnique({
			where: { codSta },
			select: { resSta: true },
		});

		const resSta = Number(station?.resSta);
		if (!Number.isFinite(resSta) || resSta <= 0) {
			return NextResponse.json({ error: "resSta inválido" }, { status: 400 });
		}

		const toMs = Date.now();
		const fromMs = toMs - 24 * 60 * 60 * 1000;
		const fromTs = BigInt(Math.floor(fromMs / 1000));
		const toTs = BigInt(Math.ceil(toMs / 1000));

		const agg = await prisma.data.aggregate({
			where: {
				codSta,
				ts: { gte: fromTs, lte: toTs },
			},
			_sum: { pulsos: true },
		});

		const totalPulses = agg._sum.pulsos ?? 0;
		const accumMm = totalPulses * resSta;

		return NextResponse.json({ accumMm });
	} catch (err) {
		console.error(err);
		return NextResponse.json({ error: "internal_error" }, { status: 500 });
	}
}
