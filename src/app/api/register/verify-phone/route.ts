import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/server/prisma";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const { phone, code } = json || {};

  if (!phone || !code) {
    return NextResponse.json({ ok: false, error: "Datos requeridos" }, { status: 400 });
  }

  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0] || "unknown";
  const cleanPhone = phone.replace(/\D/g, "");

  const rlIp = await rateLimit(`verify-phone:${ip}`, { intervalMs: 3600_000, max: 20 });
  const rlPhone = await rateLimit(`verify-phone:${cleanPhone}`, { intervalMs: 3600_000, max: 10 });
  if (!rlIp.ok || !rlPhone.ok) {
    return NextResponse.json(
      { ok: false, error: "Demasiados intentos. Intenta más tarde." },
      { status: 429 },
    );
  }

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