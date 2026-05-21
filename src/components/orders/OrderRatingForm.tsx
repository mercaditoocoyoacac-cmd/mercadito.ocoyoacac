"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className={`h-8 w-8 text-lg transition-colors ${
            star <= value ? "text-yellow-400" : "text-gray-300"
          }`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export default function OrderRatingForm({
  orderId,
  fulfillmentType,
  hasExistingRating,
}: {
  orderId: string;
  fulfillmentType: string;
  hasExistingRating: boolean;
}) {
  const router = useRouter();
  const [storeScore, setStoreScore] = useState(0);
  const [deliveryScore, setDeliveryScore] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(hasExistingRating);
  const [error, setError] = useState("");

  if (done) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-center text-sm text-green-800">
        {hasExistingRating && !submitting ? "Ya calificaste este pedido." : "Gracias por tu calificación."}
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (storeScore === 0) {
      setError("Selecciona una calificación para la tienda");
      return;
    }
    setSubmitting(true);
    setError("");
    const res = await fetch("/api/ratings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, storeScore, deliveryScore: deliveryScore || null, comment: comment || null }),
    });
    const data = await res.json().catch(() => null);
    if (res.ok && data?.ok) {
      setDone(true);
      router.refresh();
    } else {
      setError(data?.error || "Error al guardar calificación");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-[var(--border)] p-4 space-y-4">
      <h3 className="font-semibold">Califica tu pedido</h3>

      <div>
        <label className="mb-1 block text-sm font-medium">Tienda</label>
        <StarInput value={storeScore} onChange={setStoreScore} />
      </div>

      {fulfillmentType === "DELIVERY" && (
        <div>
          <label className="mb-1 block text-sm font-medium">Repartidor</label>
          <StarInput value={deliveryScore} onChange={setDeliveryScore} />
        </div>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium">Comentario (opcional)</label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
          rows={2}
          maxLength={500}
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
      >
        {submitting ? "Enviando..." : "Enviar calificación"}
      </button>
    </form>
  );
}
