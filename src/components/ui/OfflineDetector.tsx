"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

export function OfflineDetector() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    setOffline(!navigator.onLine);

    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);

    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);

    const interval = setInterval(() => {
      setOffline(!navigator.onLine);
    }, 5000);

    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
      clearInterval(interval);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white px-6">
      <div className="flex flex-col items-center gap-6 max-w-sm text-center">
        <Image
          src="/logo.png"
          alt="Mercadito Ocoyoacac"
          width={120}
          height={120}
          className="rounded-2xl"
          priority
        />

        <h1 className="text-2xl font-bold text-gray-800">
          Sin conexión a internet
        </h1>

        <p className="text-gray-500 leading-relaxed">
          Verifica tu conexión e intenta de nuevo.
        </p>

        <p className="text-sm text-gray-400">
          Disculpe los inconvenientes.
        </p>

        <button
          onClick={() => window.location.reload()}
          className="mt-2 rounded-xl bg-[var(--accent)] px-8 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:bg-[var(--accent-hover)] hover:scale-105 active:scale-95"
        >
          Reintentar
        </button>
      </div>
    </div>
  );
}
