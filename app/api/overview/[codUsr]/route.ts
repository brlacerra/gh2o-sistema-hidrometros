import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";

export async function GET(
  _req: Request,
  context: { params: Promise<{ codUsr: string }> }
) {
  try {
    const { codUsr } = await context.params;
    const me = await getCurrentUser();

    // Se não tiver sessão (visitante), pode retornar apenas as públicas
    if (!me) {
      const publicStations = await prisma.sta.findMany({
        where: { is_public: true },
        select: { codSta: true, nomeSta: true, is_public: true, codUsr: true, isActive: true },
        orderBy: { nomeSta: 'asc' }
      });
      return NextResponse.json(publicStations, { status: 200 });
    }

    // Admins recebem a frota inteira
    if (me.role === "admin") {
      const allStations = await prisma.sta.findMany({
        select: { codSta: true, nomeSta: true, is_public: true, codUsr: true, isActive: true },
        orderBy: { nomeSta: 'asc' }
      });
      return NextResponse.json(allStations, { status: 200 });
    }

    // Se o usuário logado estiver tentando acessar a rota de *outro* codUsr (e não for admin),
    // podemos barrar (segurança) ou apenas retornar o que *ele* próprio tem acesso.
    // Vamos barrar para evitar vazamento da lista privada de terceiros:
    if (me.codUsr !== codUsr) {
      return NextResponse.json({ error: "Forbidden: You can only view your own overview." }, { status: 403 });
    }

    // Usuário normal pedindo o overview dele (codUsr dele mesmo):
    const permittedStations = await prisma.sta.findMany({
      where: {
        OR: [
          { is_public: true },
          { codUsr: codUsr, isActive: true }
        ]
      },
      select: { codSta: true, nomeSta: true, is_public: true, codUsr: true, isActive: true },
      orderBy: { nomeSta: 'asc' }
    });

    return NextResponse.json(permittedStations, { status: 200 });

  } catch (err) {
    console.error("Overview API Error:", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
