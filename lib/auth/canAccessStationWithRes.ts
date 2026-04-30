import "server-only";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";

export async function canAccessStationWithRes(codSta: string) {
  const station = await prisma.sta.findUnique({
    where: { codSta },
    select: { codSta: true, codUsr: true, is_public: true, resSta: true },
  });

  if (!station) {
    return { allowed: false as const, reason: "not_found" as const, station: null, user: null };
  }

  // pública: não consulta sessão/usuário
  if (station.is_public) {
    return { allowed: true as const, reason: "public" as const, station, user: null };
  }

  // privada: consulta usuário
  const user = await getCurrentUser();
  if (!user) {
    return { allowed: false as const, reason: "unauthenticated" as const, station, user: null };
  }

  if (user.role === "admin" || user.codUsr === station.codUsr) {
    return { allowed: true as const, reason: "owner_or_admin" as const, station, user };
  }

  return { allowed: false as const, reason: "forbidden" as const, station, user };
}