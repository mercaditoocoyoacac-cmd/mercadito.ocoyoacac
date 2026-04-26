import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const { phone, code } = json || {};

  if (!phone || !code) {
    return NextResponse.json({ ok: false, error: "Datos requeridos" }, { status: 400 });
  }

  const cleanPhone = phone.replace(/\D/g, "");

  const verification = await prisma.verification.findFirst({
    where: {
      target: cleanPhone,
      code,
      type: "PHONE",
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

  return NextResponse.json({ 
    ok: true, 
    verifiedPhone: cleanPhone 
  });
}