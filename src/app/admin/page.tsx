import { redirect } from "next/navigation";
import { prisma } from "@/server/prisma";
import { getSession } from "@/server/session";

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency }).format(
    cents / 100,
  );
}

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const session = await getSession();

  if (!session?.user?.id || session.user.role !== "ADMIN") {
    redirect("/");
  }

  const [
    totalUsers,
    customerCount,
    vendorCount,
    deliveryCount,
    totalStores,
    activeStores,
    totalProducts,
    totalOrders,
    pendingOrders,
    completedOrders,
    totalRevenue,
    recentOrders,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: "CUSTOMER" } }),
    prisma.user.count({ where: { role: "VENDOR" } }),
    prisma.user.count({ where: { role: "DELIVERY" } }),
    prisma.store.count(),
    prisma.store.count({ where: { isPublished: true } }),
    prisma.product.count(),
    prisma.order.count(),
    prisma.order.count({ where: { status: "PENDING" } }),
    prisma.order.count({ where: { status: "COMPLETED" } }),
    prisma.order.aggregate({
      where: { status: "COMPLETED" },
      _sum: { totalCents: true },
    }),
    prisma.order.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        totalCents: true,
        currency: true,
        createdAt: true,
        user: { select: { email: true } },
        store: { select: { name: true } },
      },
    }),
  ]);

  const statusLabels: Record<string, string> = {
    PENDING: "Pendiente",
    CONFIRMED: "Confirmado",
    READY: "Listo",
    OUT_FOR_DELIVERY: "En camino",
    COMPLETED: "Entregado",
    CANCELLED: "Cancelado",
  };

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">
          Dashboard de Administración
        </h1>
        <p className="mt-1 text-sm text-[color:var(--muted)]">
          Resumen general de la plataforma
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-[var(--border)] p-5">
          <div className="text-sm text-[color:var(--muted)]">Usuarios totales</div>
          <div className="mt-1 text-2xl font-semibold">{totalUsers}</div>
          <div className="mt-1 text-xs text-[color:var(--muted)]">
            {customerCount} clientes, {vendorCount} vendedores, {deliveryCount} repartidores
          </div>
        </div>
        <div className="rounded-xl border border-[var(--border)] p-5">
          <div className="text-sm text-[color:var(--muted)]">Tiendas</div>
          <div className="mt-1 text-2xl font-semibold">{totalStores}</div>
          <div className="mt-1 text-xs text-green-600">
            {activeStores} activas
          </div>
        </div>
        <div className="rounded-xl border border-[var(--border)] p-5">
          <div className="text-sm text-[color:var(--muted)]">Productos</div>
          <div className="mt-1 text-2xl font-semibold">{totalProducts}</div>
        </div>
        <div className="rounded-xl border border-[var(--border)] p-5">
          <div className="text-sm text-[color:var(--muted)]">Pedidos</div>
          <div className="mt-1 text-2xl font-semibold">{totalOrders}</div>
          <div className="mt-1 text-xs text-[color:var(--muted)]">
            {pendingOrders} pendientes, {completedOrders} completados
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-[var(--border)]">
          <div className="border-b border-[var(--border)] px-5 py-4">
            <h2 className="font-semibold">Ingresos totales</h2>
          </div>
          <div className="p-5">
            <div className="text-3xl font-bold text-green-600">
              {formatMoney(totalRevenue._sum.totalCents || 0, "MXN")}
            </div>
            <div className="mt-1 text-sm text-[color:var(--muted)]">
              Total de pedidos completados
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-[var(--border)]">
          <div className="border-b border-[var(--border)] px-5 py-4">
            <h2 className="font-semibold">Distribución de usuarios</h2>
          </div>
          <div className="p-5">
            <div className="flex items-center justify-around">
              <div className="text-center">
                <div className="text-2xl font-semibold text-blue-600">{customerCount}</div>
                <div className="text-xs text-[color:var(--muted)]">Clientes</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-semibold text-green-600">{vendorCount}</div>
                <div className="text-xs text-[color:var(--muted)]">Vendedores</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-semibold text-orange-600">{deliveryCount}</div>
                <div className="text-xs text-[color:var(--muted)]">Repartidores</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 rounded-xl border border-[var(--border)]">
        <div className="border-b border-[var(--border)] px-5 py-4">
          <h2 className="font-semibold">Pedidos recientes</h2>
        </div>
        {recentOrders.length === 0 ? (
          <div className="p-5 text-center text-sm text-[color:var(--muted)]">
            No hay pedidos aún.
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {recentOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between px-5 py-4">
                <div>
                  <div className="font-mono text-sm">
                    #{order.id.slice(-8).toUpperCase()}
                  </div>
                  <div className="text-xs text-[color:var(--muted)]">
                    {order.store.name} • {order.user.email}
                  </div>
                  <div className="text-xs text-[color:var(--muted)]">
                    {new Date(order.createdAt).toLocaleDateString("es-MX", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium">
                    {formatMoney(order.totalCents, order.currency)}
                  </div>
                  <div className={`text-xs ${
                    order.status === "COMPLETED" ? "text-green-600" :
                    order.status === "PENDING" ? "text-yellow-600" :
                    order.status === "CANCELLED" ? "text-red-600" :
                    "text-blue-600"
                  }`}>
                    {statusLabels[order.status]}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}