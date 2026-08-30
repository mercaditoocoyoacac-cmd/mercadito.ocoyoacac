"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

const SETUP_PATHS = [
  "/vendor/onboarding",
  "/vendor/registro",
  "/vendor/login",
  "/vendor/completar-registro",
];

export function VendorSetupGuard() {
  const pathname = usePathname() ?? "";
  const router = useRouter();

  useEffect(() => {
    if (SETUP_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/vendor/store");
        const data = await res.json();
        if (cancelled) return;
        if (!data?.store) {
          router.replace("/vendor/onboarding");
          return;
        }
        const pres = await fetch("/api/vendor/products");
        const pdata = await pres.json();
        if (cancelled) return;
        if (pdata?.ok && Array.isArray(pdata.products) && pdata.products.length === 0) {
          router.replace("/vendor/completar-registro");
        }
      } catch {
        // noop
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  return null;
}
