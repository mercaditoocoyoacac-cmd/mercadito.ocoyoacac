"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
type Props = {
  order: {
    id: string;
    status: string;
    pickupCode: string | null;
    totalCents: number;
    currency: string;
  };
};

export default function OrderConfirmation({ order }: Props) {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (order.pickupCode && order.status === "OUT_FOR_DELIVERY") {
      QRCode.toDataURL(
        JSON.stringify({ orderId: order.id, code: order.pickupCode }),
        { width: 250, margin: 2 }
      ).then(setQrCode);
    }
  }, [order.pickupCode, order.id, order.status]);

  if (order.status !== "OUT_FOR_DELIVERY") {
    return null;
  }

  if (success) {
    return (
      <div className="mt-6 rounded-xl border-2 border-green-500 bg-green-50 p-6 text-center">
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div className="text-lg font-semibold text-green-700">¡Pedido recibido!</div>
        <p className="mt-1 text-sm text-green-600">
          El repartidor ha entregado el pedido.
        </p>
      </div>
    );
  }

  async function confirmDelivery() {
    setConfirming(true);
    setError(null);

    try {
      const res = await fetch("/api/order/confirm-received", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ orderId: order.id }),
      });
      const data = await res.json();

      if (data.ok) {
        setSuccess(true);
      } else {
        setError(data.error || "Error al confirmar");
      }
    } catch {
      setError("Error de conexión");
    }
    setConfirming(false);
  }

  return (
    <div className="mt-6 rounded-xl border-2 border-orange-500 bg-orange-50 p-5">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-orange-700">
          Tu repartir está en camino
        </h3>
        <p className="mt-1 text-sm text-orange-600">
          Cuando llegue, muuéstrale este código QR para confirmar la entrega
        </p>
      </div>

      {qrCode && (
        <div className="mt-4 flex justify-center">
          <div className="rounded-xl border-4 border-white bg-white p-3 shadow-lg">
            <img src={qrCode} alt="Código QR" className="h-48 w-48" />
          </div>
        </div>
      )}

      {order.pickupCode && (
        <div className="mt-4 text-center">
          <p className="text-xs text-orange-600">O muestra este código al repartidor:</p>
          <div className="mt-1 font-mono text-3xl font-bold tracking-widest text-orange-700">
            {order.pickupCode}
          </div>
        </div>
      )}

      <div className="mt-5">
        <button
          onClick={confirmDelivery}
          disabled={confirming}
          className="w-full rounded-lg bg-green-600 px-4 py-3 text-base font-semibold text-white hover:bg-green-700 disabled:opacity-50"
        >
          {confirming ? "Confirmando..." : "Confirmar que recibí el pedido"}
        </button>
      </div>

      {error && (
        <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}