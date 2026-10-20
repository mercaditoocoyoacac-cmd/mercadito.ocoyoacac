"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { haversineDistance, formatDistance, getMapsUrl, openMapsUrl } from "@/lib/geo";
import DeliveryChat from "@/components/chat/DeliveryChat";
import { getStatusLabel } from "@/lib/labels";
import { formatMoney } from "@/lib/format";

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

const statusTone: Record<string, string> = {
  COMPLETED: "text-[var(--success)]",
  OUT_FOR_DELIVERY: "text-[var(--warning)]",
  READY: "text-[var(--info)]",
  CONFIRMED: "text-[var(--info)]",
  PENDING: "text-[var(--warning)]",
  CANCELLED: "text-[var(--danger)]",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-[var(--border)] px-3 py-1 text-xs font-medium text-[color:var(--muted)]">
      <span className={statusTone[status] ?? "text-[color:var(--text)]"}>{getStatusLabel(status)}</span>
    </span>
  );
}

function MapsButton({ url, label }: { url: string | null; label: string }) {
  if (!url) return null;
  return (
    <button
      type="button"
      onClick={(e) => { e.preventDefault(); openMapsUrl(url!); }}
      className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--border)] px-4 py-3 text-sm font-medium text-[color:var(--text)] transition-colors hover:bg-[var(--surface)]"
    >
      <svg aria-hidden="true" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
      {label}
    </button>
  );
}

