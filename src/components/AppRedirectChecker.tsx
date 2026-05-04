"use client";

import { useEffect } from "react";

const APP_REDIRECTS: Record<string, string> = {
  MercaditoCliente: "/",
  MercaditoVendedor: "/portal/vendedor",
  MercaditoRepartidor: "/portal/repartidor",
  MercaditoAdmin: "/portal/admin",
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
