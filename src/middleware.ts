import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_APP_URL || "",
  process.env.NEXTAUTH_URL || "",
  "http://localhost:3000",
  "http://localhost:3001",
  "capacitor://localhost",
  "https://localhost",
  "file://",
].filter(Boolean);

const CSRF_PATHS = ["/api/auth/forgot-password", "/api/auth/reset-password"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (CSRF_PATHS.some((p) => pathname.startsWith(p)) && request.method === "POST") {
    const origin = request.headers.get("origin") || request.headers.get("referer") || "";

    if (origin) {
      const requestOrigin = request.nextUrl.origin;
      const isAllowed = [requestOrigin, ...ALLOWED_ORIGINS].some((allowed) => allowed && origin.startsWith(allowed));
      if (!isAllowed) {
        return NextResponse.json({ ok: false, error: "Origen no autorizado" }, { status: 403 });
      }
    }
  }

  const response = NextResponse.next();

  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  return response;
}

export const config = {
  matcher: ["/api/:path*"],
};
