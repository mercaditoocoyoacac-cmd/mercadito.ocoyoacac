import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/server/prisma";
import { getSession } from "@/server/session";

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency }).format(
    cents / 100,
  );
}

function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    PENDING: "Pendiente",
    CONFIRMED: "Confirmado",
    READY: "Listo",
    OUT_FOR_DELIVERY: "En camino",
    COMPLETED: "Entregado",
    CANCELLED: "Cancelado",
  };
  return labels[status] || status;
}

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

export const revalidate = 30;

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

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Mis Pedidos</h1>
      <p className="mt-2 text-sm text-[color:var(--muted)]">
        Historial de tus compras en Mercadito Ocoyoacac.
      </p>

      {orders.length === 0 ? (
        <div className="mt-8 rounded-xl border border-[var(--border)] p-8 text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-[var(--accent-soft)] flex items-center justify-center mb-4">
            <svg className="h-8 w-8 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold">Aún no tienes pedidos</h2>
          <p className="mt-2 text-sm text-[color:var(--muted)]">
            Explora las tiendas y haz tu primera compra.
          </p>
          <div className="mt-6">
            <Link
              href="/tiendas"
              className="inline-flex rounded-md bg-[var(--accent)] px-6 py-2.5 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
            >
              Ver tiendas
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/mis-pedidos/${order.id}`}
              className="block rounded-xl border border-[var(--border)] bg-white p-5 transition-all hover:shadow-md hover:border-[var(--accent)]"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-semibold">
                      #{order.id.slice(-8).toUpperCase()}
                    </span>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${getStatusColor(order.status)}`}>
                      {getStatusLabel(order.status)}
                    </span>
                  </div>
                  <div className="mt-2 text-sm">
                    <span className="text-[color:var(--muted)]">Tienda: </span>
                    <span className="font-medium">{order.store.name}</span>
                  </div>
                  <div className="mt-1 text-xs text-[color:var(--muted)]">
                    {order.fulfillmentType === "PICKUP" ? "📍 Recolección" : "🚚 Entrega"} en tienda ·{" "}
                    {new Date(order.createdAt).toLocaleDateString("es-MX", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold">
                    {formatMoney(order.totalCents, order.currency)}
                  </div>
                  <div className="text-xs text-[color:var(--muted)]">Total</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}