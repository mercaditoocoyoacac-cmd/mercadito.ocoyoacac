import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { prisma } from "@/server/prisma";
import { getSession } from "@/server/session";
import { Card, CardContent, EmptyState } from "@/components/ui/design-system";
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
      <section className="relative overflow-hidden bg-[var(--navy)] px-4 py-20 text-white lg:py-28">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,var(--accent),transparent_60%)] opacity-40"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-[var(--accent)] opacity-20 blur-3xl"
        />

        <div className="relative mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-sm font-medium backdrop-blur-sm">
              <span aria-hidden="true">🛒</span> Compra local en Ocoyoacac
            </div>

            <h1 className="mt-6 text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Todo lo que <span className="text-[#86EFAC]">necesitas</span>,<br />
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
              <div className="flex items-center gap-2 rounded-full border border-white/15 bg-[var(--card-bg)] p-1.5 pl-4 shadow-2xl">
                <svg
                  aria-hidden="true"
                  className="h-5 w-5 shrink-0 text-[color:var(--muted)]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  id="home-search"
                  name="q"
                  type="search"
                  placeholder="¿Qué buscas hoy?"
                  autoComplete="off"
                  className="min-w-0 flex-1 bg-transparent py-3 text-base text-[color:var(--foreground)] outline-none placeholder:text-[color:var(--muted)]"
                />
                <button
                  type="submit"
                  className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[var(--accent)] px-6 py-3 font-semibold text-[var(--on-accent)] transition-colors hover:bg-[var(--accent-hover)]"
                >
                  Buscar
                </button>
              </div>
            </form>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/tiendas"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--card-bg)] px-7 py-3.5 text-base font-semibold text-[var(--accent-strong)] shadow-lg transition-transform hover:-translate-y-0.5 active:scale-[0.98]"
              >
                Explorar tiendas
              </Link>
              <Link
                href="/registro"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/30 px-7 py-3.5 text-base font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/10 active:scale-[0.98]"
              >
                Crear cuenta
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section
        aria-label="Cifras del mercado"
        className="mx-auto -mt-6 max-w-4xl px-4"
      >
        <Card variant="elevated" className="rounded-2xl">
          <CardContent className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 px-6 py-6 text-center">
            <div>
              <div className="text-2xl font-bold text-[var(--accent-strong)] lg:text-3xl">
                {storeCount.toLocaleString()}
              </div>
              <div className="text-sm text-[color:var(--muted)]">Tiendas locales</div>
            </div>
            <div className="hidden h-8 w-px bg-[var(--border)] sm:block" aria-hidden="true" />
            <div>
              <div className="text-2xl font-bold text-[var(--accent-strong)] lg:text-3xl">
                {productCount.toLocaleString()}
              </div>
              <div className="text-sm text-[color:var(--muted)]">Productos disponibles</div>
            </div>
            <div className="hidden h-8 w-px bg-[var(--border)] sm:block" aria-hidden="true" />
            <div>
              <div className="text-2xl font-bold text-[var(--accent-strong)] lg:text-3xl">Mismo día</div>
              <div className="text-sm text-[color:var(--muted)]">Entrega local</div>
            </div>
          </CardContent>
        </Card>
      </section>

      {featuredStores.length > 0 ? (
        <section className="mx-auto max-w-6xl px-4 py-16 lg:py-20">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Tiendas destacadas</h2>
              <p className="mt-2 text-[color:var(--muted)]">Los negocios más activos de tu comunidad</p>
            </div>
            <Link
              href="/tiendas"
              className="hidden shrink-0 text-sm font-semibold text-[var(--accent-strong)] underline-offset-4 hover:underline sm:inline"
            >
              Ver todas →
            </Link>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featuredStores.map((store, idx) => (
              <Link
                key={store.id}
                href={`/tienda/${store.slug}`}
                className="group overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card-bg)] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[var(--accent)]/30 hover:shadow-xl"
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-[var(--accent-soft)]">
                  {store.imageUrl ? (
                    <Image
                      src={store.imageUrl}
                      alt=""
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      placeholder="blur"
                      blurDataURL={shimmerBlur}
                      priority={idx < 3}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-5xl font-bold text-[var(--accent-strong)]">
                      {store.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-black/0 to-transparent"
                  />
                  <span className="absolute left-3 top-3 rounded-full bg-[var(--card-bg)]/90 px-2.5 py-1 text-xs font-medium text-[color:var(--foreground)] shadow-sm backdrop-blur">
                    {categoryLabels[store.category] || store.category?.replace(/_/g, " ")}
                  </span>
                </div>
                <div className="p-5">
                  <h3 className="line-clamp-1 text-lg font-semibold transition-colors group-hover:text-[var(--accent-strong)]">
                    {store.name}
                  </h3>
                  {store.description ? (
                    <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-[color:var(--muted)]">
                      {store.description}
                    </p>
                  ) : null}
                </div>
              </Link>
            ))}
          </div>
          <div className="mt-8 text-center sm:hidden">
            <Link
              href="/tiendas"
              className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-[var(--on-accent)]"
            >
              Ver todas las tiendas
            </Link>
          </div>
        </section>
      ) : (
        <section className="mx-auto max-w-6xl px-4 py-16">
          <EmptyState
            illustration="store"
            title="Aún no hay tiendas"
            description="Sé el primero en registrar tu negocio en Mercadito."
            action={{ label: "Registrar mi negocio", href: "/vendor/registro", variant: "primary" }}
          />
        </section>
      )}

      <section className="border-t border-[var(--border)] bg-[var(--surface)] py-16 lg:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">¿Cómo funciona?</h2>
            <p className="mt-2 text-[color:var(--muted)]">Tres pasos para recibir tus productos</p>
          </div>
          <div className="grid gap-8 sm:grid-cols-3">
            <StepCard
              number="1"
              title="Elige una tienda"
              description="Explora las tiendas locales y encuentra lo que necesitas."
            />
            <StepCard
              number="2"
              title="Agrega al carrito"
              description="Elige tus productos y paga al recibir o en línea."
            />
            <StepCard
              number="3"
              title="Recibe en casa"
              description="Lo recibes el mismo día o pasando a recoger."
            />
          </div>
        </div>
      </section>

      <section className="border-t border-[var(--border)] bg-[var(--card-bg)] py-16 lg:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Compra por categoría</h2>
            <p className="mt-2 text-[color:var(--muted)]">Encuentra exactamente lo que buscas</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {Object.entries(categoryLabels).map(([key, label]) => (
              <Link
                key={key}
                href={`/tiendas?category=${key}`}
                className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--card-bg)] px-4 py-2.5 text-sm font-medium transition-colors hover:border-[var(--accent)]/40 hover:bg-[var(--accent-soft)] hover:text-[var(--accent-strong)]"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8 sm:flex sm:items-center sm:justify-between lg:p-10">
          <div>
            <h2 className="text-xl font-bold sm:text-2xl">¿Tienes un negocio?</h2>
            <p className="mt-2 max-w-xl text-sm text-[color:var(--muted)] sm:text-base">
              Súmalo a Mercadito y llega a más clientes de tu comunidad.
            </p>
          </div>
          <Link
            href="/vendor/registro"
            className="mt-5 inline-flex shrink-0 items-center gap-2 rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-[var(--on-accent)] transition-colors hover:bg-[var(--accent-hover)] sm:mt-0"
          >
            Registrar mi negocio
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl border-t border-[var(--border)] px-4 py-10 text-center">
        <div className="flex flex-wrap items-center justify-center gap-8 text-sm">
          <Link
            href="/login"
            className="text-[color:var(--muted)] transition-colors hover:text-[var(--foreground)] hover:underline"
          >
            Iniciar sesión
          </Link>
          <Link
            href="/portal/vendedor"
            className="font-semibold text-[var(--accent-strong)] underline-offset-4 hover:underline"
          >
            ¿Eres vendedor? →
          </Link>
          <Link
            href="/portal/repartidor"
            className="font-semibold text-[var(--accent-strong)] underline-offset-4 hover:underline"
          >
            ¿Quieres entregar? →
          </Link>
        </div>
      </section>
    </main>
  );
}

function StepCard({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="animate-slide-up-sm text-center">
      <div
        className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent)] text-xl font-bold text-[var(--on-accent)]"
        aria-hidden="true"
      >
        {number}
      </div>
      <h3 className="mt-4 text-lg font-bold">{title}</h3>
      <p className="mx-auto mt-2 max-w-xs text-sm text-[color:var(--muted)]">{description}</p>
    </div>
  );
}
