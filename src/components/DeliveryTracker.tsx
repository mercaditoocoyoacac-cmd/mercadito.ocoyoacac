"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { haversineDistance, formatDistance } from "@/lib/geo";
import DeliveryChat from "@/components/DeliveryChat";
import { getStatusLabel } from "@/lib/labels";

interface OrderItem {
  name: string;
  quantity: number;
  priceCents: number;
  weightGrams: number | null;
  variantName: string | null;
}

interface Order {
  id: string;
  status: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string | null;
  customerLat: number | null;
  customerLng: number | null;
  totalCents: number;
  currency: string;
  createdAt: Date;
  arrivedAt: Date | null;
  arrivalConfirmedAt: Date | null;
  notes: string | null;
  paymentMethod: string;
  userId: string;
  items: OrderItem[];
  store: { name: string; phone: string | null; address: string | null };
}

export default function DeliveryTracker({
  myDeliveries,
  availableDeliveries,
}: {
  myDeliveries: Order[];
  availableDeliveries: Order[];
}) {
  const router = useRouter();
  const { data: session } = useSession();
  const currentUserId = session?.user?.id || "";
  const [driverLat, setDriverLat] = useState<number | null>(null);
  const [driverLng, setDriverLng] = useState<number | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [completeCode, setCompleteCode] = useState<Record<string, string>>({});
  const [arriving, setArriving] = useState<Record<string, boolean>>({});
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function sendLocation(lat: number, lng: number) {
    setDriverLat(lat);
    setDriverLng(lng);
    fetch("/api/delivery/location", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ latitude: lat, longitude: lng }),
    }).catch(() => {});
  }

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError("Geolocalización no disponible en este navegador.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        sendLocation(pos.coords.latitude, pos.coords.longitude);
        setLocationError(null);
      },
      (err) => {
        setLocationError("Activa la ubicacion para recibir pedidos cercanos.");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );

    intervalRef.current = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          sendLocation(pos.coords.latitude, pos.coords.longitude);
        },
        () => {},
        { enableHighAccuracy: false, timeout: 5000 },
      );
    }, 30000);

    return () => {
      if (intervalRef.current !== null) clearInterval(intervalRef.current);
    };
  }, []);

  async function acceptOrder(orderId: string) {
    const res = await fetch("/api/delivery/claim", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ orderId }),
    });
    const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
    if (res.ok && data?.ok) {
      router.refresh();
    } else {
      alert(data?.error || "No se pudo aceptar el pedido.");
    }
  }

  async function notifyArrival(orderId: string) {
    if (arriving[orderId]) return;
    setArriving((prev) => ({ ...prev, [orderId]: true }));
    const res = await fetch("/api/delivery/arrived", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ orderId }),
    });
    const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
    if (res.ok && data?.ok) {
      router.refresh();
    } else {
      alert(data?.error || "Error al notificar llegada.");
      setArriving((prev) => ({ ...prev, [orderId]: false }));
    }
  }

  async function confirmDelivery(orderId: string) {
    const code = completeCode[orderId];
    if (!code) {
      alert("Ingresa el código de entrega del cliente.");
      return;
    }
    const res = await fetch("/api/delivery/confirm", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ orderId, code }),
    });
    const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
    if (res.ok && data?.ok) {
      router.refresh();
    } else {
      alert(data?.error || "Código inválido.");
    }
  }

  function getDistanceToOrder(
    orderLat: number | null,
    orderLng: number | null,
  ): string | null {
    if (!driverLat || !driverLng || !orderLat || !orderLng) return null;
    return formatDistance(haversineDistance(driverLat, driverLng, orderLat, orderLng));
  }

  function getGoogleMapsUrl(lat: number | null, lng: number | null, address: string | null): string {
    if (lat && lng) return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    if (address) return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
    return "#";
  }

  function getStoreDirectionsUrl(address: string): string {
    if (typeof navigator === "undefined") return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile) return `geo:0,0?q=${encodeURIComponent(address)}`;
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
  }

  const activeDeliveries = myDeliveries.filter(
    (o) => o.status === "OUT_FOR_DELIVERY",
  );

  return (
    <>
      {locationError && (
        <div className="mb-4 rounded-lg bg-yellow-50 border border-yellow-200 px-4 py-3 text-sm text-yellow-800">
          {locationError}
        </div>
      )}
      {driverLat && (
        <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800 flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          Ubicacion activa
        </div>
      )}

      {activeDeliveries.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
              </span>
              Entregas activas
            </h2>
            <a
              href="/delivery/escanear"
              className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 flex items-center gap-2"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              Escanear QR
            </a>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {activeDeliveries.map((order) => (
              <div key={order.id} className="rounded-xl border border-[var(--border)] p-4">
                <div className="font-mono text-sm">#{order.id.slice(-8).toUpperCase()}</div>

                {/* Store info */}
                <div className="mt-2 rounded-lg bg-gray-50 p-3 text-sm">
                  <div className="font-semibold text-xs uppercase tracking-wide text-[color:var(--muted)]">Tienda</div>
                  <div className="font-medium mt-0.5">{order.store.name}</div>
                  {order.store.address && (
                    <div className="text-xs text-[color:var(--muted)]">📍 {order.store.address}</div>
                  )}
                  {order.store.address && (
                    <a
                      href={getStoreDirectionsUrl(order.store.address)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mt-1.5 text-xs font-medium text-blue-600 hover:underline"
                    >
                      <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                      </svg>
                      Cómo llegar a la tienda
                    </a>
                  )}
                </div>

                {/* Customer info */}
                <div className="mt-2">
                  <div className="font-medium">{order.customerName}</div>
                  <div className="text-xs text-[color:var(--muted)]">{order.customerPhone}</div>
                  {order.customerAddress && (
                    <div className="text-xs text-[color:var(--muted)] mt-0.5">📍 {order.customerAddress}</div>
                  )}
                </div>

                {/* Order items */}
                {order.items.length > 0 && (
                  <div className="mt-2 border-t border-[var(--border)] pt-2">
                    <div className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)] mb-1">Productos</div>
                    <div className="space-y-1">
                      {order.items.map((item, i) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <span>
                            {item.quantity}x {item.name}
                            {item.variantName && <span className="text-[color:var(--muted)]"> ({item.variantName})</span>}
                            {item.weightGrams && <span className="text-[color:var(--muted)]"> · {item.weightGrams}g</span>}
                          </span>
                          <span className="text-[color:var(--muted)]">${(item.priceCents * item.quantity / 100).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {order.notes && (
                  <div className="mt-2 rounded-lg bg-yellow-50 px-3 py-2 text-xs text-yellow-800">
                    📝 {order.notes}
                  </div>
                )}

                {/* Payment method */}
                <div className="mt-1 text-xs text-[color:var(--muted)]">
                  Pago: {order.paymentMethod === "CASH" ? "Efectivo" : order.paymentMethod === "MERCADO_PAGO" ? "Tarjeta" : order.paymentMethod}
                  {order.paymentMethod === "CASH" && <span className="ml-1 font-medium">— ${(order.totalCents / 100).toFixed(2)}</span>}
                </div>

                <div className="mt-3 flex flex-col gap-2">
                  {(order.customerLat || order.customerAddress) && (
                    <a
                      href={getGoogleMapsUrl(order.customerLat, order.customerLng, order.customerAddress)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-600"
                    >
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                      </svg>
                      Ruta al cliente
                    </a>
                  )}
                  {order.arrivedAt ? (
                    <div className="flex items-center gap-2 rounded-lg bg-green-100 px-3 py-1.5 text-xs font-medium text-green-800">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Llegada notificada
                    </div>
                  ) : (
                    <button
                      onClick={() => notifyArrival(order.id)}
                      disabled={arriving[order.id]}
                      className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-600 disabled:opacity-50"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {arriving[order.id] ? "Notificando..." : "Llegué"}
                    </button>
                  )}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Código del cliente"
                      value={completeCode[order.id] || ""}
                      onChange={(e) => setCompleteCode((prev) => ({ ...prev, [order.id]: e.target.value }))}
                      className="flex-1 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs outline-none focus:border-[var(--accent)]"
                      maxLength={6}
                    />
                    <button
                      onClick={() => confirmDelivery(order.id)}
                      className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
                    >
                      Completar
                    </button>
                  </div>
                  <DeliveryChat orderId={order.id} currentUserId={currentUserId} currentUserRole="DELIVERY" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Available deliveries - prominently at top */}
      <div className="mb-8 rounded-xl border border-[var(--border)]">
        <div className="border-b border-[var(--border)] bg-[var(--accent-soft)]/30 px-5 py-4">
          <h2 className="flex items-center gap-2 font-semibold">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
            </span>
            Pedidos disponibles ({availableDeliveries.length})
          </h2>
        </div>
        {availableDeliveries.length === 0 ? (
          <div className="p-8 text-center text-sm text-[color:var(--muted)]">
            No hay pedidos disponibles en este momento.
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {availableDeliveries.map((order) => {
              const distance = getDistanceToOrder(order.customerLat, order.customerLng);
              return (
                <div key={order.id} className="px-5 py-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="font-mono text-sm font-semibold">
                          #{order.id.slice(-8).toUpperCase()}
                        </div>
                        {distance && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                            {distance}
                          </span>
                        )}
                      </div>

                      <div className="text-xs mt-1 text-[color:var(--muted)]">
                        🏪 {order.store.name}
                        {order.store.address && <> · {order.store.address}</>}
                        {order.store.address && (
                          <a
                            href={getStoreDirectionsUrl(order.store.address)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-2 text-blue-600 hover:underline"
                          >
                            Ver en mapa
                          </a>
                        )}
                      </div>

                      <div className="font-medium mt-1">{order.customerName}</div>
                      <div className="text-xs text-[color:var(--muted)]">
                        📞 {order.customerPhone}
                      </div>
                      {order.customerAddress && (
                        <div className="text-xs text-[color:var(--muted)]">
                          📍 {order.customerAddress}
                        </div>
                      )}

                      {order.items.length > 0 && (
                        <div className="mt-1 text-xs text-[color:var(--muted)]">
                          {order.items.map((item, i) => (
                            <span key={i}>
                              {i > 0 && <span className="mx-1">·</span>}
                              {item.quantity}x {item.name}
                            </span>
                          ))}
                        </div>
                      )}
                      {order.paymentMethod === "CASH" ? (
                        <div className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">
                          💵 Cobrar ${(order.totalCents / 100).toFixed(2)}
                        </div>
                      ) : (
                        <div className="mt-1 text-xs text-[color:var(--muted)]">
                          💳 Pagó con tarjeta
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => acceptOrder(order.id)}
                      className="shrink-0 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-hover)]"
                    >
                      Aceptar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* My deliveries */}
      <div className="rounded-xl border border-[var(--border)]">
        <div className="border-b border-[var(--border)] px-5 py-4">
          <h2 className="font-semibold">Mis entregas ({myDeliveries.length})</h2>
        </div>
        {myDeliveries.length === 0 ? (
          <div className="p-5 text-center text-sm text-[color:var(--muted)]">
            No tienes entregas asignadas.
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {myDeliveries.slice(0, 10).map((order) => (
              <div key={order.id} className="px-5 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-mono text-sm">
                      #{order.id.slice(-8).toUpperCase()}
                    </div>
                    <div className="text-sm font-medium">{order.customerName}</div>
                    <div className="text-xs text-[color:var(--muted)]">
                      🏪 {order.store.name}
                      {order.store.address && <> · {order.store.address}</>}
                    </div>
                    {order.store.address && (
                      <a
                        href={getStoreDirectionsUrl(order.store.address)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 mt-1 text-xs text-blue-600 hover:underline"
                      >
                        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                        </svg>
                        Cómo llegar a la tienda
                      </a>
                    )}
                    {order.items.length > 0 && (
                      <div className="mt-1.5 text-xs text-[color:var(--muted)]">
                        {order.items.map((item, i) => (
                          <span key={i}>
                            {i > 0 && <span className="mx-1">·</span>}
                            {item.quantity}x {item.name}
                            {item.weightGrams && <span> ({item.weightGrams}g)</span>}
                          </span>
                        ))}
                      </div>
                    )}
                    {order.paymentMethod === "CASH" ? (
                      <div className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">
                        💵 Cobrar ${(order.totalCents / 100).toFixed(2)}
                      </div>
                    ) : (
                      <div className="mt-1.5 text-xs text-[color:var(--muted)]">
                        💳 Pagó con tarjeta
                      </div>
                    )}
                    {order.customerAddress && (
                      <div className="mt-1 text-xs text-[color:var(--muted)]">
                        📍 {order.customerAddress}
                      </div>
                    )}
                    {order.customerAddress && (
                      <a
                        href={getGoogleMapsUrl(order.customerLat, order.customerLng, order.customerAddress)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 mt-1 text-xs text-blue-600 hover:underline"
                      >
                        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                        </svg>
                        Ruta al cliente
                      </a>
                    )}
                  </div>
                    <div className="text-right flex flex-col items-end gap-1">
                    <div className={`text-xs px-2 py-1 rounded-full ${
                      order.status === "COMPLETED"
                        ? "bg-green-100 text-green-800"
                        : order.status === "OUT_FOR_DELIVERY"
                        ? "bg-orange-100 text-orange-800"
                        : "bg-gray-100 text-gray-800"
                    }`}>
                      {getStatusLabel(order.status)}
                    </div>
                    {order.arrivedAt && (
                      <div className={`text-[10px] px-2 py-0.5 rounded-full ${
                        order.arrivalConfirmedAt
                          ? "bg-green-50 text-green-700"
                          : "bg-orange-50 text-orange-700"
                      }`}>
                        {order.arrivalConfirmedAt ? "✅ Cliente confirmó" : "⏳ Esperando confirmación"}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
