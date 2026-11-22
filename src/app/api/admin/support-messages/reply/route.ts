import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/prisma";
import { requireRole } from "@/server/requireUser";
import { rateLimit } from "@/lib/rate-limit";
import { absoluteUrl } from "@/lib/appUrl";
import { sendEmail } from "@/server/email";
import { sendTextNotification } from "@/server/notifications";
import { sendSMS } from "@/server/sns";

export const dynamic = "force-dynamic";

const ReplySchema = z.object({
  id: z.string().min(1, "Mensaje no válido"),
  reply: z.string().trim().min(1, "Escribe una respuesta").max(2000, "La respuesta es demasiado larga"),
});

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[char] ?? char;
  });
}

export async function POST(req: Request) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.res;

  const limited = await rateLimit(`support-reply:${auth.userId}`, {
    intervalMs: 3600_000,
    max: 30,
  });
  if (!limited.ok) {
    return NextResponse.json(
      { ok: false, error: "Demasiadas respuestas enviadas. Intenta más tarde." },
      { status: 429 },
    );
  }

  const parsed = ReplySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 },
    );
  }

  const supportMessage = await prisma.supportMessage.findUnique({
    where: { id: parsed.data.id },
    select: {
      message: true,
      contactEmail: true,
      contactPhone: true,
      user: { select: { id: true, name: true, email: true } },
    },
  });
  if (!supportMessage) {
    return NextResponse.json({ ok: false, error: "Mensaje no encontrado" }, { status: 404 });
  }

  const adminName = auth.session?.user?.name || auth.session?.user?.email || "Administrador";
  const repliedAt = new Date();

  const updated = await prisma.supportMessage.update({
    where: { id: parsed.data.id },
    data: {
      reply: parsed.data.reply,
      repliedAt,
      repliedBy: adminName,
      read: true,
    },
    select: { id: true, reply: true, repliedAt: true, repliedBy: true, read: true },
  });

  const delivered: string[] = [];

  if (supportMessage.user) {
    await sendTextNotification(supportMessage.user.id, {
      title: "Respuesta de soporte",
      body: parsed.data.reply.slice(0, 140),
      type: "SUPPORT",
      url: "/mensajes",
    });
    delivered.push("interna");
  }

  const recipients = new Set<string>();
  if (supportMessage.user?.email) recipients.add(supportMessage.user.email);
  if (supportMessage.contactEmail) recipients.add(supportMessage.contactEmail);

  if (recipients.size > 0) {
    const replyHtml = escapeHtml(parsed.data.reply).replace(/\n/g, "<br />");
    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#222">
        <h2>Respuesta de Mercadito Ocoyoacac</h2>
        <p><strong>Tu mensaje:</strong><br />${escapeHtml(supportMessage.message)}</p>
        <p><strong>Respuesta:</strong><br />${replyHtml}</p>
        <p><a href="${absoluteUrl("/mensajes")}">Ver tus mensajes en la plataforma</a></p>
      </div>
    `;

    for (const to of recipients) {
      try {
        await sendEmail({ to, subject: "Respuesta de Mercadito Ocoyoacac", html });
        delivered.push("correo");
      } catch {
        delivered.push("correo-pendiente");
      }
    }
  } else if (supportMessage.contactPhone) {
    const sent = await sendSMS(
      supportMessage.contactPhone,
      `Mercadito: respuesta a tu mensaje: ${parsed.data.reply.slice(0, 160)}`,
    );
    if (sent) delivered.push("sms");
  }

  return NextResponse.json({ ok: true, message: updated, delivered });
}
