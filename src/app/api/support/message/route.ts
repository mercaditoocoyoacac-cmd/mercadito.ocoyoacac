import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { requireUser } from "@/server/requireUser";
import { Role } from "@prisma/client";

export async function POST(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.res;

  const userId = auth.userId;
  const { message } = await req.json().catch(() => ({ message: "" }));

  if (!message?.trim()) {
    return NextResponse.json({ ok: false, error: "Mensaje requerido" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  });

  if (!user) {
    return NextResponse.json({ ok: false, error: "Usuario no encontrado" }, { status: 404 });
  }

  const admins = await prisma.user.findMany({
    where: { role: Role.ADMIN },
    select: { id: true },
  });

  if (admins.length === 0) {
    return NextResponse.json({ ok: false, error: "No hay administradores disponibles" }, { status: 500 });
  }

  await prisma.notification.createMany({
    data: admins.map((admin) => ({
      userId: admin.id,
      type: "SUPPORT",
      title: `Mensaje de ${user.name || user.email || "usuario"}`,
      message: message.trim(),
    })),
  });

  return NextResponse.json({ ok: true });
}