function CashBadge({ totalCents, currency }: { totalCents: number; currency: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-lg border border-[var(--warning)] px-4 py-2 text-sm font-semibold text-[var(--warning)]">
      Cobrar {formatMoney(totalCents, currency)}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <span className="text-sm text-[color:var(--muted)]">{label}</span>
      <span className="text-right text-sm font-medium">{value}</span>
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
  const [claimingOrder, setClaimingOrder] = useState<string | null>(null);
  const [showDelivered, setShowDelivered] = useState(false);
  const [pickupOrderId, setPickupOrderId] = useState<string | null>(null);
  const [pickupCode, setPickupCode] = useState("");
  const [pickupLoading, setPickupLoading] = useState(false);
  const [pickupError, setPickupError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasGeo = useSyncExternalStore(() => () => {}, () => "geolocation" in navigator, () => false);

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
    setClaimingOrder(orderId);
    const res = await fetch("/api/delivery/claim", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ orderId }),
    });
    const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
    if (res.ok && data?.ok) {
      toast.success("Pedido aceptado — ingresa el código de recogida de la tienda");
      setPickupOrderId(orderId);
      setPickupCode("");
      setPickupError(null);
      setClaimingOrder(null);
      router.refresh();
    } else {
      toast.error(data?.error || "No se pudo aceptar el pedido.");
      setClaimingOrder(null);
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

  async function handlePickup(orderId: string, codeOverride?: string) {
    const code = (codeOverride ?? pickupCode).trim();
    if (!code) {
      toast.error("Escanea o ingresa el código de recogida.");
      return;
    }
    setPickupLoading(true);
    setPickupError(null);
    const res = await fetch("/api/delivery/confirm", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ orderId, code: code.toUpperCase(), action: "pickup" }),
    });
    const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
    setPickupLoading(false);
    if (res.ok && data?.ok) {
      toast.success("Producto recogido — en camino");
      setPickupOrderId(null);
      setPickupCode("");
      setPickupError(null);
      router.refresh();
    } else {
      setPickupError(data?.error || "Código inválido");
    }
  }

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
      {(!hasGeo || locationError) && (
        <div className="mb-6 rounded-xl border border-[var(--warning)] px-5 py-4 text-sm text-[var(--warning)]">
          {locationError ?? "La geolocalización no está disponible en este navegador."}
        </div>
      )}
      {driverLat && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-[var(--border)] px-5 py-4 text-sm text-[color:var(--muted)]">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--success)] opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[var(--success)]" />
          </span>
          Ubicación activa — recibiendo pedidos cercanos
        </div>
      )}

      {earnings && earnings.completedCount > 0 && (
        <section className="mb-6 rounded-xl border border-[var(--border)] bg-[var(--card-bg)]">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
            <h2 className="font-semibold">Ingresos</h2>
            <span className="text-xs text-[color:var(--muted)]">{earnings.completedCount} entregas completadas</span>
          </div>
          <div className="grid grid-cols-3 divide-x divide-[var(--border)]">
            {[
              { label: "Hoy", value: earnings.day },
              { label: "Semana", value: earnings.week },
              { label: "Mes", value: earnings.month },
            ].map((row) => (
              <div key={row.label} className="px-5 py-4 text-center">
                <div className="text-xs uppercase tracking-wide text-[color:var(--muted)]">{row.label}</div>
                <div className="mt-1 text-xl font-semibold tabular-nums">{formatMoney(row.value, "MXN")}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {(activeDeliveries.length > 0 || nonCompletedMyDeliveries.length > 0) && (
        <section className="mb-6 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[color:var(--muted)]">Mis entregas</h2>

          {activeDeliveries.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              {activeDeliveries.map((order) => (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-5"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <div className="font-mono text-base font-semibold">#{order.id.slice(-8).toUpperCase()}</div>
                    <StatusBadge status={order.status} />
                  </div>

                  <div className="mb-4 rounded-lg border border-[var(--border)] p-4">
                    <div className="text-xs uppercase tracking-wide text-[color:var(--muted)]">Tienda</div>
                    <div className="mt-1 font-medium">{order.store.name}</div>
                    {order.store.address && <div className="mt-1 text-sm text-[color:var(--muted)]">{order.store.address}</div>}
                    {order.store.address && (
                      <div className="mt-3">
                        <MapsButton url={getMapsUrl(null, null, order.store.address)} label="Cómo llegar a la tienda" />
                      </div>
                    )}
                  </div>

                  <div className="mb-4">
                    <div className="text-xs uppercase tracking-wide text-[color:var(--muted)]">Cliente</div>
                    <div className="mt-1 font-medium">{order.customerName}</div>
                    <a href={`tel:${order.customerPhone}`} className="block text-sm text-[var(--accent-strong)] hover:underline">
                      {order.customerPhone}
                    </a>
                    {order.customerAddress && <div className="mt-1 text-sm text-[color:var(--muted)]">{order.customerAddress}</div>}
                    {(order.customerLat || order.customerAddress) && (
                      <div className="mt-3">
                        <MapsButton url={getMapsUrl(order.customerLat, order.customerLng, order.customerAddress)} label="Ruta al cliente" />
                      </div>
                    )}
                  </div>

                  {order.items.length > 0 && (
                    <div className="border-t border-[var(--border)] py-3">
                      <div className="text-xs uppercase tracking-wide text-[color:var(--muted)]">Productos</div>
                      <div className="mt-2 space-y-1.5">
                        {order.items.map((item, i) => (
                          <div key={i} className="flex items-center justify-between text-sm">
                            <span>
                              {item.quantity}x {item.name}
                              {item.variantName && <span className="text-[color:var(--muted)]"> ({item.variantName})</span>}
                              {item.weightGrams && <span className="text-[color:var(--muted)]"> · {item.weightGrams}g</span>}
                            </span>
                            <span className="font-medium tabular-nums">{formatMoney(item.priceCents * item.quantity, order.currency)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {order.notes && (
                    <div className="mt-3 rounded-lg border border-[var(--warning)] px-4 py-3 text-sm text-[var(--warning)]">
                      {order.notes}
                    </div>
                  )}

                  <div className="mt-4">
                    {order.paymentMethod === "CASH" ? (
                      <CashBadge totalCents={order.totalCents} currency={order.currency} />
                    ) : (
                      <div className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-[color:var(--muted)]">
                        {order.paymentMethod === "TRANSFERENCIA" ? "Pagó por transferencia" : "Pagó con tarjeta"}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex flex-col gap-3 border-t border-[var(--border)] pt-4">
                    {order.arrivedAt ? (
                      <div className="flex items-center gap-2 rounded-lg border border-[var(--success)] px-4 py-3 text-sm text-[var(--success)]">
                        <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Llegada notificada — espera al cliente
                      </div>
                    ) : (
                      <button
                        onClick={() => notifyArrival(order.id)}
                        disabled={arriving[order.id]}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-[var(--on-accent)] transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-50"
                      >
                        {arriving[order.id] ? "Notificando..." : "Llegué"}
                      </button>
                    )}

                    <div className="flex items-center gap-2">
                      <input
                        aria-label="Código del cliente"
                        type="text"
                        placeholder="Código del cliente"
                        value={completeCode[order.id] || ""}
                        onChange={(e) => setCompleteCode((prev) => ({ ...prev, [order.id]: e.target.value }))}
                        className="flex-1 rounded-lg border border-[var(--border)] px-4 py-3 text-center text-base font-semibold uppercase tracking-widest outline-none focus:border-[var(--accent)] [font-size:16px]"
                        maxLength={6}
                      />
                      <button
                        onClick={() => confirmDelivery(order.id)}
                        className="rounded-lg bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-[var(--on-accent)] transition-colors hover:bg-[var(--accent-hover)]"
                      >
                        Completar
                      </button>
                    </div>

                    <DeliveryChat orderId={order.id} currentUserId={currentUserId} currentUserRole="DELIVERY" />
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {nonCompletedMyDeliveries.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {nonCompletedMyDeliveries.map((order) => (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold">#{order.id.slice(-8).toUpperCase()}</span>
                      <StatusBadge status={order.status} />
                    </div>
                    <span className="text-sm font-medium tabular-nums">{formatMoney(order.totalCents, order.currency)}</span>
                  </div>
                  <div className="mt-2 font-medium">{order.customerName}</div>
                  <div className="text-sm text-[color:var(--muted)]">{order.store.name}</div>
                  {order.store.address && (
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); openMapsUrl(getMapsUrl(null, null, order.store.address)); }}
                      className="mt-1 text-sm text-[var(--accent-strong)] hover:underline"
                    >
                      Cómo llegar a la tienda
                    </button>
                  )}
                  {order.paymentMethod === "CASH" && (
                    <div className="mt-2">
                      <CashBadge totalCents={order.totalCents} currency={order.currency} />
                    </div>
                  )}

                  <div className="mt-3 flex flex-col gap-2">
                    {pickupOrderId === order.id ? (
                      <div className="rounded-lg border border-[var(--border)] p-4">
                        <div className="mb-3 flex items-center justify-between">
                          <span className="text-sm font-medium">Ingresa el código de recogida</span>
                          <button
                            type="button"
                            onClick={() => { setPickupOrderId(null); setPickupCode(""); setPickupError(null); }}
                            className="text-xs text-[color:var(--muted)] hover:text-[color:var(--text)]"
                          >
                            Cancelar
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            aria-label="Código de recogida"
                            type="text"
                            value={pickupCode}
                            onChange={(e) => setPickupCode(e.target.value.toUpperCase())}
                            placeholder="Código de recogida"
                            className="flex-1 rounded-lg border border-[var(--border)] px-3 py-2 text-center text-base font-semibold uppercase tracking-widest outline-none focus:border-[var(--accent)] [font-size:16px]"
                            maxLength={10}
                          />
                          <button
                            type="button"
                            onClick={() => handlePickup(order.id)}
                            disabled={pickupLoading || !pickupCode.trim()}
                            className="rounded-lg bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-[var(--on-accent)] transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-50"
                          >
                            {pickupLoading ? "..." : "Recoger"}
                          </button>
                        </div>
                        {pickupError && (
                          <div className="mt-2 rounded-lg border border-[var(--danger)] px-3 py-2 text-sm text-[var(--danger)]">
                            {pickupError}
                          </div>
                        )}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => { setPickupOrderId(order.id); setPickupCode(""); setPickupError(null); }}
                        className="w-full rounded-lg border border-[var(--border)] py-3 text-sm font-medium transition-colors hover:bg-[var(--surface)]"
                      >
                        Llegué a la tienda
                      </button>
                    )}

                    <DeliveryChat orderId={order.id} currentUserId={currentUserId} currentUserRole="DELIVERY" />
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </section>
      )}

      <section className="mb-6 rounded-xl border border-[var(--border)] bg-[var(--card-bg)]">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
          <h2 className="font-semibold">Pedidos disponibles</h2>
          <span className="text-xs text-[color:var(--muted)]">{availableDeliveries.length} disponibles</span>
        </div>
        {availableDeliveries.length === 0 ? (
          <div className="p-8 text-center">
            <div className="font-medium text-[color:var(--muted)]">No hay pedidos disponibles</div>
            <div className="mt-1 text-sm text-[color:var(--muted)]">Los nuevos pedidos aparecerán aquí automáticamente.</div>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {availableDeliveries.map((order) => {
              const distance = getDistanceToOrder(order.customerLat, order.customerLng);
              return (
                <div key={order.id} className="flex items-start justify-between gap-4 px-5 py-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-semibold">#{order.id.slice(-8).toUpperCase()}</span>
                      {distance && (
                        <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-xs text-[color:var(--muted)]">
                          {distance}
                        </span>
                      )}
                    </div>
                    <div className="mt-1.5 font-medium">{order.customerName}</div>
                    <a href={`tel:${order.customerPhone}`} className="block text-sm text-[var(--accent-strong)] hover:underline">
                      {order.customerPhone}
                    </a>
                    {order.customerAddress && <div className="text-sm text-[color:var(--muted)]">{order.customerAddress}</div>}
                    <div className="mt-1 text-sm text-[color:var(--muted)]">
                      {order.store.name}
                      {order.store.address && (
                        <>
                          {" · "}
                          <button
                            type="button"
                            onClick={(e) => { e.preventDefault(); openMapsUrl(getMapsUrl(null, null, order.store.address)); }}
                            className="text-[var(--accent-strong)] hover:underline"
                          >
                            Ver en mapa
                          </button>
                        </>
                      )}
                    </div>
                    {order.items.length > 0 && (
                      <div className="mt-1 text-sm text-[color:var(--muted)]">
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
                        <CashBadge totalCents={order.totalCents} currency={order.currency} />
                      ) : (
                        <span className="text-sm text-[color:var(--muted)]">Pagó con tarjeta</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => acceptOrder(order.id)}
                    disabled={claimingOrder === order.id}
                    className="shrink-0 rounded-lg bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-[var(--on-accent)] transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-60"
                  >
                    {claimingOrder === order.id ? "Aceptando..." : "Aceptar"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {completedDeliveries.length > 0 && (
        <section className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)]">
          <button
            type="button"
            onClick={() => setShowDelivered(!showDelivered)}
            className="flex w-full items-center justify-between rounded-t-xl px-5 py-4 transition-colors hover:bg-[var(--surface)]"
          >
            <h2 className="font-semibold">
              Entregados <span className="ml-1 text-sm font-normal text-[color:var(--muted)]">{completedDeliveries.length}</span>
            </h2>
            <svg
              aria-hidden="true"
              className={`h-5 w-5 text-[color:var(--muted)] transition-transform ${showDelivered ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showDelivered && (
            <div className="divide-y divide-[var(--border)] border-t border-[var(--border)]">
              {completedDeliveries.map((order) => (
                <div key={order.id} className="flex items-center justify-between gap-3 px-5 py-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold">#{order.id.slice(-8).toUpperCase()}</span>
                      <span className="text-xs text-[color:var(--muted)]">
                        {new Date(order.createdAt).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}
                      </span>
                    </div>
                    <div className="mt-0.5 text-sm">{order.customerName}</div>
                    <div className="text-xs text-[color:var(--muted)]">{order.store.name}</div>
                  </div>
                  <div className="text-sm font-medium tabular-nums text-[var(--success)]">
                    {formatMoney(order.totalCents, order.currency)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </>
  );
}
