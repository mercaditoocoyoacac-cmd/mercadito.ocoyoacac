import { redirect } from "next/navigation";
import { prisma } from "@/server/prisma";
import { getSession } from "@/server/session";
import { getUserRoles } from "@/server/requireUser";
import { formatMoney } from "@/lib/format";
import { getStatusLabel } from "@/lib/labels";

export const revalidate = 30;

export default async function AdminOrdersPage() {
  const session = await getSession();

  if (!session?.user?.id || session.user.isActive === false || !getUserRoles(session).includes("ADMIN")) {
    redirect("/");
  }

  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      fulfillmentType: true,
      totalCents: true,
      currency: true,
      createdAt: true,
      user: { select: { email: true, name: true } },
      store: { select: { name: true, slug: true } },
      deliveryUser: { select: { email: true } },
    },
    take: 100,
  });

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">
          Todos los Pedidos
        </h1>
        <p className="mt-1 text-sm text-[color:var(--muted)]">
          Historial completo de pedidos de la plataforma
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-5 mb-8">
        <div className="rounded-xl border border-[var(--border)] p-5">
          <div className="text-sm text-[color:var(--muted)]">Total</div>
          <div className="mt-1 text-2xl font-semibold">{orders.length}</div>
        </div>
        <div className="rounded-xl border border-[var(--border)] p-5">
          <div className="text-sm text-[color:var(--muted)]">Pendientes</div>
          <div className="mt-1 text-2xl font-semibold text-yellow-600">
            {orders.filter(o => o.status === "PENDING").length}
          </div>
        </div>
        <div className="rounded-xl border border-[var(--border)] p-5">
          <div className="text-sm text-[color:var(--muted)]">Confirmados</div>
          <div className="mt-1 text-2xl font-semibold text-blue-600">
            {orders.filter(o => o.status === "CONFIRMED").length}
          </div>
        </div>
        <div className="rounded-xl border border-[var(--border)] p-5">
          <div className="text-sm text-[color:var(--muted)]">En camino</div>
          <div className="mt-1 text-2xl font-semibold text-orange-600">
            {orders.filter(o => o.status === "OUT_FOR_DELIVERY").length}
          </div>
        </div>
        <div className="rounded-xl border border-[var(--border)] p-5">
          <div className="text-sm text-[color:var(--muted)]">Completados</div>
          <div className="mt-1 text-2xl font-semibold text-green-600">
            {orders.filter(o => o.status === "COMPLETED").length}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--border)]">
        <div className="border-b border-[var(--border)] px-5 py-4">
          <h2 className="font-semibold">Pedidos ({orders.length})</h2>
        </div>
        {orders.length === 0 ? (
          <div className="p-5 text-center text-sm text-[color:var(--muted)]">
            No hay pedidos aún.
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {orders.map((order) => (
              <div key={order.id} className="px-5 py-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-mono text-sm font-medium">
                      #{order.id.slice(-8).toUpperCase()}
                    </div>
                    <div className="text-sm">{order.store.name}</div>
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
                      })} CST
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">
                      {formatMoney(order.totalCents, order.currency)}
                    </div>
                    <div className={`text-xs px-2 py-1 rounded-full mt-1 ${
                      order.status === "COMPLETED" ? "bg-green-100 text-green-800" :
                      order.status === "PENDING" ? "bg-yellow-100 text-yellow-800" :
                      order.status === "CANCELLED" ? "bg-red-100 text-red-800" :
                      order.status === "OUT_FOR_DELIVERY" ? "bg-orange-100 text-orange-800" :
                      "bg-blue-100 text-blue-800"
                    }`}>
                      {getStatusLabel(order.status)}
                    </div>
                    <div className={`text-xs mt-1 ${
                      order.fulfillmentType === "DELIVERY" ? "text-purple-600" : "text-gray-600"
                    }`}>
                      {order.fulfillmentType === "DELIVERY" ? "📦 Entrega" : "🏪 Recoger"}
                    </div>
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
