import Link from "next/link";
import { cookies } from "next/headers";
import { prisma } from "@/server/prisma";
import { getSession } from "@/server/session";
import { revalidatePath } from "next/cache";
import { formatMoney } from "@/lib/format";
import { getStatusLabel } from "@/lib/labels";

export const dynamic = "force-dynamic";

export default async function VendorPedidosPage() {
  const session = await getSession();
  const userId = session!.user.id;

  const store = await prisma.store.findFirst({
    where: { ownerId: userId },
    select: { id: true, name: true, slug: true },
  });

  if (!store) {
    return (
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
        <div className="rounded-xl border border-[var(--border)] p-5">
          <div className="font-medium">Primero crea tu tienda</div>
        </div>
      </main>
    );
  }

  const orders = await prisma.order.findMany({
    where: { storeId: store.id },
    select: {
      id: true,
      status: true,
      fulfillmentType: true,
      customerName: true,
      customerPhone: true,
      customerAddress: true,
      totalCents: true,
      currency: true,
      createdAt: true,
      deliveryUserId: true,
      paymentMethod: true,
      paymentVerified: true,
      user: { select: { email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const counts = await prisma.order.groupBy({
    by: ["status"],
    where: { storeId: store.id },
    _count: true,
  });

  const getCount = (status: string) => {
    const found = counts.find((c) => c.status === status);
    return found?._count || 0;
  };

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 fade-in">
      <div className="mb-8 animate-slide-up-sm">
        <h1 className="text-2xl font-semibold tracking-tight">Pedidos</h1>
        <p className="mt-1 text-sm text-[color:var(--muted)]">
          {store.name} ·{" "}
          <Link className="underline" href={`/tienda/${store.slug}`}>
            ver storefront
          </Link>
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 mb-8 animate-slide-up-sm">
        <div className="rounded-xl border border-[var(--border)] p-5">
          <div className="text-sm text-[color:var(--muted)]">Total</div>
          <div className="mt-1 text-2xl font-semibold">{orders.length}</div>
        </div>
        <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-5">
          <div className="text-sm text-yellow-700">Pendientes</div>
          <div className="mt-1 text-2xl font-semibold text-yellow-600">
            {getCount("PENDING")}
          </div>
        </div>
        <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-5">
          <div className="text-sm text-blue-700">Confirmados</div>
          <div className="mt-1 text-2xl font-semibold text-blue-600">
            {getCount("CONFIRMED")}
          </div>
        </div>
        <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 p-5">
          <div className="text-sm text-orange-700">En camino</div>
          <div className="mt-1 text-2xl font-semibold text-orange-600">
            {getCount("OUT_FOR_DELIVERY")}
          </div>
        </div>
        <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-5">
          <div className="text-sm text-green-700">Completados</div>
          <div className="mt-1 text-2xl font-semibold text-green-600">
            {getCount("COMPLETED")}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--border)]">
        <div className="border-b border-[var(--border)] px-5 py-4">
          <h2 className="font-semibold">Todos los pedidos ({orders.length})</h2>
        </div>
        {orders.length === 0 ? (
          <div className="p-5 text-center text-sm text-[color:var(--muted)]">
            No hay pedidos aún.
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)] animate-slide-up-sm">
            {orders.map((order, idx) => (
              <div key={order.id} style={{ animationDelay: `${idx * 40}ms` }} className="px-5 py-4 fade-in">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-mono font-medium">
                      #{order.id.slice(-8).toUpperCase()}
                    </div>
                    <div className="text-sm">{order.customerName}</div>
                    <div className="text-xs text-[color:var(--muted)]">
                      {order.user.email}
                    </div>
                    <div className="text-xs text-[color:var(--muted)]">
                      {order.createdAt.toLocaleString("es-MX", {
                        timeZone: "America/Mexico_City",
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })} CST
                    </div>
                    {order.fulfillmentType === "DELIVERY" &&
                      order.customerAddress && (
                        <div className="text-xs text-[color:var(--muted)] mt-1">
                          📍 {order.customerAddress}
                        </div>
                      )}
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">
                      {formatMoney(order.totalCents, order.currency)}
                    </div>
                    <div
                      className={`text-xs px-2 py-1 rounded-full mt-1 ${
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
                      {getStatusLabel(order.status)}
                    </div>
                    <div className="text-xs mt-1">
                      {order.fulfillmentType === "DELIVERY" ? "📦 Entrega" : "🏪 Recoger"}
                    </div>
                    {order.paymentMethod === "TRANSFERENCIA" && (
                      <div className="text-xs mt-1">
                        <span className={order.paymentVerified ? "text-green-600 font-medium" : "text-purple-700 font-medium"}>
                          {order.paymentVerified ? "✓ Transferencia verificada" : "⏳ Transferencia sin verificar"}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-3 flex gap-2 flex-wrap">
                  <Link
                    href={`/vendor/pedidos/${order.id}`}
                    className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium hover:bg-[var(--accent-soft)]"
                  >
                    Ver detalle
                  </Link>
                  {order.status === "PENDING" &&
                    order.paymentMethod === "TRANSFERENCIA" &&
                    !order.paymentVerified && (
                      <form
                        action={async () => {
                          "use server";
                          const c = (await cookies()).toString();
                          await fetch(`${process.env.NEXTAUTH_URL}/api/vendor/orders/${order.id}/verify-payment`, {
                            method: "POST",
                            headers: { cookie: c },
                          });
                          revalidatePath("/vendor/pedidos");
                          revalidatePath(`/vendor/pedidos/${order.id}`);
                        }}
                      >
                        <button className="rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-700">
                          Verificar pago
                        </button>
                      </form>
                    )}
                  {order.status === "PENDING" && (
                    order.paymentMethod === "TRANSFERENCIA" && !order.paymentVerified ? (
                      <button
                        disabled
                        title="Verifica el pago por transferencia antes de confirmar"
                        className="rounded-lg bg-gray-300 px-3 py-1.5 text-xs font-medium text-gray-500 cursor-not-allowed"
                      >
                        Verifica pago
                      </button>
                    ) : (
                    <form
                      action={async () => {
                        "use server";
                        const c = (await cookies()).toString();
                        await fetch(`${process.env.NEXTAUTH_URL}/api/vendor/orders/${order.id}/status`, {
                          method: "POST",
                          headers: { "content-type": "application/json", cookie: c },
                          body: JSON.stringify({ status: "CONFIRMED" }),
                        });
                        revalidatePath("/vendor/pedidos");
                        revalidatePath(`/vendor/pedidos/${order.id}`);
                      }}
                    >
                      <button className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700">
                        Confirmar
                      </button>
                    </form>
                    )
                  )}
                  {order.status === "CONFIRMED" && (
                    <form
                      action={async () => {
                        "use server";
                        const c = (await cookies()).toString();
                        await fetch(`${process.env.NEXTAUTH_URL}/api/vendor/orders/${order.id}/status`, {
                          method: "POST",
                          headers: { "content-type": "application/json", cookie: c },
                          body: JSON.stringify({ status: "READY" }),
                        });
                        revalidatePath("/vendor/pedidos");
                        revalidatePath(`/vendor/pedidos/${order.id}`);
                      }}
                    >
                      <button className="rounded-lg bg-yellow-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-yellow-700">
                        Marcar listo
                      </button>
                    </form>
                  )}
                  {order.status === "READY" &&
                    order.fulfillmentType === "DELIVERY" &&
                    order.deliveryUserId && (
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
                        <button className="rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-700">
                          Enviar
                        </button>
                      </form>
                    )}
                  {order.status === "READY" &&
                    order.fulfillmentType === "DELIVERY" &&
                    !order.deliveryUserId && (
                      <div className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs text-gray-500">
                        Esperando repartidor
                      </div>
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
                      <button className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700">
                        Completar
                      </button>
                    </form>
                  )}
                  {order.status !== "COMPLETED" &&
                    order.status !== "CANCELLED" && (
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
                        <button className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700">
                          Cancelar
                        </button>
                      </form>
                    )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}