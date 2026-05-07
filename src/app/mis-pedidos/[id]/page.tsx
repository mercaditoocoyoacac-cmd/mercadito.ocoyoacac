import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/server/prisma";
import { getSession } from "@/server/session";

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency }).format(
    cents / 100,
  );
}

const statusSteps = [
  { status: "PENDING", label: "Pedido recibido", icon: "📋" },
  { status: "CONFIRMED", label: "Confirmado", icon: "✅" },
  { status: "READY", label: "Listo para recoger", icon: "📦" },
  { status: "OUT_FOR_DELIVERY", label: "En camino", icon: "🚚" },
  { status: "COMPLETED", label: "Entregado", icon: "🎉" },
];

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
    PENDING: "border-yellow-500 bg-yellow-50",
    CONFIRMED: "border-blue-500 bg-blue-50",
    READY: "border-purple-500 bg-purple-50",
    OUT_FOR_DELIVERY: "border-orange-500 bg-orange-50",
    COMPLETED: "border-green-500 bg-green-50",
    CANCELLED: "border-red-500 bg-red-50",
  };
  return colors[status] || "border-gray-500 bg-gray-50";
}

export const revalidate = 30;

export default async function PedidoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;

  const order = await prisma.order.findFirst({
    where: { id, userId: session.user.id },
    select: {
      id: true,
      status: true,
      fulfillmentType: true,
      customerName: true,
      customerPhone: true,
      customerAddress: true,
      notes: true,
      subtotalCents: true,
      totalCents: true,
      currency: true,
      createdAt: true,
      updatedAt: true,
      store: { select: { name: true, slug: true, phone: true } },
      items: { select: { id: true, name: true, priceCents: true, quantity: true } },
    },
  });

  if (!order) return notFound();

  const currentStepIndex = statusSteps.findIndex((s) => s.status === order.status);
  const isCancelled = order.status === "CANCELLED";

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10">
      <div className="mb-6">
        <Link href="/mis-pedidos" className="text-sm text-[var(--accent)] hover:underline">
          ← Volver a mis pedidos
        </Link>
      </div>

      <div className="flex flex-col gap-6">
        <div className="rounded-xl border border-[var(--border)] p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold">
                Pedido <span className="font-mono">#{order.id.slice(-8).toUpperCase()}</span>
              </h1>
              <p className="mt-1 text-sm text-[color:var(--muted)]">
                Realizado el{" "}
                {new Date(order.createdAt).toLocaleString("es-MX", {
                  timeZone: "America/Mexico_City",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })} CST
              </p>
            </div>
            <div className={`rounded-lg px-4 py-2 ${getStatusColor(order.status)} border-l-4`}>
              <span className="font-semibold">{getStatusLabel(order.status)}</span>
            </div>
          </div>
        </div>

        {!isCancelled && (
          <div className="rounded-xl border border-[var(--border)] p-6">
            <h2 className="text-lg font-semibold mb-4">Estado del pedido</h2>
            <div className="flex items-center justify-between">
              {statusSteps.map((step, index) => {
                const isCompleted = index <= currentStepIndex;
                const isCurrent = index === currentStepIndex;
                return (
                  <div key={step.status} className="flex flex-col items-center">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full text-lg ${
                        isCompleted
                          ? "bg-[var(--accent)] text-white"
                          : "bg-gray-200 text-gray-400"
                      }`}
                    >
                      {step.icon}
                    </div>
                    <span
                      className={`mt-2 text-xs text-center ${
                        isCurrent ? "font-semibold text-[var(--accent)]" : "text-[color:var(--muted)]"
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 relative">
              <div className="absolute top-0 left-5 right-5 h-0.5 bg-gray-200"></div>
              <div
                className="absolute top-0 left-5 h-0.5 bg-[var(--accent)] transition-all"
                style={{ width: `${(currentStepIndex / (statusSteps.length - 1)) * 90}%` }}
              ></div>
            </div>
          </div>
        )}

        <div className="rounded-xl border border-[var(--border)] p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <h3 className="text-sm font-medium text-[color:var(--muted)]">Tienda</h3>
              <p className="mt-1 font-medium">{order.store.name}</p>
              {order.store.phone && (
                <p className="text-sm text-[color:var(--muted)]">{order.store.phone}</p>
              )}
            </div>
            <div>
              <h3 className="text-sm font-medium text-[color:var(--muted)]">Tipo de entrega</h3>
              <p className="mt-1 font-medium">
                {order.fulfillmentType === "PICKUP" ? "📍 Recolección en tienda" : "🚚 Entrega a domicilio"}
              </p>
            </div>
            {order.fulfillmentType === "DELIVERY" && order.customerAddress && (
              <div className="sm:col-span-2">
                <h3 className="text-sm font-medium text-[color:var(--muted)]">Dirección de entrega</h3>
                <p className="mt-1">{order.customerAddress}</p>
              </div>
            )}
            <div>
              <h3 className="text-sm font-medium text-[color:var(--muted)]">Cliente</h3>
              <p className="mt-1">{order.customerName}</p>
              <p className="text-sm text-[color:var(--muted)]">{order.customerPhone}</p>
            </div>
            {order.notes && (
              <div>
                <h3 className="text-sm font-medium text-[color:var(--muted)]">Notas</h3>
                <p className="mt-1">{order.notes}</p>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-[var(--border)] overflow-hidden">
          <div className="bg-[var(--accent-soft)] px-6 py-3">
            <h3 className="font-medium">Productos</h3>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {order.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between px-6 py-4">
                <div>
                  <div className="font-medium">{item.name}</div>
                  <div className="text-sm text-[color:var(--muted)]">
                    {item.quantity} x {formatMoney(item.priceCents, order.currency)}
                  </div>
                </div>
                <div className="font-medium">
                  {formatMoney(item.priceCents * item.quantity, order.currency)}
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between px-6 py-4 bg-gray-50">
            <span className="font-medium">Total</span>
            <span className="text-lg font-semibold">
              {formatMoney(order.totalCents, order.currency)}
            </span>
          </div>
        </div>
      </div>
    </main>
  );
}