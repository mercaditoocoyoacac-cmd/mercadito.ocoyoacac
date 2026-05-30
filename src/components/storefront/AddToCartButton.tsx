"use client";

import { memo, useState } from "react";
import { formatMoney } from "@/lib/format";

interface Variant {
  id: string;
  name: string;
  priceCents: number;
}

export const AddToCartButton = memo(function AddToCartButton({
  productId,
  variants,
  disabled,
  disabledLabel,
  sellByWeight,
  minWeightGrams,
  maxWeightGrams,
  priceCents,
}: {
  productId: string;
  variants?: Variant[];
  disabled?: boolean;
  disabledLabel?: string;
  sellByWeight?: boolean;
  minWeightGrams?: number;
  maxWeightGrams?: number;
  priceCents?: number;
}) {
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [weightGrams, setWeightGrams] = useState<number>(minWeightGrams || 500);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const hasVariants = variants && variants.length > 0;
  const canAdd = hasVariants ? selectedVariantId !== null : true;
  const isBlocked = disabled || loading || !canAdd;
  const label = disabledLabel || (disabled ? "No disponible" : "Agregar");

  const effectivePriceCents = hasVariants && selectedVariantId
    ? variants!.find((v) => v.id === selectedVariantId)?.priceCents ?? priceCents ?? 0
    : priceCents ?? 0;

  const estimatedTotal = sellByWeight
    ? Math.round((weightGrams / 1000) * effectivePriceCents)
    : null;

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
      <div className="flex items-center gap-2 flex-wrap">
        {sellByWeight && (
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={minWeightGrams || 100}
              max={maxWeightGrams || 5000}
              step={50}
              value={weightGrams}
              onChange={(e) => setWeightGrams(Number(e.target.value) || (minWeightGrams || 100))}
              className="w-20 rounded-md border border-[var(--border)] bg-white px-2 py-1.5 text-xs text-center outline-none focus:border-[var(--accent)]"
            />
            <span className="text-xs text-[color:var(--muted)]">gramos</span>
          </div>
        )}
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
                weightGrams: sellByWeight ? weightGrams : undefined,
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
        {estimatedTotal !== null && estimatedTotal > 0 && (
          <span className="text-xs font-medium text-[var(--accent)]">
            ≈ {formatMoney(estimatedTotal)}
          </span>
        )}
        {message ? (
          <span className="text-xs text-[color:var(--muted)]">
            {message}
          </span>
        ) : null}
      </div>
    </div>
  );
});
