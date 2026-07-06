import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/server/prisma";
import { getSession } from "@/server/session";
import { revalidatePath } from "next/cache";
import { formatMoney } from "@/lib/format";
import { getStatusLabel, FULFILLMENT_LABELS } from "@/lib/labels";
import VendorCodeQR from "@/components/vendor/VendorCodeQR";

export const dynamic = "force-dynamic";

export default async function VendorPedidoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();

  if (!session?.user?.id) redirect("/vendor/login");

  const store = await prisma.store.findFirst({
    where: { ownerId: session.user.id },
    select: { id: true, name: true, slug: true },
  });

  if (!store) redirect("/vendor");

  const order = await prisma.order.findFirst({
    where: { id, storeId: store.id },
    include: {
      items: true,
      user: { select: { email: true, name: true, phone: true } },
      deliveryUser: { select: { email: true, name: true, phone: true } },
    },
  });

  if (!order) notFound();

  if (!order) notFound();

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/vendor/pedidos"
          className="text-sm text-[var(--accent)] hover:underline"
        >
          &larr; Volver a pedidos
        </Link>
      </div>

      <div className="rounded-xl border border-[var(--border)] overflow-hidden">
        <div className="border-b border-[var(--border)] px-5 py-4 flex items-center justify-between">
          <div>
            <div className="font-mono text-lg font-semibold">
              #{order.id.slice(-8).toUpperCase()}
            </div>
            <div className="text-xs text-[color:var(--muted)] mt-1">
              {order.createdAt.toLocaleString("es-MX", {
                timeZone: "America/Mexico_City",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}{" "}
              {order.createdAt.toLocaleTimeString("es-MX", {
                timeZone: "America/Mexico_City",
                hour: "2-digit",
                minute: "2-digit",
              })} CST
            </div>
          </div>
          <div className="text-right">
            <div
              className={`inline-block text-xs px-3 py-1.5 rounded-full font-medium ${
                order.status === "COMPLETED"
                  ? "bg-green-100 text-green-800"
                  : order.status === "PENDING"
                  ? "bg-yellow-100 text-yellow-800"
                  : order.status === "CANCELLED"
                  ? "bg-red-100 text-red-800"
                  : order.status === "OUT_FOR_DELIVERY"
                  ? "bg-orange-100 text-orange-800"
                  : "bg-blue-100 text-blue-800"
              }`}
            >
              {getStatusLabel(order.status) === "Listo" ? "Listo para entrega" : getStatusLabel(order.status)}
            </div>
            <div className="text-xs text-[color:var(--muted)] mt-1">
              {FULFILLMENT_LABELS[order.fulfillmentType]}
            </div>
          </div>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div>
            <div className="text-sm font-medium mb-2">Cliente</div>
            <div className="text-sm">{order.customerName}</div>
            <div className="text-sm text-[color:var(--muted)]">
              {order.customerPhone}
            </div>
            {order.customerAddress && (
              <div className="text-sm text-[color:var(--muted)]">
                {order.customerAddress}
              </div>
            )}
          </div>

          {order.deliveryUser && (
            <div>
              <div className="text-sm font-medium mb-2">Repartidor</div>
              <div className="text-sm">{order.deliveryUser.name || order.deliveryUser.email}</div>
              {order.deliveryUser.phone && (
                <div className="text-sm text-[color:var(--muted)]">
                  {order.deliveryUser.phone}
                </div>
              )}
            </div>
          )}

          {order.notes && (
            <div>
              <div className="text-sm font-medium mb-1">Notas</div>
              <div className="text-sm text-[color:var(--muted)]">{order.notes}</div>
            </div>
          )}

          <div>
            <div className="text-sm font-medium mb-2">Productos</div>
            <div className="space-y-1">
              {order.items.map((item) => {
                const wg = (item as { weightGrams?: number | null }).weightGrams;
                const isWeight = !!wg;
                const lineTotal = isWeight
                  ? Math.round((wg / 1000) * item.priceCents) * item.quantity
                  : item.priceCents * item.quantity;
                return (
                <div
                  key={item.id}
                  className="flex items-center justify-between text-sm"
                >
                  <span>
                    {isWeight ? `${wg}g` : `${item.quantity}x`} {item.name}
                    {item.variantName && <span className="text-xs text-[color:var(--muted)]"> ({item.variantName})</span>}
                  </span>
                  <span className="font-medium">
                    {formatMoney(lineTotal, order.currency)}
                  </span>
                </div>
              )})}
            </div>
            <div className="mt-3 pt-3 border-t border-[var(--border)] space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[color:var(--muted)]">Subtotal</span>
                <span>{formatMoney(order.subtotalCents, order.currency)}</span>
              </div>
              {order.fulfillmentType === "DELIVERY" && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[color:var(--muted)]">Envío</span>
                  <span>{formatMoney(order.deliveryCents, order.currency)}</span>
                </div>
              )}
              <div className="flex items-center justify-between font-semibold pt-1">
                <span>Total</span>
                <span className="text-lg font-semibold">
                  {formatMoney(order.totalCents, order.currency)}
                </span>
              </div>
            </div>
          </div>

          {order.fulfillmentType === "DELIVERY" && order.deliveryCode && (
            <div className="rounded-lg bg-blue-50 px-4 py-3 text-center">
              <div className="text-sm font-medium mb-2">Código QR para el repartidor</div>
              <VendorCodeQR code={order.deliveryCode} orderId={order.id} label="delivery" />
              <div className="text-xs text-[color:var(--muted)] mt-2">
                Muestra este QR al repartidor al recoger el pedido
              </div>
            </div>
          )}
          {order.pickupCode && (
            <div className="rounded-lg bg-orange-50 px-4 py-3 text-center">
              <div className="text-sm font-medium mb-2">Código QR de confirmación del cliente</div>
              <VendorCodeQR code={order.pickupCode} orderId={order.id} label="pickup" />
              <div className="text-xs text-[color:var(--muted)] mt-2">
                El repartidor lo escaneará al entregar al cliente
              </div>
            </div>
          )}
        </div>

        {order.status !== "CANCELLED" && order.status !== "COMPLETED" && (
          <div className="border-t border-[var(--border)] px-5 py-3 bg-gray-50/50">
            <div className="flex flex-wrap gap-1 text-[11px] text-[color:var(--muted)]">
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-yellow-100 text-yellow-800">📋 Pendiente</span>
              <span className="text-[color:var(--muted)]">→</span>
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-100 text-blue-800">✅ Confirmado</span>
              <span className="text-[color:var(--muted)]">→</span>
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-purple-100 text-purple-800">📦 Listo</span>
              {order.fulfillmentType === "DELIVERY" && <><span className="text-[color:var(--muted)]">→</span><span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-orange-100 text-orange-800">🚚 En camino</span></>}
              <span className="text-[color:var(--muted)]">→</span>
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-green-100 text-green-800">🎉 Entregado</span>
            </div>
          </div>
        )}
        <div className="border-t border-[var(--border)] px-5 py-4 flex gap-2 flex-wrap">
          {order.status === "PENDING" && (
            <form
              action={async () => {
                "use server";
                await prisma.order.update({
                  where: { id: order.id },
                  data: { status: "CONFIRMED" },
                });
                revalidatePath("/vendor/pedidos");
                revalidatePath(`/vendor/pedidos/${order.id}`);
              }}
            >
              <button title="Acepta el pedido y notifica al cliente que lo prepararás" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                Confirmar pedido
              </button>
            </form>
          )}
          {order.status === "CONFIRMED" && (
            <form
              action={async () => {
                "use server";
                await prisma.order.update({
                  where: { id: order.id },
                  data: { status: "READY" },
                });
                revalidatePath("/vendor/pedidos");
                revalidatePath(`/vendor/pedidos/${order.id}`);
              }}
            >
              <button title="Marca el pedido como preparado y listo para entregar" className="rounded-lg bg-yellow-600 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-700">
                Marcar listo
              </button>
            </form>
          )}
          {order.status === "READY" && order.fulfillmentType === "DELIVERY" && (
            <form
              action={async () => {
                "use server";
                await prisma.order.update({
                  where: { id: order.id },
                  data: { status: "OUT_FOR_DELIVERY" },
                });
                revalidatePath("/vendor/pedidos");
                revalidatePath(`/vendor/pedidos/${order.id}`);
              }}
            >
              <button title="Entrega el pedido al repartidor para que lo lleve al cliente" className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700">
                Entregar a repartidor
              </button>
            </form>
          )}
          {order.status === "READY" && order.fulfillmentType === "PICKUP" && (
            <form
              action={async () => {
                "use server";
                await prisma.order.update({
                  where: { id: order.id },
                  data: { status: "COMPLETED" },
                });
                revalidatePath("/vendor/pedidos");
                revalidatePath(`/vendor/pedidos/${order.id}`);
              }}
            >
              <button title="El cliente ya recogió el pedido en la tienda. Marca como entregado." className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">
                Cliente recogió
              </button>
            </form>
          )}
          {order.status === "OUT_FOR_DELIVERY" && (
            <form
              action={async () => {
                "use server";
                await prisma.order.update({
                  where: { id: order.id },
                  data: { status: "COMPLETED" },
                });
                revalidatePath("/vendor/pedidos");
                revalidatePath(`/vendor/pedidos/${order.id}`);
              }}
            >
              <button title="El repartidor confirmó la entrega. Marca como completado." className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">
                Completar
              </button>
            </form>
          )}
          {order.status !== "COMPLETED" && order.status !== "CANCELLED" && (
            <form
              action={async () => {
                "use server";
                await prisma.order.update({
                  where: { id: order.id },
                  data: { status: "CANCELLED" },
                });
                revalidatePath("/vendor/pedidos");
                revalidatePath(`/vendor/pedidos/${order.id}`);
              }}
            >
              <button title="Cancela este pedido. El cliente será notificado." className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">
                Cancelar
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
