import "server-only"

import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { AUTH_COOKIE_NAME } from "./constants";
import { Decimal } from "@prisma/client/runtime/library";
import type { CurrentProperty } from "./getCurrentProperty";

export type CurrentUser = {
    created_at: Date;
    codUsr: string;
    emailUsr: string;
    nomeUsr: string | null;
    numero: string | null;
    cpfUsr: string | null;
    cepUsr: string | null;
    ufUsr: string | null;
    cidadeUsr: string | null;
    logradouroUsr: string | null;
    role: "admin" | "user" | "owner_no_login" | "viewer";
    latMap?: Decimal | null;
    longMap?: Decimal | null;
    zoomMap?: Decimal | null;
    createdAt?: Date;
    propriedade?: CurrentProperty[];
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
                    numero: true,
                    cpfUsr: true,
                    cepUsr: true,
                    ufUsr: true,
                    cidadeUsr: true,
                    logradouroUsr: true,
                    role: true,
                    latMap: true,
                    longMap: true,
                    zoomMap: true,
                    created_at: true,
                    propriedade: {
                        select: {
                            codProp: true,
                            nomeProp: true,
                            cidadeProp: true,
                            ufProp: true,
                            geojsonProp: true,
                            centroLng: true,
                            centroLat: true,
                            created_at: true,
                            updated_at: true,
                        }
                    }
                },
            },
        }
    });

    if (!session) return null;
    if (session.expires <= now) return null;

    return session.usuario as CurrentUser;
}
