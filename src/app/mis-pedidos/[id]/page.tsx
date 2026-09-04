import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/server/prisma";
import { getSession } from "@/server/session";
import { OrderCancelButton } from "@/components/orders/OrderCancelButton";
import { PullToRefreshWrapper } from "@/components/ui/PullToRefreshWrapper";
import { OrderAutoRefresh } from "@/components/orders/OrderAutoRefresh";
import OrderRatingForm from "@/components/orders/OrderRatingForm";
import DeliveryChat from "@/components/chat/DeliveryChat";
import { ArrivalConfirmButton } from "@/components/orders/ArrivalConfirmButton";
import { formatMoney } from "@/lib/format";
import { getStatusLabel } from "@/lib/labels";

const deliverySteps = [
  { status: "PENDING", label: "Pedido recibido", icon: "📋" },
  { status: "CONFIRMED", label: "Confirmado", icon: "✅" },
  { status: "READY", label: "Listo para entregar", icon: "📦" },
  { status: "OUT_FOR_DELIVERY", label: "En camino", icon: "🚚" },
  { status: "COMPLETED", label: "Entregado", icon: "🎉" },
];

const pickupSteps = [
  { status: "PENDING", label: "Pedido recibido", icon: "📋" },
  { status: "CONFIRMED", label: "Confirmado", icon: "✅" },
  { status: "READY", label: "Listo para recoger", icon: "📦" },
  { status: "OUT_FOR_DELIVERY", label: "Disponible para recoger", icon: "💛" },
  { status: "COMPLETED", label: "Recogido", icon: "🎉" },
];

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

function getOrderStatusLabel(status: string, fulfillmentType: string) {
  if (fulfillmentType === "PICKUP" && status === "OUT_FOR_DELIVERY") {
    return "Listo para recoger";
  }
  return getStatusLabel(status);
}

