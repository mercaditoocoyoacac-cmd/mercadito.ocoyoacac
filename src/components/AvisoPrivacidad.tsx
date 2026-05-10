"use client";

import { useState } from "react";
import { formatDateInMexico } from "@/lib/dates";

export default function AvisoPrivacidad() {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-[color:var(--muted)] underline hover:text-[color:var(--foreground)]"
      >
        Aviso de privacidad
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Aviso de Privacidad</h2>
          <button
            onClick={() => setOpen(false)}
            className="text-gray-500 hover:text-gray-700 text-xl"
          >
            ×
          </button>
        </div>

        <div className="space-y-4 text-sm text-gray-600">
          <p>
            <strong>Mercadito</strong> respects tu privacidad. Este aviso explica cómo recopilamos, usamos y protegemos tu información.
          </p>

          <div>
            <h3 className="font-semibold text-gray-900">Información que Recopilamos</h3>
            <ul className="mt-1 list-disc pl-4 space-y-1">
              <li>Información de cuenta (nombre, correo, teléfono)</li>
              <li>Información del negocio (nombre de tienda, dirección, descripción)</li>
              <li>Datos de pedidos y pagos</li>
              <li>Información del dispositivo y acceso</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900">Cómo Usamos Tu Información</h3>
            <ul className="mt-1 list-disc pl-4 space-y-1">
              <li>Prestar y operar nuestros servicios</li>
              <li>Procesar pedidos y pagos</li>
              <li>Comunicarte sobre pedidos</li>
              <li>Mejorar nuestros servicios</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900">Información Pública</h3>
            <p className="mt-1">
              Al firmar el contrato de servicio, nos autorizas a mostrar tu información comercial (nombre de tienda, dirección, teléfono, descripción) públicamente en la plataforma Mercadito para fines operativos.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900">Protección de Datos</h3>
            <p className="mt-1">
              Implementamos medidas de seguridad para proteger tus datos. Sin embargo, no somos responsables por acceso no autorizado a tu información pública por terceros.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900">Tus Derechos</h3>
            <ul className="mt-1 list-disc pl-4 space-y-1">
              <li>Acceder a tus datos personales</li>
              <li>Solicitar corrección de datos</li>
              <li>Solicitar eliminación de datos</li>
              <li>Optarte por no recibir comunicaciones de marketing</li>
            </ul>
          </div>

          <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
            <h3 className="font-semibold text-yellow-800">Limitación de Responsabilidad</h3>
            <p className="mt-1 text-yellow-700 text-xs">
              Mercadito no se hace responsable por el uso indebido de tu información pública (nombre, dirección, teléfono) por parte de terceros usuarios de la plataforma. Es tu responsabilidad evaluar a tus clientes.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900">Contacto</h3>
            <p className="mt-1">
              Para preguntas sobre privacidad, contacta: mercadito@ocoyoacac.com
            </p>
          </div>

          <p className="text-xs text-gray-500 mt-4">
            Última actualización: {formatDateInMexico(new Date())}
          </p>
        </div>

        <button
          onClick={() => setOpen(false)}
          className="mt-6 w-full rounded-lg bg-[var(--accent)] px-4 py-2 text-white hover:bg-[var(--accent-hover)]"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}