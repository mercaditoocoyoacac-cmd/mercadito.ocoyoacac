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
    }, 3000);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
      window.clearInterval(timer);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-white dark:bg-neutral-900 p-6"
    >
      <div className="flex flex-col items-center text-center max-w-sm">
        <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-500/10">
          <svg
            className="h-10 w-10 text-orange-600 dark:text-orange-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M20 12a8 8 0 11-16 0 8 8 0 0116 0z"
            />
          </svg>
        </div>
        <h2 className="mt-5 text-xl font-bold text-[var(--foreground)]">
          Sin conexión a internet
        </h2>
        <p className="mt-2 text-sm text-[color:var(--muted)]">
          Revisa tu conexión. Esta ventana se cerrará automáticamente cuando se
          restablezca la red.
        </p>
        <div className="mt-6 flex items-center gap-2">
          <span className="h-2 w-2 animate-pulse rounded-full bg-orange-500" />
          <span className="text-xs font-medium text-[color:var(--muted)]">
            Esperando conexión…
          </span>
        </div>
      </div>
    </div>
  );
}