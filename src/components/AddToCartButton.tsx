"use client";

import { useState } from "react";

export function AddToCartButton({ productId, disabled, disabledLabel }: { productId: string; disabled?: boolean; disabledLabel?: string }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const isBlocked = disabled || loading;
  const label = disabledLabel || (disabled ? "No disponible" : "Agregar");

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={isBlocked}
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
        className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
          disabled
            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
            : "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
        } disabled:opacity-60`}
      >
        {loading ? "..." : label}
      </button>
      {message ? (
        <span className="text-xs text-[color:var(--muted)]">
          {message}
        </span>
      ) : null}
    </div>
  );
}

