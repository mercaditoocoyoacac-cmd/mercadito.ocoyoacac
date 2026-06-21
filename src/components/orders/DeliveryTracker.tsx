"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { haversineDistance, formatDistance, getMapsUrl, openMapsUrl } from "@/lib/geo";
import { startQrScanner, stopQrScanner } from "@/lib/scanner";
import type { Html5Qrcode } from "html5-qrcode";
import DeliveryChat from "@/components/chat/DeliveryChat";
import { getStatusLabel } from "@/lib/labels";

interface OrderItem {
  name: string;
  quantity: number;
  priceCents: number;
  weightGrams: number | null;
  variantName: string | null;
}

interface EarningsData {
  day: number;
  week: number;
  month: number;
  total: number;
  completedCount: number;
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
  deliveryCents: number;
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

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    COMPLETED: "bg-green-100 text-green-800",
    OUT_FOR_DELIVERY: "bg-orange-100 text-orange-800",
    READY: "bg-blue-100 text-blue-800",
    CONFIRMED: "bg-purple-100 text-purple-800",
    PENDING: "bg-yellow-100 text-yellow-800",
    CANCELLED: "bg-red-100 text-red-800",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold ${colors[status] || "bg-gray-100 text-gray-800"}`}>
      {status === "COMPLETED" && "✅"}
      {status === "OUT_FOR_DELIVERY" && "🚚"}
      {status === "READY" && "📦"}
      {status === "CONFIRMED" && "✓"}
      {status === "PENDING" && "⏳"}
      <span>{getStatusLabel(status)}</span>
    </span>
  );
}

function MapsButton({ url, label }: { url: string | null; label: string }) {
  if (!url) return null;
  return (
    <button
      type="button"
      onClick={(e) => { e.preventDefault(); openMapsUrl(url!); }}
      className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-base font-semibold text-white shadow-md active:scale-95 transition-transform hover:bg-blue-700 border-none cursor-pointer w-full"
    >
      <svg className="h-5 w-5 shrink-0" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
      </svg>
      {label}
    </button>
  );
}

function CashBadge({ totalCents }: { totalCents: number }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-lg bg-green-100 px-4 py-2 text-base font-bold text-green-800 border-2 border-green-300">
      💵 Cobrar ${(totalCents / 100).toFixed(2)}
    </div>
  );
}

export default function DeliveryTracker({
  myDeliveries,
  availableDeliveries,
  earnings,
}: {
  myDeliveries: Order[];
  availableDeliveries: Order[];
  earnings?: EarningsData;
}) {
  const router = useRouter();
  const { data: session } = useSession();
  const currentUserId = session?.user?.id || "";
  const [driverLat, setDriverLat] = useState<number | null>(null);
  const [driverLng, setDriverLng] = useState<number | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [completeCode, setCompleteCode] = useState<Record<string, string>>({});
  const [arriving, setArriving] = useState<Record<string, boolean>>({});
  const [showMyDeliveries, setShowMyDeliveries] = useState(true);
  const [showDelivered, setShowDelivered] = useState(false);
  const [pickupOrderId, setPickupOrderId] = useState<string | null>(null);
  const [pickupCode, setPickupCode] = useState("");
  const [pickupLoading, setPickupLoading] = useState(false);
  const [pickupScanning, setPickupScanning] = useState(false);
  const [pickupError, setPickupError] = useState<string | null>(null);
  const [ratingOrderId, setRatingOrderId] = useState<string | null>(null);
  const [ratingStore, setRatingStore] = useState(0);
  const [ratingDelivery, setRatingDelivery] = useState(0);
  const [ratingComment, setRatingComment] = useState("");
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerId = "pickup-qr-scanner";
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasGeo = useSyncExternalStore(() => () => {}, () => 'geolocation' in navigator, () => false);

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
    if (!hasGeo) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        sendLocation(pos.coords.latitude, pos.coords.longitude);
        setLocationError(null);
      },
      () => {
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
      toast.error(data?.error || "No se pudo aceptar el pedido.");
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
      toast.error(data?.error || "Error al notificar llegada.");
      setArriving((prev) => ({ ...prev, [orderId]: false }));
    }
  }

  async function confirmDelivery(orderId: string) {
    const code = completeCode[orderId];
    if (!code) {
      toast.error("Ingresa el código de entrega del cliente.");
      return;
    }
    const res = await fetch("/api/delivery/confirm", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ orderId, code }),
    });
    const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
    if (res.ok && data?.ok) {
      setRatingOrderId(orderId);
      setRatingStore(0);
      setRatingDelivery(0);
      setRatingComment("");
    } else {
      toast.error(data?.error || "Código inválido.");
    }
  }

  async function submitRating() {
    if (!ratingOrderId) return;
    setRatingSubmitting(true);
    const res = await fetch("/api/ratings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        orderId: ratingOrderId,
        storeScore: ratingStore,
        deliveryScore: ratingDelivery > 0 ? ratingDelivery : undefined,
        comment: ratingComment.trim() || undefined,
      }),
    });
    setRatingSubmitting(false);
    if (res.ok) {
      toast.success("¡Gracias por calificar!");
    } else {
      toast.error("Error al guardar calificación.");
    }
    setRatingOrderId(null);
    router.refresh();
  }

  function skipRating() {
    setRatingOrderId(null);
    router.refresh();
  }

  async function handlePickup(orderId: string) {
    if (!pickupCode.trim()) {
      toast.error("Escanea o ingresa el código de recogida.");
      return;
    }
    setPickupLoading(true);
    setPickupError(null);
    const res = await fetch("/api/delivery/confirm", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ orderId, code: pickupCode.trim().toUpperCase(), action: "pickup" }),
    });
    const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
    setPickupLoading(false);
    if (res.ok && data?.ok) {
      toast.success("✓ Producto recogido — ¡En camino!");
      setPickupOrderId(null);
      setPickupCode("");
      setPickupError(null);
      stopScanner();
      router.refresh();
    } else {
      setPickupError(data?.error || "Código inválido");
    }
  }

  async function startPickupScanner() {
    setPickupError(null);
    setPickupScanning(true);

    const scanner = await startQrScanner(
      scannerId,
      (code) => {
        if (code.length >= 4 && code.length <= 10) {
          stopScanner();
          setPickupCode(code);
        }
      },
      (msg) => setPickupError(msg),
    );

    if (scanner) {
      scannerRef.current = scanner;
    } else {
      setPickupScanning(false);
      if (!pickupError) setPickupError("No se pudo iniciar la cámara. Ingresa el código manualmente.");
    }
  }

  const stopScanner = useCallback(async () => {
    stopQrScanner(scannerRef.current);
    scannerRef.current = null;
    setPickupScanning(false);
  }, []);

  useEffect(() => {
    return () => { stopScanner(); };
  }, [stopScanner]);

  function getDistanceToOrder(orderLat: number | null, orderLng: number | null): string | null {
    if (!driverLat || !driverLng || !orderLat || !orderLng) return null;
    return formatDistance(haversineDistance(driverLat, driverLng, orderLat, orderLng));
  }

  const activeDeliveries = myDeliveries.filter((o) => o.status === "OUT_FOR_DELIVERY");
  const completedDeliveries = myDeliveries.filter((o) => o.status === "COMPLETED");
  const nonCompletedMyDeliveries = myDeliveries.filter(
    (o) => o.status !== "COMPLETED" && o.status !== "OUT_FOR_DELIVERY" && o.status !== "CANCELLED"
  );

  return (
    <>
      {/* Location status bar */}
      {!hasGeo && (
        <div className="mb-4 rounded-xl bg-yellow-50 border-2 border-yellow-300 px-5 py-4 text-base font-medium text-yellow-800">
          📡 Geolocalización no disponible en este navegador.
        </div>
      )}
      {hasGeo && locationError && (
        <div className="mb-4 rounded-xl bg-yellow-50 border-2 border-yellow-300 px-5 py-4 text-base font-medium text-yellow-800">
          {locationError}
        </div>
      )}
      {driverLat && (
        <div className="mb-4 rounded-xl bg-green-50 border-2 border-green-300 px-5 py-4 text-base font-medium text-green-800 flex items-center gap-3">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
          Ubicación activa — recibiendo pedidos cercanos
        </div>
      )}

      {/* Earnings analysis */}
      {earnings && earnings.completedCount > 0 && (
        <div className="mb-6 rounded-xl border border-[var(--border)] p-5">
          <h2 className="text-base font-bold mb-3 flex items-center gap-2">
            <svg className="h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Mis ingresos
            <span className="text-xs font-normal text-[color:var(--muted)] ml-auto">{earnings.completedCount} entregas completadas</span>
          </h2>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-green-50 border border-green-200 p-4 text-center">
              <div className="text-xs font-semibold uppercase tracking-wide text-green-600 mb-1">Hoy</div>
              <div className="text-xl font-bold text-green-800">${(earnings.day / 100).toFixed(2)}</div>
            </div>
            <div className="rounded-xl bg-blue-50 border border-blue-200 p-4 text-center">
              <div className="text-xs font-semibold uppercase tracking-wide text-blue-600 mb-1">Semana</div>
              <div className="text-xl font-bold text-blue-800">${(earnings.week / 100).toFixed(2)}</div>
            </div>
            <div className="rounded-xl bg-purple-50 border border-purple-200 p-4 text-center">
              <div className="text-xs font-semibold uppercase tracking-wide text-purple-600 mb-1">Mes</div>
              <div className="text-xl font-bold text-purple-800">${(earnings.month / 100).toFixed(2)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Mis entregas - collapsible */}
      {(activeDeliveries.length > 0 || nonCompletedMyDeliveries.length > 0) && (
        <div className="mb-6 rounded-xl border-2 border-orange-200 bg-white shadow-md overflow-hidden">
          <button
            type="button"
            onClick={() => setShowMyDeliveries(!showMyDeliveries)}
            className="w-full flex items-center justify-between px-5 py-4 bg-orange-50 hover:bg-orange-100 border-none cursor-pointer"
          >
            <h2 className="text-lg font-bold flex items-center gap-2">
              🛵 Mis entregas
              <span className="rounded-full bg-orange-200 text-orange-800 text-sm px-3 py-0.5 font-bold">
                {activeDeliveries.length + nonCompletedMyDeliveries.length}
              </span>
            </h2>
            <div className="flex items-center gap-3">
              <svg className={`h-6 w-6 text-orange-600 transition-transform ${showMyDeliveries ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>
          {showMyDeliveries && (
            <>
              {/* Active deliveries */}
              {activeDeliveries.length > 0 && (
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
                    </span>
                    <h3 className="text-base font-bold text-orange-800">En curso</h3>
                    <span className="rounded-full bg-orange-100 text-orange-800 text-xs px-2 py-0.5 font-bold">{activeDeliveries.length}</span>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {activeDeliveries.map((order) => (
                      <div key={order.id} className="rounded-xl border-2 border-orange-200 bg-white p-5 shadow-md">
                        {/* Order header */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="font-mono text-lg font-bold tracking-wider">
                            #{order.id.slice(-8).toUpperCase()}
                          </div>
                          <StatusBadge status={order.status} />
                        </div>

                        {/* Store info */}
                        <div className="rounded-xl bg-blue-50 border border-blue-200 p-4 mb-3">
                          <div className="text-xs font-bold uppercase tracking-wide text-blue-600 mb-1">🏪 Tienda</div>
                          <div className="text-lg font-bold">{order.store.name}</div>
                          {order.store.address && (
                            <div className="text-sm text-blue-700 mt-1">📍 {order.store.address}</div>
                          )}
                          {order.store.address && (
                            <div className="mt-2">
                              <MapsButton url={getMapsUrl(null, null, order.store.address)} label="Cómo llegar a la tienda" />
                            </div>
                          )}
                        </div>

                        {/* Customer info */}
                        <div className="mb-3">
                          <div className="text-xs font-bold uppercase tracking-wide text-[var(--muted)] mb-1">👤 Cliente</div>
                          <div className="text-lg font-bold">{order.customerName}</div>
                          <a href={`tel:${order.customerPhone}`} className="text-base text-blue-600 font-medium hover:underline block">{order.customerPhone}</a>
                          {order.customerAddress && (
                            <div className="text-sm text-[var(--muted)] mt-1">📍 {order.customerAddress}</div>
                          )}
                          {(order.customerLat || order.customerAddress) && (
                            <div className="mt-2">
                              <MapsButton
                                url={getMapsUrl(order.customerLat, order.customerLng, order.customerAddress)}
                                label="Ruta al cliente"
                              />
                            </div>
                          )}
                        </div>

                        {/* Items */}
                        {order.items.length > 0 && (
                          <div className="border-t border-gray-200 pt-3 mb-3">
                            <div className="text-xs font-bold uppercase tracking-wide text-[var(--muted)] mb-2">Productos</div>
                            <div className="space-y-1.5">
                              {order.items.map((item, i) => (
                                <div key={i} className="flex items-center justify-between text-base">
                                  <span className="font-medium">
                                    {item.quantity}x {item.name}
                                    {item.variantName && <span className="text-sm text-[var(--muted)]"> ({item.variantName})</span>}
                                    {item.weightGrams && <span className="text-sm text-[var(--muted)]"> · {item.weightGrams}g</span>}
                                  </span>
                                  <span className="font-semibold">${(item.priceCents * item.quantity / 100).toFixed(2)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Notes */}
                        {order.notes && (
                          <div className="rounded-xl bg-yellow-50 border border-yellow-200 px-4 py-3 text-sm font-medium text-yellow-800 mb-3">
                            📝 {order.notes}
                          </div>
                        )}

                        {/* Payment */}
                        <div className="mb-3">
                          {order.paymentMethod === "CASH" ? (
                            <CashBadge totalCents={order.totalCents} />
                          ) : (
                            <div className="inline-flex items-center gap-2 rounded-lg bg-blue-100 px-4 py-2 text-base font-semibold text-blue-800">
                              💳 Pagó con tarjeta
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-3 border-t border-gray-200 pt-3">
                          {order.arrivedAt ? (
                            <div className="flex items-center gap-2 rounded-xl bg-green-100 px-4 py-3 text-base font-bold text-green-800 border-2 border-green-300">
                              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Llegada notificada — espera al cliente
                            </div>
                          ) : (
                            <button
                              onClick={() => notifyArrival(order.id)}
                              disabled={arriving[order.id]}
                              className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-4 text-lg font-bold text-white shadow-md active:scale-95 transition-transform hover:bg-orange-600 disabled:opacity-50 border-none cursor-pointer"
                            >
                              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                              className="flex-1 rounded-xl border-2 border-gray-300 px-4 py-3 text-lg font-bold text-center outline-none focus:border-[var(--accent)] uppercase tracking-widest [font-size:16px] sm:[font-size:1.125rem]"
                              maxLength={6}
                            />
                            <button
                              onClick={() => confirmDelivery(order.id)}
                              className="rounded-xl bg-green-600 px-6 py-3 text-lg font-bold text-white hover:bg-green-700 shadow-md active:scale-95 transition-transform border-none cursor-pointer"
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

              {/* Non-completed my deliveries (CONFIRMED, READY) — with inline pickup scanner */}
              {nonCompletedMyDeliveries.length > 0 && (
                <div className="border-t border-orange-200">
                  <div className="px-5 py-3 bg-orange-50/50">
                    <h3 className="text-base font-bold flex items-center gap-2 text-purple-800">
                      📋 Pendientes ({nonCompletedMyDeliveries.length})
                    </h3>
                  </div>
                  <div className="grid gap-3 p-4">
                    {nonCompletedMyDeliveries.map((order) => (
                      <div key={order.id} className="rounded-xl border-2 border-purple-200 bg-white p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-base font-bold">#{order.id.slice(-8).toUpperCase()}</span>
                            <StatusBadge status={order.status} />
                          </div>
                          <span className="text-sm font-semibold">${(order.totalCents / 100).toFixed(2)}</span>
                        </div>
                        <div className="text-base font-semibold">{order.customerName}</div>
                        <div className="text-sm text-[var(--muted)]">🏪 {order.store.name}</div>
                        {order.store.address && (
                          <button
                            type="button"
                            onClick={(e) => { e.preventDefault(); openMapsUrl(getMapsUrl(null, null, order.store.address)); }}
                            className="inline-flex items-center gap-1 mt-1 text-sm font-medium text-blue-600 hover:underline bg-transparent border-none p-0 cursor-pointer"
                          >
                            📍 Cómo llegar a la tienda
                          </button>
                        )}
                        {order.paymentMethod === "CASH" && (
                          <div className="mt-2">
                            <CashBadge totalCents={order.totalCents} />
                          </div>
                        )}

                        <div className="mt-3 flex flex-col gap-2">
                          {pickupOrderId === order.id ? (
                            <div className="rounded-xl border-2 border-green-200 bg-green-50 p-4">
                              <div className="flex items-center justify-between mb-3">
                                <span className="text-sm font-bold text-green-800 flex items-center gap-1">
                                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/>
                                  </svg>
                                  Escanea o ingresa el código
                                </span>
                                <button
                                  type="button"
                                  onClick={() => { setPickupOrderId(null); setPickupCode(""); setPickupError(null); stopScanner(); }}
                                  className="text-xs font-medium text-gray-500 hover:text-gray-700 bg-transparent border-none p-0 cursor-pointer"
                                >
                                  Cancelar
                                </button>
                              </div>

                              {/* QR scanner */}
                              <div id={scannerId} className="w-full overflow-hidden rounded-lg bg-gray-200 mb-3" style={{ minHeight: 200 }} />

                              {!pickupScanning && !pickupCode && (
                                <button
                                  type="button"
                                  onClick={startPickupScanner}
                                  className="w-full rounded-lg bg-blue-600 py-2 text-sm font-bold text-white hover:bg-blue-700 mb-3 border-none cursor-pointer"
                                >
                                  📷 Activar cámara
                                </button>
                              )}

                              {pickupScanning && (
                                <p className="text-xs text-center text-gray-500 mb-3">
                                  Apunta al código QR de la tienda
                                </p>
                              )}

                              {/* Manual code */}
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={pickupCode}
                                  onChange={(e) => setPickupCode(e.target.value.toUpperCase())}
                                  placeholder="Código de recogida"
                                  className="flex-1 rounded-lg border-2 border-gray-300 px-3 py-2 text-base font-bold text-center outline-none focus:border-green-500 uppercase tracking-widest [font-size:16px]"
                                  maxLength={10}
                                />
                                <button
                                  type="button"
                                  onClick={() => handlePickup(order.id)}
                                  disabled={pickupLoading || !pickupCode.trim()}
                                  className="rounded-lg bg-green-600 px-5 py-2 text-base font-bold text-white hover:bg-green-700 disabled:opacity-50 border-none cursor-pointer"
                                >
                                  {pickupLoading ? "..." : "Recoger"}
                                </button>
                              </div>

                              {pickupError && (
                                <div className="mt-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">
                                  {pickupError}
                                </div>
                              )}
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setPickupOrderId(order.id);
                                setPickupCode("");
                                setPickupError(null);
                                setTimeout(() => startPickupScanner(), 300);
                              }}
                              className="w-full rounded-xl bg-green-600 py-3 text-base font-bold text-white hover:bg-green-700 shadow-sm active:scale-95 transition-transform border-none cursor-pointer flex items-center justify-center gap-2"
                            >
                              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              Llegué a la tienda
                            </button>
                          )}

                          <DeliveryChat orderId={order.id} currentUserId={currentUserId} currentUserRole="DELIVERY" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Available deliveries */}
      <div className="mb-6 rounded-xl border-2 border-blue-200 bg-white shadow-md">
        <div className="border-b border-gray-200 bg-blue-50 px-5 py-4">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
            </span>
            Pedidos disponibles
            <span className="rounded-full bg-blue-100 text-blue-800 text-sm px-3 py-0.5 font-bold">{availableDeliveries.length}</span>
          </h2>
        </div>
        {availableDeliveries.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-4xl mb-3">🛵</div>
            <div className="text-lg font-medium text-[var(--muted)]">No hay pedidos disponibles</div>
            <div className="text-sm text-[var(--muted)] mt-1">Los nuevos pedidos aparecerán aquí automáticamente</div>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {availableDeliveries.map((order) => {
              const distance = getDistanceToOrder(order.customerLat, order.customerLng);
              return (
                <div key={order.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-lg font-bold">#{order.id.slice(-8).toUpperCase()}</span>
                        {distance && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 text-blue-800 px-3 py-1 text-sm font-bold">
                            📍 {distance}
                          </span>
                        )}
                      </div>

                      <div className="text-base font-semibold mt-2">{order.customerName}</div>
                      <a href={`tel:${order.customerPhone}`} className="text-sm text-blue-600 font-medium hover:underline block">{order.customerPhone}</a>
                      {order.customerAddress && (
                        <div className="text-sm text-[var(--muted)]">📍 {order.customerAddress}</div>
                      )}

                      <div className="text-sm text-[var(--muted)] mt-1">
                        🏪 {order.store.name}
                        {order.store.address && <> · {order.store.address}</>}
                        {order.store.address && (
                          <button
                            type="button"
                            onClick={(e) => { e.preventDefault(); openMapsUrl(getMapsUrl(null, null, order.store.address)); }}
                            className="ml-2 text-blue-600 font-medium hover:underline bg-transparent border-none p-0 cursor-pointer"
                          >
                            Ver en mapa
                          </button>
                        )}
                      </div>

                      {order.items.length > 0 && (
                        <div className="mt-1.5 text-sm text-[var(--muted)]">
                          {order.items.map((item, i) => (
                            <span key={i}>
                              {i > 0 && <span className="mx-1">·</span>}
                              {item.quantity}x {item.name}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="mt-2">
                        {order.paymentMethod === "CASH" ? (
                          <CashBadge totalCents={order.totalCents} />
                        ) : (
                          <div className="inline-flex items-center gap-1 rounded-lg bg-blue-100 px-3 py-1.5 text-sm font-semibold text-blue-800">
                            💳 Pagó con tarjeta
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => acceptOrder(order.id)}
                      className="shrink-0 rounded-xl bg-emerald-600 px-6 py-4 text-base font-bold text-white hover:bg-emerald-700 shadow-md active:scale-95 transition-transform border-none cursor-pointer"
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

      {/* Completed deliveries - collapsible */}
      {completedDeliveries.length > 0 && (
        <div className="rounded-xl border-2 border-gray-200 bg-white shadow-sm">
          <button
            type="button"
            onClick={() => setShowDelivered(!showDelivered)}
            className="w-full flex items-center justify-between px-5 py-4 bg-gray-50 hover:bg-gray-100 border-none cursor-pointer rounded-t-xl"
          >
            <h2 className="text-lg font-bold flex items-center gap-2">
              ✅ Entregados
              <span className="rounded-full bg-gray-200 text-gray-700 text-sm px-3 py-0.5 font-bold">{completedDeliveries.length}</span>
            </h2>
            <svg className={`h-6 w-6 text-gray-500 transition-transform ${showDelivered ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showDelivered && (
            <div className="divide-y divide-gray-200">
              {completedDeliveries.map((order) => (
                <div key={order.id} className="px-5 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold">#{order.id.slice(-8).toUpperCase()}</span>
                        <span className="text-xs text-gray-500">
                          {new Date(order.createdAt).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}
                        </span>
                      </div>
                      <div className="text-sm font-medium mt-0.5">{order.customerName}</div>
                      <div className="text-xs text-[var(--muted)]">🏪 {order.store.name}</div>
                    </div>
                    <div className="text-sm font-bold text-green-700">
                      ${(order.totalCents / 100).toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Rating modal after delivery completion */}
      {ratingOrderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-5">
            <h3 className="text-xl font-bold text-center">Califica tu experiencia</h3>
            <p className="text-sm text-gray-500 text-center">Tu opinión nos ayuda a mejorar</p>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">Tienda *</label>
              <div className="flex gap-2 justify-center text-4xl">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRatingStore(star)}
                    className={`cursor-pointer transition-transform active:scale-125 ${star <= ratingStore ? "scale-110" : "opacity-40"} border-none bg-transparent`}
                  >
                    {star <= ratingStore ? "⭐" : "☆"}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">Repartidor</label>
              <div className="flex gap-2 justify-center text-4xl">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRatingDelivery(star)}
                    className={`cursor-pointer transition-transform active:scale-125 ${star <= ratingDelivery ? "scale-110" : "opacity-40"} border-none bg-transparent`}
                  >
                    {star <= ratingDelivery ? "⭐" : "☆"}
                  </button>
                ))}
              </div>
            </div>

            <textarea
              placeholder="Comentario (opcional)"
              value={ratingComment}
              onChange={(e) => setRatingComment(e.target.value)}
              className="w-full rounded-xl border-2 border-gray-200 p-3 text-sm outline-none focus:border-[var(--accent)] resize-none h-20"
            />

            <div className="flex gap-3">
              <button
                type="button"
                onClick={skipRating}
                className="flex-1 rounded-xl bg-gray-200 py-3 text-sm font-bold text-gray-700 hover:bg-gray-300 border-none cursor-pointer"
              >
                Saltar
              </button>
              <button
                type="button"
                onClick={submitRating}
                disabled={ratingStore === 0 || ratingSubmitting}
                className="flex-1 rounded-xl bg-[var(--accent)] py-3 text-sm font-bold text-white hover:opacity-90 disabled:opacity-40 border-none cursor-pointer"
              >
                {ratingSubmitting ? "Enviando..." : "Enviar calificación"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
