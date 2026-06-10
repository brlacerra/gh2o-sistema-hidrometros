import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";

type CreateHidroBody = {
    nome: string;
    descricao?: string | null;
    latHidr?: number;
    longHidr?: number;
    is_public?: boolean;
    isActive?: boolean;
    codProp?: string;
}

function jsonBigIntReplacer(_key: string, value: unknown) {
    return typeof value === "bigint" ? value.toString() : value;
}

export async function GET() {
    try {
        const user = await getCurrentUser();
        const where = !user
            ? { is_public: true }
            : user.role === "admin"
                ? {}
                : {
                    OR: [{ is_public: true }, { propriedade: { usuarioId: user.codUsr } }],
                };

        const hidrometros = await prisma.hidrometro.findMany({
            where,
            select: {
                codHidr: true,
                descricao: true,
                latHidr: true,
                longHidr: true,
                is_public: true,
                isActive: true,
                propriedade: {
                    select: {
                        nomeProp: true,
                    }
                },
                outorga: {
                    where: { ativo: true },
                    select: {
                        numeroPortaria: true,
                        dataVencimento: true,
                        lim_accum_diario: true,
                    }
                }
            },
            orderBy: { codHidr: "asc" },
        });

        return new NextResponse(JSON.stringify({ data: hidrometros }, jsonBigIntReplacer), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (err) {
        console.error(err);
        return NextResponse.json(
            { error: "Failed to fetch hidrometros" },
            { status: 500 },
        );
    }
}