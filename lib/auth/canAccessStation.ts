import "server-only";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";

export async function canAccessStation(codSta: string) {
  const station = await prisma.sta.findUnique({
    where: { codSta },
    select: { codSta: true, codUsr: true, is_public: true, isActive: true },
  });

  if (!station) {
    return { allowed: false as const, station: null, user: null, reason: "not_found" as const };
  }

  if (station.is_public) {
    return { allowed: true as const, station, user: null, reason: "public" as const };
  }

  const user = await getCurrentUser();
  if (!user) {
    return { allowed: false as const, station, user: null, reason: "unauthenticated" as const };
  }
  if (user.role === "admin") {
    return { allowed: true as const, station, user, reason: "admin" as const };
  }

  if (user.codUsr === station.codUsr && station.isActive) {
    return { allowed: true as const, station, user, reason: "owner_active" as const };
  }
  if (user.codUsr === station.codUsr && !station.isActive) {
    return { allowed: false as const, station, user, reason: "owner_inactive" as const };
  }


  return { allowed: false as const, station, user, reason: "forbidden" as const };
}