import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { getSession } from "@/server/session";
import { sendPushToAdmins } from "@/server/push";

export async function POST(req: Request) {
  const session = await getSession();
  const body = await req.json().catch(() => ({ message: "", contactEmail: "", contactPhone: "", imageUrl: "" }));
  const { message, contactEmail, contactPhone, imageUrl } = body;

  if (!message?.trim()) {
    return NextResponse.json({ ok: false, error: "Mensaje requerido" }, { status: 400 });
  }

  await prisma.supportMessage.create({
    data: {
      message: message.trim(),
      contactEmail: contactEmail?.trim() || null,
      contactPhone: contactPhone?.trim() || null,
      imageUrl: imageUrl?.trim() || null,
      userId: session?.user?.id || null,
    },
  });

  const sender = session?.user?.id
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { name: true, email: true },
      })
    : null;
  const senderName = sender?.name || sender?.email || "Visitante";

  // In-app notifications for admins
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true, pushToken: true },
  });
  if (admins.length > 0) {
    await prisma.notification.createMany({
      data: admins.map((admin) => ({
        userId: admin.id,
        type: "SUPPORT",
        title: `Mensaje de ${senderName}`,
        message: message.trim(),
      })),
    });
  }

  // Push notification to admins
  await sendPushToAdmins({
    title: `✉️ Mensaje de ${senderName}`,
    body: message.trim().length > 80 ? message.trim().slice(0, 80) + "…" : message.trim(),
    url: "/admin/mensajes",
    type: "SUPPORT",
  });

  return NextResponse.json({ ok: true });
}
