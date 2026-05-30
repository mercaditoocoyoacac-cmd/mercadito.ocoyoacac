"use client";

import { usePathname } from "next/navigation";
import NProgress from "nprogress";
import { useEffect } from "react";

export function TopLoader() {
  const pathname = usePathname();

  useEffect(() => {
    NProgress.configure({ showSpinner: false, trickleSpeed: 200 });
  }, []);

  useEffect(() => {
    NProgress.start();
    NProgress.done();
  }, [pathname]);

  return null;
}
