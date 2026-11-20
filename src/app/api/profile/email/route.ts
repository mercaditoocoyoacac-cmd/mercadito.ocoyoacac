import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/server/prisma";
import { requireUser } from "@/server/requireUser";
import { rateLimit } from "@/lib/rate-limit";

const EmailChangeSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Ingresa un correo electrónico válido")
    .max(254, "El correo electrónico es demasiado largo"),
  password: z.string().min(1, "Ingresa tu contraseña actual"),
});

export async function PUT(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.res;

  const limited = await rateLimit(`profile-email:${auth.userId}`, {
    intervalMs: 3600_000,
    max: 5,
  });
  if (!limited.ok) {
    return NextResponse.json(
      { ok: false, error: "Demasiados intentos para cambiar el correo. Intenta más tarde." },
      { status: 429 },
    );
  }

  const parsed = EmailChangeSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: { email: true, passwordHash: true },
  });
  if (!user) {
    return NextResponse.json({ ok: false, error: "Usuario no encontrado" }, { status: 404 });
  }

  const passwordMatches = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!passwordMatches) {
    return NextResponse.json(
      { ok: false, error: "La contraseña actual es incorrecta." },
      { status: 400 },
    );
  }

  const email = parsed.data.email;
  if (email === user.email.toLowerCase()) {
    return NextResponse.json(
      { ok: false, error: "Ese correo ya es el que tienes registrado." },
      { status: 400 },
    );
  }

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existing && existing.id !== auth.userId) {
    return NextResponse.json(
      { ok: false, error: "Ese correo ya está registrado en otra cuenta." },
      { status: 400 },
    );
  }

  try {
    await prisma.user.update({
      where: { id: auth.userId },
      data: { email, emailVerified: false },
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Ese correo ya está registrado en otra cuenta." },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true, email });
}
