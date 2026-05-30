"use client";

import { useState } from "react";

interface StepGuide {
  icon: string;
  title: string;
  field: string;
  explica: string;
  ejemplo: string;
  tip: string;
}

const PASOS: StepGuide[] = [
  {
    icon: "✏️",
    title: "Nombre y descripción",
    field: "Nombre del producto",
    explica: "Pon el nombre exacto como lo conocen tus clientes. Por ejemplo, si vendes 'Concha de vainilla', no pongas solo 'Pan'. La descripción es opcional pero ayuda a que el cliente sepa qué incluye.",
    ejemplo: "Concha de vainilla grande",
    tip: "Entre más claro el nombre, más fácil será que los clientes te encuentren en la búsqueda.",
  },
  {
    icon: "📸",
    title: "Foto del producto",
    field: "Imagen del producto",
    explica: "Sube una foto clara de tu producto. Los productos con foto se venden hasta 3 veces más. No importa si la tomas con el celular, con buena luz y de frente basta.",
    ejemplo: "Foto de frente, buena luz, fondo limpio",
    tip: "Si vendes varios iguales, muestra solo uno. Si es comida, procura que se vea apetitosa.",
  },
  {
    icon: "⚖️",
    title: "Venta por peso (opcional)",
    field: "Precio por kg / gramos",
    explica: "Si vendes por kilo (carnicería, verdulería, frutería), activa 'Venta por peso'. El cliente elegirá los gramos que quiere y pagará solo por esa cantidad.",
    ejemplo: "Precio: $50/kg, cliente pide 500g → paga $25",
    tip: "Define un mínimo y máximo de gramos para evitar que pidan cantidades muy pequeñas o muy grandes.",
  },
  {
    icon: "📋",
    title: "Variantes (opcional)",
    field: "Variantes del producto",
    explica: "Si un producto viene en diferentes presentaciones con distintos precios, agrega variantes. Por ejemplo, 'Huevo' puede ser de 12 piezas o 30 piezas.",
    ejemplo: "Variante 1: 12 piezas - $35 / Variante 2: 30 piezas - $75",
    tip: "No uses variantes para sabores (ej. 'Coca-Cola sabor original' vs 'Coca-Cola light'). Es mejor crear productos separados en ese caso.",
  },
  {
    icon: "🏷️",
    title: "SKU y existencia",
    field: "Clave interna y stock",
    explica: "El SKU es un código que tú inventas para llevar tu control de inventario (ej. 'CON-001'). La existencia es cuántos tienes disponibles. Si pones -1 significa que tienes inventario ilimitado.",
    ejemplo: "SKU: CON-001 / Existencia: 50",
    tip: "Si también vendes en tu tienda física, pon el número real para no vender algo que no tengas.",
  },
];

export function ProductoTutorial({ show }: { show: boolean }) {
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return true;
    return !!localStorage.getItem("productoTutorialSeen");
  });
  const [paso, setPaso] = useState(0);

  function handleDismiss() {
    setDismissed(true);
    localStorage.setItem("productoTutorialSeen", "true");
  }

  if (!show || dismissed) return null;

  const current = PASOS[paso];

  return (
    <div className="mb-6 rounded-xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 to-white p-4 shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">?</span>
          <span className="text-xs font-medium text-emerald-600">
            Paso {paso + 1} de {PASOS.length}
          </span>
        </div>
        <button type="button" onClick={handleDismiss} className="text-xs font-medium text-emerald-400 hover:text-emerald-600">
          ✕ Cerrar tutorial
        </button>
      </div>

      <div className="mb-3 flex gap-1.5">
        {PASOS.map((_, i) => (
          <div key={i} className={`h-1.5 flex-1 rounded-full ${i === paso ? "bg-emerald-500" : i < paso ? "bg-emerald-300" : "bg-emerald-100"}`} />
        ))}
      </div>

      <div className="rounded-lg border border-emerald-100 bg-white p-3">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 text-lg">{current.icon}</span>
          <div className="min-w-0">
            <div className="text-xs text-emerald-500 font-medium uppercase tracking-wide">{current.title}</div>
            <h3 className="mt-1 text-sm font-semibold text-emerald-900">{current.field}</h3>
            <p className="mt-1 text-sm text-emerald-700">{current.explica}</p>
            <div className="mt-2 rounded-md bg-emerald-50 px-2.5 py-1.5 text-xs text-emerald-600">
              <span className="font-medium">Ejemplo:</span> {current.ejemplo}
            </div>
            <div className="mt-1.5 text-xs text-emerald-500">
              💡 {current.tip}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <button
          type="button"
          onClick={paso > 0 ? () => setPaso(paso - 1) : handleDismiss}
          className="text-xs font-medium text-emerald-500 hover:text-emerald-700"
        >
          {paso > 0 ? "← Anterior" : "Saltar tutorial"}
        </button>
        <button
          type="button"
          onClick={paso < PASOS.length - 1 ? () => setPaso(paso + 1) : handleDismiss}
          className="rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-emerald-700"
        >
          {paso < PASOS.length - 1 ? "Siguiente campo →" : "¡Entendido!"}
        </button>
      </div>
    </div>
  );
}
