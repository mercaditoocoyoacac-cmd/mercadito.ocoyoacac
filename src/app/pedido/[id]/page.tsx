import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/server/prisma";
import { getSession } from "@/server/session";
import OrderConfirmation from "@/components/orders/OrderConfirmation";
import { OrderAutoRefresh } from "@/components/orders/OrderAutoRefresh";
import { OrderCancelButton } from "@/components/orders/OrderCancelButton";
import { formatMoney } from "@/lib/format";

export default async function PedidoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId) redirect("/login");

  const { id } = await params;
  const order = await prisma.order.findFirst({
    where: { id, userId },
    select: {
      id: true,
      status: true,
      fulfillmentType: true,
      customerName: true,
      customerPhone: true,
      customerAddress: true,
      pickupCode: true,
      notes: true,
      totalCents: true,
      subtotalCents: true,
      deliveryCents: true,
      currency: true,
      createdAt: true,
      store: { select: { name: true, slug: true } },
      items: { select: { id: true, name: true, priceCents: true, quantity: true, weightGrams: true, variantName: true } },
    },
  });
  if (!order) return notFound();

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Pedido confirmado</h1>
      <p className="mt-2 text-sm text-[color:var(--muted)]">
        Pedido <span className="font-mono">#{order.id.slice(-8)}</span> en{" "}
        <Link className="underline" href={`/tienda/${order.store.slug}`}>
          {order.store.name}
        </Link>
        .
      </p>

      <div className="mt-6 rounded-xl border border-[var(--border)] p-5">
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <div className="text-xs text-[color:var(--muted)]">
              Modalidad
            </div>
            <div className="font-medium">
              {order.fulfillmentType === "DELIVERY" ? "Entrega" : "Recoger en tienda"}
            </div>
          </div>
          <div>
            <div className="text-xs text-[color:var(--muted)]">Estado</div>
            <div className="font-medium">{order.status}</div>
          </div>
          <div>
            <div className="text-xs text-[color:var(--muted)]">Cliente</div>
            <div className="font-medium">{order.customerName}</div>
          </div>
          <div>
            <div className="text-xs text-[color:var(--muted)]">Teléfono</div>
            <div className="font-medium">{order.customerPhone}</div>
          </div>
          {order.customerAddress ? (
            <div className="sm:col-span-2">
              <div className="text-xs text-[color:var(--muted)]">
                Dirección
              </div>
              <div className="font-medium">{order.customerAddress}</div>
            </div>
          ) : null}
          {order.notes ? (
            <div className="sm:col-span-2">
              <div className="text-xs text-[color:var(--muted)]">Notas</div>
              <div className="font-medium">{order.notes}</div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-[var(--border)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--accent-soft)]">
            <tr>
              <th className="px-4 py-3 font-medium">Producto</th>
              <th className="px-4 py-3 font-medium">Cantidad</th>
              <th className="px-4 py-3 font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item: typeof order.items[number]) => (
              <tr
                key={item.id}
                className="border-t border-[var(--border)]"
              >
                <td className="px-4 py-3">
                  {item.name}
                  {item.variantName && (
                    <span className="ml-1 text-xs text-[color:var(--muted)]">({item.variantName})</span>
                  )}
                  {item.weightGrams && (
                    <span className="ml-1 text-xs text-[color:var(--muted)]">({item.weightGrams}g)</span>
                  )}
                </td>
                <td className="px-4 py-3">{item.weightGrams ? `${item.weightGrams}g` : item.quantity}</td>
                <td className="px-4 py-3 font-medium">
                  {formatMoney(item.weightGrams
                    ? Math.round((item.weightGrams / 1000) * item.priceCents) * item.quantity
                    : item.priceCents * item.quantity, order.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 space-y-1 text-right text-sm">
        <div>
          <span className="text-[color:var(--muted)]">Subtotal:</span>{" "}
          <span className="font-semibold">
            {formatMoney(order.subtotalCents, order.currency)}
          </span>
        </div>
        {order.fulfillmentType === "DELIVERY" && (
          <div>
            <span className="text-[color:var(--muted)]">Envío:</span>{" "}
            <span className="font-semibold">
              {formatMoney(order.deliveryCents, order.currency)}
            </span>
          </div>
        )}
        <div className="text-base">
          <span className="text-[color:var(--muted)]">Total:</span>{" "}
          <span className="font-semibold">
            {formatMoney(order.totalCents, order.currency)}
          </span>
        </div>
      </div>

      {order.status === "PENDING" && (
        <div className="mt-6">
          <OrderCancelButton orderId={order.id} createdAt={order.createdAt.toISOString()} />
        </div>
      )}

      <OrderConfirmation order={order} />

      <OrderAutoRefresh status={order.status} />
    </main>
  );
}

