"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function OrderModifyButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleModify = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/order/modify?orderId=${encodeURIComponent(orderId)}`);
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "No se pudo cargar el pedido para modificarlo.");
        return;
      }
      router.push(`/carrito?modify=${encodeURIComponent(orderId)}`);
    } catch {
      setError("Error de red");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleModify}
        disabled={loading}
        className="rounded-lg border border-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent)] transition-colors hover:bg-[var(--accent-soft)] disabled:opacity-50"
      >
        {loading ? "Cargando..." : "Modificar pedido"}
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <p className="mt-2 text-xs text-[color:var(--muted)]">
        Podrás ajustar tu pedido mientras la tienda aún no lo confirma.
      </p>
    </div>
  );
}