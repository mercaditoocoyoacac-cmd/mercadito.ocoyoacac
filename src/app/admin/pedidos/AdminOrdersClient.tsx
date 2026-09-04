"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatMoney } from "@/lib/format";
import { getStatusLabel } from "@/lib/labels";

const STATUS_FLOW = ["PENDING", "CONFIRMED", "READY", "OUT_FOR_DELIVERY", "COMPLETED"];

function getAdvanceLabel(status: string, fulfillmentType: string) {
  if (fulfillmentType === "PICKUP" && status === "OUT_FOR_DELIVERY") {
    return "Listo para recoger";
  }
  return getStatusLabel(status);
}

interface OrderData {
  id: string;
  status: string;
  fulfillmentType: string;
  totalCents: number;
  currency: string;
  createdAt: string;
  user: { email: string; name: string | null };
  store: { name: string; slug: string };
  deliveryUser: { email: string } | null;
}

interface DeliverySettingsData {
  id: number;
  baseFeeCents: number;
  extraFeePerSegmentCents: number;
  baseDistanceKm: number;
  segmentKm: number;
  fallbackFeeCents: number;
  updatedAt: string | Date;
}

export function AdminOrdersClient({ orders, deliverySettings: initialSettings }: { orders: OrderData[]; deliverySettings: DeliverySettingsData }) {
  const router = useRouter();
  const [processing, setProcessing] = useState<Set<string>>(new Set());
  const [editingFee, setEditingFee] = useState(false);
  const [savingFee, setSavingFee] = useState(false);
  const [feeError, setFeeError] = useState("");
  const [feeSettings, setFeeSettings] = useState({
    baseFeeCents: initialSettings.baseFeeCents,
    extraFeePerSegmentCents: initialSettings.extraFeePerSegmentCents,
    baseDistanceKm: initialSettings.baseDistanceKm,
    segmentKm: initialSettings.segmentKm,
    fallbackFeeCents: initialSettings.fallbackFeeCents,
  });

  async function handleAdvance(orderId: string) {
    setProcessing((prev) => new Set(prev).add(orderId));
    try {
      const res = await fetch(`/api/admin/pedidos/${orderId}/status`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "advance" }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        alert(data?.error || "Error al avanzar");
      }
    } catch {
      alert("Error de red");
    }
    setProcessing((prev) => { const next = new Set(prev); next.delete(orderId); return next; });
    router.refresh();
  }

  async function handleCancel(orderId: string) {
    if (!confirm("¿Cancelar este pedido? No se puede deshacer.")) return;
    setProcessing((prev) => new Set(prev).add(orderId));
    try {
      const res = await fetch(`/api/admin/pedidos/${orderId}/status`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        alert(data?.error || "Error al cancelar");
      }
    } catch {
      alert("Error de red");
    }
    setProcessing((prev) => { const next = new Set(prev); next.delete(orderId); return next; });
    router.refresh();
  }

  async function handleSaveFee() {
    setSavingFee(true);
    setFeeError("");
    try {
      const res = await fetch("/api/admin/delivery-settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          baseFeeCents: feeSettings.baseFeeCents,
          extraFeePerSegmentCents: feeSettings.extraFeePerSegmentCents,
          baseDistanceKm: feeSettings.baseDistanceKm,
          segmentKm: feeSettings.segmentKm,
          fallbackFeeCents: feeSettings.fallbackFeeCents,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        setFeeError(data?.error || "Error al guardar");
      } else {
        setEditingFee(false);
        router.refresh();
      }
    } catch {
      setFeeError("Error de red");
    }
    setSavingFee(false);
  }

  function getStatusBadgeClass(status: string): string {
    switch (status) {
      case "COMPLETED": return "bg-green-100 text-green-800";
      case "PENDING": return "bg-yellow-100 text-yellow-800";
      case "CANCELLED": return "bg-red-100 text-red-800";
      case "OUT_FOR_DELIVERY": return "bg-orange-100 text-orange-800";
      default: return "bg-blue-100 text-blue-800";
    }
  }

  const summary = {
    total: orders.length,
    pending: orders.filter(o => o.status === "PENDING").length,
    confirmed: orders.filter(o => o.status === "CONFIRMED" || o.status === "READY" || o.status === "OUT_FOR_DELIVERY").length,
    completed: orders.filter(o => o.status === "COMPLETED").length,
    cancelled: orders.filter(o => o.status === "CANCELLED").length,
  };

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Todos los Pedidos</h1>
        <p className="mt-1 text-sm text-[color:var(--muted)]">
          Avanza o cancela pedidos paso a paso
        </p>
      </div>

      {/* Delivery fee settings */}
      <div className="rounded-xl border border-[var(--border)] mb-8 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <div>
            <h2 className="font-semibold">Tarifa general de envío</h2>
            <p className="text-xs text-[color:var(--muted)] mt-0.5">
              Se aplica a pedidos de entrega que no caen en ninguna zona configurada.
            </p>
          </div>
          {!editingFee ? (
            <button
              type="button"
              onClick={() => { setFeeSettings({
                baseFeeCents: initialSettings.baseFeeCents,
                extraFeePerSegmentCents: initialSettings.extraFeePerSegmentCents,
                baseDistanceKm: initialSettings.baseDistanceKm,
                segmentKm: initialSettings.segmentKm,
                fallbackFeeCents: initialSettings.fallbackFeeCents,
              }); setFeeError(""); setEditingFee(true); }}
              className="rounded-lg bg-[var(--accent)] px-4 py-2 text-xs font-medium text-white hover:bg-[var(--accent-hover)] transition-colors"
            >
              Modificar
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEditingFee(false)}
                disabled={savingFee}
                className="rounded-lg border border-[var(--border)] px-4 py-2 text-xs font-medium hover:bg-gray-50 disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveFee}
                disabled={savingFee}
                className="rounded-lg bg-[var(--accent)] px-4 py-2 text-xs font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-60 transition-colors"
              >
                {savingFee ? "Guardando..." : "Guardar"}
              </button>
            </div>
          )}
        </div>

        {editingFee ? (
          <div className="p-5">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="text-xs text-[color:var(--muted)]">Tarifa base</label>
                <input
                  type="number"
                  min={0}
                  value={feeSettings.baseFeeCents}
                  onChange={(e) => setFeeSettings({ ...feeSettings, baseFeeCents: parseInt(e.target.value || "0", 10) })}
                  className="mt-1 w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                />
                <div className="text-[10px] text-[color:var(--muted)] mt-1">Precio en centavos</div>
              </div>
              <div>
                <label className="text-xs text-[color:var(--muted)]">Costo por segmento extra</label>
                <input
                  type="number"
                  min={0}
                  value={feeSettings.extraFeePerSegmentCents}
                  onChange={(e) => setFeeSettings({ ...feeSettings, extraFeePerSegmentCents: parseInt(e.target.value || "0", 10) })}
                  className="mt-1 w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                />
                <div className="text-[10px] text-[color:var(--muted)] mt-1">Precio en centavos</div>
              </div>
              <div>
                <label className="text-xs text-[color:var(--muted)]">Km gratis con tarifa base</label>
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  value={feeSettings.baseDistanceKm}
                  onChange={(e) => setFeeSettings({ ...feeSettings, baseDistanceKm: parseFloat(e.target.value || "0") })}
                  className="mt-1 w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                />
              </div>
              <div>
                <label className="text-xs text-[color:var(--muted)]">Km por segmento</label>
                <input
                  type="number"
                  min={0.1}
                  step={0.1}
                  value={feeSettings.segmentKm}
                  onChange={(e) => setFeeSettings({ ...feeSettings, segmentKm: parseFloat(e.target.value || "0") })}
                  className="mt-1 w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                />
              </div>
              <div>
                <label className="text-xs text-[color:var(--muted)]">Tarifa sin coordenadas (fallback)</label>
                <input
                  type="number"
                  min={0}
                  value={feeSettings.fallbackFeeCents}
                  onChange={(e) => setFeeSettings({ ...feeSettings, fallbackFeeCents: parseInt(e.target.value || "0", 10) })}
                  className="mt-1 w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                />
                <div className="text-[10px] text-[color:var(--muted)] mt-1">Precio en centavos</div>
              </div>
            </div>
            {feeError && (
              <div className="mt-3 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700">
                {feeError}
              </div>
            )}
          </div>
        ) : (
          <div className="px-5 py-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg bg-gray-50 px-4 py-3">
              <div className="text-xs text-[color:var(--muted)]">Tarifa base</div>
              <div className="mt-0.5 text-lg font-semibold">{formatMoney(initialSettings.baseFeeCents, "MXN")}</div>
            </div>
            <div className="rounded-lg bg-gray-50 px-4 py-3">
              <div className="text-xs text-[color:var(--muted)]">Por segmento extra</div>
              <div className="mt-0.5 text-lg font-semibold">{formatMoney(initialSettings.extraFeePerSegmentCents, "MXN")}</div>
            </div>
            <div className="rounded-lg bg-gray-50 px-4 py-3">
              <div className="text-xs text-[color:var(--muted)]">Km gratis</div>
              <div className="mt-0.5 text-lg font-semibold">{initialSettings.baseDistanceKm} km</div>
            </div>
            <div className="rounded-lg bg-gray-50 px-4 py-3">
              <div className="text-xs text-[color:var(--muted)]">Km por segmento</div>
              <div className="mt-0.5 text-lg font-semibold">{initialSettings.segmentKm} km</div>
            </div>
            <div className="rounded-lg bg-gray-50 px-4 py-3">
              <div className="text-xs text-[color:var(--muted)]">Tarifa fallback</div>
              <div className="mt-0.5 text-lg font-semibold">{formatMoney(initialSettings.fallbackFeeCents, "MXN")}</div>
            </div>
            <div className="rounded-lg bg-gray-50 px-4 py-3 flex items-center">
              <span className="text-xs text-[color:var(--muted)]">
                Las zonas configuradas en "Zonas Envío" tienen prioridad sobre esta tarifa.
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-5 mb-8">
        <div className="rounded-xl border border-[var(--border)] p-5">
          <div className="text-sm text-[color:var(--muted)]">Total</div>
          <div className="mt-1 text-2xl font-semibold">{summary.total}</div>
        </div>
        <div className="rounded-xl border border-[var(--border)] p-5">
          <div className="text-sm text-[color:var(--muted)]">Pendientes</div>
          <div className="mt-1 text-2xl font-semibold text-yellow-600">{summary.pending}</div>
        </div>
        <div className="rounded-xl border border-[var(--border)] p-5">
          <div className="text-sm text-[color:var(--muted)]">En proceso</div>
          <div className="mt-1 text-2xl font-semibold text-blue-600">{summary.confirmed}</div>
        </div>
        <div className="rounded-xl border border-[var(--border)] p-5">
          <div className="text-sm text-[color:var(--muted)]">Completados</div>
          <div className="mt-1 text-2xl font-semibold text-green-600">{summary.completed}</div>
        </div>
        <div className="rounded-xl border border-[var(--border)] p-5">
          <div className="text-sm text-[color:var(--muted)]">Cancelados</div>
          <div className="mt-1 text-2xl font-semibold text-red-600">{summary.cancelled}</div>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--border)]">
        <div className="border-b border-[var(--border)] px-5 py-4">
          <h2 className="font-semibold">Pedidos ({orders.length})</h2>
        </div>
        {orders.length === 0 ? (
          <div className="p-5 text-center text-sm text-[color:var(--muted)]">No hay pedidos aún.</div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {orders.map((order) => {
              const flowIdx = STATUS_FLOW.indexOf(order.status);
              const isTerminal = order.status === "COMPLETED" || order.status === "CANCELLED";
              const canAdvance = !isTerminal && order.status !== "CANCELLED" && flowIdx < STATUS_FLOW.length - 1;
              const canCancel = !isTerminal;
              const isBusy = processing.has(order.id);

              return (
                <div key={order.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-sm font-medium">
                        #{order.id.slice(-8).toUpperCase()}
                      </div>
                      <div className="text-sm font-medium">{order.store.name}</div>
                      <div className="text-xs text-[color:var(--muted)]">
                        Cliente: {order.user.name || order.user.email}
                      </div>
                      {order.deliveryUser && (
                        <div className="text-xs text-[color:var(--muted)]">
                          Repartidor: {order.deliveryUser.email}
                        </div>
                      )}
                      <div className="text-xs text-[color:var(--muted)]">
                        {new Date(order.createdAt).toLocaleString("es-MX", {
                          timeZone: "America/Mexico_City",
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-medium">{formatMoney(order.totalCents, order.currency)}</div>
                      <div className={`text-xs px-2 py-1 rounded-full mt-1 inline-block ${getStatusBadgeClass(order.status)}`}>
                        {getStatusLabel(order.status)}
                      </div>
                      <div className={`text-xs mt-1 ${order.fulfillmentType === "DELIVERY" ? "text-purple-600" : "text-gray-600"}`}>
                        {order.fulfillmentType === "DELIVERY" ? "Entrega" : "Recoger"}
                      </div>
                    </div>
                  </div>

                  {/* Step indicator */}
                  <div className="mt-3 flex items-center gap-1">
                    {STATUS_FLOW.map((s, i) => {
                      const isActive = flowIdx >= i;
                      const isCurrent = order.status === s;
                      return (
                        <div key={s} className="flex items-center gap-1 flex-1">
                          <div
                            className={`h-2 w-full rounded-full transition-colors ${
                              isCurrent
                                ? "bg-[var(--accent)]"
                                : isActive
                                  ? "bg-[var(--accent-soft)]"
                                  : "bg-gray-200"
                            }`}
                          />
                          {i < STATUS_FLOW.length - 1 && (
                            <div className={`h-0.5 flex-1 ${isActive && i < STATUS_FLOW.length - 1 ? "bg-[var(--accent-soft)]" : "bg-gray-200"}`} />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Action buttons */}
                  {!isTerminal && (
                    <div className="mt-3 flex gap-2">
                      {canAdvance && (
                        <button
                          type="button"
                          onClick={() => handleAdvance(order.id)}
                          disabled={isBusy}
                          className="rounded-lg bg-[var(--accent)] px-4 py-2 text-xs font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-60"
                        >
                          {isBusy ? "..." : `Avanzar a ${getAdvanceLabel(STATUS_FLOW[flowIdx + 1], order.fulfillmentType)}`}
                        </button>
                      )}
                      {canCancel && (
                        <button
                          type="button"
                          onClick={() => handleCancel(order.id)}
                          disabled={isBusy}
                          className="rounded-lg border border-red-300 px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
                        >
                          Cancelar
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
