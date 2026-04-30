import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";

import { prisma } from "@/lib/prisma";
import { AUTH_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "@/lib/auth/constants";


type LoginBody = {
    email?: string;
    password?: string;
};

function jsonError(message: string, status = 400){
    return NextResponse.json({ error: message }, { status });
}

export async function POST(req: Request){
    let body: LoginBody;
    try{
        body = (await req.json()) as LoginBody;
    }catch{
        return jsonError("Body Inválido", 400);
    }

    const email = (body.email ?? "").trim().toLowerCase();
    const password = body.password ?? "";

    if(!email || !password){
        return jsonError("Email e senha são obrigatórios", 400);
    }

    const user = await prisma.usuario.findUnique({
        where: { emailUsr: email },
        select: {
            codUsr: true,
            emailUsr: true,
            nomeUsr: true,
            pwdUsr: true,
            role: true,
        }
    });

    if(!user) return jsonError("Credencias inválidas", 401);

    const ok = await bcrypt.compare(password, user.pwdUsr);
    if(!ok) return jsonError("Credencias inválidas", 401);

    const sessionToken = crypto.randomBytes(32).toString("base64url");
    const expires = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);

    await prisma.session.create({
        data: {
            id: crypto.randomUUID(),
            sessionToken,
            userId: user.codUsr,
            expires,
        }
    });

    const res = NextResponse.json({
        ok: true,
        user: {
            codUsr: user.codUsr,
            emailUsr: user.emailUsr,
            role: user.role,
            nomeUsr: user.nomeUsr,
        }
    });

    res.cookies.set({
        name: AUTH_COOKIE_NAME,
        value: sessionToken,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: SESSION_MAX_AGE_SECONDS
    });

    return res;
}
