"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminRepartidoresClient({ userId }: { userId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<"APP" | "WHATSAPP" | null>(null);

  async function approve(via: "APP" | "WHATSAPP") {
    setLoading(via);
    try {
      const res = await fetch(`/api/admin/repartidores/${userId}/approve-docs`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ via }),
      });
      if (res.ok) {
        router.refresh();
      }
    } catch {}
    setLoading(null);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => approve("APP")}
        disabled={loading !== null}
        className="rounded-lg bg-[var(--accent)] px-3 py-1 text-xs font-semibold text-[var(--on-accent)] transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-60"
      >
        {loading === "APP" ? "Validando..." : "Fotos validadas"}
      </button>
      <button
        type="button"
        onClick={() => approve("WHATSAPP")}
        disabled={loading !== null}
        className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--accent-strong)] px-3 py-1 text-xs font-semibold text-[var(--accent-strong)] transition-colors hover:bg-[var(--accent-soft)] disabled:opacity-60"
      >
        <svg aria-hidden="true" className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 004.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0012.04 2zm5.8 14.09c-.25.69-1.44 1.32-1.98 1.36-.53.05-1.03.24-3.46-.72-2.93-1.15-4.78-4.15-4.92-4.34-.14-.19-1.17-1.55-1.17-2.96 0-1.41.73-2.1 1-2.39.25-.29.55-.36.73-.36.18 0 .37 0 .53.01.17.01.4-.06.62.48.25.6.85 2.06.92 2.21.07.15.12.32.02.51-.09.19-.14.31-.29.48-.15.17-.31.38-.44.51-.15.15-.3.31-.13.6.17.29.76 1.25 1.63 2.02 1.12.99 2.06 1.3 2.35 1.45.29.15.46.12.63-.07.17-.19.73-.85.92-1.14.19-.29.39-.24.65-.15.27.1 1.7.8 1.99.95.29.15.48.22.55.34.07.12.07.7-.18 1.39z" />
        </svg>
        {loading === "WHATSAPP" ? "Validando..." : "Validadas por WhatsApp"}
      </button>
    </div>
  );
}
