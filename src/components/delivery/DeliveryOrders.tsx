"use client";

import { memo, useCallback } from "react";
import { useRouter } from "next/navigation";
import LocationViewer from "@/components/maps/LocationViewer";
import { formatMoney } from "@/lib/format";

type DeliveryOrder = {
  id: string;
  status: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string | null;
  customerLat: number | null;
  customerLng: number | null;
  totalCents: number;
  currency: string;
};

const DeliveryOrderCard = memo(function DeliveryOrderCard({
  order,
  showMap,
  onComplete,
}: {
  order: DeliveryOrder;
  showMap: boolean;
  onComplete: (id: string) => void;
}) {
  return (
    <div className="rounded-xl border-2 border-orange-500 bg-orange-50 p-5 card-hover">
      <div className="flex items-start justify-between">
        <div>
          <div className="font-mono font-semibold">
            #{order.id.slice(-8).toUpperCase()}
          </div>
          <div className="mt-1 font-medium">{order.customerName}</div>
          <div className="text-sm text-[color:var(--muted)]">
            {order.customerPhone}
          </div>
        </div>
        <div className="text-lg font-semibold">
          {formatMoney(order.totalCents, order.currency)}
        </div>
      </div>
      {order.customerAddress && (
        <div className="mt-3 text-sm">
          📍 {order.customerAddress}
        </div>
      )}
      {showMap && order.customerLat && order.customerLng && (
        <div className="mt-3">
          <LocationViewer
            latitude={order.customerLat}
            longitude={order.customerLng}
            height="h-40"
          />
        </div>
      )}
      <div className="mt-4 space-y-2">
        <div className="text-xs text-orange-600 font-medium">
          {order.status === "OUT_FOR_DELIVERY"
            ? "Escanea el codigo QR para entregar"
            : "Pedido listo para entregar"}
        </div>
        {order.status === "OUT_FOR_DELIVERY" && (
          <button
            onClick={() => onComplete(order.id)}
            className="w-full rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            Confirmar entrega final
          </button>
        )}
      </div>
    </div>
  );
});

export default function DeliveryOrdersGrid({
  orders,
  showMap = false,
}: {
  orders: DeliveryOrder[];
  showMap?: boolean;
}) {
  const router = useRouter();

  const completeOrder = useCallback(async (orderId: string) => {
    await fetch("/api/delivery/confirm", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ orderId }),
    });
    router.refresh();
  }, [router]);

  if (orders.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {orders.map((order) => (
        <DeliveryOrderCard
          key={order.id}
          order={order}
          showMap={showMap}
          onComplete={completeOrder}
        />
      ))}
    </div>
  );
}