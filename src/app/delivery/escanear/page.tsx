"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

interface OrderInfo {
  id: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string | null;
  status: string;
  totalCents: number;
  store: { name: string; phone: string };
}

export default function DeliveryScanPage() {
  const router = useRouter();
  const [scanning, setScanning] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [orderInfo, setOrderInfo] = useState<OrderInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  function formatMoney(cents: number) {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(cents / 100);
  }

  async function lookupCode(code: string) {
    setLoading(true);
    setError(null);
    setOrderInfo(null);

    try {
      const res = await fetch(`/api/delivery/confirm?code=${encodeURIComponent(code)}`);
      const data = await res.json();

      if (data.ok) {
        setOrderInfo(data.order);
      } else {
        setError(data.error || "Código no encontrado");
      }
    } catch (e) {
      setError("Error al buscar el código");
    } finally {
      setLoading(false);
    }
  }

  async function confirmDelivery() {
    if (!orderInfo) return;

    setConfirming(true);
    try {
      const res = await fetch("/api/delivery/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          orderId: orderInfo.id,
          deliveryCode: orderInfo.id,
        }),
      });
      const data = await res.json();

      if (data.ok) {
        alert("✓ Entrega confirmada exitosamente!");
        setOrderInfo(null);
        setManualCode("");
      } else {
        setError(data.error || "Error al confirmar");
      }
    } catch (e) {
      setError("Error al confirmar entrega");
    } finally {
      setConfirming(false);
    }
  }

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (manualCode.trim()) {
      const code = JSON.stringify({ orderId: "test", code: manualCode.trim() });
      lookupCode(code);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-lg px-4 py-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-100">
            <svg className="h-8 w-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold">Confirmar Entrega</h1>
          <p className="mt-1 text-sm text-gray-500">Escaneá el código QR del paquete</p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          {!orderInfo ? (
            <>
              <div className="mb-6 flex h-48 items-center justify-center rounded-xl bg-gray-100">
                <div className="text-center">
                  <div className="mx-auto mb-2 h-16 w-16 rounded-lg bg-gray-200 flex items-center justify-center">
                    <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-500">Esperando código QR...</p>
                </div>
              </div>

              <div className="mb-4 text-center">
                <span className="text-sm text-gray-500">o ingresá el código manualmente</span>
              </div>

              <form onSubmit={handleManualSubmit} className="space-y-4">
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                  placeholder="Código de entrega (ej: ABC123)"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-center text-lg tracking-widest uppercase"
                  maxLength={6}
                />
                <button
                  type="submit"
                  disabled={loading || manualCode.length < 4}
                  className="w-full rounded-lg bg-orange-500 py-3 font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
                >
                  {loading ? "Buscando..." : "Buscar pedido"}
                </button>
              </form>

              {error && (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-center text-sm text-red-600">
                  {error}
                </div>
              )}
            </>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl bg-green-50 p-4 text-center">
                <div className="mb-2 text-4xl">✓</div>
                <h3 className="font-semibold text-green-800">Orden encontrada</h3>
                <p className="text-sm text-green-600">{orderInfo.store.name}</p>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-500">Cliente</span>
                  <span className="font-medium">{orderInfo.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Teléfono</span>
                  <span className="font-medium">{orderInfo.customerPhone}</span>
                </div>
                {orderInfo.customerAddress && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Dirección</span>
                    <span className="text-right text-sm">{orderInfo.customerAddress}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-gray-100 pt-3">
                  <span className="text-gray-500">Total</span>
                  <span className="text-xl font-bold text-orange-600">{formatMoney(orderInfo.totalCents)}</span>
                </div>
              </div>

              <div className="space-y-3 pt-4">
                <button
                  onClick={confirmDelivery}
                  disabled={confirming}
                  className="w-full rounded-xl bg-green-600 py-4 text-lg font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                >
                  {confirming ? "Confirmando..." : "✓ Confirmar entrega"}
                </button>
                <button
                  onClick={() => {
                    setOrderInfo(null);
                    setManualCode("");
                    setError(null);
                  }}
                  className="w-full rounded-xl border border-gray-300 py-3 font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 text-center">
          <a href="/delivery" className="text-sm text-gray-500 hover:underline">
            ← Volver al panel
          </a>
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />
      <video ref={videoRef} className="hidden" />
    </main>
  );
}