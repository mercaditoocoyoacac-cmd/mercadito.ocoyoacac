"use client";

import { useEffect, useState } from "react";

export function OfflineDetector() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setOffline(!navigator.onLine);

    const handleOffline = () => setOffline(true);
    const handleOnline = () => setOffline(false);

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    const timer = window.setInterval(() => {
      setOffline(!navigator.onLine);
    }, 5000);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
      window.clearInterval(timer);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{ top: "calc(4rem + env(safe-area-inset-top, 0px))" }}
      className="fixed inset-x-0 z-[9999] flex items-center justify-center gap-2 bg-[var(--accent)] px-4 py-2 text-center text-sm font-medium text-[var(--on-accent)] shadow-md"
    >
      <svg aria-hidden="true" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M8.5 8.5A8 8 0 0012 20a8 8 0 005.5-2.2M5.3 5.3A8 8 0 0119.5 12" />
      </svg>
      Sin conexión. Mostrando la información guardada en este dispositivo.
    </div>
  );
}
