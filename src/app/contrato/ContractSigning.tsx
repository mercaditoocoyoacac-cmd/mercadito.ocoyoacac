"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

function formatMoney(cents: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(
    cents / 100,
  );
}

const CONTRACT_TERMS = `
CONTRATO DE PRESTACIÓN DE SERVICIOS DE COMERCIO ELECTRÓNICO

En Ocoyoacac, Estado de México, a {fecha}.

PARTES:
PRESTADOR: Mercadito - Plataforma de comercio electrónico
CLIENTE: {nombreTienda}

OBJETO DEL CONTRATO:
El Prestador otorga al Cliente acceso a la plataforma Mercadito para la gestión de ventas en línea, 
incluyendo:
- Tienda virtual personalizada
- Gestión de productos y pedidos
- Sistema de pagos en línea (MercadoPago)
- Panel de administración
- Soporte técnico básico

COSTO DEL SERVICIO:
El Cliente se compromete a pagar la cantidad de {precio} MXN (IVA incluido) 
de manera mensual, mediante el método de pago registrado.

PLAZO:
El contrato tendrá vigencia de un mes calendario, renovándose automáticamente 
siempre que el servicio esté vigente y al corriente de pagos.

OBLIGACIONES DEL CLIENTE:
- Proporcionar información verídica y actualizada de su negocio
- Mantener productos stocks actualizados
- Respetar los términos de servicio de la plataforma
- No realizar actividades ilegítimas

OBLIGACIONES DEL PRESTADOR:
- Mantener la plataforma operativa 24/7
- Brindar soporte técnico en horario laboral
- Procesar pagos conforme a las políticas de MercadoPago
- Protezer datos del cliente conforme a la ley LGPD

LIMITACIÓN DE RESPONSABILIDAD:
El Prestador no será responsable por pérdidas directas o indirectas 
derivadas del uso de la plataforma. La responsabilidad máxima不会出现 
excederá el monto pagado por el servicio en el mes correspondiente.

CANCELACIÓN:
Cualquier parte puede terminate el contrato con 30 días de anticipación. 
En caso de mora superior a 15 días, el Prestador podrá suspende el servicio.

Acepto los términos y condiciones establecidos en este contrato.
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

export default function ContractSigning({ store, subscription }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);

  const precio = subscription?.monthlyPriceCents || 49600;
  const today = new Date();
  const fecha = today.toLocaleDateString("es-MX", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const terms = CONTRACT_TERMS.replace(/{fecha}/g, fecha)
    .replace(/{nombreTienda}/g, store.name)
    .replace(/{precio}/g, formatMoney(precio));

  async function handleSign(e: React.FormEvent) {
    e.preventDefault();
    if (!agreed) {
      setError("Debes aceptar los términos del contrato");
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
        router.refresh();
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
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Términos y Condiciones</h2>
          <span className="text-sm text-[color:var(--muted)]">
            Costo: <span className="font-semibold">{formatMoney(precio)}/mes</span>
          </span>
        </div>

        <div className="max-h-64 overflow-y-auto rounded-lg bg-gray-50 p-4 text-sm leading-relaxed">
          <pre className="whitespace-pre-wrap font-sans">{terms}</pre>
        </div>
      </div>

      <form className="rounded-xl border border-[var(--border)] p-5" onSubmit={handleSign}>
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-1 h-5 w-5 rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)]"
          />
          <span className="text-sm">
            Acepto los términos y condiciones del contrato de servicio
          </span>
        </label>

        {error && (
          <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !agreed}
          className="mt-4 w-full rounded-lg bg-[var(--accent)] px-4 py-3 text-base font-semibold text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
        >
          {loading
            ? "Firmando contrato..."
            : `Firmar contrato (${formatMoney(precio)}/mes)`}
        </button>
      </form>
    </div>
  );
}