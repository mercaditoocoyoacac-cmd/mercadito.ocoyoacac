"use client";

import { useState } from "react";

const STEPS = [
  {
    title: "Bienvenido a tu tienda",
    desc: "Aquí administrarás tus productos, pedidos y pagos. Te guiaremos en los primeros pasos.",
  },
  {
    title: "Agrega tu primer producto",
    desc: "Ve a 'Mis Productos' y haz clic en 'Nuevo'. Pon nombre, precio y una foto para empezar a vender.",
  },
  {
    title: "Revisa tus pedidos",
    desc: "Cuando un cliente compre, aparecerán en 'Pedidos' para que los confirmes y prepares.",
  },
  {
    title: "Configura tus pagos",
    desc: "Para recibir pagos con tarjeta en línea, ve a 'Pagos' y conecta Mercado Pago u otro procesador.",
  },
];

export function VendorCoachMarks() {
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return true;
    return !!localStorage.getItem("vendorCoachSeen");
  });
  const [step, setStep] = useState(0);

  function handleDismiss() {
    setDismissed(true);
    localStorage.setItem("vendorCoachSeen", "true");
  }

  if (dismissed) return null;

  const current = STEPS[step];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs text-[color:var(--muted)]">Paso {step + 1} de {STEPS.length}</span>
          <button type="button" onClick={handleDismiss} className="text-xs text-[color:var(--muted)] hover:text-[var(--foreground)]">
            Saltar tutorial
          </button>
        </div>
        <h3 className="text-lg font-semibold">{current.title}</h3>
        <p className="mt-2 text-sm text-[color:var(--muted)]">{current.desc}</p>
        <div className="mt-6 flex justify-end gap-3">
          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium hover:bg-gray-50"
            >
              Atrás
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
            >
              Siguiente
            </button>
          ) : (
            <button
              type="button"
              onClick={handleDismiss}
              className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
            >
              ¡Empezar!
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
