import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/server/prisma";
import { getSession } from "@/server/session";
import OrderConfirmation from "@/components/orders/OrderConfirmation";
import { OrderAutoRefresh } from "@/components/orders/OrderAutoRefresh";
import { OrderCancelButton } from "@/components/orders/OrderCancelButton";
import { formatMoney } from "@/lib/format";
import { formatDateTimeInMexico } from "@/lib/dates";
import { Card, CardContent, CardHeader, CardTitle, Button, Badge, OrderTimeline, OrderStatusBadge } from "@/components/ui/design-system";
import { maybeSendReadyReminder } from "@/server/readyReminder";

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
      paymentMethod: true,
      paymentEvidenceUrl: true,
      paymentReference: true,
      paymentVerified: true,
      paymentVerifiedAt: true,
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
      statusTimestamps: true,
      arrivedAt: true,
      arrivalConfirmedAt: true,
      store: { select: { name: true, slug: true, phone: true } },
      items: { select: { id: true, name: true, priceCents: true, quantity: true, weightGrams: true, variantName: true } },
    },
  });
  if (!order) return notFound();

  await maybeSendReadyReminder(order.id);

  const paymentMethodLabels: Record<string, string> = {
    CASH: "Efectivo",
    ONLINE: "Tarjeta",
    TRANSFERENCIA: "Transferencia",
  };

  const timelineData = {
    currentStatus: order.status as any,
    status: order.status as any,
    fulfillmentType: order.fulfillmentType,
    pickupCode: order.pickupCode ?? undefined,
    deliveryAddress: order.customerAddress ?? undefined,
    storeName: order.store.name,
    storePhone: order.store.phone ?? undefined,
    estimatedDelivery: order.arrivedAt ? formatDateTimeInMexico(new Date(new Date(order.arrivedAt).getTime() + 45 * 60000), { hour: "2-digit", minute: "2-digit" }) : undefined,
    timestamps: {
      PENDING: order.createdAt.toISOString(),
      CONFIRMED: (order.statusTimestamps as Record<string, string | undefined>)?.CONFIRMED || "",
      READY: (order.statusTimestamps as Record<string, string | undefined>)?.READY || "",
      OUT_FOR_DELIVERY: (order.statusTimestamps as Record<string, string | undefined>)?.OUT_FOR_DELIVERY || "",
      COMPLETED: (order.statusTimestamps as Record<string, string | undefined>)?.COMPLETED || "",
      CANCELLED: (order.statusTimestamps as Record<string, string | undefined>)?.CANCELLED || "",
    },
  };

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 lg:py-10">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Pedido confirmado</h1>
            <p className="mt-1 text-sm text-[color:var(--muted)]">
              Pedido <span className="font-mono">#{order.id.slice(-8)}</span> en{" "}
              <Link className="text-[var(--accent)] hover:underline" href={`/tienda/${order.store.slug}`}>
                {order.store.name}
              </Link>
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <OrderStatusBadge status={order.status as any} size="lg" fulfillmentType={order.fulfillmentType} />
          </div>
        </div>
      </div>

      {/* Timeline */}
      <OrderTimeline
        data={timelineData}
        variant="card"
        showDescriptions={true}
        onContactStore={() => order.store.phone && window.open(`https://api.whatsapp.com/send?phone=${order.store.phone.replace(/\D/g, "")}`)}
      />

      {/* Order Details */}
      <div className="mt-6 grid gap-6">
        {/* Info Grid */}
        <Card variant="outlined">
          <CardHeader>
            <CardTitle className="text-base">Información del pedido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <InfoRow label="Modalidad" value={order.fulfillmentType === "DELIVERY" ? "🚚 Entrega a domicilio" : "📍 Recoger en tienda"} />
              <InfoRow label="Pago" value={
                order.paymentMethod === "TRANSFERENCIA"
                  ? `Transferencia ${order.paymentVerified ? "✓ Verificada" : "⏳ En verificación"}`
                  : paymentMethodLabels[order.paymentMethod] || order.paymentMethod
              } />
              <InfoRow label="Cliente" value={order.customerName} />
              <InfoRow label="Teléfono" value={order.customerPhone} />
              {order.customerAddress && (
                <InfoRow label="Dirección" value={order.customerAddress} colSpan={2} />
              )}
              {order.notes && (
                <InfoRow label="Notas" value={order.notes} colSpan={2} />
              )}
              {order.pickupCode && (
                <div className="sm:col-span-2">
                  <div className="text-xs text-[color:var(--muted)]">Código de recogida</div>
                  <div className="mt-1 inline-flex items-center gap-2 rounded-lg bg-[var(--accent-soft)] px-4 py-3">
                    <code className="font-mono text-xl font-bold tracking-widest text-[var(--accent)]">{order.pickupCode}</code>
                    <Button variant="ghost" size="sm" onClick={() => { navigator.clipboard.writeText(order.pickupCode!); }} leftIcon={
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-12a2 2 0 00-2-2h-2M12 5v12M12 5a2 2 0 014 0v12a2 2 0 01-4 0" /></svg>
                    }>
                      Copiar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Items */}
        <Card variant="outlined">
          <CardHeader>
            <CardTitle className="text-base">Productos ({order.items.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[var(--accent-soft)]">
                  <tr>
                    <th className="px-4 py-3 font-medium">Producto</th>
                    <th className="px-4 py-3 font-medium text-center">Cant.</th>
                    <th className="px-4 py-3 font-medium text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {order.items.map((item: typeof order.items[number]) => (
                    <tr key={item.id} className="hover:bg-[var(--accent-soft)]/30">
                      <td className="px-4 py-3">
                        <div className="font-medium">{item.name}</div>
                        {item.variantName && (
                          <div className="text-xs text-[color:var(--muted)]">({item.variantName})</div>
                        )}
                        {item.weightGrams && (
                          <div className="text-xs text-[color:var(--muted)]">({item.weightGrams}g)</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {item.weightGrams ? `${item.weightGrams}g` : item.quantity}
                      </td>
                      <td className="px-4 py-3 font-medium text-right">
                        {formatMoney(item.weightGrams
                          ? Math.round((item.weightGrams / 1000) * item.priceCents) * item.quantity
                          : item.priceCents * item.quantity, order.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Price Breakdown */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle className="text-base">Resumen de precios</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <PriceRow label="Subtotal" value={formatMoney(order.subtotalCents, order.currency)} />
            {order.fulfillmentType === "DELIVERY" && (
              <PriceRow label="Envío" value={formatMoney(order.deliveryCents, order.currency)} />
            )}
            <PriceRow label="Total" value={formatMoney(order.totalCents, order.currency)} isTotal={true} />
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
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

function InfoRow({ label, value, colSpan = 1 }: { label: string; value: string; colSpan?: number }) {
  return (
    <div className={`${colSpan === 2 ? "sm:col-span-2" : ""}`}>
      <div className="text-xs text-[color:var(--muted)] uppercase tracking-wide">{label}</div>
      <div className="mt-1 font-medium text-sm">{value}</div>
    </div>
  );
}

function PriceRow({ label, value, isTotal = false }: { label: string; value: string; isTotal?: boolean }) {
  return (
    <div className={`flex justify-between ${isTotal ? "text-base font-bold border-t border-[var(--border)] pt-3" : "text-sm"}`}>
      <span className={isTotal ? "text-[var(--foreground)]" : "text-[color:var(--muted)]"}>{label}</span>
      <span className={isTotal ? "text-lg font-bold text-[var(--accent)]" : "font-semibold"}>{value}</span>
    </div>
  );
}