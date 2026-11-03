import { NextResponse } from "next/server";
import { getSession } from "@/server/session";
import { prisma } from "@/server/prisma";
import { parseRoles } from "@/lib/roles";

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
  return parseRoles(session.user.role, session.user.additionalRoles ?? undefined);
}

export async function requireRole(...roles: string[]) {
  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId) {
    return { ok: false as const, res: NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 }) };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isActive: true, role: true, additionalRoles: true },
  });

  if (!user || !user.isActive) {
    return { ok: false as const, res: NextResponse.json({ ok: false, error: "Cuenta desactivada" }, { status: 403 }) };
  }

  const currentRoles = parseRoles(user.role, user.additionalRoles);
  if (!currentRoles.some((r) => roles.includes(r))) {
    return { ok: false as const, res: NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 }) };
  }

  return { ok: true as const, userId, session };
}
export function requireAdmin() {
  return requireRole('ADMIN');
}
