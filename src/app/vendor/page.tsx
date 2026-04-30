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
    include: { subscription: true, owner: { select: { trialUsed: true } } },
  });

  if (!store) {
    return (
      <main className="flex-1">
        <section className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-700 px-4 py-20 text-white">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-white blur-3xl"></div>
            <div className="absolute -bottom-20 -right-20 h-96 w-96 rounded-full bg-white blur-3xl"></div>
          </div>
          
          <div className="relative mx-auto max-w-4xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1.5 text-sm font-medium backdrop-blur-sm">
              🏪 Tu negocio online
            </div>
            
            <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl">
              Vende en Mercadito
            </h1>
            
            <p className="mt-4 text-lg text-white/90 sm:text-xl">
              Crea tu tienda digital y reaching a más clientes en tu comunidad.
              Empieza a vender hoy.
            </p>
            
            <div className="mt-8">
              <Link
                href="/vendor/onboarding"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-8 py-4 text-base font-semibold text-emerald-700 shadow-lg transition-transform hover:scale-105 hover:bg-yellow-50"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Crear mi tienda
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-4 py-16">
          <div className="grid gap-6 sm:grid-cols-3">
            <div className="rounded-xl border border-[var(--border)] bg-white p-6 text-center shadow-sm">
              <div className="text-3xl mb-2">📦</div>
              <h3 className="font-semibold">Productos</h3>
              <p className="mt-1 text-sm text-[color:var(--muted)]">
                Sube fotos y descripciones de tus productos
              </p>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-white p-6 text-center shadow-sm">
              <div className="text-3xl mb-2">📱</div>
              <h3 className="font-semibold">Gestión fácil</h3>
              <p className="mt-1 text-sm text-[color:var(--muted)]">
                Adminstra pedidos desde tu celular
              </p>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-white p-6 text-center shadow-sm">
              <div className="text-3xl mb-2">💳</div>
              <h3 className="font-semibold">Pagos</h3>
              <p className="mt-1 text-sm text-[color:var(--muted)]">
                Acepta efectivo o tarjeta
              </p>
            </div>
          </div>
        </section>
      </main>
    );
  }

  const subscriptionActive = store.subscription && 
    ["ACTIVE", "TRIAL"].includes(store.subscription.status) && 
    new Date(store.subscription.endDate) > new Date();

  const contractSigned = store.subscription?.contractSigned ?? false;
  const isTrial = store.subscription?.status === "TRIAL";
  const trialUsed = store.owner?.trialUsed ?? false;
  const trialExpired = store.subscription && 
    store.subscription.status === "TRIAL" && 
    new Date(store.subscription.endDate) <= new Date();

  if (trialUsed && trialExpired && !contractSigned && !subscriptionActive) {
    return (
      <main className="flex-1">
        <section className="bg-gradient-to-br from-red-600 via-red-700 to-rose-700 px-4 py-20 text-white">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-3xl font-bold">Período de prueba finalizado</h1>
            <p className="mt-4 text-lg text-white/90">
              Ya utilizaste tu prueba gratuita de 15 días.
            </p>
            <p className="mt-2 text-white/70">
              Para continuar usando la plataforma, debes firmar el contrato o contactar a un administrador.
            </p>
            <div className="mt-8 flex justify-center gap-4">
              <Link
                href="/contrato"
                className="inline-block rounded-lg bg-white px-6 py-3 text-lg font-semibold text-red-700 hover:bg-gray-100"
              >
                Firmar contrato
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (!contractSigned && !isTrial) {
    return (
      <main className="flex-1">
        <section className="bg-gradient-to-br from-orange-600 via-orange-700 to-amber-700 px-4 py-20 text-white">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-3xl font-bold">Contrato requerido</h1>
            <p className="mt-4 text-lg text-white/90">
              Para continuar, necesitas firmar el contrato de servicio.
            </p>
            <div className="mt-8">
              <Link
                href="/contrato"
                className="inline-block rounded-lg bg-white px-6 py-3 text-lg font-semibold text-orange-700 hover:bg-gray-100"
              >
                Firmar contrato
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (!store.isApproved && !isTrial) {
    return (
      <main className="flex-1">
        <section className="bg-gradient-to-br from-amber-600 via-amber-700 to-yellow-700 px-4 py-20 text-white">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-3xl font-bold">En espera de aprobación</h1>
            <p className="mt-4 text-lg text-white/90">
              Tu tienda está en espera de aprobación por un administrador.
            </p>
            <p className="mt-2 text-white/70">
              Serás notificado cuando tu solicitud sea aprobada.
            </p>
            {isTrial && (
              <p className="mt-2 text-white/90">
                Mientras tanto, puedes configurar tus productos durante tu prueba.
              </p>
            )}
          </div>
        </section>
      </main>
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

  const totalRevenue = await prisma.order.aggregate({
    where: { storeId: store.id, status: { not: "CANCELLED" } },
    _sum: { subtotalCents: true },
  });

  return (
    <main className="flex-1">
      {(!subscriptionActive || isTrial) && (
        <div className={`mx-4 mt-4 rounded-lg border px-4 py-3 ${isTrial ? "border-emerald-500/30 bg-emerald-500/10" : "border-yellow-500/30 bg-yellow-500/10"}`}>
          <div className="flex items-center gap-3">
            <svg className={`h-5 w-5 ${isTrial ? "text-emerald-600" : "text-yellow-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isTrial ? "M13 10V3L4 14h7v7l9-11h-7z" : "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"} />
            </svg>
            <div>
              <div className={`font-medium ${isTrial ? "text-emerald-800" : "text-yellow-800"}`}>
                {isTrial ? "Prueba gratuita activa" : "Membresía inactiva"}
              </div>
              <div className={`text-sm ${isTrial ? "text-emerald-700" : "text-yellow-700"}`}>
                {isTrial
                  ? `Tu prueba termina el ${store.subscription!.endDate.toLocaleDateString("es-MX", { day: "numeric", month: "long" })}. Firma el contrato para continuar.`
                  : "Tu tienda no está visible. Contacta al admin para activar."}
              </div>
            </div>
          </div>
        </div>
      )}

      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-700 px-4 py-12 text-white">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-white blur-3xl"></div>
          <div className="absolute -bottom-20 -right-20 h-96 w-96 rounded-full bg-white blur-3xl"></div>
        </div>
        
        <div className="relative mx-auto max-w-6xl">
          <div className="flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1.5 text-sm font-medium backdrop-blur-sm">
                🏪 {store.name}
              </div>
              <h1 className="mt-4 text-3xl font-bold">Mi Tienda</h1>
              <p className="mt-2 text-white/80">
                {subscriptionActive ? "✓ Tu tienda está activa" : "Tu tienda no es visible para clientes"}
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href={`/tienda/${store.slug}`}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 font-semibold text-emerald-700 shadow-lg hover:bg-yellow-50"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Ver tienda
              </Link>
              <Link
                href="/vendor/productos/nuevo"
                className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-white/30 bg-white/10 px-6 py-3 font-semibold backdrop-blur-sm hover:bg-white/20"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Agregar producto
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-[var(--border)] bg-white p-6 shadow-sm">
            <div className="text-sm text-[color:var(--muted)]"> Productos</div>
            <div className="mt-1 text-3xl font-bold">{totalProducts}</div>
            <div className="mt-1 text-xs text-green-600">
              {activeProducts} activos
            </div>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-white p-6 shadow-sm">
            <div className="text-sm text-[color:var(--muted)]">Pedidos</div>
            <div className="mt-1 text-3xl font-bold">{totalOrders}</div>
            <div className="mt-1 text-xs text-yellow-600">
              {pendingOrders} pendientes
            </div>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-white p-6 shadow-sm">
            <div className="text-sm text-[color:var(--muted)]">Ingresos</div>
            <div className="mt-1 text-3xl font-bold">
              {formatMoney(totalRevenue._sum.subtotalCents || 0, "MXN")}
            </div>
            <div className="mt-1 text-xs text-[color:var(--muted)]">
              Total
            </div>
          </div>
          <div className={`rounded-xl border p-6 shadow-sm ${store.acceptsMercadoPago ? "border-green-500 bg-green-50" : "border-yellow-500/50 bg-yellow-50"}`}>
            <div className="text-sm text-[color:var(--muted)]">Pago con tarjeta</div>
            <div className="mt-1 text-2xl font-bold">
              {store.acceptsMercadoPago ? "✓ Configurado" : "⚠ No configurado"}
            </div>
            <div className="mt-1 text-xs text-[color:var(--muted)]">
              {store.acceptsMercadoPago ? "Aceptas tarjetas" : "Configure en ajustes"}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-[var(--border)] bg-white">
            <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
              <h2 className="font-semibold">Productos recientes</h2>
              <Link href="/vendor/productos" className="text-sm text-emerald-600 hover:underline">
                Ver todos →
              </Link>
            </div>
            {products.length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-4xl mb-2">📦</div>
                <p className="text-[color:var(--muted)]">No tienes productos aún.</p>
                <Link href="/vendor/productos/nuevo" className="mt-4 inline-block text-sm text-emerald-600 hover:underline">
                  Agregar primer producto →
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {products.map((product: typeof products[number]) => (
                  <div key={product.id} className="flex items-center gap-4 px-5 py-3">
                    {product.imageUrl ? (
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-[var(--border)]">
                        <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
                      </div>
                    ) : (
                      <div className="h-12 w-12 shrink-0 rounded-lg border border-[var(--border)] bg-gray-100 flex items-center justify-center text-2xl">
                        📷
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{product.name}</div>
                      <div className="text-sm text-[color:var(--muted)]">
                        {formatMoney(product.priceCents, product.currency)}
                      </div>
                    </div>
                    <div className={`text-xs px-2 py-1 rounded-full ${product.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                      {product.isActive ? "Activo" : "Inactivo"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-white">
            <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
              <h2 className="font-semibold">Pedidos recientes</h2>
              <Link href="/vendor/pedidos" className="text-sm text-emerald-600 hover:underline">
                Ver todos →
              </Link>
            </div>
            {orders.length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-4xl mb-2">📋</div>
                <p className="text-[color:var(--muted)]">No tienes pedidos aún.</p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {orders.map((order: typeof orders[number]) => (
                  <div key={order.id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <div className="font-medium">#{order.id.slice(-6).toUpperCase()}</div>
                      <div className="text-xs text-[color:var(--muted)]">
                        {new Date(order.createdAt).toLocaleDateString("es-MX", { dateStyle: "medium" })}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{formatMoney(order.subtotalCents, "MXN")}</div>
                      <div className={`text-xs ${
                        order.status === "PENDING" ? "text-yellow-600" :
                        order.status === "COMPLETED" ? "text-green-600" :
                        "text-blue-600"
                      }`}>
                        {order.status === "PENDING" ? "⏳ Pendiente" :
                         order.status === "CONFIRMED" ? "✓ Confirmado" :
                         order.status === "READY" ? "📦 Listo" :
                         order.status === "OUT_FOR_DELIVERY" ? "🚚 En camino" :
                         order.status === "COMPLETED" ? "✅ Completado" :
                         "❌ Cancelado"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
