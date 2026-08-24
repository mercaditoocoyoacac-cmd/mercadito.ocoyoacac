import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { prisma } from "@/server/prisma";
import { getSession } from "@/server/session";
import { Card, CardContent, Button, Skeleton, EmptyState, Badge } from "@/components/ui/design-system";
import { shimmerBlur } from "@/lib/images";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await getSession();
  const role = session?.user?.role;
  const additionalRoles = session?.user?.additionalRoles;
  const hasExtraRoles = additionalRoles && additionalRoles.length > 0;
  if (role === "VENDOR" && !hasExtraRoles) redirect("/vendor");
  if (role === "DELIVERY" && !hasExtraRoles) redirect("/delivery");
  if (role === "ADMIN" && !hasExtraRoles) redirect("/admin");

  const storeCount = await prisma.store.count({ where: { isActive: true, isPublished: true } });
  const productCount = await prisma.product.count({ where: { isActive: true } });
  const orderCount = await prisma.order.count({ where: { status: "COMPLETED" } });

  const featuredStores = await prisma.store.findMany({
    where: { isActive: true, isPublished: true },
    select: { id: true, name: true, slug: true, imageUrl: true, description: true, category: true },
    take: 6,
  });

  const categoryLabels: Record<string, string> = {
    CANASTA_BASICA: "Canasta básica",
    FRUTAS_VERDURAS: "Frutas y verduras",
    CARNES: "Carnes",
    LACTEOS: "Lácteos",
    PANADERIA: "Panadería",
    BEBIDAS: "Bebidas",
    SNACKS: "Snacks",
    LIMPIEZA: "Limpieza",
    SERVICIOS: "Servicios",
    OTROS: "Otros",
  };

  return (
    <main className="flex-1">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-amber-700 via-orange-600 to-rose-700 px-4 py-20 lg:py-28 text-white">
        <div className="absolute inset-0 opacity-[0.08]">
          <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <pattern id="pueblo" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M0 10 L10 0 L20 10 L10 20 Z" fill="currentColor" />
                <circle cx="10" cy="10" r="2" fill="currentColor" />
              </pattern>
            </defs>
            <rect width="100" height="100" fill="url(#pueblo)" />
          </svg>
        </div>
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-white blur-3xl"></div>
          <div className="absolute -bottom-20 -right-20 h-96 w-96 rounded-full bg-white blur-3xl"></div>
          <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-300 blur-3xl"></div>
        </div>

        <div className="relative mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-200/20 px-4 py-1.5 text-sm font-medium backdrop-blur-sm border border-amber-200/10">
              🛒 Compra local en Ocoyoacac
            </div>

            <h1 className="mt-6 text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl leading-tight">
              Todo lo que{" "}
              <span className="text-amber-200">necesitas</span>,<br/>
              cerca de ti
            </h1>

            <p className="mt-6 text-xl leading-relaxed text-white/90 max-w-xl">
              Descubre los mejores productos de tu comunidad. Compra directo a vendedores locales
              y recibe tus pedidos en minutos.
            </p>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/tiendas"
                className="inline-flex items-center justify-center gap-3 rounded-2xl bg-white px-8 py-4 text-lg font-bold text-amber-700 shadow-2xl transition-all duration-300 hover:scale-105 hover:shadow-xl active:scale-[0.98]"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Explorar tiendas
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-3 rounded-2xl border-2 border-white/40 px-8 py-4 text-lg font-bold text-white backdrop-blur-sm transition-all duration-300 hover:bg-white/10 hover:border-white/60 active:scale-[0.98]"
              >
                Iniciar sesión
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Stats */}
      <section className="mx-auto max-w-6xl px-4 py-12 lg:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 lg:gap-8">
          <StatCard
            value={storeCount.toLocaleString()}
            label="Tiendas locales"
            icon={
              <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            }
          />
          <StatCard
            value={productCount.toLocaleString()}
            label="Productos disponibles"
            icon={
              <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            }
          />
          <StatCard
            value={`${orderCount.toLocaleString()}+`}
            label="Pedidos entregados"
            icon={
              <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
              </svg>
            }
          />
        </div>
      </section>

      {/* How it works */}
      <section className="bg-gradient-to-b from-amber-50 to-orange-50 py-20 lg:py-28">
        <div className="mx-auto max-w-6xl px-4 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-stone-800">¿Cómo funciona?</h2>
          <p className="mt-3 text-stone-600">Tres pasos para recibir tus productos</p>
          <div className="mt-12 lg:mt-16 grid gap-8 sm:grid-cols-3">
            <StepCard
              number="1"
              color="from-amber-500 to-orange-500"
              title="Elige una tienda"
              description="Explora las tiendas locales y encuentra lo que necesitas"
            />
            <StepCard
              number="2"
              color="from-teal-500 to-emerald-500"
              title="Agrega al carrito"
              description="Elige tus productos y paga cuando recibas"
            />
            <StepCard
              number="3"
              color="from-rose-500 to-rose-600"
              title="Recibe en casa"
              description="Lo recibes el mismo día o pasando a recoger"
            />
          </div>
        </div>
      </section>

      {/* Featured Stores */}
      {featuredStores.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-16 lg:py-24">
          <div className="text-center mb-12 lg:mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-stone-800">Tiendas destacadas</h2>
            <p className="mt-2 text-stone-600">Descubre las tiendas más populares de tu comunidad</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featuredStores.map((store, idx) => (
              <Link
                key={store.id}
                href={`/tienda/${store.slug}`}
                className="group rounded-2xl border border-[var(--border)] bg-white overflow-hidden shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
              >
                <div className="relative aspect-video bg-gradient-to-br from-[var(--accent-soft)] to-[var(--accent)] flex items-center justify-center overflow-hidden">
                  {store.imageUrl ? (
                    <Image
                      src={store.imageUrl}
                      alt={store.name}
                      fill
                      className="object-cover p-4 transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      placeholder="blur"
                      blurDataURL={shimmerBlur}
                      priority={idx < 3}
                    />
                  ) : (
                    <div className="h-20 w-20 rounded-full bg-white/50 flex items-center justify-center text-5xl font-bold text-[var(--accent)]">
                      {store.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="neutral" size="sm">
                      {categoryLabels[store.category] || store.category?.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <h3 className="text-lg font-semibold text-stone-800 group-hover:text-[var(--accent)] transition-colors line-clamp-1">
                    {store.name}
                  </h3>
                  {store.description && (
                    <p className="mt-2 text-sm text-stone-600 line-clamp-2">
                      {store.description}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
          <div className="mt-12 text-center">
            <Link
              href="/tiendas"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 px-6 py-3 text-sm font-bold text-white shadow-md transition-all duration-300 hover:shadow-lg hover:from-amber-700 hover:to-orange-700 active:scale-[0.97]"
            >
              Ver todas las tiendas
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </section>
      )}

      {/* Categories CTA */}
      <section className="bg-white py-16 lg:py-24 border-t border-[var(--border)]">
        <div className="mx-auto max-w-6xl px-4 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-stone-800">Compra por categoría</h2>
          <p className="mt-3 text-stone-600">Encuentra exactamente lo que buscas</p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            {Object.entries(categoryLabels).map(([key, label]) => (
              <Link
                key={key}
                href={`/tiendas?category=${key}`}
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-sm font-medium text-stone-700 hover:border-[var(--accent)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent)] transition-all"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-gradient-to-br from-amber-700 via-orange-600 to-rose-700 py-20 lg:py-28 text-white">
        <div className="absolute inset-0 opacity-[0.06]">
          <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <rect width="100" height="100" fill="url(#pueblo)" />
          </svg>
        </div>
        <div className="relative mx-auto max-w-4xl px-4 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold">¿Listo para comprar?</h2>
          <p className="mt-3 text-amber-100 text-lg">
            Explora las tiendas de tu zona y encuentra lo que necesitas
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/tiendas"
              className="rounded-xl bg-white px-8 py-4 text-lg font-bold text-amber-700 shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl active:scale-[0.98]"
            >
              Ver tiendas
            </Link>
            <Link
              href="/login"
              className="rounded-xl border-2 border-white/30 px-8 py-4 text-lg font-bold text-white backdrop-blur-sm transition-all duration-300 hover:bg-white/10 hover:border-white/50 active:scale-[0.98]"
            >
              Iniciar sesión
            </Link>
          </div>
        </div>
      </section>

      {/* Footer Links */}
      <section className="mx-auto max-w-6xl px-4 py-10 text-center border-t border-[var(--border)]">
        <div className="flex flex-wrap items-center justify-center gap-8 text-sm">
          <Link href="/login" className="text-stone-600 hover:text-stone-800 transition-colors hover:underline">
            Iniciar sesión
          </Link>
          <Link href="/portal/vendedor" className="text-amber-600 font-semibold hover:text-amber-700 transition-colors hover:underline">
            ¿Eres vendedor? →
          </Link>
          <Link href="/portal/repartidor" className="text-teal-600 font-semibold hover:text-teal-700 transition-colors hover:underline">
            ¿Quieres entregar? →
          </Link>
        </div>
      </section>
    </main>
  );
}

function StatCard({ value, label, icon }: { value: string; label: string; icon: React.ReactNode }) {
  return (
    <Card variant="elevated" className="text-center p-6 lg:p-8">
      <CardContent className="flex flex-col items-center gap-3">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
          {icon}
        </div>
        <div className="text-4xl lg:text-5xl font-bold text-amber-600">{value}</div>
        <div className="text-sm text-stone-600">{label}</div>
      </CardContent>
    </Card>
  );
}

function StepCard({ number, color, title, description }: { number: string; color: string; title: string; description: string }) {
  return (
    <div className="animate-slide-up-sm">
      <div className={`mx-auto h-20 w-20 rounded-3xl bg-gradient-to-br ${color} flex items-center justify-center text-3xl font-bold text-white shadow-lg`}>
        {number}
      </div>
      <h3 className="mt-5 text-lg font-bold text-stone-800">{title}</h3>
      <p className="mt-2 text-sm text-stone-600">{description}</p>
    </div>
  );
}