import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/server/prisma";
import { getSession } from "@/server/session";
import { formatDateTimeInMexico } from "@/lib/dates";
import { formatMoney } from "@/lib/format";
import { getStatusLabel } from "@/lib/labels";
import { PullToRefreshWrapper } from "@/components/ui/PullToRefreshWrapper";
import { Card, CardContent, Button, EmptyState, Badge, OrderStatusBadge, Skeleton, SkeletonCard } from "@/components/ui/design-system";

function getStatusColor(status: string) {
  const colors: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-800",
    CONFIRMED: "bg-blue-100 text-blue-800",
    READY: "bg-purple-100 text-purple-800",
    OUT_FOR_DELIVERY: "bg-orange-100 text-orange-800",
    COMPLETED: "bg-green-100 text-green-800",
    CANCELLED: "bg-red-100 text-red-800",
  };
  return colors[status] || "bg-gray-100 text-gray-800";
}

export const dynamic = "force-dynamic";

export default async function MisPedidosPage() {
  const session = await getSession();
  if (!session?.user?.id) redirect("/login");

  const orders = await prisma.order.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      fulfillmentType: true,
      customerName: true,
      totalCents: true,
      currency: true,
      createdAt: true,
      store: { select: { name: true, slug: true } },
    },
  });

  const stats = {
    total: orders.length,
    pending: orders.filter(o => ["PENDING", "CONFIRMED", "READY", "OUT_FOR_DELIVERY"].includes(o.status)).length,
    completed: orders.filter(o => o.status === "COMPLETED").length,
    cancelled: orders.filter(o => o.status === "CANCELLED").length,
  };

  return (
    <PullToRefreshWrapper>
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 lg:py-10 fade-in">
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Mis Pedidos</h1>
            <p className="mt-1 text-sm text-[color:var(--muted)]">Historial de tus compras en Mercadito Ocoyoacac</p>
          </div>
          <Link href="/tiendas" className="shrink-0">
            <Button variant="outline" leftIcon={
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            }>
              Seguir comprando
            </Button>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <StatCard label="Total" value={stats.total} icon={
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
          } />
          <StatCard label="Activos" value={stats.pending} variant="warning" icon={
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          } />
          <StatCard label="Entregados" value={stats.completed} variant="success" icon={
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" /></svg>
          } />
          <StatCard label="Cancelados" value={stats.cancelled} variant="danger" icon={
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" /></svg>
          } />
        </div>
      </div>

      {orders.length === 0 ? (
        <EmptyState
          illustration="orders"
          title="Aún no tienes pedidos"
          description="Explora las tiendas y haz tu primera compra."
          action={{ label: "Explorar tiendas", href: "/tiendas", variant: "primary" }}
        />
      ) : (
        <div className="space-y-4" role="list" aria-label="Lista de pedidos">
          {orders.map((order, i) => (
            <Link
              key={order.id}
              href={`/mis-pedidos/${order.id}`}
              className="block"
            >
              <Card variant="default" hover={true} className="fade-in" style={{ animationDelay: `${i * 60}ms` }}>
                <CardContent className="p-5">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="font-mono text-sm font-semibold text-[var(--foreground)]">
                          #{order.id.slice(-8).toUpperCase()}
                        </span>
                        <OrderStatusBadge status={order.status as any} size="md" fulfillmentType={order.fulfillmentType} />
                        <Badge variant="neutral" size="sm">
                          {order.fulfillmentType === "PICKUP" ? "📍 Recoger en tienda" : "🚚 Entrega a domicilio"}
                        </Badge>
                      </div>
                      <div className="mt-2 text-sm">
                        <span className="text-[color:var(--muted)]">Tienda: </span>
                        <Link href={`/tienda/${order.store.slug}`} className="font-medium text-[var(--accent)] hover:underline">
                          {order.store.name}
                        </Link>
                      </div>
                      <div className="mt-1 text-xs text-[color:var(--muted)]">
                        {formatDateTimeInMexico(order.createdAt, {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-lg font-semibold text-[var(--foreground)]">
                        {formatMoney(order.totalCents, order.currency)}
                      </div>
                      <div className="text-xs text-[color:var(--muted)]">Total</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </main>
    </PullToRefreshWrapper>
  );
}

function StatCard({ label, value, variant = "default", icon }: { label: string; value: number; variant?: "default" | "success" | "warning" | "danger"; icon: React.ReactNode }) {
  const variantColors = {
    default: "bg-white border-[var(--border)]",
    success: "bg-green-50 border-green-200",
    warning: "bg-amber-50 border-amber-200",
    danger: "bg-red-50 border-red-200",
  };
  const iconColors = {
    default: "text-[var(--accent)]",
    success: "text-green-600",
    warning: "text-amber-600",
    danger: "text-red-600",
  };
  const valueColors = {
    default: "text-[var(--foreground)]",
    success: "text-green-700",
    warning: "text-amber-700",
    danger: "text-red-700",
  };

  return (
    <Card variant="outlined" className={`${variantColors[variant]} p-4`}>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-medium text-[color:var(--muted)] uppercase tracking-wide">{label}</div>
          <div className={`text-2xl font-bold ${valueColors[variant]}`}>{value}</div>
        </div>
        <div className={`p-2 rounded-xl ${iconColors[variant]}`}>{icon}</div>
      </div>
    </Card>
  );
}