import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function getAppType(ua: string | null): string {
  if (!ua) return "WEB";
  if (ua.includes("MercaditoCliente")) return "CLIENTE";
  if (ua.includes("MercaditoVendedor")) return "VENDOR";
  if (ua.includes("MercaditoRepartidor")) return "DELIVERY";
  if (ua.includes("MercaditoAdmin")) return "ADMIN";
  return "WEB";
}

const portalRoutes: Record<string, string> = {
  CLIENTE: "/",
  VENDOR: "/portal/vendedor",
  DELIVERY: "/portal/repartidor",
  ADMIN: "/portal/admin",
};

const loginRoutes: Record<string, string> = {
  CLIENTE: "/login",
  VENDOR: "/vendor/login",
  DELIVERY: "/delivery/login",
  ADMIN: "/admin/login",
  WEB: "/login",
};

const blockedByApp: Record<string, string[]> = {
  CLIENTE: ["/vendor/", "/delivery/", "/admin/"],
  DELIVERY: ["/vendor/", "/admin/", "/mis-pedidos", "/carrito", "/tiendas", "/tienda/", "/contrato"],
  VENDOR: ["/delivery/", "/admin/"],
  ADMIN: ["/delivery/"],
};

const publicPaths = [
  "/_next",
  "/favicon",
  "/api/auth",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ua = request.headers.get("user-agent");
  const appType = getAppType(ua);

  if (appType === "WEB") {
    return NextResponse.next();
  }

  if (pathname === "/" || pathname === "") {
    return NextResponse.redirect(new URL(portalRoutes[appType], request.url));
  }

  for (const prefix of publicPaths) {
    if (pathname.startsWith(prefix)) {
      return NextResponse.next();
    }
  }

  const blocked = blockedByApp[appType] || [];
  const isBlocked = blocked.some((p) => pathname.startsWith(p));

  if (isBlocked) {
    const loginUrl = new URL(loginRoutes[appType], request.url);
    loginUrl.searchParams.set("blocked", "1");
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
