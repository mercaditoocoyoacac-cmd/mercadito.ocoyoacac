import { NextResponse } from "next/server";

const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_APP_URL || "",
  process.env.NEXTAUTH_URL || "",
  "http://localhost:3000",
  "http://localhost:3001",
  "capacitor://localhost",
  "https://localhost",
].filter(Boolean);

export function validateOrigin(request: Request): boolean {
  const origin = request.headers.get("origin") || request.headers.get("referer") || "";
  if (!origin) return false;
  return ALLOWED_ORIGINS.some((allowed) => origin.startsWith(allowed));
}

export function csrfErrorResponse() {
  return NextResponse.json({ ok: false, error: "Origen no autorizado" }, { status: 403 });
}
