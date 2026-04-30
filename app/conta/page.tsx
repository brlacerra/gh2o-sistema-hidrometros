import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { NavbarClient } from "@/app/components/Navbar/NavbarClient";
import { ContaClient } from "@/app/components/admin/station/contaClient";
import { prisma } from "@/lib/prisma";

function toNumberOrNull(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  // Prisma Decimal geralmente tem toNumber()
  if (
    typeof v === "object" &&
    v !== null &&
    "toNumber" in v &&
    typeof (v as { toNumber?: unknown }).toNumber === "function"
  ) {
    return (v as { toNumber: () => number }).toNumber();
  }
  // fallback (caso venha como string/number)
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export default async function contaPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  const stationsProperties = await prisma.sta.findMany({
    where: { codUsr: me.codUsr },
    select: {
      codSta: true,
      nomeSta: true,
      aliasSta: true,
    },
  });

  const userProperties = {
    codUsr: me.codUsr,
    emailUsr: me.emailUsr,
    nomeUsr: me.nomeUsr,
    role: me.role,
    latMap: toNumberOrNull(me.latMap),
    longMap: toNumberOrNull(me.longMap),
    zoomMap: toNumberOrNull(me.zoomMap),
    created_at: me.created_at,
  };

  return (
    <>
      <NavbarClient title="Usuário - Estações" />
      <div className="mt-40 px-4 md:px-10">
        <ContaClient
          userProperties={userProperties}
          stationsProperties={stationsProperties}
        />
      </div>
    </>
  );
}