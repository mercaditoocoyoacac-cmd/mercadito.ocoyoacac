import { NextResponse } from "next/server";
import { getSession } from "@/server/session";
import { prisma } from "@/server/prisma";

export async function requireUser() {
  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId) {
    return {
      ok: false as const,
      res: NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 }),
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isActive: true },
  });

  if (!user || !user.isActive) {
    return {
      ok: false as const,
      res: NextResponse.json({ ok: false, error: "Cuenta desactivada" }, { status: 403 }),
    };
  }

  return { ok: true as const, userId, session };
}

export function getUserRoles(session: { user: { role?: string | null; additionalRoles?: string | null } }): string[] {
  return [
    session.user.role ?? "",
    ...(session.user.additionalRoles?.split(",").filter(Boolean) ?? []),
  ].filter(Boolean);
}

export async function requireRole(...roles: string[]) {
  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId) {
    return { ok: false as const, res: NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 }) };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isActive: true },
  });

  if (!user || !user.isActive) {
    return { ok: false as const, res: NextResponse.json({ ok: false, error: "Cuenta desactivada" }, { status: 403 }) };
  }

  const userRoles = getUserRoles(session);
  if (!userRoles.some(r => roles.includes(r))) {
    return { ok: false as const, res: NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 }) };
  }

  return { ok: true as const, userId, session };
}

