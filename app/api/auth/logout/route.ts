import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { prisma } from "@/lib/prisma";
import { AUTH_COOKIE_NAME } from "@/lib/auth/constants";

export async function POST() {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

    if (token){
        await prisma.session.deleteMany({
            where: { sessionToken: token},
        })
    }

    const res = NextResponse.json({ok: true});

    res.cookies.set({
        name: AUTH_COOKIE_NAME,
        value: "",
        httpOnly: true,
        path: "/",
        maxAge: 0
    });

    return res;
}