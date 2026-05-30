"use client";

import { useState } from "react";

interface Paso {
  icon: string;
  titulo: string;
  campo: string;
  explica: string;
  ejemplo: string;
  tip: string;
}

const PASOS: Paso[] = [
  {
    icon: "💳",
    titulo: "Mercado Pago",
    campo: "Access Token y Public Key",
    explica: "Mercado Pago es el procesador más usado. Necesitas crear una cuenta en Mercado Pago para vendedores y obtener tu Access Token desde el panel de integración.",
    ejemplo: "Access Token: APP_USR-123456... / Public Key: APP_USR-abc123...",
    tip: "Ve a tu cuenta de Mercado Pago → Tu negocio → Configuración → Credenciales. Copia el Access Token de producción (no el de pruebas).",
  },
  {
    icon: "🔵",
    titulo: "Clip",
    campo: "API Key y API Secret",
    explica: "Clip es ideal si ya usas su terminal. Necesitas las credenciales de su panel de desarrolladores. Tus clientes pagarán con link de pago.",
    ejemplo: "API Key: pk_live_xxxx / API Secret: sk_live_xxxx",
    tip: "Las credenciales de Clip las encuentras en clip.mx → Configuración → API. Deben ser las de producción, no pruebas.",
  },
  {
    icon: "🟢",
    titulo: "OpenPay",
    campo: "ID de comercio y API Key",
    explica: "OpenPay requiere un ID de comercio y una llave privada. La llave pública es opcional pero recomendada para que funcione correctamente.",
    ejemplo: "Merchant ID: mzff3... / Private Key: sk_... / Public Key: pk_...",
    tip: "En OpenPay las credenciales están en el panel → Configuración → Llaves de API. Asegúrate de usar las de tu ambiente productivo.",
  },
  {
    icon: "🟠",
    titulo: "BBVA",
    campo: "Client ID, Client Secret, API Key",
    explica: "BBVA requiere registrar tu aplicación en su portal para desarrolladores. Necesitas las tres llaves que te proporcionan al crear la app.",
    ejemplo: "Client ID: 9a8b7c... / Client Secret: d4e5f6... / API Key: ABC123...",
    tip: "En BBVA debes ir a developers.bbva.com, crear una aplicación y solicitar acceso a los APIs de cobro. El proceso puede tomar 1-2 días.",
  },
  {
    icon: "🟣",
    titulo: "Conekta",
    campo: "Public Key y Private Key",
    explica: "Conekta es otro procesador popular en México. Necesitas tu llave pública y privada del panel de Conekta. La llave pública va en el frontend y la privada en el servidor.",
    ejemplo: "Public Key: pk_live_... / Private Key: sk_live_...",
    tip: "En Conekta ve a Panel → Configuración → API. Usa las llaves de Live (producción), no las de test.",
  },
  {
    icon: "✅",
    titulo: "Aprobación del administrador",
    campo: "Esperar revisión",
    explica: "Una vez guardes tus credenciales, el administrador de Mercadito debe aprobarlas antes de que tus clientes puedan pagar con tarjeta en línea. Recibirás notificación cuando esté listo.",
    ejemplo: "Estado: Pendiente → Aprobado",
    tip: "Si ves 'Pendiente' no te preocupes, es normal. El administrador revisará tus datos y activará el método de pago.",
  },
];

export function PagosTutorial({ show }: { show: boolean }) {
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return true;
    return !!localStorage.getItem("pagosTutorialSeen");
  });
  const [paso, setPaso] = useState(0);

  function handleDismiss() {
    setDismissed(true);
    localStorage.setItem("pagosTutorialSeen", "true");
  }

  if (!show || dismissed) return null;

  const current = PASOS[paso];

  return (
    <div className="mb-6 rounded-xl border-2 border-purple-300 bg-gradient-to-br from-purple-50 to-white p-4 shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-purple-600 text-xs font-bold text-white">?</span>
          <span className="text-xs font-medium text-purple-600">
            Paso {paso + 1} de {PASOS.length}
          </span>
        </div>
        <button type="button" onClick={handleDismiss} className="text-xs font-medium text-purple-400 hover:text-purple-600">
          ✕ Cerrar tutorial
        </button>
      </div>

      <div className="mb-3 flex gap-1.5">
        {PASOS.map((_, i) => (
          <div key={i} className={`h-1.5 flex-1 rounded-full ${i === paso ? "bg-purple-500" : i < paso ? "bg-purple-300" : "bg-purple-100"}`} />
        ))}
      </div>

      <div className="rounded-lg border border-purple-100 bg-white p-3">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 text-lg">{current.icon}</span>
          <div className="min-w-0">
            <div className="text-xs text-purple-500 font-medium uppercase tracking-wide">{current.titulo}</div>
            <h3 className="mt-1 text-sm font-semibold text-purple-900">{current.campo}</h3>
            <p className="mt-1 text-sm text-purple-700">{current.explica}</p>
            <div className="mt-2 rounded-md bg-purple-50 px-2.5 py-1.5 text-xs text-purple-600">
              <span className="font-medium">Ejemplo:</span> {current.ejemplo}
            </div>
            <div className="mt-1.5 text-xs text-purple-500">
              💡 {current.tip}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <button
          type="button"
          onClick={paso > 0 ? () => setPaso(paso - 1) : handleDismiss}
          className="text-xs font-medium text-purple-500 hover:text-purple-700"
        >
          {paso > 0 ? "← Anterior" : "Saltar tutorial"}
        </button>
        <button
          type="button"
          onClick={paso < PASOS.length - 1 ? () => setPaso(paso + 1) : handleDismiss}
          className="rounded-lg bg-purple-600 px-4 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-purple-700"
        >
          {paso < PASOS.length - 1 ? "Siguiente →" : "¡Entendido!"}
        </button>
      </div>
    </div>
  );
}
