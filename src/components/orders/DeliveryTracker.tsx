"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Html5Qrcode } from "html5-qrcode";
import { haversineDistance, formatDistance, getMapsUrl, openMapsUrl } from "@/lib/geo";
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
    COMPLETED: "bg-emerald-100 text-emerald-800 border-emerald-300",
    OUT_FOR_DELIVERY: "bg-amber-100 text-amber-800 border-amber-300",
    READY: "bg-teal-100 text-teal-800 border-teal-300",
    CONFIRMED: "bg-indigo-100 text-indigo-800 border-indigo-300",
    PENDING: "bg-amber-100 text-amber-800 border-amber-300",
    CANCELLED: "bg-rose-100 text-rose-800 border-rose-300",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold animate-scale-in ${colors[status] || "bg-stone-100 text-stone-800 border-stone-300"}`}>
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
      className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-3 text-base font-semibold text-white shadow-lg active:scale-[0.97] transition-all duration-200 hover:bg-amber-700 hover:shadow-xl border-none cursor-pointer w-full"
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
    <div className="inline-flex items-center gap-2 rounded-xl bg-amber-50 border-2 border-amber-300 px-4 py-2 text-base font-bold text-amber-800 shadow-sm">
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
        setLocationError("Activa la ubicación para recibir pedidos cercanos.");
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
      router.refresh();
    } else {
      toast.error(data?.error || "Código inválido.");
    }
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
    try {
      const scanner = new Html5Qrcode(scannerId);
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (decodedText) => {
          const code = decodedText.trim().toUpperCase();
          if (code.length >= 4 && code.length <= 10) {
            stopScanner();
            setPickupCode(code);
          }
        },
        () => {},
      );
    } catch {
      setPickupError("No se pudo acceder a la cámara. Ingresa el código manualmente.");
      setPickupScanning(false);
    }
  }

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); } catch {}
      scannerRef.current = null;
    }
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
    (o) => o.status !== "COMPLETED" && o.status !== "OUT_FOR_DELIVERY"
  );

  return (
    <>
      {/* Location status bar */}
      {!hasGeo && (
        <div className="mb-5 rounded-xl border-2 border-amber-300 bg-amber-50/80 px-5 py-4 text-base font-medium text-amber-800 animate-slide-up backdrop-blur-sm">
          📡 Geolocalización no disponible en este navegador.
        </div>
      )}
      {hasGeo && locationError && (
        <div className="mb-5 rounded-xl border-2 border-amber-300 bg-amber-50/80 px-5 py-4 text-base font-medium text-amber-800 animate-slide-up backdrop-blur-sm">
          {locationError}
        </div>
      )}
      {driverLat && (
        <div className="mb-5 rounded-xl border-2 border-emerald-300 bg-emerald-50/80 px-5 py-4 text-base font-medium text-emerald-800 animate-slide-up flex items-center gap-3 backdrop-blur-sm">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
          Ubicación activa — recibiendo pedidos cercanos
        </div>
      )}

      {/* Earnings analysis */}
      {earnings && earnings.completedCount > 0 && (
        <div className="mb-6 animate-slide-up card-pueblo rounded-xl border p-5 shadow-sm">
          <h2 className="text-base font-bold mb-4 flex items-center gap-2 text-stone-800">
            <svg className="h-5 w-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Mis ingresos
            <span className="text-xs font-normal text-stone-500 ml-auto">{earnings.completedCount} entregas completadas</span>
          </h2>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 p-4 text-center animate-slide-up-sm animate-stagger-1 shadow-sm">
              <div className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-1">Hoy</div>
              <div className="text-xl font-bold text-stone-800">${(earnings.day / 100).toFixed(2)}</div>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-teal-50 to-emerald-50 border border-teal-200 p-4 text-center animate-slide-up-sm animate-stagger-2 shadow-sm">
              <div className="text-xs font-bold uppercase tracking-wider text-teal-700 mb-1">Semana</div>
              <div className="text-xl font-bold text-stone-800">${(earnings.week / 100).toFixed(2)}</div>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-rose-50 to-amber-50 border border-rose-200 p-4 text-center animate-slide-up-sm animate-stagger-3 shadow-sm">
              <div className="text-xs font-bold uppercase tracking-wider text-rose-700 mb-1">Mes</div>
              <div className="text-xl font-bold text-stone-800">${(earnings.month / 100).toFixed(2)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Mis entregas - collapsible */}
      {(activeDeliveries.length > 0 || nonCompletedMyDeliveries.length > 0) && (
        <div className="mb-6 animate-slide-up rounded-xl border-2 border-amber-200 bg-white shadow-md overflow-hidden">
          <button
            type="button"
            onClick={() => setShowMyDeliveries(!showMyDeliveries)}
            className="w-full flex items-center justify-between px-5 py-4 bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 border-none cursor-pointer transition-all duration-200"
          >
            <h2 className="text-lg font-bold flex items-center gap-2 text-stone-800">
              🛵 Mis entregas
              <span className="rounded-full bg-amber-200 text-amber-800 text-sm px-3 py-0.5 font-bold">
                {activeDeliveries.length + nonCompletedMyDeliveries.length}
              </span>
            </h2>
            <div className="flex items-center gap-3">
              <svg className={`h-6 w-6 text-amber-600 transition-all duration-300 ${showMyDeliveries ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>
          {showMyDeliveries && (
            <>
              {/* Active deliveries */}
              {activeDeliveries.length > 0 && (
                <div className="p-4 animate-fade-in">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                    </span>
                    <h3 className="text-base font-bold text-amber-800">En curso</h3>
                    <span className="rounded-full bg-amber-100 text-amber-800 text-xs px-2 py-0.5 font-bold">{activeDeliveries.length}</span>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {activeDeliveries.map((order, idx) => (
                      <div key={order.id} className={`rounded-xl border-2 border-amber-200 bg-white p-5 shadow-md animate-slide-up-sm animate-stagger-${Math.min(idx + 1, 6)} transition-all duration-200 hover:shadow-lg hover:border-amber-300`}>
                        {/* Order header */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="font-mono text-lg font-bold tracking-wider text-stone-800">
                            #{order.id.slice(-8).toUpperCase()}
                          </div>
                          <StatusBadge status={order.status} />
                        </div>

                        {/* Store info */}
                        <div className="rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 p-4 mb-3">
                          <div className="text-xs font-bold uppercase tracking-wide text-amber-700 mb-1">🏪 Tienda</div>
                          <div className="text-lg font-bold text-stone-800">{order.store.name}</div>
                          {order.store.address && (
                            <div className="text-sm text-stone-600 mt-1">📍 {order.store.address}</div>
                          )}
                          {order.store.address && (
                            <div className="mt-2">
                              <MapsButton url={getMapsUrl(null, null, order.store.address)} label="Cómo llegar a la tienda" />
                            </div>
                          )}
                        </div>

                        {/* Customer info */}
                        <div className="mb-3">
                          <div className="text-xs font-bold uppercase tracking-wide text-stone-500 mb-1">👤 Cliente</div>
                          <div className="text-lg font-bold text-stone-800">{order.customerName}</div>
                          <a href={`tel:${order.customerPhone}`} className="text-base text-amber-600 font-medium hover:text-amber-700 hover:underline block transition-colors">{order.customerPhone}</a>
                          {order.customerAddress && (
                            <div className="text-sm text-stone-500 mt-1">📍 {order.customerAddress}</div>
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
                          <div className="border-t border-amber-100 pt-3 mb-3">
                            <div className="text-xs font-bold uppercase tracking-wide text-stone-500 mb-2">Productos</div>
                            <div className="space-y-1.5">
                              {order.items.map((item, i) => (
                                <div key={i} className="flex items-center justify-between text-base">
                                  <span className="font-medium text-stone-700">
                                    {item.quantity}x {item.name}
                                    {item.variantName && <span className="text-sm text-stone-500"> ({item.variantName})</span>}
                                    {item.weightGrams && <span className="text-sm text-stone-500"> · {item.weightGrams}g</span>}
                                  </span>
                                  <span className="font-semibold text-stone-800">${(item.priceCents * item.quantity / 100).toFixed(2)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Notes */}
                        {order.notes && (
                          <div className="rounded-xl bg-amber-50/80 border border-amber-200 px-4 py-3 text-sm font-medium text-amber-800 mb-3">
                            📝 {order.notes}
                          </div>
                        )}

                        {/* Payment */}
                        <div className="mb-3">
                          {order.paymentMethod === "CASH" ? (
                            <CashBadge totalCents={order.totalCents} />
                          ) : (
                            <div className="inline-flex items-center gap-2 rounded-xl bg-teal-50 border border-teal-200 px-4 py-2 text-base font-semibold text-teal-800">
                              💳 Pagó con tarjeta
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-3 border-t border-amber-100 pt-3">
                          {order.arrivedAt ? (
                            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border-2 border-emerald-300 px-4 py-3 text-base font-bold text-emerald-800">
                              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Llegada notificada — espera al cliente
                            </div>
                          ) : (
                            <button
                              onClick={() => notifyArrival(order.id)}
                              disabled={arriving[order.id]}
                              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 px-5 py-4 text-lg font-bold text-white shadow-md active:scale-[0.97] transition-all duration-200 hover:from-amber-700 hover:to-orange-700 hover:shadow-lg disabled:opacity-50 border-none cursor-pointer"
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
                              className="flex-1 rounded-xl border-2 border-stone-300 px-4 py-3 text-lg font-bold text-center outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 uppercase tracking-widest transition-all duration-200 [font-size:16px] sm:[font-size:1.125rem]"
                              maxLength={6}
                            />
                            <button
                              onClick={() => confirmDelivery(order.id)}
                              className="rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 px-6 py-3 text-lg font-bold text-white hover:from-emerald-700 hover:to-green-700 shadow-md active:scale-[0.97] transition-all duration-200 border-none cursor-pointer"
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
                <div className="border-t border-amber-200">
                  <div className="px-5 py-3 bg-gradient-to-r from-amber-50/50 to-orange-50/50">
                    <h3 className="text-base font-bold flex items-center gap-2 text-rose-800">
                      📋 Pendientes ({nonCompletedMyDeliveries.length})
                    </h3>
                  </div>
                  <div className="grid gap-3 p-4">
                    {nonCompletedMyDeliveries.map((order, idx) => (
                      <div key={order.id} className={`rounded-xl border-2 border-rose-200 bg-white p-4 shadow-sm animate-slide-up-sm animate-stagger-${Math.min(idx + 1, 6)} transition-all duration-200 hover:shadow-md`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-base font-bold text-stone-800">#{order.id.slice(-8).toUpperCase()}</span>
                            <StatusBadge status={order.status} />
                          </div>
                          <span className="text-sm font-semibold text-stone-700">${(order.totalCents / 100).toFixed(2)}</span>
                        </div>
                        <div className="text-base font-semibold text-stone-800">{order.customerName}</div>
                        <div className="text-sm text-stone-500">🏪 {order.store.name}</div>
                        {order.store.address && (
                          <button
                            type="button"
                            onClick={(e) => { e.preventDefault(); openMapsUrl(getMapsUrl(null, null, order.store.address)); }}
                            className="inline-flex items-center gap-1 mt-1 text-sm font-medium text-amber-600 hover:text-amber-700 hover:underline bg-transparent border-none p-0 cursor-pointer transition-colors"
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
                            <div className="rounded-xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-50 p-4 animate-scale-in">
                              <div className="flex items-center justify-between mb-3">
                                <span className="text-sm font-bold text-emerald-800 flex items-center gap-1">
                                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/>
                                  </svg>
                                  Escanea o ingresa el código
                                </span>
                                <button
                                  type="button"
                                  onClick={() => { setPickupOrderId(null); setPickupCode(""); setPickupError(null); stopScanner(); }}
                                  className="text-xs font-medium text-stone-500 hover:text-stone-700 bg-transparent border-none p-0 cursor-pointer transition-colors"
                                >
                                  Cancelar
                                </button>
                              </div>

                              <div id={scannerId} className="w-full overflow-hidden rounded-lg bg-stone-200 mb-3" style={{ minHeight: 200 }} />

                              {!pickupScanning && !pickupCode && (
                                <button
                                  type="button"
                                  onClick={startPickupScanner}
                                  className="w-full rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 py-2.5 text-sm font-bold text-white hover:from-amber-700 hover:to-orange-700 mb-3 shadow-sm active:scale-[0.97] transition-all duration-200 border-none cursor-pointer"
                                >
                                  📷 Activar cámara
                                </button>
                              )}

                              {pickupScanning && (
                                <p className="text-xs text-center text-stone-500 mb-3">
                                  Apunta al código QR de la tienda
                                </p>
                              )}

                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={pickupCode}
                                  onChange={(e) => setPickupCode(e.target.value.toUpperCase())}
                                  placeholder="Código de recogida"
                                  className="flex-1 rounded-xl border-2 border-stone-300 px-3 py-2.5 text-base font-bold text-center outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 uppercase tracking-widest transition-all duration-200 [font-size:16px]"
                                  maxLength={10}
                                />
                                <button
                                  type="button"
                                  onClick={() => handlePickup(order.id)}
                                  disabled={pickupLoading || !pickupCode.trim()}
                                  className="rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 px-5 py-2.5 text-base font-bold text-white hover:from-emerald-700 hover:to-green-700 disabled:opacity-50 shadow-sm active:scale-[0.97] transition-all duration-200 border-none cursor-pointer"
                                >
                                  {pickupLoading ? "..." : "Recoger"}
                                </button>
                              </div>

                              {pickupError && (
                                <div className="mt-2 rounded-xl bg-rose-50 border border-rose-200 px-3 py-2.5 text-sm text-rose-700 animate-scale-in">
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
                              className="w-full rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 py-3 text-base font-bold text-white hover:from-emerald-700 hover:to-green-700 shadow-md active:scale-[0.97] transition-all duration-200 border-none cursor-pointer flex items-center justify-center gap-2"
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
      <div className="mb-6 animate-slide-up rounded-xl border-2 border-teal-200 bg-white shadow-md overflow-hidden">
        <div className="border-b border-teal-200 bg-gradient-to-r from-teal-50 to-emerald-50 px-5 py-4">
          <h2 className="flex items-center gap-2 text-lg font-bold text-stone-800">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-teal-500"></span>
            </span>
            Pedidos disponibles
            <span className="rounded-full bg-teal-100 text-teal-800 text-sm px-3 py-0.5 font-bold">{availableDeliveries.length}</span>
          </h2>
        </div>
        {availableDeliveries.length === 0 ? (
          <div className="p-8 text-center animate-fade-in">
            <div className="text-4xl mb-3">🛵</div>
            <div className="text-lg font-medium text-stone-500">No hay pedidos disponibles</div>
            <div className="text-sm text-stone-400 mt-1">Los nuevos pedidos aparecerán aquí automáticamente</div>
          </div>
        ) : (
          <div className="divide-y divide-teal-100">
            {availableDeliveries.map((order, idx) => {
              const distance = getDistanceToOrder(order.customerLat, order.customerLng);
              return (
                <div key={order.id} className={`px-5 py-4 animate-slide-up-sm animate-stagger-${Math.min(idx + 1, 6)} transition-all duration-200 hover:bg-teal-50/30`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-lg font-bold text-stone-800">#{order.id.slice(-8).toUpperCase()}</span>
                        {distance && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-teal-100 text-teal-800 px-3 py-1 text-sm font-bold">
                            📍 {distance}
                          </span>
                        )}
                      </div>

                      <div className="text-base font-semibold mt-2 text-stone-800">{order.customerName}</div>
                      <a href={`tel:${order.customerPhone}`} className="text-sm text-amber-600 font-medium hover:text-amber-700 hover:underline block transition-colors">{order.customerPhone}</a>
                      {order.customerAddress && (
                        <div className="text-sm text-stone-500">📍 {order.customerAddress}</div>
                      )}

                      <div className="text-sm text-stone-500 mt-1">
                        🏪 {order.store.name}
                        {order.store.address && <> · {order.store.address}</>}
                        {order.store.address && (
                          <button
                            type="button"
                            onClick={(e) => { e.preventDefault(); openMapsUrl(getMapsUrl(null, null, order.store.address)); }}
                            className="ml-2 text-amber-600 font-medium hover:text-amber-700 hover:underline bg-transparent border-none p-0 cursor-pointer transition-colors"
                          >
                            Ver en mapa
                          </button>
                        )}
                      </div>

                      {order.items.length > 0 && (
                        <div className="mt-1.5 text-sm text-stone-500">
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
                          <div className="inline-flex items-center gap-1 rounded-xl bg-teal-50 border border-teal-200 px-3 py-1.5 text-sm font-semibold text-teal-800">
                            💳 Pagó con tarjeta
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => acceptOrder(order.id)}
                      className="shrink-0 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 px-6 py-4 text-base font-bold text-white hover:from-emerald-700 hover:to-green-700 shadow-md active:scale-[0.97] transition-all duration-200 border-none cursor-pointer"
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
        <div className="animate-slide-up rounded-xl border border-stone-200 bg-white shadow-sm overflow-hidden">
          <button
            type="button"
            onClick={() => setShowDelivered(!showDelivered)}
            className="w-full flex items-center justify-between px-5 py-4 bg-stone-50 hover:bg-stone-100 border-none cursor-pointer transition-all duration-200"
          >
            <h2 className="text-lg font-bold flex items-center gap-2 text-stone-700">
              ✅ Entregados
              <span className="rounded-full bg-stone-200 text-stone-600 text-sm px-3 py-0.5 font-bold">{completedDeliveries.length}</span>
            </h2>
            <svg className={`h-6 w-6 text-stone-500 transition-all duration-300 ${showDelivered ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showDelivered && (
            <div className="divide-y divide-stone-100 animate-fade-in">
              {completedDeliveries.map((order) => (
                <div key={order.id} className="px-5 py-4 transition-colors hover:bg-stone-50/50">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-stone-700">#{order.id.slice(-8).toUpperCase()}</span>
                        <span className="text-xs text-stone-400">
                          {new Date(order.createdAt).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}
                        </span>
                      </div>
                      <div className="text-sm font-medium text-stone-700 mt-0.5">{order.customerName}</div>
                      <div className="text-xs text-stone-500">🏪 {order.store.name}</div>
                    </div>
                    <div className="text-sm font-bold text-emerald-700">
                      ${(order.totalCents / 100).toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
