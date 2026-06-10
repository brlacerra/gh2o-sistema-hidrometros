import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { NavbarClient } from "@/app/components/Navbar/NavbarClient";
import { ContaClient } from "@/app/components/admin/station/contaClient";
import { prisma } from "@/lib/prisma";
import { getCurrentProperty } from "@/lib/auth/getCurrentProperty";

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
  const property = await getCurrentProperty()
  if (!me) redirect("/login");

  const stationsProperties = await prisma.hidrometro.findMany({
    where: me.role === "admin" ? {} : { propriedade: { usuarioId: me.codUsr } },
    select: {
      codHidr: true,
      descricao: true,
    },
  });

  const formattedStations = stationsProperties.map(h => ({
    codSta: h.codHidr,
    nomeSta: h.descricao,
    aliasSta: null,
  }));

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

  const userProperty = property ? {
    codProp: property.codProp,
    nomeProp: property.nomeProp,
    cidadeProp: property.cidadeProp,
    ufProp: property.ufProp,
    geojsonProp: property.geojsonProp,
    centroLng: toNumberOrNull(property.centroLng),
    centroLat: toNumberOrNull(property.centroLat),
    created_at: property.created_at,
    updated_at: property.updated_at,
  } : null;

  return (
    <>
      <NavbarClient title="Usuário - Propriedade e Hidrômetros" />
      <div className="mt-40 px-4 md:px-10">
        <ContaClient
          userProperties={userProperties}
          stationsProperties={formattedStations}
          propertyProperties={userProperty}
        />
      </div>
    </>
  );
}