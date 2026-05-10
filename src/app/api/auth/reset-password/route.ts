import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/server/prisma";

export async function POST(req: Request) {
  const { token, password } = await req.json().catch(() => ({}));
  if (!token || !password || typeof password !== "string") {
    return NextResponse.json({ ok: false, error: "Datos inválidos" }, { status: 400 });
  }

  if (password.length < 6) {
    return NextResponse.json({ ok: false, error: "La contraseña debe tener al menos 6 caracteres" }, { status: 400 });
  }

  const record = await prisma.passwordResetToken.findUnique({ where: { token } });
  if (!record || record.used || record.expiresAt < new Date()) {
    return NextResponse.json({ ok: false, error: "Enlace inválido o expirado" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.$transaction([
    prisma.user.update({
      where: { email: record.email },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { used: true },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
