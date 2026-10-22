import Link from "next/link";
import Image from "next/image";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/server/prisma";
import { getSession } from "@/server/session";
import { getUserRoles } from "@/server/requireUser";
import { formatDateInMexico, formatDateTimeInMexico } from "@/lib/dates";
import { formatMoney } from "@/lib/format";
import { membershipPlanLabel } from "@/lib/membership";
import { VendorCoachMarks } from "@/components/ui/VendorCoachMarks";
import { PullToRefreshWrapper } from "@/components/ui/PullToRefreshWrapper";
import { RoleModeSwitcher } from "@/components/layout/RoleModeSwitcher";

export const dynamic = "force-dynamic";

export default async function VendorDashboard() {
  const session = await getSession();
  const userId = session!.user.id;

  const vendorUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, additionalRoles: true },
  });
  const hasDeliveryAccess = vendorUser?.role === "DELIVERY" || vendorUser?.additionalRoles?.includes("DELIVERY");
  const sessionRoles = session ? getUserRoles(session) : [];

  const store = await prisma.store.findFirst({
    where: { ownerId: userId },
    include: {
      subscription: true,
      owner: { select: { trialUsed: true } },
      paymentMethods: {
        where: { isActive: true, status: "APPROVED" },
        select: { processor: true, label: true },
      },
    },
  });

  if (!store) {
    return (
      <main className="flex-1">
        <section className="relative overflow-hidden bg-[var(--navy)] px-4 py-20 text-white">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,var(--accent),transparent_65%)] opacity-40" />
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
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--card-bg)] px-8 py-4 text-base font-semibold text-[var(--brand)] shadow-lg transition-transform hover:scale-105 hover:bg-[var(--surface)]"
              >
                <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Crear mi tienda
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-4 py-16">
          <div className="grid gap-6 sm:grid-cols-3">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-6 text-center shadow-sm">
              <div className="text-3xl mb-2">📦</div>
              <h3 className="font-semibold">Productos</h3>
              <p className="mt-1 text-sm text-[color:var(--muted)]">
                Sube fotos y descripciones de tus productos
              </p>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-6 text-center shadow-sm">
              <div className="text-3xl mb-2">📱</div>
              <h3 className="font-semibold">Gestión fácil</h3>
              <p className="mt-1 text-sm text-[color:var(--muted)]">
                Adminstra pedidos desde tu celular
              </p>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-6 text-center shadow-sm">
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

  const productCount = await prisma.product.count({
    where: { storeId: store.id },
  });

  if (productCount === 0) {
    redirect("/vendor/completar-registro");
  }

  const isTrial = store.subscription?.status === "TRIAL";
  const trialUsed = store.owner?.trialUsed ?? false;
  const trialExpired = store.subscription && 
    store.subscription.status === "TRIAL" && 
    new Date(store.subscription.endDate) <= new Date();

  if (trialUsed && trialExpired && !subscriptionActive) {
    return (
      <main className="flex-1">
        <section className="relative overflow-hidden bg-[var(--navy)] px-4 py-20 text-white">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--danger),transparent_65%)] opacity-30" />
          <div className="relative mx-auto max-w-2xl text-center">
            <h1 className="text-3xl font-bold">Período de prueba finalizado</h1>
            <p className="mt-4 text-lg text-white/90">
              Ya utilizaste tu prueba gratuita de 30 días.
            </p>
            <p className="mt-2 text-white/70">
              Para continuar usando la plataforma, adquiere una membresía (Solo Delivery o Vende+) o contacta a un administrador.
            </p>
            <div className="mt-8 flex justify-center gap-4">
              <Link
                href="/vendor/membresia"
                className="inline-block rounded-lg bg-[var(--card-bg)] px-6 py-3 text-lg font-semibold text-[color:var(--danger)] hover:bg-[var(--surface)]"
              >
                Ver membresía
              </Link>
            </div>
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

  const activeProducts = await prisma.product.count({
    where: { storeId: store.id, isActive: true },
  });

  const orders = await prisma.order.findMany({
    where: { storeId: store.id },
    select: {
      id: true,
      status: true,
      subtotalCents: true,
      currency: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 10,
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

  const storeRatings = await prisma.orderRating.findMany({
    where: { order: { storeId: store.id } },
    select: { storeScore: true },
  });
  const avgStoreRating = storeRatings.length > 0
    ? (storeRatings.reduce((a, r) => a + r.storeScore, 0) / storeRatings.length).toFixed(1)
    : null;

  return (
    <>
      <VendorCoachMarks />
      <PullToRefreshWrapper>
      <main className="flex-1 fade-in">
      {productCount < 5 ? (
        <div className="mx-4 mt-4 rounded-lg border border-[var(--info)]/30 bg-[var(--info-soft)] px-4 py-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 text-xl">💡</span>
            <div className="flex-1">
              <div className="font-medium text-[color:var(--info)]">Tienes solo {productCount} producto{productCount === 1 ? "" : "s"}</div>
              <div className="mt-1 text-sm text-[color:var(--info)]">
                Las tiendas con más productos generan hasta 3x más ventas.{" "}
                <Link href="/vendor/productos/nuevo" className="font-semibold underline hover:no-underline">
                  Agrega más productos
                </Link>{" "}
                para ofrecer más opciones a tus clientes.
              </div>
            </div>
            <Link
              href="/vendor/productos/nuevo"
              className="shrink-0 rounded-lg border border-[var(--info)] px-4 py-2 text-sm font-medium text-[color:var(--info)] hover:bg-[var(--info-soft)]"
            >
              Agregar
            </Link>
          </div>
        </div>
      ) : null}

      {(!subscriptionActive || isTrial) && (
        <div className={`mx-4 mt-4 rounded-lg border px-4 py-3 ${isTrial ? "border-[var(--success)]/30 bg-[var(--success-soft)]" : "border-[var(--warning)]/30 bg-[var(--warning-soft)]"}`}>
          <div className="flex items-center gap-3">
            <svg aria-hidden="true" className={`h-5 w-5 ${isTrial ? "text-[var(--success)]" : "text-[var(--warning)]"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isTrial ? "M13 10V3L4 14h7v7l9-11h-7z" : "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"} />
            </svg>
            <div>
              <div className={`font-medium ${isTrial ? "text-[color:var(--success)]" : "text-[color:var(--warning)]"}`}>
                {isTrial ? "Prueba gratuita activa" : "Membresía inactiva"}
              </div>
              <div className={`text-sm ${isTrial ? "text-[color:var(--success)]" : "text-[color:var(--warning)]"}`}>
                {isTrial
                  ? `Tu prueba termina el ${formatDateInMexico(store.subscription!.endDate, { day: "numeric", month: "long" })}. Adquiere una membresía (Solo Delivery o Vende+) para continuar.`
                  : "Tu tienda no está visible. Contacta al admin para activar."}
              </div>
            </div>
          </div>
        </div>
      )}

      {!subscriptionActive && (
        <div className="mx-4 mt-4 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
          <div className="flex flex-col sm:flex-row items-center gap-4 p-5">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--gold)]">
              <span className="text-2xl">⭐</span>
            </div>
            <div className="flex-1 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <h3 className="text-base font-bold">Desbloquea una membresía</h3>
                <span className="inline-flex items-center rounded-full bg-[var(--gold)]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[color:var(--gold)]">Premium</span>
              </div>
              <p className="mt-1 text-sm text-[color:var(--muted)]">
                Envíos a domicilio, promociones, pagos en línea y más. Desde $299/mes con Solo Delivery.
              </p>
              <div className="mt-2 flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1 text-xs text-[color:var(--muted)]">
                <span className="flex items-center gap-1"><span className="text-[var(--gold)]">✓</span> Envío a domicilio</span>
                <span className="flex items-center gap-1"><span className="text-[var(--gold)]">✓</span> Promociones</span>
                <span className="flex items-center gap-1"><span className="text-[var(--gold)]">✓</span> Pagos en línea</span>
                <span className="flex items-center gap-1"><span className="text-[var(--gold)]">✓</span> Push</span>
              </div>
            </div>
            <a href="/vendor/membresia" className="shrink-0 rounded-xl bg-[var(--accent)] px-6 py-3 text-sm font-bold text-[var(--on-accent)] shadow-sm transition-colors hover:bg-[var(--accent-hover)]">
              Ver planes →
            </a>
          </div>
        </div>
      )}

      {(store.plan === "MEMBER" || store.plan === "SOLO_DELIVERY") && subscriptionActive && (
        <div className="mx-4 mt-4 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
          <div className="flex flex-col sm:flex-row items-center gap-4 p-5">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--gold)]">
              <span className="text-2xl">👑</span>
            </div>
            <div className="flex-1 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <h3 className="text-base font-bold">{membershipPlanLabel(store.plan)} Activa</h3>
                <span className="inline-flex items-center rounded-full bg-[var(--success-soft)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[color:var(--success)]">Activa</span>
              </div>
              <p className="mt-1 text-sm text-[color:var(--muted)]">
                Tu membresía está activa. Disfruta de todos los beneficios.
              </p>
              <div className="mt-2 flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1 text-xs text-[color:var(--muted)]">
                <span className="flex items-center gap-1"><span className="text-[var(--success)]">✓</span> Envío a domicilio</span>
                <span className="flex items-center gap-1"><span className="text-[var(--success)]">✓</span> Promociones</span>
                <span className="flex items-center gap-1"><span className="text-[var(--success)]">✓</span> Pagos en línea</span>
                <span className="flex items-center gap-1"><span className="text-[var(--success)]">✓</span> Push</span>
              </div>
            </div>
            <a href="/vendor/membresia" className="shrink-0 rounded-xl border-2 border-[var(--border)] bg-[var(--card-bg)] px-5 py-2.5 text-sm font-semibold transition-colors hover:border-[var(--accent)]/40 hover:bg-[var(--surface)]">
              Gestionar
            </a>
          </div>
        </div>
      )}

      <section className="relative overflow-hidden bg-[var(--navy)] px-4 py-12 text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,var(--accent),transparent_65%)] opacity-40" />
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-white blur-3xl"></div>
          <div className="absolute -bottom-20 -right-20 h-96 w-96 rounded-full bg-white blur-3xl"></div>
        </div>
        
        <div className="relative mx-auto max-w-6xl">
          <div className="flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1.5 text-sm font-medium backdrop-blur-sm">
                🏪 {store.name}
                {subscriptionActive && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                    👑 {membershipPlanLabel(store.plan)}
                  </span>
                )}
              </div>
              <h1 className="mt-4 text-3xl font-bold">Mi Tienda</h1>
              <p className="mt-2 text-white/80">
                {store.isPublished && store.isActive
                  ? (subscriptionActive ? `✓ Tu tienda está activa con ${membershipPlanLabel(store.plan)}` : "✓ Tu tienda está publicada y visible para clientes")
                  : "Tu tienda no es visible para clientes"}
              </p>
            </div>
            <div className="flex flex-col items-stretch gap-3 sm:flex-row">
              {sessionRoles.includes("DELIVERY") && (
                <RoleModeSwitcher availableRoles={sessionRoles} />
              )}
              <Link
                href={`/tienda/${store.slug}`}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--card-bg)] px-6 py-3 font-semibold text-[var(--brand)] shadow-lg hover:bg-[var(--surface)]"
              >
                <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Ver tienda
              </Link>
              <Link
                href="/vendor/productos/importar"
                className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-white/30 bg-white/10 px-6 py-3 font-semibold backdrop-blur-sm hover:bg-white/20"
              >
                <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m0 0l4 4" />
                </svg>
                Importar CSV
              </Link>
              <Link
                href="/vendor/productos/nuevo"
                className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-white/30 bg-white/10 px-6 py-3 font-semibold backdrop-blur-sm hover:bg-white/20"
              >
                <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Agregar producto
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-6 shadow-sm">
            <div className="text-sm text-[color:var(--muted)]"> Productos</div>
            <div className="mt-1 text-3xl font-bold">{productCount}</div>
            <div className="mt-1 text-xs text-[var(--success)]">
              {activeProducts} activos
            </div>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-6 shadow-sm">
            <div className="text-sm text-[color:var(--muted)]">Pedidos</div>
            <div className="mt-1 text-3xl font-bold">{totalOrders}</div>
            <div className="mt-1 text-xs text-[var(--warning)]">
              {pendingOrders} pendientes
            </div>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-6 shadow-sm">
            <div className="text-sm text-[color:var(--muted)]">Ingresos</div>
            <div className="mt-1 text-3xl font-bold">
              {formatMoney(totalRevenue._sum.subtotalCents || 0, "MXN")}
            </div>
            <div className="mt-1 text-xs text-[color:var(--muted)]">
              Total
            </div>
          </div>
          <Link
            href="/vendor/pagos"
            className={`block rounded-xl border p-6 shadow-sm transition hover:shadow-md ${store.paymentMethods.length > 0 ? "border-[var(--success)]/50 bg-[var(--success-soft)]" : "border-[var(--warning)]/50 bg-[var(--warning-soft)]"}`}
          >
            <div className="text-sm text-[color:var(--muted)]">Pago con tarjeta</div>
            <div className="mt-1 text-2xl font-bold">
              {store.paymentMethods.length > 0 ? "✓ Configurado" : "⚠ No configurado"}
            </div>
            <div className="mt-1 text-xs text-[color:var(--muted)]">
              {store.paymentMethods.length > 0
                ? store.paymentMethods.map((m) => m.label).join(", ")
                : "Configure en ajustes"}
            </div>
          </Link>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-6 shadow-sm">
            <div className="text-sm text-[color:var(--muted)]">Calificación</div>
            <div className="mt-1 text-3xl font-bold">
              {avgStoreRating ? (
                <span className="text-[var(--gold)]">{avgStoreRating} ★</span>
              ) : (
                "—"
              )}
            </div>
            <div className="mt-1 text-xs text-[color:var(--muted)]">
              {avgStoreRating ? `${storeRatings.length} opiniones` : "Sin calificaciones"}
            </div>
          </div>
          <Link
            href="/delivery/registro"
            className={`block rounded-xl border p-6 shadow-sm transition hover:shadow-md ${hasDeliveryAccess ? "border-[var(--info)]/40 bg-[var(--info-soft)]" : "border-[var(--border)] bg-[var(--card-bg)]"}`}
          >
            <div className="text-sm text-[color:var(--muted)]">Repartidor</div>
            <div className="mt-1 text-2xl font-bold">
              {hasDeliveryAccess ? "✓ Activado" : " También quiero repartir"}
            </div>
            <div className="mt-1 text-xs text-[color:var(--muted)]">
              {hasDeliveryAccess ? "Cambia a modo repartidor desde el menú" : "Regístrate como repartidor"}
            </div>
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)]">
            <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
              <h2 className="font-semibold">Productos recientes</h2>
              <Link href="/vendor/productos" className="text-sm text-[var(--accent-strong)] hover:underline">
                Ver todos →
              </Link>
            </div>
            {products.length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-4xl mb-2">📦</div>
                <p className="text-[color:var(--muted)]">No tienes productos aún.</p>
                <Link href="/vendor/productos/nuevo" className="mt-4 inline-block text-sm text-[var(--accent-strong)] hover:underline">
                  Agregar primer producto →
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {products.map((product: typeof products[number]) => (
                  <div key={product.id} className="flex items-center gap-4 px-5 py-3">
                    {product.imageUrl ? (
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-[var(--border)]">
                        <Image src={product.imageUrl} alt={product.name} fill className="object-cover" sizes="48px" />
                      </div>
                    ) : (
                      <div className="h-12 w-12 shrink-0 rounded-lg border border-[var(--border)] bg-[var(--surface)] flex items-center justify-center text-2xl">
                        📷
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{product.name}</div>
                      <div className="text-sm text-[color:var(--muted)]">
                        {formatMoney(product.priceCents, product.currency)}
                      </div>
                    </div>
                      <div className={`text-xs px-2 py-1 rounded-full ${product.isActive ? "bg-[var(--success-soft)] text-[color:var(--success)]" : "bg-[var(--surface)] text-[color:var(--muted)]"}`}>
                      {product.isActive ? "Activo" : "Inactivo"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)]">
            <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
              <h2 className="font-semibold">Pedidos recientes</h2>
              <Link href="/vendor/pedidos" className="text-sm text-[var(--accent-strong)] hover:underline">
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
                        {formatDateTimeInMexico(order.createdAt, { dateStyle: "medium" })}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{formatMoney(order.subtotalCents, order.currency || "MXN")}</div>
                      <div className={`text-xs ${
                        order.status === "PENDING" ? "text-[var(--warning)]" :
                        order.status === "COMPLETED" ? "text-[var(--success)]" :
                        "text-[var(--info)]"
                      }`}>
                        {order.status === "PENDING" ? "⏳ Pendiente" :
                         order.status === "CONFIRMED" ? "✓ Confirmado" :
                         order.status === "READY" ? "📦 Listo" :
                         order.status === "OUT_FOR_DELIVERY" ? "🚚 En camino" :
                         order.status === "COMPLETED" ? "✅ Completado" :
                         "❌ Cancelado"}
                      </div>
                      {order.status === "PENDING" && (
                        <form
                          action={async () => {
                            "use server";
                            const c = (await cookies()).toString();
                            await fetch(`${process.env.NEXTAUTH_URL}/api/vendor/orders/${order.id}/status`, {
                              method: "POST",
                              headers: { "content-type": "application/json", cookie: c },
                              body: JSON.stringify({ status: "CONFIRMED" }),
                            });
                            revalidatePath("/vendor");
                            revalidatePath(`/vendor/pedidos/${order.id}`);
                          }}
                        >
                          <button className="mt-1 rounded-lg bg-[var(--accent)] px-3 py-1 text-xs font-medium text-[var(--on-accent)] hover:bg-[var(--accent-hover)]">
                            Confirmar
                          </button>
                        </form>
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
                            revalidatePath("/vendor");
                            revalidatePath(`/vendor/pedidos/${order.id}`);
                          }}
                        >
                          <button className="mt-1 rounded-lg bg-[var(--accent)] px-3 py-1 text-xs font-medium text-[var(--on-accent)] hover:bg-[var(--accent-hover)]">
                            Marcar listo
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
    </PullToRefreshWrapper>
    </>
  );
}