export const dynamic = "force-dynamic";

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
      deliveryCents: true,
      totalCents: true,
      currency: true,
      createdAt: true,
      updatedAt: true,
      pickupCode: true,
      deliveryCode: true,
      arrivedAt: true,
      arrivalConfirmedAt: true,
      rating: { select: { id: true } },
      store: { select: { name: true, slug: true, phone: true } },
      items: { select: { id: true, name: true, priceCents: true, quantity: true, weightGrams: true, variantName: true } },
    },
  });

  if (!order) return notFound();

  const statusSteps = order.fulfillmentType === "PICKUP" ? pickupSteps : deliverySteps;
  const currentStepIndex = statusSteps.findIndex((s) => s.status === order.status);
  const isCancelled = order.status === "CANCELLED";

  return (
    <PullToRefreshWrapper>
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
              <span className="font-semibold">{getOrderStatusLabel(order.status, order.fulfillmentType)}</span>
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

        {order.status === "PENDING" && (
          <OrderCancelButton orderId={order.id} createdAt={order.createdAt.toISOString()} />
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
                {order.fulfillmentType === "PICKUP" ? "📍 Recoger en tienda" : "🚚 Entrega a domicilio"}
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

        {order.fulfillmentType === "DELIVERY" && order.arrivedAt && order.status === "OUT_FOR_DELIVERY" && order.pickupCode && (
          <div className={`rounded-xl border-2 p-8 text-center ${
            order.arrivalConfirmedAt
              ? "border-green-400 bg-green-50"
              : "border-orange-400 bg-orange-50 shadow-lg"
          }`}>
            <div className="text-4xl mb-3">🛵</div>
            <div className="text-xl font-bold text-green-900">¡El repartidor ya está aquí!</div>
            <div className="mt-4">
              <div className="text-sm font-medium text-gray-600 mb-2">
                {order.arrivalConfirmedAt
                  ? "Sal a recibir tu pedido"
                  : "Proporciona este código al repartidor"}
              </div>
              <div className="inline-block rounded-xl bg-white px-8 py-4 shadow-inner">
                <div className="font-mono text-5xl font-bold tracking-[0.3em] text-gray-900">
                  {order.pickupCode}
                </div>
              </div>
              <div className="mt-3 text-xs text-gray-500">
                El repartidor te solicitará este código para confirmar la entrega
              </div>
            </div>
            {!order.arrivalConfirmedAt && (
              <div className="mt-4">
                <ArrivalConfirmButton orderId={order.id} />
              </div>
            )}
          </div>
        )}

        {(order.status === "OUT_FOR_DELIVERY" || order.status === "READY" || order.status === "CONFIRMED") && order.pickupCode && !(order.arrivedAt && order.status === "OUT_FOR_DELIVERY") && (
          <div className="rounded-xl border border-orange-200 bg-orange-50 p-6 text-center">
            <div className="text-sm font-medium text-orange-700">Tu código de entrega</div>
            <div className="mt-2 font-mono text-4xl font-bold tracking-widest text-orange-700">
              {order.pickupCode}
            </div>
            <div className="mt-2 text-xs text-orange-600">
              {order.fulfillmentType === "DELIVERY"
                ? "Proporciona este código al repartidor para recibir tu pedido"
                : "Proporciona este código al recoger tu pedido en la tienda"}
            </div>
          </div>
        )}

        {order.fulfillmentType === "DELIVERY" && order.status === "OUT_FOR_DELIVERY" && (
          <DeliveryChat orderId={order.id} currentUserId={session.user.id} currentUserRole="CUSTOMER" />
        )}

        <div className="rounded-xl border border-[var(--border)] overflow-hidden">
          <div className="bg-[var(--accent-soft)] px-6 py-3">
            <h3 className="font-medium">Productos</h3>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {order.items.map((item) => {
              const isWeight = !!item.weightGrams;
              const lineTotal = isWeight
                ? Math.round((item.weightGrams! / 1000) * item.priceCents) * item.quantity
                : item.priceCents * item.quantity;
              return (
              <div key={item.id} className="flex items-center justify-between px-6 py-4">
                <div>
                  <div className="font-medium">
                    {item.name}
                    {item.variantName && (
                      <span className="ml-1 text-xs text-[color:var(--muted)]">({item.variantName})</span>
                    )}
                    {isWeight && (
                      <span className="ml-1 text-xs text-[color:var(--muted)]">({item.weightGrams}g)</span>
                    )}
                  </div>
                  <div className="text-sm text-[color:var(--muted)]">
                    {isWeight
                      ? `${item.weightGrams}g x ${item.quantity}`
                      : `${item.quantity} x ${formatMoney(item.priceCents, order.currency)}`}
                  </div>
                </div>
                <div className="font-medium">
                  {formatMoney(lineTotal, order.currency)}
                </div>
              </div>
            )})}
          </div>
          <div className="space-y-1 px-6 py-3 bg-gray-50 text-sm">
            <div className="flex justify-between">
              <span className="text-[color:var(--muted)]">Subtotal</span>
              <span>{formatMoney(order.subtotalCents, order.currency)}</span>
            </div>
            {order.fulfillmentType === "DELIVERY" && (
              <div className="flex justify-between">
                <span className="text-[color:var(--muted)]">Envío</span>
                <span>{formatMoney(order.deliveryCents, order.currency)}</span>
              </div>
            )}
            <div className="flex justify-between font-medium text-base pt-1 border-t border-[var(--border)]">
              <span>Total</span>
              <span className="text-lg font-semibold">
                {formatMoney(order.totalCents, order.currency)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {order.status === "COMPLETED" && (
        <OrderRatingForm
          orderId={order.id}
          fulfillmentType={order.fulfillmentType}
          hasExistingRating={!!order.rating}
        />
      )}

      <OrderAutoRefresh status={order.status} />
    </main>
    </PullToRefreshWrapper>
  );
}