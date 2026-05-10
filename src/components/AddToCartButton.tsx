"use client";

import { useState } from "react";

function formatMoney(cents: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(cents / 100);
}

interface Variant {
  id: string;
  name: string;
  priceCents: number;
}

export function AddToCartButton({ productId, variants, disabled, disabledLabel }: { productId: string; variants?: Variant[]; disabled?: boolean; disabledLabel?: string }) {
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const hasVariants = variants && variants.length > 0;
  const canAdd = hasVariants ? selectedVariantId !== null : true;
  const isBlocked = disabled || loading || !canAdd;
  const label = disabledLabel || (disabled ? "No disponible" : "Agregar");

  return (
    <div className="flex flex-col gap-2">
      {hasVariants && (
        <select
          value={selectedVariantId || ""}
          onChange={(e) => setSelectedVariantId(e.target.value || null)}
          className="w-full rounded-md border border-[var(--border)] bg-white px-2 py-1.5 text-xs outline-none focus:border-[var(--accent)]"
        >
          <option value="">Selecciona una opción</option>
          {variants.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name} — {formatMoney(v.priceCents)}
            </option>
          ))}
        </select>
      )}
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
              body: JSON.stringify({
                productId,
                quantity: 1,
                variantId: selectedVariantId || undefined,
              }),
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
    </div>
  );
}
