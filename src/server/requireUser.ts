import { NextResponse } from "next/server";
import { getSession } from "@/server/session";

export async function requireUser() {
  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId) {
    return {
      ok: false as const,
      res: NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 }),
    };
  }
  return { ok: true as const, userId, session };
}

export async function requireRole(...roles: string[]) {
  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId) {
    return { ok: false as const, res: NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 }) };
  }
  if (!session.user.role || !roles.includes(session.user.role)) {
    return { ok: false as const, res: NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 }) };
  }
  return { ok: true as const, userId, session };
}

