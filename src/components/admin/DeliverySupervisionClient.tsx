"use client";

import { useEffect, useState } from "react";
import { formatMoney } from "@/lib/format";
import { getStatusLabel } from "@/lib/labels";
import { openMapsUrl, getMapsUrl } from "@/lib/geo";

interface OrderItem {
  id: string;
  quantity: number;
  weightGrams: number | null;
  priceCents: number;
  product: { id: string; name: string; imageUrl: string | null } | null;
}

interface Driver {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  latitude: number | null;
  longitude: number | null;
  updatedAt: string;
}

interface OrderData {
  id: string;
  status: string;
  fulfillmentType: string;
  paymentMethod: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string | null;
  customerLat: number | null;
  customerLng: number | null;
  notes: string | null;
  subtotalCents: number;
  deliveryCents: number;
  totalCents: number;
  currency: string;
  deliveryCode: string | null;
  pickupCode: string | null;
  arrivedAt: string | null;
  arrivalConfirmedAt: string | null;
  createdAt: string;
  updatedAt: string;
  statusTimestamps: Record<string, string> | null;
  user: { id: string; name: string | null; email: string; phone: string | null };
  store: { id: string; name: string; slug: string; latitude: number | null; longitude: number | null; address: string | null; phone: string | null };
  deliveryUser: { id: string; name: string | null; email: string; phone: string | null } | null;
  items: OrderItem[];
}

interface ApiResponse {
  ok: boolean;
  orders: OrderData[];
  drivers: Driver[];
}

const STATUS_FLOW = ["PENDING", "CONFIRMED", "READY", "OUT_FOR_DELIVERY", "COMPLETED"];

