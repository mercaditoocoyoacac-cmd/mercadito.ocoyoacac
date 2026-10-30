import crypto from "crypto";
import { NextResponse } from "next/server";

export function requireCron(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Cron no configurado" }, { status: 503 });
  }

  const authHeader = req.headers.get("authorization") || "";
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(authHeader, "utf8");
  const b = Buffer.from(expected, "utf8");

  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  return null;
}
