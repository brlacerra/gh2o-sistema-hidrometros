import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

type RegisterBody = {
  nome?: string;
  email?: string;
  password?: string;
  passwordConfirm?: string;
  numero?: string;
  cpfUsr?: string;
  cepUsr?: string;
  ufUsr?: string;
  cidadeUsr?: string;
  logradouroUsr?: string;
};

async function generateUniqueUserId() {
  while (true) {
    const id = String(Math.floor(Math.random() * 100000)).padStart(5, "0");
    const existing = await prisma.usuario.findUnique({ where: { codUsr: id } });
    if (!existing) return id;
  }
}

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(req: Request) {
  let body: RegisterBody;
  try {
    body = (await req.json()) as RegisterBody;
  } catch {
    return jsonError("Body inválido", 400);
  }

  const nome = (body.nome ?? "").trim();
  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  const passwordConfirm = body.passwordConfirm ?? "";

  if (!nome || !email || !password || !passwordConfirm)
    return jsonError("Todos os campos são obrigatórios", 400);

  if (password.length < 5)
    return jsonError("A senha deve ter pelo menos 5 caracteres", 400);

  if (password !== passwordConfirm)
    return jsonError("As senhas não conferem", 400);

  const existing = await prisma.usuario.findUnique({
    where: { emailUsr: email },
    select: { codUsr: true },
  });
  if (existing) return jsonError("Email já cadastrado", 400);

  const hash = await bcrypt.hash(password, 10);

  // ID automático (uuid)
  const codUsr = await generateUniqueUserId();

  await prisma.usuario.create({
    data: {
      codUsr,
      emailUsr: email,
      nomeUsr: nome,
      pwdUsr: hash,
      numero: body.numero,
      cpfUsr: body.cpfUsr,
      cepUsr: body.cepUsr,
      ufUsr: body.ufUsr,
      cidadeUsr: body.cidadeUsr,
      logradouroUsr: body.logradouroUsr,
      // latMap, longMap, zoomMap default null
      // role padrão é 'user' (PRISMA já define isso)
    }
  });

  return NextResponse.json({ ok: true });
}