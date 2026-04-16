import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { requireUser } from "@/server/requireUser";
import { sendVerificationSMS } from "@/server/sns";

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.res;

  const json = await req.json().catch(() => null);
  const { type, target } = json || {};

  if (!type || !target) {
    return NextResponse.json({ ok: false, error: "Datos requeridos" }, { status: 400 });
  }

  if (type === "email" && !target.includes("@")) {
    return NextResponse.json({ ok: false, error: "Email inválido" }, { status: 400 });
  }

  if (type === "phone") {
    const cleanPhone = target.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      return NextResponse.json({ ok: false, error: "Teléfono inválido" }, { status: 400 });
    }
  }

  const code = generateCode();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  await prisma.verification.deleteMany({
    where: { userId: auth.userId, type, target },
  });

  await prisma.verification.create({
    data: {
      userId: auth.userId,
      type,
      target,
      code,
      expiresAt,
    },
  });

  if (type === "email") {
    console.log(`[EMAIL VERIFICATION] Code for ${target}: ${code}`);
  } else {
    console.log(`[PHONE VERIFICATION] Sending SMS to ${target} with code: ${code}`);
    const sent = await sendVerificationSMS(target, code);
    if (!sent) {
      return NextResponse.json({ 
        ok: false, 
        error: "Error al enviar SMS. Asegúrate de que tu número esté verificado en AWS SNS." 
      }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, target });
}