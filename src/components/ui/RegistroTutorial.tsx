"use client";

import { useState, useEffect, useRef } from "react";

interface FieldGuide {
  title: string;
  field: string;
  ejemplo: string;
  explica: string;
}

const GUIAS: Record<number, FieldGuide[]> = {
  0: [
    { title: "Nombre", field: "Nombre o nombre del negocio", ejemplo: "Panadería La Esquina", explica: "Pon el nombre de tu negocio tal como lo conocen tus clientes. No es necesario registrar razón social." },
    { title: "Correo", field: "Correo electrónico", ejemplo: "tu@negocio.com", explica: "Aquí recibirás notificaciones de pedidos nuevos. Usa uno que revises seguido." },
    { title: "Teléfono", field: "Teléfono", ejemplo: "7221234567", explica: "Los clientes te llamarán aquí si tienen dudas con su pedido." },
    { title: "Contraseña", field: "Contraseña", ejemplo: "Mínimo 8 caracteres", explica: "Elige una contraseña segura que puedas recordar. Mezcla letras y números." },
  ],
  1: [
    { title: "Logo", field: "Logo de la tienda", ejemplo: "Foto de tu negocio", explica: "Sube una foto clara de tu negocio o un logotipo. Los productos con logo de tienda generan más confianza." },
    { title: "Nombre", field: "Nombre de la tienda", ejemplo: "Panadería La Esquina", explica: "Así aparecerá tu tienda en la aplicación. Pon el nombre que tus clientes conocen." },
    { title: "Categoría", field: "Categoría", ejemplo: "Canasta básica, Frutas y verduras...", explica: "Elige la categoría que mejor describa lo que vendes. Esto ayuda a los clientes a encontrarte." },
    { title: "Descripción", field: "Descripción (opcional)", ejemplo: "Vendemos pan artesanal de lunes a sábado de 8am a 8pm", explica: "Cuéntales a los clientes qué vendes, tu horario, y todo lo que quieras que sepan." },
    { title: "Teléfono y dirección", field: "Teléfono y dirección", ejemplo: "722... / Centro, Ocoyoacac", explica: "El teléfono es para que los clientes te contacten. La dirección ayuda a calcular el costo de envío." },
  ],
  2: [
    { title: "Producto", field: "Nombre del producto", ejemplo: "Concha de vainilla", explica: "Agrega al menos un producto para que tu tienda no se vea vacía. Después puedes agregar más desde 'Mis Productos'." },
    { title: "Precio", field: "Precio", ejemplo: "25.00", explica: "Pon el precio en pesos. Solo números, sin comas ni símbolos." },
  ],
};

export function RegistroTutorial({ formStep }: { formStep: number }) {
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return true;
    return !!localStorage.getItem("registroTutorialSeen");
  });
  const [guideIdx, setGuideIdx] = useState(0);
  const prevRef = useRef(formStep);

  useEffect(() => {
    if (formStep !== prevRef.current) {
      prevRef.current = formStep;
      const id = setTimeout(() => setGuideIdx(0), 0);
      return () => clearTimeout(id);
    }
  }, [formStep]);

  function handleDismiss() {
    setDismissed(true);
    localStorage.setItem("registroTutorialSeen", "true");
  }

  if (dismissed) return null;

  const guias = GUIAS[formStep];
  if (!guias) return null;

  const current = guias[guideIdx];

  return (
    <div className="mb-6 rounded-xl border-2 border-blue-300 bg-gradient-to-br from-blue-50 to-white p-4 shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">?</span>
          <span className="text-xs font-medium text-blue-600">
            Paso {guideIdx + 1} de {guias.length}
          </span>
        </div>
        <button type="button" onClick={handleDismiss} className="text-xs font-medium text-blue-400 hover:text-blue-600">
          ✕ Cerrar tutorial
        </button>
      </div>

      <div className="mb-3 flex gap-1.5">
        {guias.map((_, i) => (
          <div key={i} className={`h-1.5 flex-1 rounded-full ${i === guideIdx ? "bg-blue-500" : i < guideIdx ? "bg-blue-300" : "bg-blue-100"}`} />
        ))}
      </div>

      <div className="rounded-lg border border-blue-100 bg-white p-3">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 text-lg">{["✏️", "📸", "📦", "📝", "📍", "🛍️", "💰"][guideIdx] ?? "📌"}</span>
          <div className="min-w-0">
            <div className="text-xs text-blue-500 font-medium uppercase tracking-wide">{current.title}</div>
            <h3 className="mt-1 text-sm font-semibold text-blue-900">{current.field}</h3>
            <p className="mt-1 text-sm text-blue-700">{current.explica}</p>
            <div className="mt-2 rounded-md bg-blue-50 px-2.5 py-1.5 text-xs text-blue-600">
              <span className="font-medium">Ejemplo:</span> {current.ejemplo}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <button
          type="button"
          onClick={guideIdx > 0 ? () => setGuideIdx(guideIdx - 1) : handleDismiss}
          className="text-xs font-medium text-blue-500 hover:text-blue-700"
        >
          {guideIdx > 0 ? "← Anterior" : "Saltar tutorial"}
        </button>
        <button
          type="button"
          onClick={guideIdx < guias.length - 1 ? () => setGuideIdx(guideIdx + 1) : handleDismiss}
          className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
        >
          {guideIdx < guias.length - 1 ? "Siguiente campo →" : "¡Entendido!"}
        </button>
      </div>
    </div>
  );
}
