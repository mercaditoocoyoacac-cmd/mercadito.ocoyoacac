import { useState } from "react";

export type AppType = "CLIENTE" | "VENDOR" | "DELIVERY" | "ADMIN" | "WEB";

export function useAppType(): AppType {
  const [appType] = useState<AppType>(() => {
    if (typeof navigator === "undefined") return "WEB";
    return getAppTypeFromUA(navigator.userAgent || "");
  });
  return appType;
}

export function getAppTypeFromUA(ua: string | null): AppType {
  if (!ua) return "WEB";
  if (ua.includes("MercaditoCliente")) return "CLIENTE";
  if (ua.includes("MercaditoVendedor")) return "VENDOR";
  if (ua.includes("MercaditoRepartidor")) return "DELIVERY";
  if (ua.includes("MercaditoAdmin")) return "ADMIN";
  return "WEB";
}

export const roleForApp: Record<AppType, string[]> = {
  CLIENTE: ["CUSTOMER"],
  VENDOR: ["VENDOR", "ADMIN"],
  DELIVERY: ["DELIVERY"],
  ADMIN: ["ADMIN"],
  WEB: ["CUSTOMER", "VENDOR", "DELIVERY", "ADMIN"],
};

export const loginRouteForApp: Record<AppType, string> = {
  CLIENTE: "/login",
  VENDOR: "/vendor/login",
  DELIVERY: "/delivery/login",
  ADMIN: "/admin/login",
  WEB: "/login",
};

export const registerRouteForApp: Record<AppType, string> = {
  CLIENTE: "/registro",
  VENDOR: "/vendor/registro",
  DELIVERY: "/delivery/registro",
  ADMIN: "/admin/registro",
  WEB: "/registro",
};

export const protectedRoutes: Record<AppType, string[]> = {
  CLIENTE: ["/mis-pedidos", "/perfil", "/carrito"],
  VENDOR: ["/vendor"],
  DELIVERY: ["/delivery"],
  ADMIN: ["/admin"],
  WEB: [],
};
