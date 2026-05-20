"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/format";

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
  user: {
    id: string;
    name: string | null;
    ineFrontUrl: string | null;
    ineBackUrl: string | null;
    ineNumber: string | null;
  };
};

export default function VendorContractForm({ store, subscription, user }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agreed1, setAgreed1] = useState(false);
  const [agreed2, setAgreed2] = useState(false);
  const [agreed3, setAgreed3] = useState(false);
  const [ineNumber, setIneNumber] = useState(user.ineNumber || "");
  const [ineFrontUrl, setIneFrontUrl] = useState(user.ineFrontUrl || "");
  const [ineBackUrl, setIneBackUrl] = useState(user.ineBackUrl || "");
  const [uploadingFront, setUploadingFront] = useState(false);
  const [uploadingBack, setUploadingBack] = useState(false);

  const precio = subscription?.monthlyPriceCents || 49600;
  const allAgreed = agreed1 && agreed2 && agreed3;
  const hasIne = ineNumber && ineFrontUrl && ineBackUrl;

  async function handleFileUpload(
    e: React.ChangeEvent<HTMLInputElement>,
    side: "front" | "back"
  ) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (side === "front") setUploadingFront(true);
    else setUploadingBack(true);

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const data = (await res.json()) as
      | { ok: true; url: string }
      | { ok: false; error?: string };

    if (side === "front") setUploadingFront(false);
    else setUploadingBack(false);

    if (!res.ok || !data.ok) {
      const errorMsg = "error" in data ? data.error : "Error al subir imagen.";
      setError(errorMsg ?? "Error al subir imagen.");
      return;
    }

    if (side === "front") setIneFrontUrl(data.url);
    else setIneBackUrl(data.url);
  }

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
        body: JSON.stringify({
          storeId: store.id,
          ineNumber,
          ineFrontUrl,
          ineBackUrl,
        }),
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

      <div className="rounded-xl border border-[var(--border)] p-5">
        <h2 className="text-lg font-semibold mb-2">Identificación oficial (INE)</h2>
        <p className="text-sm text-[color:var(--muted)] mb-4">
          Sube foto de tu INE por ambos lados para verificar tu identidad.
        </p>

        <div className="mb-4">
          <label className="block">
            <div className="text-sm font-medium">Número de INE / Credencial para votar</div>
            <input
              value={ineNumber}
              onChange={(e) => setIneNumber(e.target.value)}
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
              placeholder="1234567890123"
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <div className="text-sm font-medium mb-2">Frente</div>
            <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 border-[var(--border)]">
              {ineFrontUrl ? (
                <img src={ineFrontUrl} alt="INE frente" className="h-full w-full object-contain rounded-lg p-1" />
              ) : (
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <svg className="w-8 h-8 mb-3 text-[color:var(--muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3" />
                  </svg>
                  <p className="text-xs text-[color:var(--muted)]">
                    {uploadingFront ? "Subiendo..." : "Click para subir"}
                  </p>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileUpload(e, "front")}
                disabled={uploadingFront}
              />
            </label>
          </div>

          <div>
            <div className="text-sm font-medium mb-2">Reverso</div>
            <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 border-[var(--border)]">
              {ineBackUrl ? (
                <img src={ineBackUrl} alt="INE reverso" className="h-full w-full object-contain rounded-lg p-1" />
              ) : (
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <svg className="w-8 h-8 mb-3 text-[color:var(--muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3" />
                  </svg>
                  <p className="text-xs text-[color:var(--muted)]">
                    {uploadingBack ? "Subiendo..." : "Click para subir"}
                  </p>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileUpload(e, "back")}
                disabled={uploadingBack}
              />
            </label>
          </div>
        </div>
      </div>

      <form className="rounded-xl border border-[var(--border)] p-5" onSubmit={handleSign}>
        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {!hasIne && (
          <div className="mb-4 rounded-lg border border-orange-500/30 bg-orange-500/10 px-4 py-3 text-sm text-orange-700">
            ⚠ Debes subir tu INE (ambos lados) y proporcionar el número de credencial para firmar.
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !allAgreed || !hasIne}
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