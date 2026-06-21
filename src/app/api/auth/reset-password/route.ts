import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { prisma } from "@/server/prisma";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const { token, password } = await req.json().catch(() => ({}));
  if (!token || !password || typeof password !== "string") {
    return NextResponse.json({ ok: false, error: "Datos inválidos" }, { status: 400 });
  }

  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0] || "unknown";
  const rl = await rateLimit(`reset:${ip}`, { intervalMs: 3600_000, max: 10 });
  if (!rl.ok) {
    return NextResponse.json({ ok: false, error: "Demasiadas solicitudes. Intenta más tarde." }, { status: 429 });
  }

  if (password.length < 6) {
    return NextResponse.json({ ok: false, error: "La contraseña debe tener al menos 6 caracteres" }, { status: 400 });
  }

  const record = await prisma.passwordResetToken.findUnique({ where: { token } });
  if (!record || record.used || record.expiresAt < new Date()) {
    return NextResponse.json({ ok: false, error: "Enlace inválido o expirado" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: record.email } });
  if (!user) {
    return NextResponse.json({ ok: false, error: "Usuario no encontrado" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, failedLoginAttempts: 0, lastFailedLoginAt: null, lockoutUntil: null },
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { used: true },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
