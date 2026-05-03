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

const loginRoutes: Record<string, string> = {
  CLIENTE: "/login",
  VENDOR: "/vendor/login",
  DELIVERY: "/delivery/login",
  ADMIN: "/admin/login",
  WEB: "/login",
};

const registerRoutes: Record<string, string> = {
  CLIENTE: "/registro",
  VENDOR: "/vendor/registro",
  DELIVERY: "/delivery/registro",
  ADMIN: "/admin/registro",
  WEB: "/registro",
};

const allowedRoutes: Record<string, string[]> = {
  CLIENTE: ["/", "/tiendas", "/tienda/", "/carrito", "/mis-pedidos", "/perfil", "/login", "/registro", "/api/", "/pedido/"],
  VENDOR: ["/", "/vendor", "/vendor/login", "/vendor/registro", "/vendor/onboarding", "/vendor/upgrade", "/vendor/mi-tienda", "/vendor/productos", "/vendor/pedidos", "/vendor/mercado-pago", "/vendor/onboarding", "/api/", "/tienda/", "/carrito", "/perfil", "/mis-pedidos", "/contrato", "/pedido/"],
  DELIVERY: ["/", "/delivery", "/delivery/login", "/delivery/registro", "/delivery/escanear", "/api/", "/perfil", "/login", "/registro"],
  ADMIN: ["/", "/admin", "/admin/login", "/admin/registro", "/admin/membresias", "/admin/aprobacion", "/admin/contratos", "/admin/usuarios", "/admin/pedidos", "/admin/mercado-pago", "/api/", "/vendor/pedidos", "/vendor/mercado-pago", "/contrato", "/perfil"],
  WEB: [],
};

const publicPaths = [
  "/tiendas",
  "/tienda/",
  "/",
  "/login",
  "/registro",
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

  const isPublic = publicPaths.some(
    (p) => pathname === p || pathname.startsWith(p)
  );

  const allowed = allowedRoutes[appType] || [];
  const isAllowed = allowed.some(
    (p) => pathname === p || pathname.startsWith(p)
  );

  if (!isAllowed && !isPublic) {
    const loginUrl = new URL(loginRoutes[appType], request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
