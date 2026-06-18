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

type ScoreField = { label: string; key: "storeScore" | "packagingScore" | "completenessScore" | "deliveryScore" | "timelinessScore"; show: boolean };

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
  const [scores, setScores] = useState<Record<string, number>>({});
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(hasExistingRating);
  const [error, setError] = useState("");

  const isDelivery = fulfillmentType === "DELIVERY";

  const questions: ScoreField[] = [
    { label: "¿Cómo calificas tu pedido?", key: "storeScore", show: true },
    { label: "¿El pedido estaba bien empaquetado?", key: "packagingScore", show: true },
    { label: "¿Llegó completo?", key: "completenessScore", show: true },
    { label: "¿El repartidor llegó en buen tiempo?", key: "timelinessScore", show: isDelivery },
    { label: "Calificación del repartidor", key: "deliveryScore", show: isDelivery },
  ];

  function setScore(key: string, val: number) {
    setScores(prev => ({ ...prev, [key]: val }));
  }

  if (done) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-center text-sm text-green-800">
        {hasExistingRating && !submitting ? "Ya calificaste este pedido." : "Gracias por tu calificación."}
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!scores.storeScore) {
      setError("Califica tu pedido");
      return;
    }
    setSubmitting(true);
    setError("");
    const res = await fetch("/api/ratings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId,
        storeScore: scores.storeScore,
        packagingScore: scores.packagingScore || null,
        completenessScore: scores.completenessScore || null,
        deliveryScore: scores.deliveryScore || null,
        timelinessScore: scores.timelinessScore || null,
        comment: comment || null,
      }),
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
    <form onSubmit={handleSubmit} className="rounded-xl border border-[var(--border)] p-6 space-y-5">
      <div className="text-center">
        <div className="text-2xl mb-2">📝</div>
        <h3 className="text-lg font-semibold">¿Cómo fue tu experiencia?</h3>
        <p className="text-sm text-[color:var(--muted)] mt-1">
          Tu opinión nos ayuda a mejorar
        </p>
      </div>

      <div className="space-y-4">
        {questions.filter(q => q.show).map(q => (
          <div key={q.key}>
            <label className="mb-1.5 block text-sm font-medium">{q.label}</label>
            <StarInput value={scores[q.key] || 0} onChange={(v) => setScore(q.key, v)} />
          </div>
        ))}
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium">Comentario adicional (opcional)</label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
          rows={3}
          maxLength={500}
          placeholder="Cuéntanos más sobre tu experiencia..."
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
      >
        {submitting ? "Enviando..." : "Enviar calificación"}
      </button>
    </form>
  );
}
