import Link from "next/link";
import { formatMoney } from "@/lib/format";

interface StatsData {
  totals: {
    customerCount: number; vendorCount: number;
    deliveryCount: number; totalStores: number; activeStores: number;
    totalProducts: number; totalOrders: number; pendingOrders: number;
  };
  revenue: { totalCents: number };
  subscriptions: { activeCount: number; monthlyRevenueCents: number };
  orders: {
    recentOrders: {
      id: string; status: string; totalCents: number; currency: string;
      createdAt: string; paymentMethod: string; fulfillmentType: string;
      user: { email: string; name: string | null };
      store: { name: string };
    }[];
  };
}

const statusLabels: Record<string, string> = {
  COMPLETED: "Completado",
  PENDING: "Pendiente",
  CANCELLED: "Cancelado",
  OUT_FOR_DELIVERY: "En camino",
  CONFIRMED: "Confirmado",
  READY: "Listo",
};

const statusTone: Record<string, string> = {
  COMPLETED: "text-[var(--success)]",
  PENDING: "text-[var(--warning)]",
  CANCELLED: "text-[var(--danger)]",
  OUT_FOR_DELIVERY: "text-[var(--info)]",
  CONFIRMED: "text-[var(--info)]",
  READY: "text-[color:var(--muted)]",
};

function Stat({ label, value, sub, href }: { label: string; value: number; sub?: string; href: string }) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-5 transition-colors hover:border-[var(--accent)]"
    >
      <div className="text-sm text-[color:var(--muted)]">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value.toLocaleString("es-MX")}</div>
      {sub && <div className="mt-1 text-xs text-[color:var(--muted)]">{sub}</div>}
    </Link>
  );
}

export default function AdminDashboardClient({ data }: { data: StatsData }) {
  const { totals, revenue, subscriptions, orders } = data;

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Pedidos pendientes"
          value={totals.pendingOrders}
          sub={`${totals.totalOrders} pedidos en total`}
          href="/admin/pedidos"
        />
        <Stat
          label="Ingresos completados"
          value={Math.round(revenue.totalCents / 100)}
          sub="Pedidos completados (MXN)"
          href="/admin/informes"
        />
        <Stat
          label="Tiendas activas"
          value={totals.activeStores}
          sub={`${totals.totalStores} tiendas registradas`}
          href="/admin/tiendas"
        />
        <Stat
          label="Membresías activas"
          value={subscriptions.activeCount}
          sub={`${formatMoney(subscriptions.monthlyRevenueCents, "MXN")} / mes`}
          href="/admin/membresias"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] lg:col-span-2">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
            <h2 className="font-semibold">Pedidos recientes</h2>
            <Link href="/admin/pedidos" className="text-sm text-[var(--accent-strong)] hover:underline">
              Ver todos
            </Link>
          </div>
          {orders.recentOrders.length === 0 ? (
            <div className="p-8 text-center text-sm text-[color:var(--muted)]">No hay pedidos aún.</div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {orders.recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between gap-4 px-5 py-4">
                  <div className="min-w-0">
                    <div className="font-mono text-sm">#{order.id.slice(-8).toUpperCase()}</div>
                    <div className="truncate text-xs text-[color:var(--muted)]">
                      {order.store.name} · {order.user.name || order.user.email}
                    </div>
                    <div className="text-xs text-[color:var(--muted)]">
                      {new Date(order.createdAt).toLocaleDateString("es-MX", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium tabular-nums">{formatMoney(order.totalCents, order.currency)}</div>
                    <div className={`text-xs ${statusTone[order.status] ?? "text-[color:var(--muted)]"}`}>
                      {statusLabels[order.status] ?? order.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)]">
          <div className="border-b border-[var(--border)] px-5 py-4">
            <h2 className="font-semibold">Comunidad</h2>
          </div>
          <div className="divide-y divide-[var(--border)] px-5">
            {[
              { label: "Clientes", value: totals.customerCount },
              { label: "Vendedores", value: totals.vendorCount },
              { label: "Repartidores", value: totals.deliveryCount },
              { label: "Productos publicados", value: totals.totalProducts },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between py-3 text-sm">
                <span className="text-[color:var(--muted)]">{row.label}</span>
                <span className="font-medium tabular-nums">{row.value.toLocaleString("es-MX")}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
