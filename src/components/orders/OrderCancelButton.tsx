"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getCancellationBlockMessage } from "@/lib/orderCancellation";

interface Props {
  orderId: string;
  status: string;
}

const REASONS = [
  "Cambié de opinión",
  "Encontré mejor opción en otro lugar",
  "El pedido fue un error",
  "El tiempo de espera es muy largo",
  "Problema con el pago",
  "Otro",
];

export function OrderCancelButton({ orderId, status }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [reason, setReason] = useState("");
  const [detail, setDetail] = useState("");

  const blockMessage = getCancellationBlockMessage(status);
  const canCancel = blockMessage === null;
  const info = canCancel
    ? "Puedes modificar o cancelar tu pedido antes de que la tienda lo confirme."
    : blockMessage;

  const fullReason = detail.trim()
    ? `${reason}: ${detail.trim()}`
    : reason;

  const handleCancel = async () => {
    if (!fullReason || fullReason.trim().length < 3) {
      setError("Selecciona el motivo de tu cancelación.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/order/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, reason: fullReason }),
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
      <p className="text-sm text-[color:var(--muted)] mb-3">{info}</p>

      {canCancel ? (
        !showForm ? (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
          >
            Cancelar pedido
          </button>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-[color:var(--muted)] mb-1">
                ¿Cuál es el motivo de tu cancelación? *
              </label>
              <select aria-label="Selecciona una opción"
                value={reason}
                onChange={(e) => { setReason(e.target.value); setError(""); }}
                className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
              >
                <option value="">Selecciona una opción</option>
                {REASONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[color:var(--muted)] mb-1">
                Detalle (opcional)
              </label>
              <textarea aria-label="Cuéntanos un poco más"
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm resize-none"
                placeholder="Cuéntanos un poco más"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium opacity-70"
              >
                Atrás
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={loading}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? "Cancelando..." : "Confirmar cancelación"}
              </button>
            </div>
          </div>
        )
      ) : (
        <p className="text-sm text-[color:var(--muted)]">
          Si tienes algún problema con tu pedido, contacta directamente a la tienda.
        </p>
      )}
    </div>
  );
}
