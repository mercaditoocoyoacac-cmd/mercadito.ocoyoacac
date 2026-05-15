"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { haversineDistance, formatDistance } from "@/lib/geo";

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
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile) {
      if (lat && lng) return `geo:${lat},${lng}?q=${lat},${lng}`;
      if (address) return `geo:0,0?q=${encodeURIComponent(address)}`;
    } else {
      if (lat && lng) return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
      if (address) return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
    }
    return "#";
  }

  const statusLabels: Record<string, string> = {
    PENDING: "Pendiente",
    CONFIRMED: "Confirmado",
    READY: "Listo",
    OUT_FOR_DELIVERY: "En camino",
    COMPLETED: "Entregado",
    CANCELLED: "Cancelado",
  };

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
                <div className="font-medium mt-1">{order.customerName}</div>
                {order.customerAddress && (
                  <div className="text-sm text-[color:var(--muted)] mt-1">
                    📍 {order.customerAddress}
                  </div>
                )}
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
                      Abrir en Google Maps
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
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
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
                    <div>
                      <div className="font-mono text-sm">
                        #{order.id.slice(-8).toUpperCase()}
                      </div>
                      <div className="text-sm">{order.customerName}</div>
                      <div className="text-xs text-[color:var(--muted)]">
                        {order.store.name}
                      </div>
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
                          Ver ruta
                        </a>
                      )}
                    </div>
                    <div className="text-right">
                      <div className={`text-xs px-2 py-1 rounded-full ${
                        order.status === "COMPLETED"
                          ? "bg-green-100 text-green-800"
                          : order.status === "OUT_FOR_DELIVERY"
                          ? "bg-orange-100 text-orange-800"
                          : "bg-gray-100 text-gray-800"
                      }`}>
                        {statusLabels[order.status]}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-[var(--border)]">
          <div className="border-b border-[var(--border)] px-5 py-4">
            <h2 className="font-semibold">Pedidos disponibles ({availableDeliveries.length})</h2>
          </div>
          {availableDeliveries.length === 0 ? (
            <div className="p-5 text-center text-sm text-[color:var(--muted)]">
              No hay pedidos disponibles.
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {availableDeliveries.map((order) => {
                const distance = getDistanceToOrder(order.customerLat, order.customerLng);
                return (
                  <div key={order.id} className="px-5 py-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div className="font-mono text-sm">
                            #{order.id.slice(-8).toUpperCase()}
                          </div>
                          {distance && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                              {distance}
                            </span>
                          )}
                        </div>
                        <div className="font-medium">{order.customerName}</div>
                        <div className="text-sm text-[color:var(--muted)]">
                          {order.customerPhone}
                        </div>
                        {order.customerAddress && (
                          <div className="text-xs text-[color:var(--muted)] mt-1">
                            📍 {order.customerAddress}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => acceptOrder(order.id)}
                        className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
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
      </div>
    </>
  );
}
