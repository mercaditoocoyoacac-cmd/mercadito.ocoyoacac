"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { formatMoney } from "@/lib/format";
import Link from "next/link";

interface OrderInfo {
  id: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string | null;
  status: string;
  totalCents: number;
  deliveryCode: string | null;
  pickupCode: string | null;
  store: { name: string; phone: string };
}

export default function DeliveryScanPage() {
  const [manualCode, setManualCode] = useState("");
  const [orderInfo, setOrderInfo] = useState<OrderInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmingDelivery, setConfirmingDelivery] = useState(false);
  const [scannedCode, setScannedCode] = useState("");

  async function lookupCode(code: string) {
    setLoading(true);
    setError(null);
    setOrderInfo(null);
    setScannedCode(code.toUpperCase().trim());

    try {
      const res = await fetch(`/api/delivery/confirm?code=${encodeURIComponent(code)}`);
      const data = await res.json();

      if (data.ok) {
        setOrderInfo(data.order);
      } else {
        setError(data.error || "Código no encontrado");
      }
    } catch {
      setError("Error al buscar el código");
    } finally {
      setLoading(false);
    }
  }

  async function confirmPickup() {
    if (!orderInfo) return;
    setConfirming(true);
    try {
      const res = await fetch("/api/delivery/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          orderId: orderInfo.id,
          code: orderInfo.deliveryCode,
          action: "pickup",
        }),
      });
      const data = await res.json();
      if (data.ok) {
        toast.success("✓ Producto recogido - ¡En camino!");
        window.location.href = "/delivery";
      } else {
        setError(data.error || "Error al confirmar");
      }
    } catch {
      setError("Error al confirmar");
    } finally {
      setConfirming(false);
    }
  }

  async function confirmDelivery() {
    if (!orderInfo) return;
    setConfirmingDelivery(true);
    try {
      const res = await fetch("/api/delivery/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          orderId: orderInfo.id,
          code: orderInfo.pickupCode,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        toast.success("✓ Entrega completada");
        window.location.href = "/delivery";
      } else {
        setError(data.error || "Error al confirmar");
      }
    } catch {
      setError("Error al confirmar");
    } finally {
      setConfirmingDelivery(false);
    }
  }

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (manualCode.trim()) {
      lookupCode(manualCode.trim());
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-orange-50 to-white">
      <div className="mx-auto max-w-lg px-4 py-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-500">
            <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold">Código de entrega</h1>
          <p className="mt-1 text-sm text-gray-500">Ingresa el código alfanumérico para confirmar recogida o entrega</p>
        </div>

        {!orderInfo ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Código alfanumérico
                </label>
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                  placeholder="Ej: ABC123"
                  className="w-full rounded-xl border-2 border-gray-200 px-4 py-4 text-center text-2xl tracking-widest uppercase focus:border-orange-500 focus:outline-none"
                  maxLength={10}
                  autoFocus
                />
              </div>
              <button
                type="submit"
                disabled={loading || manualCode.length < 4}
                className="w-full rounded-xl bg-orange-500 py-4 text-lg font-bold text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
              >
                {loading ? "Buscando..." : "Buscar pedido"}
              </button>
            </form>

            {error && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-center text-sm text-red-600">
                {error}
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 rounded-xl bg-green-500 p-4 text-center text-white">
              <div className="mb-1 text-3xl">✓</div>
              <div className="font-bold">Pedido encontrado</div>
              <div className="text-sm text-green-100">{orderInfo.store.name}</div>
            </div>

            <div className="mb-4 space-y-3">
              <div className="flex justify-between rounded-lg bg-gray-50 p-3">
                <span className="text-gray-500">Cliente</span>
                <span className="font-semibold">{orderInfo.customerName}</span>
              </div>
              <div className="flex justify-between rounded-lg bg-gray-50 p-3">
                <span className="text-gray-500">Teléfono</span>
                <span className="font-semibold">{orderInfo.customerPhone}</span>
              </div>
              {orderInfo.customerAddress && (
                <div className="flex justify-between rounded-lg bg-gray-50 p-3">
                  <span className="text-gray-500">Dirección</span>
                  <span className="text-right text-sm">{orderInfo.customerAddress}</span>
                </div>
              )}
              <div className="flex justify-between rounded-lg bg-orange-50 p-3">
                <span className="font-medium text-gray-700">Total</span>
                <span className="text-xl font-bold text-orange-600">{formatMoney(orderInfo.totalCents)}</span>
              </div>
            </div>

            <div className="space-y-3">
              {scannedCode === orderInfo.deliveryCode ? (
                <button
                  onClick={confirmPickup}
                  disabled={confirming}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 py-4 text-lg font-bold text-white transition-colors hover:bg-green-700 disabled:opacity-50"
                >
                  {confirming ? "Confirmando..." : "Recoger producto - En camino"}
                </button>
              ) : null}
              {scannedCode === orderInfo.pickupCode ? (
                <button
                  onClick={confirmDelivery}
                  disabled={confirmingDelivery}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-4 text-lg font-bold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                >
                  {confirmingDelivery ? "Confirmando..." : "Completar entrega - Entregado"}
                </button>
              ) : null}
              <button
                onClick={() => {
                  setOrderInfo(null);
                  setManualCode("");
                  setError(null);
                }}
                className="w-full rounded-xl border-2 border-gray-200 py-3 font-medium text-gray-600 transition-colors hover:bg-gray-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        <div className="mt-6 text-center">
          <Link href="/delivery" className="text-sm text-gray-500 hover:text-orange-600 hover:underline">
            ← Volver al panel
          </Link>
        </div>
      </div>
    </main>
  );
}