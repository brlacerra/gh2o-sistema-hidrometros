import "server-only"

import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { AUTH_COOKIE_NAME } from "./constants";
import { Decimal } from "@prisma/client/runtime/library";

export type CurrentUser = {
    created_at: Date;
  codUsr: string;
  emailUsr: string;
  nomeUsr: string | null;
  role: "admin" | "user";
  latMap?: Decimal | null;
  longMap?: Decimal | null;
  zoomMap?: Decimal | null;
  createdAt?: Date;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
    const cookieStore = cookies();
    const token = (await cookieStore).get(AUTH_COOKIE_NAME)?.value;
    if (!token) return null;

    const now = new Date();

    const session = await prisma.session.findUnique({
        where: { sessionToken: token },
        select: {
            expires: true,
            usuario: {
                select: {
                    codUsr: true,
                    emailUsr: true,
                    nomeUsr: true,
                    role: true,
                    latMap: true,
                    longMap: true,
                    zoomMap: true,
                    created_at: true,
                },            
            },
        }
    });

    if (!session) return null;
    if(session.expires <= now) return null;

    return session.usuario;
}
