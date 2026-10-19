import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { prisma } from "@/server/prisma";
import { getSession } from "@/server/session";
import { Card, CardContent, Badge } from "@/components/ui/design-system";
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
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#14532D] via-[#15803D] to-[#14532D] px-4 py-20 lg:py-28 text-white">
        <div className="pointer-events-none absolute inset-0 opacity-40" aria-hidden="true">
          <div className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-[#34D058] blur-3xl opacity-30" />
          <div className="absolute -bottom-24 -right-16 h-96 w-96 rounded-full bg-[#0EA5E9] blur-3xl opacity-20" />
        </div>

        <div className="relative mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-medium backdrop-blur-sm">
              <span aria-hidden="true">🛒</span> Compra local en Ocoyoacac
            </div>

            <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl leading-tight">
              Todo lo que{" "}
              <span className="text-[#86EFAC]">necesitas</span>,<br />
              cerca de ti
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/90">
              Descubre los mejores productos de tu comunidad. Compra directo a vendedores locales
              y recibe tus pedidos el mismo día.
            </p>

            <form action="/tiendas" method="get" role="search" className="mt-8 max-w-xl">
              <label htmlFor="home-search" className="sr-only">
                Buscar productos o tiendas
              </label>
              <div className="flex overflow-hidden rounded-2xl border border-white/20 bg-[var(--card-bg)] p-1 shadow-2xl">
                <input
                  id="home-search"
                  name="q"
                  type="search"
                  placeholder="¿Qué buscas hoy?"
                  className="min-w-0 flex-1 rounded-xl bg-transparent px-4 py-3 text-base text-[var(--foreground)] placeholder:text-[color:var(--muted)] focus:outline-none"
                />
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-6 py-3 font-bold text-[var(--on-accent)] transition-colors hover:bg-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Buscar
                </button>
              </div>
            </form>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/tiendas"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--card-bg)] px-7 py-3.5 text-base font-bold text-[#15803D] shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl active:scale-[0.98]"
              >
                Explorar tiendas
              </Link>
              <Link
                href="/registro"
                className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-white/40 px-7 py-3.5 text-base font-bold text-white backdrop-blur-sm transition-all duration-300 hover:border-white/70 hover:bg-white/10 active:scale-[0.98]"
              >
                Crear cuenta
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Stats */}
      <section className="mx-auto max-w-6xl px-4 py-12 lg:py-16" aria-label="Cifras del mercado">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 lg:gap-8">
          <StatCard
            value={storeCount.toLocaleString()}
            label="Tiendas locales"
            icon={
              <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            }
          />
          <StatCard
            value={productCount.toLocaleString()}
            label="Productos disponibles"
            icon={
              <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            }
          />
          <StatCard
            value={`${orderCount.toLocaleString()}+`}
            label="Pedidos entregados"
            icon={
              <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
              </svg>
            }
          />
        </div>
      </section>

      {/* How it works */}
      <section className="bg-[var(--surface)] py-20 lg:py-24">
        <div className="mx-auto max-w-6xl px-4 text-center">
          <h2 className="text-3xl font-bold lg:text-4xl">¿Cómo funciona?</h2>
          <p className="mt-3 text-[color:var(--muted)]">Tres pasos para recibir tus productos</p>
          <div className="mt-12 grid gap-8 sm:grid-cols-3 lg:mt-16">
            <StepCard
              number="1"
              color="#15803D"
              title="Elige una tienda"
              description="Explora las tiendas locales y encuentra lo que necesitas"
            />
            <StepCard
              number="2"
              color="#0F766E"
              title="Agrega al carrito"
              description="Elige tus productos y paga cuando recibas"
            />
            <StepCard
              number="3"
              color="#1D4ED8"
              title="Recibe en casa"
              description="Lo recibes el mismo día o pasando a recoger"
            />
          </div>
        </div>
      </section>

      {/* Featured Stores */}
      {featuredStores.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-16 lg:py-24">
          <div className="mb-12 text-center lg:mb-16">
            <h2 className="text-3xl font-bold lg:text-4xl">Tiendas destacadas</h2>
            <p className="mt-2 text-[color:var(--muted)]">Descubre las tiendas más populares de tu comunidad</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featuredStores.map((store, idx) => (
              <Link
                key={store.id}
                href={`/tienda/${store.slug}`}
                className="group overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
              >
                <div className="relative aspect-[4/3] bg-[var(--surface)]">
                  {store.imageUrl ? (
                    <Image
                      src={store.imageUrl}
                      alt={store.name}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      placeholder="blur"
                      blurDataURL={shimmerBlur}
                      priority={idx < 3}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--accent-soft)] text-4xl font-bold text-[var(--accent)]">
                        {store.name.charAt(0).toUpperCase()}
                      </div>
                    </div>
                  )}
                </div>
                <div className="p-6">
                  <Badge variant="neutral" size="sm">
                    {categoryLabels[store.category] || store.category?.replace(/_/g, " ")}
                  </Badge>
                  <h3 className="mt-3 line-clamp-1 text-lg font-semibold group-hover:text-[var(--accent)]">
                    {store.name}
                  </h3>
                  {store.description && (
                    <p className="mt-2 line-clamp-2 text-sm text-[color:var(--muted)]">
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
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-6 py-3 text-sm font-bold text-[var(--on-accent)] shadow-md transition-all duration-300 hover:bg-[var(--accent-hover)] hover:shadow-lg active:scale-[0.97]"
            >
              Ver todas las tiendas
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </section>
      )}

      {/* Categories */}
      <section className="border-t border-[var(--border)] bg-[var(--card-bg)] py-16 lg:py-24">
        <div className="mx-auto max-w-6xl px-4 text-center">
          <h2 className="text-3xl font-bold lg:text-4xl">Compra por categoría</h2>
          <p className="mt-3 text-[color:var(--muted)]">Encuentra exactamente lo que buscas</p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            {Object.entries(categoryLabels).map(([key, label]) => (
              <Link
                key={key}
                href={`/tiendas?category=${key}`}
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card-bg)] px-4 py-2.5 text-sm font-medium transition-all hover:border-[var(--accent)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#14532D] via-[#15803D] to-[#14532D] py-20 text-white lg:py-28">
        <div className="pointer-events-none absolute inset-0 opacity-30" aria-hidden="true">
          <div className="absolute -left-20 bottom-0 h-72 w-72 rounded-full bg-[#34D058] blur-3xl opacity-30" />
          <div className="absolute -right-20 top-0 h-72 w-72 rounded-full bg-[#0EA5E9] blur-3xl opacity-20" />
        </div>
        <div className="relative mx-auto max-w-4xl px-4 text-center">
          <h2 className="text-3xl font-bold lg:text-4xl">¿Listo para comprar?</h2>
          <p className="mt-3 text-lg text-[#BBF7D0]">
            Explora las tiendas de tu zona y encuentra lo que necesitas
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/tiendas"
              className="rounded-xl bg-[var(--card-bg)] px-8 py-4 text-lg font-bold text-[#15803D] shadow-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-2xl active:scale-[0.98]"
            >
              Ver tiendas
            </Link>
            <Link
              href="/registro"
              className="rounded-xl border-2 border-white/40 px-8 py-4 text-lg font-bold text-white backdrop-blur-sm transition-all duration-300 hover:border-white/70 hover:bg-white/10 active:scale-[0.98]"
            >
              Crear cuenta
            </Link>
          </div>
        </div>
      </section>

      {/* Footer links */}
      <section className="mx-auto max-w-6xl border-t border-[var(--border)] px-4 py-10 text-center">
        <div className="flex flex-wrap items-center justify-center gap-8 text-sm">
          <Link href="/login" className="text-[color:var(--muted)] transition-colors hover:text-[var(--foreground)] hover:underline">
            Iniciar sesión
          </Link>
          <Link href="/portal/vendedor" className="font-semibold text-[var(--accent)] transition-colors hover:text-[var(--accent-hover)] hover:underline">
            ¿Eres vendedor? →
          </Link>
          <Link href="/portal/repartidor" className="font-semibold text-[#0F766E] transition-colors hover:underline">
            ¿Quieres entregar? →
          </Link>
        </div>
      </section>
    </main>
  );
}

function StatCard({ value, label, icon }: { value: string; label: string; icon: React.ReactNode }) {
  return (
    <Card variant="default" className="p-6 text-center lg:p-8">
      <CardContent className="flex flex-col items-center gap-3">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
          {icon}
        </div>
        <div className="text-4xl font-bold text-[var(--accent)] lg:text-5xl">{value}</div>
        <div className="text-sm text-[color:var(--muted)]">{label}</div>
      </CardContent>
    </Card>
  );
}

function StepCard({ number, color, title, description }: { number: string; color: string; title: string; description: string }) {
  return (
    <div className="animate-slide-up-sm">
      <div
        className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl text-3xl font-bold text-white shadow-lg"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      >
        {number}
      </div>
      <h3 className="mt-5 text-lg font-bold">{title}</h3>
      <p className="mt-2 text-sm text-[color:var(--muted)]">{description}</p>
    </div>
  );
}
