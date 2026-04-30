import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth/getCurrentUser';

export async function GET() {
    try {
        const user = await getCurrentUser();
        if(!user) {
            return NextResponse.json({ error: "Usuário não autenticado." }, { status: 401 });
        }

        // apenas usuario admin pode usar o GET
        const where = user?.role === 'admin' ? {} : { codUsr: user?.codUsr };
        const users = await prisma.usuario.findMany({
            where,
            select: {
                codUsr: true,
                nomeUsr: true,
                role: true,
            },
            orderBy: { codUsr: 'asc' },
        })
        return NextResponse.json(users);
    } catch (error) {
        return NextResponse.json({ error: "Erro ao buscar usuários." }, { status: 500 });
    }
}