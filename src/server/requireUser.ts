import { NextResponse } from "next/server";
import { getSession } from "@/server/session";

export async function requireUser() {
  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId) {
    return {
      ok: false as const,
      res: NextResponse.json({ ok: false }, { status: 401 }),
    };
  }
  return { ok: true as const, userId, session };
}

