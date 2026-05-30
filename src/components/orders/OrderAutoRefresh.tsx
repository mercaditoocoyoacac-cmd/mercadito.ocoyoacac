"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function OrderAutoRefresh({ status }: { status: string }) {
  const router = useRouter();

  useEffect(() => {
    if (status !== "OUT_FOR_DELIVERY") return;

    const interval = setInterval(() => {
      router.refresh();
    }, 5000);

    return () => clearInterval(interval);
  }, [status, router]);

  return null;
}
