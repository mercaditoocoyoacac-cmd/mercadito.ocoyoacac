"use client";

import { useEffect } from "react";

const APP_REDIRECTS: Record<string, string> = {
  MercaditoCliente: "/tiendas",
  MercaditoVendedor: "/vendor",
  MercaditoRepartidor: "/delivery",
  MercaditoAdmin: "/admin",
};

export default function AppRedirectChecker() {
  useEffect(() => {
    const ua = navigator.userAgent;
    for (const [key, path] of Object.entries(APP_REDIRECTS)) {
      if (ua.includes(key)) {
        window.location.replace(path);
        return;
      }
    }
  }, []);

  return null;
}
