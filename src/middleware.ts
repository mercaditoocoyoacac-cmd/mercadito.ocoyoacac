import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const publicPaths = [
  "/_next",
  "/favicon",
  "/api/auth",
  "/api/account/delete",
  "/privacidad",
  "/eliminar-cuenta",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  for (const prefix of publicPaths) {
    if (pathname.startsWith(prefix)) {
      return NextResponse.next();
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
