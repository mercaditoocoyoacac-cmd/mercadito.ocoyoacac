import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/server/prisma";
import { getSession } from "@/server/session";

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency }).format(
    cents / 100,
  );
}

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
      notes: true,
      subtotalCents: true,
      currency: true,
      createdAt: true,
      store: { select: { name: true, slug: true } },
      items: { select: { id: true, name: true, priceCents: true, quantity: true } },
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
              {order.fulfillmentType === "DELIVERY" ? "Entrega" : "Recolección"}
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
                <td className="px-4 py-3">{item.name}</td>
                <td className="px-4 py-3">{item.quantity}</td>
                <td className="px-4 py-3 font-medium">
                  {formatMoney(item.priceCents * item.quantity, order.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-right text-sm">
        <span className="text-[color:var(--muted)]">Subtotal:</span>{" "}
        <span className="font-semibold">
          {formatMoney(order.subtotalCents, order.currency)}
        </span>
      </div>
    </main>
  );
}

