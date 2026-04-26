import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/server/prisma";
import { getSession } from "@/server/session";
import DeliveryOrdersGrid from "@/components/DeliveryOrders";

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency }).format(
    cents / 100,
  );
}

const statusLabels: Record<string, string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmado",
  READY: "Listo",
  OUT_FOR_DELIVERY: "En camino",
  COMPLETED: "Entregado",
  CANCELLED: "Cancelado",
};

export const dynamicParams = true;

export default async function DeliveryDashboard() {
  const session = await getSession();
  
  if (!session?.user?.id || session.user.role !== "DELIVERY") {
    redirect("/delivery/login");
  }

  const myDeliveries = await prisma.order.findMany({
    where: { deliveryUserId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      fulfillmentType: true,
      customerName: true,
      customerPhone: true,
      customerAddress: true,
      customerLat: true,
      customerLng: true,
      totalCents: true,
      currency: true,
      createdAt: true,
      store: { select: { name: true, phone: true, address: true } },
    },
  });

  const availableDeliveries = await prisma.order.findMany({
    where: {
      fulfillmentType: "DELIVERY",
      status: { in: ["CONFIRMED", "READY"] },
      deliveryUserId: null,
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      status: true,
      customerName: true,
      customerPhone: true,
      customerAddress: true,
      customerLat: true,
      customerLng: true,
      totalCents: true,
      currency: true,
      createdAt: true,
      store: { select: { name: true, phone: true, address: true } },
    },
  });

  const activeDeliveries = myDeliveries.filter(
    (o) => o.status === "OUT_FOR_DELIVERY"
  );

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">
          Panel de Repartidor
        </h1>
        <p className="mt-1 text-sm text-[color:var(--muted)]">
          Bienvenido, {session.user.email}
        </p>
      </div>

      {activeDeliveries.length > 0 && (
        <>
          <div className="mb-8 flex items-center justify-between">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
              </span>
              Entregas activas
            </h2>
            <Link
              href="/delivery/escanear"
              className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 flex items-center gap-2"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              Escanear QR
            </Link>
          </div>
          <DeliveryOrdersGrid orders={activeDeliveries} showMap />
        </>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="rounded-xl border border-[var(--border)]">
          <div className="border-b border-[var(--border)] px-5 py-4">
            <h2 className="font-semibold">Mis entregas ({myDeliveries.length})</h2>
          </div>
          {myDeliveries.length === 0 ? (
            <div className="p-5 text-center text-sm text-[color:var(--muted)]">
              No tienes entregas asignadas.
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {myDeliveries.slice(0, 10).map((order) => (
                <div key={order.id} className="px-5 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-mono text-sm">
                        #{order.id.slice(-8).toUpperCase()}
                      </div>
                      <div className="text-sm">{order.customerName}</div>
                      <div className="text-xs text-[color:var(--muted)]">
                        {order.store.name}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-xs px-2 py-1 rounded-full ${
                        order.status === "COMPLETED"
                          ? "bg-green-100 text-green-800"
                          : order.status === "OUT_FOR_DELIVERY"
                          ? "bg-orange-100 text-orange-800"
                          : "bg-gray-100 text-gray-800"
                      }`}>
                        {statusLabels[order.status]}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-[var(--border)]">
          <div className="border-b border-[var(--border)] px-5 py-4">
            <h2 className="font-semibold">Pedidos disponibles ({availableDeliveries.length})</h2>
          </div>
          {availableDeliveries.length === 0 ? (
            <div className="p-5 text-center text-sm text-[color:var(--muted)]">
              No hay pedidos disponibles.
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {availableDeliveries.map((order) => (
                <div key={order.id} className="px-5 py-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-mono text-sm">
                        #{order.id.slice(-8).toUpperCase()}
                      </div>
                      <div className="font-medium">{order.customerName}</div>
                      <div className="text-sm text-[color:var(--muted)]">
                        {order.customerPhone}
                      </div>
                      {order.customerAddress && (
                        <div className="text-xs text-[color:var(--muted)] mt-1">
                          📍 {order.customerAddress}
                        </div>
                      )}
                    </div>
                    <form action={async () => {
                      "use server";
                      const session = await getSession();
                      if (session?.user?.id) {
                        await prisma.order.update({
                          where: { id: order.id },
                          data: {
                            deliveryUserId: session.user.id,
                            status: "READY",
                          },
                        });
                        revalidatePath("/delivery");
                      }
                    }}>
                      <button className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[var(--accent-hover)]">
                        Aceptar
                      </button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}