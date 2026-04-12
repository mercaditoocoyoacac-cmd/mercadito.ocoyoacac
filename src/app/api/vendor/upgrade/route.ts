import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { requireUser } from "@/server/requireUser";

export async function POST() {
  const auth = await requireUser();
  if (!auth.ok) return auth.res;

  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: { role: true },
  });

  if (!user) {
    return NextResponse.json({ ok: false, error: "Usuario no encontrado" }, { status: 404 });
  }

  if (user.role === "VENDOR" || user.role === "ADMIN") {
    return NextResponse.json({ ok: false, error: "Ya eres vendedor" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: auth.userId },
    data: { role: "VENDOR" },
  });

  return NextResponse.json({ ok: true });
}