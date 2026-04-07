import Link from "next/link";
import { prisma } from "@/server/prisma";
import { getSession } from "@/server/session";

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

export default async function VendorDashboard() {
  const session = await getSession();
  const userId = session!.user.id;

  const store = await prisma.store.findFirst({
    where: { ownerId: userId },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      phone: true,
      address: true,
      imageUrl: true,
    },
  });

  if (!store) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Panel del Vendedor
          </h1>
          <p className="mt-1 text-sm text-[color:var(--muted)]">
            Bienvenido, comienza a vender hoy.
          </p>
        </div>

        <div className="rounded-xl border border-[var(--border)] p-8 text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-[var(--accent-soft)] flex items-center justify-center mb-4">
            <svg className="h-8 w-8 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold">Crea tu tienda</h2>
          <p className="mt-2 text-sm text-[color:var(--muted)]">
            Configura tu negocio y empieza a publicar productos.
          </p>
          <div className="mt-6">
            <Link
              href="/vendor/onboarding"
              className="inline-flex rounded-md bg-[var(--accent)] px-6 py-2.5 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
            >
              Crear mi tienda
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const products = await prisma.product.findMany({
    where: { storeId: store.id },
    select: {
      id: true,
      name: true,
      priceCents: true,
      currency: true,
      imageUrl: true,
      isActive: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  const totalProducts = await prisma.product.count({
    where: { storeId: store.id },
  });

  const activeProducts = await prisma.product.count({
    where: { storeId: store.id, isActive: true },
  });

  const orders = await prisma.order.findMany({
    where: { storeId: store.id },
    select: {
      id: true,
      status: true,
      subtotalCents: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  const totalOrders = await prisma.order.count({
    where: { storeId: store.id },
  });

  const pendingOrders = await prisma.order.count({
    where: { storeId: store.id, status: "PENDING" },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Panel del Vendedor
          </h1>
          <p className="mt-1 text-sm text-[color:var(--muted)]">
            {store.name}
          </p>
        </div>
        <Link
          href={`/tienda/${store.slug}`}
          className="inline-flex items-center gap-2 rounded-md border border-[var(--border)] px-4 py-2 text-sm font-medium hover:bg-[var(--accent-soft)]"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          Ver mi tienda
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-[var(--border)] p-5">
          <div className="text-sm text-[color:var(--muted)]">Productos</div>
          <div className="mt-1 text-2xl font-semibold">{totalProducts}</div>
          <div className="mt-1 text-xs text-[color:var(--muted)]">
            {activeProducts} activos
          </div>
        </div>
        <div className="rounded-xl border border-[var(--border)] p-5">
          <div className="text-sm text-[color:var(--muted)]">Pedidos</div>
          <div className="mt-1 text-2xl font-semibold">{totalOrders}</div>
          <div className="mt-1 text-xs text-[color:var(--muted)]">
            {pendingOrders} pendientes
          </div>
        </div>
        <Link
          href="/vendor/productos/nuevo"
          className="rounded-xl border border-dashed border-[var(--accent)] p-5 text-center hover:bg-[var(--accent-soft)]"
        >
          <div className="text-2xl font-semibold text-[var(--accent)]">+</div>
          <div className="mt-1 text-sm text-[var(--accent)]">Nuevo producto</div>
        </Link>
        <Link
          href="/vendor/mi-tienda"
          className="rounded-xl border border-dashed border-[var(--border)] p-5 text-center hover:bg-[var(--accent-soft)]"
        >
          <div className="text-2xl font-semibold">⚙</div>
          <div className="mt-1 text-sm">Configurar tienda</div>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-[var(--border)]">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
            <h2 className="font-semibold">Productos recientes</h2>
            <Link href="/vendor/productos" className="text-sm text-[var(--accent)] hover:underline">
              Ver todos
            </Link>
          </div>
          {products.length === 0 ? (
            <div className="p-5 text-center text-sm text-[color:var(--muted)]">
              No tienes productos aún.
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {products.map((p) => (
                <div key={p.id} className="flex items-center gap-4 px-5 py-3">
                  {p.imageUrl ? (
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md border border-[var(--border)]">
                      <img
                        src={p.imageUrl}
                        alt={p.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="h-10 w-10 shrink-0 rounded-md border border-[var(--border)] bg-[var(--accent-soft)] flex items-center justify-center">
                      <span className="text-xs text-[var(--muted)]">Sin img</span>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{p.name}</div>
                    <div className="text-xs text-[color:var(--muted)]">
                      {formatMoney(p.priceCents, p.currency)}
                    </div>
                  </div>
                  <div className={`text-xs ${p.isActive ? "text-green-600" : "text-[var(--muted)]"}`}>
                    {p.isActive ? "Activo" : "Inactivo"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-[var(--border)]">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
            <h2 className="font-semibold">Pedidos recientes</h2>
            <Link href="/vendor/pedidos" className="text-sm text-[var(--accent)] hover:underline">
              Ver todos
            </Link>
          </div>
          {orders.length === 0 ? (
            <div className="p-5 text-center text-sm text-[color:var(--muted)]">
              No tienes pedidos aún.
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {orders.map((o) => (
                <div key={o.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <div className="text-sm font-medium">
                      #{o.id.slice(-6).toUpperCase()}
                    </div>
                    <div className="text-xs text-[color:var(--muted)]">
                      {new Date(o.createdAt).toLocaleDateString("es-MX")}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {formatMoney(o.subtotalCents, "MXN")}
                    </div>
                    <div className={`text-xs ${
                      o.status === "PENDING" ? "text-yellow-600" :
                      o.status === "COMPLETED" ? "text-green-600" :
                      o.status === "CANCELLED" ? "text-red-600" :
                      "text-blue-600"
                    }`}>
                      {o.status === "PENDING" ? "Pendiente" :
                       o.status === "CONFIRMED" ? "Confirmado" :
                       o.status === "READY" ? "Listo" :
                       o.status === "OUT_FOR_DELIVERY" ? "En camino" :
                       o.status === "COMPLETED" ? "Completado" :
                       "Cancelado"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
