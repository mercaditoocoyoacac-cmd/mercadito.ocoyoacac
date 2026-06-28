import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { getSession } from "@/server/session";

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

  // Also notify online admins
  if (session?.user?.id) {
    const admins = await prisma.user.findMany({
      where: { role: "ADMIN" },
      select: { id: true },
    });
    if (admins.length > 0) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { name: true, email: true },
      });
      await prisma.notification.createMany({
        data: admins.map((admin) => ({
          userId: admin.id,
          type: "SUPPORT",
          title: `Mensaje de ${user?.name || user?.email || "usuario"}`,
          message: message.trim(),
        })),
      });
    }
  }

  return NextResponse.json({ ok: true });
}
