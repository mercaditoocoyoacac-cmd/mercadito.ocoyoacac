import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { sendVerificationSMS } from "@/server/sns";
import { sendVerificationWhatsApp } from "@/server/whatsapp";

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const HAS_AWS_CREDS = !!(
  process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
);

const HAS_WHATSAPP_CREDS = !!(
  process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID
);

export async function POST(req: Request) {
  try {
    const json = await req.json().catch(() => null);
    const { phone } = json || {};

    if (!phone) {
      return NextResponse.json({ ok: false, error: "Teléfono requerido" }, { status: 400 });
    }

    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      return NextResponse.json({ ok: false, error: "Teléfono inválido" }, { status: 400 });
    }

    const exists = await prisma.user.findFirst({
      where: {
        OR: [
          { phone: { contains: cleanPhone.slice(-10) } },
          { phone: { endsWith: cleanPhone.slice(-10) } },
        ],
      },
    });

    if (exists) {
      return NextResponse.json({ ok: false, error: "Ese número ya está registrado" }, { status: 409 });
    }

    const code = generateCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.verification.create({
      data: {
        type: "PHONE",
        target: cleanPhone,
        code,
        expiresAt,
      },
    });

    if (HAS_WHATSAPP_CREDS) {
      const sent = await sendVerificationWhatsApp(cleanPhone, code);
      if (!sent.ok) {
        console.error("[send-verification] WhatsApp error:", sent.error);
      } else {
        return NextResponse.json({ ok: true });
      }
    }

    if (HAS_AWS_CREDS) {
      const sent = await sendVerificationSMS(cleanPhone, code);
      if (!sent) {
        return NextResponse.json({ 
          ok: false, 
          error: "Error al enviar SMS. Verifica tu configuración de AWS SNS." 
        }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true, autoVerified: true });
  } catch (error) {
    console.error("[send-verification] Error:", error);
    return NextResponse.json({ ok: false, error: "Error al conectar con el servidor" }, { status: 500 });
  }
}
