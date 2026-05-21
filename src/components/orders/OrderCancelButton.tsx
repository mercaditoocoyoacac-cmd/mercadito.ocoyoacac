"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  orderId: string;
  createdAt: string;
}

export function OrderCancelButton({ orderId, createdAt }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const createdAtMs = new Date(createdAt).getTime();
  const nowMs = Date.now();
  const minutesSince = (nowMs - createdAtMs) / 60000;

  const canCancel = minutesSince < 10 || minutesSince > 30;

  const handleCancel = async () => {
    if (!confirm("¿Estás seguro de cancelar este pedido?")) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/order/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Error al cancelar");
      } else {
        setDone(true);
        router.refresh();
      }
    } catch {
      setError("Error de red");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Pedido cancelado exitosamente.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--border)] p-4">
      {canCancel ? (
        <>
          <p className="text-sm text-[color:var(--muted)] mb-3">
            {minutesSince < 10
              ? "Puedes cancelar este pedido dentro de los primeros 10 minutos."
              : "El vendedor no ha respondido. Puedes cancelar el pedido."}
          </p>
          <button
            type="button"
            onClick={handleCancel}
            disabled={loading}
            className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
          >
            {loading ? "Cancelando..." : "Cancelar pedido"}
          </button>
        </>
      ) : (
        <p className="text-sm text-[color:var(--muted)]">
          El pedido está en revisión. Si el vendedor no responde en{" "}
          {Math.ceil(30 - minutesSince)} minutos, podrás cancelarlo.
        </p>
      )}

      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
