"use client";

import { useState } from "react";

export function AddToCartButton({ productId }: { productId: string }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={loading}
        onClick={async () => {
          setLoading(true);
          setMessage(null);
          const res = await fetch("/api/cart/items", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ productId, quantity: 1 }),
          });
          const data = (await res.json().catch(() => null)) as
            | { ok: boolean; error?: string }
            | null;
          setLoading(false);
          if (res.status === 401) {
            setMessage("Inicia sesión para agregar al carrito.");
            return;
          }
          if (!res.ok || !data?.ok) {
            setMessage(data?.error ?? "No se pudo agregar.");
            return;
          }
          setMessage("Agregado.");
          setTimeout(() => setMessage(null), 1500);
        }}
        className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-60"
      >
        {loading ? "..." : "Agregar"}
      </button>
      {message ? (
        <span className="text-xs text-[color:var(--muted)]">
          {message}
        </span>
      ) : null}
    </div>
  );
}

