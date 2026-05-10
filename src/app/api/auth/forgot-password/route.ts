import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/server/prisma";
import { sendEmail } from "@/server/email";

export async function POST(req: Request) {
  const { email } = await req.json().catch(() => ({}));
  if (!email || typeof email !== "string") {
    return NextResponse.json({ ok: false, error: "Correo requerido" }, { status: 400 });
  }

  const normalized = email.toLowerCase().trim();
  const user = await prisma.user.findUnique({ where: { email: normalized } });
  if (!user) {
    return NextResponse.json({ ok: true });
  }

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await prisma.passwordResetToken.create({
    data: { token, email: normalized, expiresAt },
  });

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const resetUrl = `${baseUrl}/reset-password/${token}`;

  await sendEmail({
    to: normalized,
    subject: "Recuperación de contraseña - Mercadito Ocoacac",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
        <h2>Recuperación de contraseña</h2>
        <p>Haz clic en el siguiente enlace para restablecer tu contraseña. Este enlace expira en 1 hora.</p>
        <a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#22c55e;color:#fff;border-radius:8px;text-decoration:none;margin:16px 0;">
          Restablecer contraseña
        </a>
        <p style="color:#666;font-size:14px;">Si no solicitaste este cambio, ignora este mensaje.</p>
      </div>
    `,
  });

  return NextResponse.json({ ok: true });
}
