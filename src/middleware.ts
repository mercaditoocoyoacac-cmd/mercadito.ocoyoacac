import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_APP_URL || "",
  process.env.NEXTAUTH_URL || "",
  "http://localhost:3000",
  "http://localhost:3001",
  "capacitor://localhost",
  "https://localhost",
].filter(Boolean);

const MUTATION_METHODS = ["POST", "PUT", "PATCH", "DELETE"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/") && MUTATION_METHODS.includes(request.method) && !pathname.startsWith("/api/auth/")) {
    const origin = request.headers.get("origin") || request.headers.get("referer") || "";

    const csrfHeader = request.headers.get("x-csrf-token");
    if (csrfHeader === "1" || csrfHeader === "true") {
      return NextResponse.next();
    }

    if (origin) {
      const isAllowed = ALLOWED_ORIGINS.some((allowed) => allowed && origin.startsWith(allowed));
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
  matcher: "/api/:path*",
};
