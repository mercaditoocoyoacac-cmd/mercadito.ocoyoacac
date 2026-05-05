"use client";

import { useState } from "react";

export function StockToggle({ productId, initial }: { productId: string; initial: boolean }) {
  const [agotado, setAgotado] = useState(initial);
  const [loading, setLoading] = useState(false);

  return (
    <button
      type="button"
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        try {
          const res = await fetch(`/api/vendor/products/${productId}`, {
            method: "PATCH",
          });
          const data = (await res.json().catch(() => null)) as {
            ok?: boolean;
            isUnavailable?: boolean;
          } | null;
          if (data?.ok && typeof data.isUnavailable === "boolean") {
            setAgotado(data.isUnavailable);
          }
        } finally {
          setLoading(false);
        }
      }}
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
        agotado
          ? "bg-red-100 text-red-700 hover:bg-red-200"
          : "bg-green-100 text-green-700 hover:bg-green-200"
      } disabled:opacity-50`}
    >
      <span className={`h-2 w-2 rounded-full ${agotado ? "bg-red-500" : "bg-green-500"}`} />
      {loading ? "..." : agotado ? "Agotado" : "Disponible"}
    </button>
  );
}
