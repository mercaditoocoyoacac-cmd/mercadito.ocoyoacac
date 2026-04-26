"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

function formatMoney(cents: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(
    cents / 100,
  );
}

const TERMS_TITLE = "AUTORIZACIÓN DE USO DE DATOS Y CONTRATO DE SERVICIO";

const CONTRACT_TERMS = `
El Cliente (Vendedor) autoriza expresamente a Mercadito a utilizar su información comercial para fines de operación de la plataforma:

1. DATOS AUTORIZADOS PARA USO PÚBLICO:
   - Nombre de la tienda
   - Dirección de la tienda
   - Teléfono de contacto
   - Descripción del negocio
   - Imagen del negocio

2. USO AUTORIZADO:
   - Mostrar datos de contacto en la tienda virtual
   - Procesar pedidos y entregas
   - Comunicación con clientes
   - Integración con MercadoPago
   - Propagación en la plataforma

3. LIMITACIÓN DE RESPONSABILIDAD - IMPORTANTE:
   El Prestador (Mercadito) NO se hace responsable por:
   
   a) Uso indebido de la información pública del vendedor por parte de terceros usuarios de la plataforma.
   
   b) Cualquier mal uso que los clientes o terceros hagan de la información pública del vendedor, incluyendo pero no-limitado a: spam, mensajes no deseados, llamadas no solicitadas, o cualquier otra actividad ilegitima.
   
   c) Disputas entre vendedores y clientes.
   
   d) Pérdidas o daños directos o indirectos derivados del uso de los datos públicos del vendedor por terceros.

4. RESPONSABILIDAD DEL VENDEDOR:
   El vendedor entiende que al publicar su información de contacto, esta será visible públicamente y acepta los riesgos asociados.

5. PAGO DEL SERVICIO:
   Costo: $496.00 MXN mensuales (IVA incluido)
   
6. VIGENCIA:
   El contrato tiene vigencia de 1 mes, renovándose automáticamente.

Al aceptar, confirmo que he leído y acepto los términos de uso de mis datos y el contrato de servicio.
`;

type Props = {
  store: {
    id: string;
    name: string;
  };
  subscription: {
    id: string;
    monthlyPriceCents: number;
    contractSigned: boolean;
    contractSignedAt: Date | null;
  } | null;
};

export default function VendorContractForm({ store, subscription }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agreed1, setAgreed1] = useState(false);
  const [agreed2, setAgreed2] = useState(false);
  const [agreed3, setAgreed3] = useState(false);

  const precio = subscription?.monthlyPriceCents || 49600;
  const allAgreed = agreed1 && agreed2 && agreed3;

  async function handleSign(e: React.FormEvent) {
    e.preventDefault();
    if (!allAgreed) {
      setError("Debes aceptar todas las autorizaciones");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/contract/sign", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ storeId: store.id }),
      });
      const data = await res.json();

      if (data.ok) {
        if (data.pdf) {
          const byteCharacters = atob(data.pdf);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: "application/pdf" });
          const url = window.URL.createObjectURL(blob);
          const link = window.document.createElement("a");
          link.href = url;
          link.download = `contrato-${store.name}.pdf`;
          window.document.body.appendChild(link);
          link.click();
          window.document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        }
        router.push("/vendor?contrato=1");
      } else {
        setError(data.error || "Error al firmar");
      }
    } catch {
      setError("Error de conexión");
    }
    setLoading(false);
  }

  return (
    <div className="mt-6 space-y-6">
      <div className="rounded-xl border border-[var(--border)] p-5">
        <h2 className="text-lg font-semibold mb-4">
          {TERMS_TITLE}
        </h2>

        <div className="text-sm text-[color:var(--muted)] mb-4">
          Para usar la plataforma, debes aceptar las siguientes autorizaciones:
        </div>

        <div className="max-h-64 overflow-y-auto rounded-lg bg-gray-50 p-4 text-sm leading-relaxed">
          <pre className="whitespace-pre-wrap font-sans">{CONTRACT_TERMS}</pre>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--border)] p-5 space-y-4">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={agreed1}
            onChange={(e) => setAgreed1(e.target.checked)}
            className="mt-1 h-5 w-5 rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)]"
          />
          <span className="text-sm">
            <strong>Autorización de datos:</strong> Acepto que mi información comercial sea visible públicamente en la plataforma.
          </span>
        </label>

        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={agreed2}
            onChange={(e) => setAgreed2(e.target.checked)}
            className="mt-1 h-5 w-5 rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)]"
          />
          <span className="text-sm">
            <strong>Aceptación de responsabilidad:</strong> Comprendo que Mercadito no se hace responsable por el mal uso de mi información por terceiros.
          </span>
        </label>

        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={agreed3}
            onChange={(e) => setAgreed3(e.target.checked)}
            className="mt-1 h-5 w-5 rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)]"
          />
          <span className="text-sm">
            <strong>Términos del servicio:</strong> Acepto pagar {formatMoney(precio)}/mes por el servicio y cumplir los términos.
          </span>
        </label>
      </div>

      <form className="rounded-xl border border-[var(--border)] p-5" onSubmit={handleSign}>
        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !allAgreed}
          className="w-full rounded-lg bg-[var(--accent)] px-4 py-3 text-base font-semibold text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
        >
          {loading
            ? "Firmando..."
            : `Aceptar y firmar contrato (${formatMoney(precio)}/mes)`}
        </button>

        <p className="mt-3 text-xs text-center text-[color:var(--muted)]">
          Al firmar, se generará un PDF con el contrato que podrás descargar
        </p>
      </form>
    </div>
  );
}