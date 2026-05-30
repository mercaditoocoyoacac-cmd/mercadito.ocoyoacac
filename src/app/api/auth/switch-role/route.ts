import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { requireUser } from "@/server/requireUser";

const validRoles = ["CUSTOMER", "DELIVERY", "VENDOR"] as const;

export async function POST(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.res;

  const json = await req.json().catch(() => null);
  const { role } = json || {};

  if (!role || !validRoles.includes(role)) {
    return NextResponse.json({ ok: false, error: "Rol inválido" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: { role: true, additionalRoles: true },
  });

  if (!user) {
    return NextResponse.json({ ok: false, error: "Usuario no encontrado" }, { status: 404 });
  }

  const allRoles = [user.role, ...(user.additionalRoles ? user.additionalRoles.split(",") : [])];

  if (!allRoles.includes(role as typeof validRoles[number])) {
    return NextResponse.json({ ok: false, error: "No tienes ese rol" }, { status: 403 });
  }

  const newAdditionalRoles = allRoles.filter((r) => r !== role).join(",");

  await prisma.user.update({
    where: { id: auth.userId },
    data: {
      role: role,
      additionalRoles: newAdditionalRoles || null,
    },
  });

  return NextResponse.json({ ok: true, role });
}
