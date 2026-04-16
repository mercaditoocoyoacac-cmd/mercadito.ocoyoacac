import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { requireUser } from "@/server/requireUser";

export async function POST(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.res;

  const json = await req.json().catch(() => null);
  const { type, target, code } = json || {};

  if (!type || !target || !code) {
    return NextResponse.json({ ok: false, error: "Datos requeridos" }, { status: 400 });
  }

  const verification = await prisma.verification.findFirst({
    where: {
      userId: auth.userId,
      type,
      target,
      code,
      verified: false,
      expiresAt: { gt: new Date() },
    },
  });

  if (!verification) {
    return NextResponse.json({ ok: false, error: "Código inválido o expirado" }, { status: 400 });
  }

  await prisma.verification.update({
    where: { id: verification.id },
    data: { verified: true },
  });

  await prisma.user.update({
    where: { id: auth.userId },
    data: {
      emailVerified: type === "email" ? true : undefined,
      phoneVerified: type === "phone" ? true : undefined,
      phone: type === "phone" ? target : undefined,
    },
  });

  return NextResponse.json({ ok: true });
}