function getTimelineStages(statusTimestamps: Record<string, string> | null): { status: string; label: string; time: string | null; done: boolean }[] {
  const ts = statusTimestamps || {};
  return STATUS_FLOW.map((s) => ({
    status: s,
    label: getStatusLabel(s),
    time: ts[s] ? new Date(ts[s]).toLocaleString("es-MX", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" }) : null,
    done: !!ts[s],
  }));
}

function getTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `hace ${days}d`;
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-800 border-yellow-200",
    CONFIRMED: "bg-purple-100 text-purple-800 border-purple-200",
    READY: "bg-blue-100 text-blue-800 border-blue-200",
    OUT_FOR_DELIVERY: "bg-orange-100 text-orange-800 border-orange-200",
    COMPLETED: "bg-green-100 text-green-800 border-green-200",
    CANCELLED: "bg-red-100 text-red-800 border-red-200",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${colors[status] || "bg-gray-100 text-gray-800"}`}>
      {getStatusLabel(status)}
    </span>
  );
}

function OrderTimeline({ timestamps }: { timestamps: Record<string, string> | null }) {
  const stages = getTimelineStages(timestamps);
  const activeIdx = stages.findLastIndex((s) => s.done);

  return (
    <div className="flex items-center gap-1">
      {stages.map((s, i) => (
        <div key={s.status} className="flex items-center gap-1 flex-1 min-w-0">
          <div className="flex flex-col items-center min-w-0">
            <div className={`w-3 h-3 rounded-full shrink-0 ${s.done ? "bg-green-500" : "bg-gray-200"}`} />
            <span className={`text-[10px] leading-tight mt-0.5 text-center ${s.done ? "text-green-700 font-medium" : "text-gray-400"}`}>
              {s.time || (i <= activeIdx ? "—" : "")}
            </span>
          </div>
          {i < stages.length - 1 && (
            <div className={`h-0.5 flex-1 mt-[-1.25rem] ${s.done ? "bg-green-400" : "bg-gray-200"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

function OrderCard({ order, drivers, onRefresh }: { order: OrderData; drivers: Driver[]; onRefresh: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [reassigning, setReassigning] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [notifying, setNotifying] = useState(false);

  const isActive = !["COMPLETED", "CANCELLED"].includes(order.status);
  const cancelled = order.status === "CANCELLED";

  async function handleReassign() {
    if (!selectedDriver) return;
    setActionMsg(null);
    try {
      const res = await fetch("/api/admin/envios/reassign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id, driverId: selectedDriver }),
      });
      const data = await res.json();
      if (data.ok) {
        setActionMsg("Repartidor reasignado");
        setReassigning(false);
        onRefresh();
      } else {
        setActionMsg(data.error || "Error al reasignar");
      }
    } catch {
      setActionMsg("Error de red");
    }
  }

  async function handleCancel() {
    if (!confirm("¿Estás seguro de cancelar este pedido? Se restaurará el inventario.")) return;
    setActionMsg(null);
    try {
      const res = await fetch("/api/admin/envios/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id }),
      });
      const data = await res.json();
      if (data.ok) {
        setActionMsg("Pedido cancelado");
        setCancelling(false);
        onRefresh();
      } else {
        setActionMsg(data.error || "Error al cancelar");
      }
    } catch {
      setActionMsg("Error de red");
    }
  }

  async function handleNotify(to: string) {
    setNotifying(true);
    setActionMsg(null);
    try {
      const res = await fetch("/api/admin/envios/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id, to }),
      });
      const data = await res.json();
      setActionMsg(data.ok ? "Notificación enviada" : data.error || "Error");
    } catch {
      setActionMsg("Error de red");
    }
    setNotifying(false);
  }

  const storeCoords = order.store.latitude && order.store.longitude;
  const customerCoords = order.customerLat && order.customerLng;

  return (
    <div className={`rounded-xl border ${isActive ? "border-[var(--border)]" : cancelled ? "border-red-200 bg-red-50/30" : "border-gray-200 bg-gray-50/30"}`}>
      <button onClick={() => setExpanded(!expanded)} className="w-full text-left p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-sm truncate">{order.customerName}</span>
              <StatusBadge status={order.status} />
            </div>
            <div className="text-xs text-[color:var(--muted)] space-y-0.5">
              <div>{order.store.name} · {formatMoney(order.totalCents, order.currency)}</div>
              {order.deliveryUser && <div>🛵 {order.deliveryUser.name || order.deliveryUser.email}</div>}
              <div className="text-[10px]">{getTimeAgo(order.updatedAt)}</div>
            </div>
          </div>
          <svg className={`w-5 h-5 shrink-0 text-[color:var(--muted)] transition-transform ${expanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-[var(--border)] px-4 pb-4 pt-3 space-y-4">
          <div>
            <h4 className="text-xs font-semibold text-[color:var(--muted)] uppercase tracking-wider mb-2">Línea de tiempo</h4>
            <OrderTimeline timestamps={order.statusTimestamps} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-lg border border-[var(--border)] p-3">
              <div className="text-xs font-medium text-[color:var(--muted)] mb-1">Origen (tienda)</div>
              <div className="text-sm font-medium">{order.store.name}</div>
              <div className="text-xs text-[color:var(--muted)]">{order.store.address || "Sin dirección"}</div>
              {storeCoords && (
                <button onClick={() => openMapsUrl(getMapsUrl(order.store.latitude, order.store.longitude, order.store.address))} className="mt-2 text-xs text-blue-600 underline">
                  Ver en mapa
                </button>
              )}
            </div>
            <div className="rounded-lg border border-[var(--border)] p-3">
              <div className="text-xs font-medium text-[color:var(--muted)] mb-1">Destino (cliente)</div>
              <div className="text-sm font-medium">{order.customerName}</div>
              <div className="text-xs text-[color:var(--muted)]">{order.customerAddress || "Sin dirección"}</div>
              <div className="text-xs text-[color:var(--muted)]">{order.customerPhone}</div>
              {customerCoords && (
                <button onClick={() => openMapsUrl(getMapsUrl(order.customerLat, order.customerLng, order.customerAddress))} className="mt-2 text-xs text-blue-600 underline">
                  Ver en mapa
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            <div className="rounded-lg bg-gray-50 p-2">
              <div className="text-[10px] text-[color:var(--muted)]">Subtotal</div>
              <div className="text-sm font-semibold">{formatMoney(order.subtotalCents, order.currency)}</div>
            </div>
            <div className="rounded-lg bg-gray-50 p-2">
              <div className="text-[10px] text-[color:var(--muted)]">Envío</div>
              <div className="text-sm font-semibold">{formatMoney(order.deliveryCents, order.currency)}</div>
            </div>
            <div className="rounded-lg bg-gray-50 p-2">
              <div className="text-[10px] text-[color:var(--muted)]">Total</div>
              <div className="text-sm font-semibold">{formatMoney(order.totalCents, order.currency)}</div>
            </div>
            <div className="rounded-lg bg-gray-50 p-2">
              <div className="text-[10px] text-[color:var(--muted)]">Pago</div>
              <div className="text-sm font-semibold">{order.paymentMethod === "CASH" ? "Efectivo" : order.paymentMethod}</div>
            </div>
          </div>

          {order.items.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-[color:var(--muted)] uppercase tracking-wider mb-1">Productos</h4>
              <div className="text-xs space-y-1">
                {order.items.map((item) => (
                  <div key={item.id} className="flex justify-between">
                    <span>{item.product?.name || "Producto"} × {item.weightGrams ? `${item.weightGrams}g` : item.quantity}</span>
                    <span className="font-medium">{formatMoney(item.priceCents * (item.weightGrams ? item.weightGrams * item.quantity : item.quantity), order.currency)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {order.notes && (
            <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-2 text-xs">
              <span className="font-medium">Notas:</span> {order.notes}
            </div>
          )}

          {/* Action buttons */}
          {isActive && (
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setReassigning(!reassigning)} className="text-xs px-3 py-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--accent-soft)] transition-colors">
                {order.deliveryUser ? "🔄 Reasignar" : "👤 Asignar repartidor"}
              </button>
              <button onClick={() => handleNotify("driver")} disabled={notifying} className="text-xs px-3 py-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--accent-soft)] transition-colors disabled:opacity-50">
                {notifying ? "..." : "🔔 Notificar repartidor"}
              </button>
              <button onClick={() => handleNotify("customer")} disabled={notifying} className="text-xs px-3 py-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--accent-soft)] transition-colors disabled:opacity-50">
                {notifying ? "..." : "🔔 Notificar cliente"}
              </button>
              <button onClick={() => { if (confirm("¿Cancelar este pedido?")) handleCancel(); }} className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 transition-colors">
                ❌ Cancelar pedido
              </button>
            </div>
          )}

          {cancelled && (
            <div className="text-xs text-red-600 bg-red-50 rounded-lg p-2">
              Pedido cancelado
            </div>
          )}

          {reassigning && (
            <div className="rounded-lg border border-[var(--border)] p-3 space-y-2">
              <div className="text-xs font-medium">Seleccionar repartidor</div>
              <select
                value={selectedDriver}
                onChange={(e) => setSelectedDriver(e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
              >
                <option value="">— Seleccionar —</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>{d.name || d.email}</option>
                ))}
              </select>
              <div className="flex gap-2">
                <button onClick={handleReassign} disabled={!selectedDriver} className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors">
                  Confirmar
                </button>
                <button onClick={() => setReassigning(false)} className="text-xs px-3 py-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--accent-soft)] transition-colors">
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {actionMsg && (
            <div className={`text-xs rounded-lg p-2 ${actionMsg.includes("Error") || actionMsg.includes("error") ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
              {actionMsg}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function DeliverySupervisionClient() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [storeFilter, setStoreFilter] = useState<string>("ALL");

  async function fetchData() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/envios");
      const json = await res.json();
      if (json.ok) setData(json);
    } catch (e) {
      console.error("Error fetching envios", e);
    }
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, []);

  const statuses = ["ALL", "CONFIRMED", "READY", "OUT_FOR_DELIVERY", "COMPLETED", "CANCELLED"];
  const storeNames = data ? [...new Set(data.orders.map((o) => o.store.name))].sort() : [];

  const filtered = data
    ? data.orders.filter((o) => {
        if (statusFilter !== "ALL" && o.status !== statusFilter) return false;
        if (storeFilter !== "ALL" && o.store.name !== storeFilter) return false;
        if (search) {
          const q = search.toLowerCase();
          const match = o.customerName.toLowerCase().includes(q) || o.customerPhone.includes(q) || o.store.name.toLowerCase().includes(q) || o.id.includes(q);
          if (!match) return false;
        }
        return true;
      })
    : [];

  const counts = data ? {
    ALL: data.orders.length,
    CONFIRMED: data.orders.filter((o) => o.status === "CONFIRMED").length,
    READY: data.orders.filter((o) => o.status === "READY").length,
    OUT_FOR_DELIVERY: data.orders.filter((o) => o.status === "OUT_FOR_DELIVERY").length,
    COMPLETED: data.orders.filter((o) => o.status === "COMPLETED").length,
    CANCELLED: data.orders.filter((o) => o.status === "CANCELLED").length,
  } : {} as Record<string, number>;

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--border)] border-t-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {statuses.map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)} className={`rounded-xl border p-3 text-center transition-all ${statusFilter === s ? "border-blue-500 bg-blue-50 shadow-sm" : "border-[var(--border)] hover:bg-[var(--accent-soft)]"}`}>
            <div className="text-xl font-bold">{counts[s] || 0}</div>
            <div className="text-xs text-[color:var(--muted)] mt-0.5">{s === "ALL" ? "Todos" : getStatusLabel(s)}</div>
          </button>
        ))}
      </div>

      {/* Active drivers */}
      {data && (
        <div className="rounded-xl border border-green-200 bg-green-50/50 p-4">
          <h3 className="text-sm font-bold text-green-800 mb-3 flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
            </span>
            Repartidores activos
            <span className="text-xs font-normal text-green-600 ml-auto">
              {data.drivers.filter((d) => Date.now() - new Date(d.updatedAt).getTime() < 120000).length} en línea
            </span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {data.drivers.filter((d) => Date.now() - new Date(d.updatedAt).getTime() < 120000).length === 0 && (
              <div className="text-xs text-green-600 col-span-full">No hay repartidores activos</div>
            )}
            {data.drivers
              .filter((d) => Date.now() - new Date(d.updatedAt).getTime() < 120000)
              .map((d) => (
                <div key={d.id} className="flex items-center gap-3 rounded-lg bg-white border border-green-200 px-3 py-2">
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{d.name || d.email}</div>
                    {d.latitude && d.longitude && (
                      <button
                        onClick={() => openMapsUrl(getMapsUrl(d.latitude!, d.longitude!, d.name || ""))}
                        className="text-[11px] text-blue-600 underline"
                      >
                        Ver en mapa
                      </button>
                    )}
                  </div>
                  {d.latitude && d.longitude && (
                    <span className="text-[10px] text-green-600 shrink-0">📍</span>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Buscar cliente, tienda o ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-[200px] flex-1 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm"
        />
        <select
          value={storeFilter}
          onChange={(e) => setStoreFilter(e.target.value)}
          className="rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm"
        >
          <option value="ALL">Todas las tiendas</option>
          {storeNames.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
        <button onClick={fetchData} className="rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm hover:bg-[var(--accent-soft)] transition-colors">
          ↻ Actualizar
        </button>
      </div>

      {/* Orders list */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-[var(--border)] p-8 text-center text-sm text-[color:var(--muted)]">
            No hay envíos que coincidan con los filtros
          </div>
        ) : (
          filtered.map((order) => (
            <OrderCard key={order.id} order={order} drivers={data?.drivers || []} onRefresh={fetchData} />
          ))
        )}
      </div>
    </div>
  );
}
