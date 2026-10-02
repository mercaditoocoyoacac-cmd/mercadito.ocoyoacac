"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminRepartidoresClient({ userId }: { userId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function approve() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/repartidores/${userId}/approve-docs`, { method: "POST" });
      if (res.ok) {
        router.refresh();
      }
    } catch {}
    setLoading(false);
  }

  return (
    <button
      onClick={approve}
      disabled={loading}
      className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
    >
      {loading ? "Validando..." : "Fotos validadas"}
    </button>
  );
}