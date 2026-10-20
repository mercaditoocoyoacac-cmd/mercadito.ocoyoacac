import Link from "next/link";
import { prisma } from "@/server/prisma";
import { CategoryFilter } from "@/components/ui/CategoryFilter";
import { StoreCard } from "@/components/storefront/StoreCard";
import { EmptyState } from "@/components/ui/design-system";

export const dynamic = "force-dynamic";

export default async function TiendasPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string }>;
}) {
  const params = await searchParams;
  const category = params?.category || "";
  const q = params?.q || "";

  const allCategories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    select: { key: true, label: true, icon: true },
  });

  const validCategory = category && allCategories.some((c) => c.key === category) ? category : "";
  const qTrim = q.trim().toLowerCase();

  const stores = await prisma.store.findMany({
    where: {
      isActive: true,
      isPublished: true,
      ...(validCategory ? { category: validCategory } : {}),
      ...(qTrim
        ? {
            OR: [
              { name: { contains: qTrim, mode: "insensitive" } },
              { description: { contains: qTrim, mode: "insensitive" } },
              { products: { some: { name: { contains: qTrim, mode: "insensitive" } } } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      name: true,
      slug: true,
      category: true,
      description: true,
      imageUrl: true,
      _count: { select: { products: { where: { isActive: true } } } },
    },
  });

  const [completedCounts, ratedOrders] = await Promise.all([
    prisma.order.groupBy({
      by: ["storeId"],
      where: { status: "COMPLETED" },
      _count: { id: true },
    }),
    prisma.order.findMany({
      where: { rating: { isNot: null } },
      select: { storeId: true, rating: { select: { storeScore: true } } },
    }),
  ]);

  const countMap = new Map(completedCounts.map((o) => [o.storeId, o._count.id]));
  stores.sort((a, b) => (countMap.get(b.id) || 0) - (countMap.get(a.id) || 0));

  const ratingMap = new Map<string, { sum: number; count: number }>();
  for (const order of ratedOrders) {
    if (!order.rating) continue;
    const current = ratingMap.get(order.storeId) ?? { sum: 0, count: 0 };
    current.sum += order.rating.storeScore;
    current.count += 1;
    ratingMap.set(order.storeId, current);
  }

  const storesWithProducts = await Promise.all(
    stores.map(async (store) => {
      const products = await prisma.product.findMany({
        where: { storeId: store.id, isActive: true, imageUrl: { not: null } },
        orderBy: [{ soldCount: "desc" }, { createdAt: "desc" }],
        take: 3,
        select: { id: true, name: true, imageUrl: true },
      });
      const aggregated = ratingMap.get(store.id);
      return {
        ...store,
        topProducts: products,
        rating: aggregated ? aggregated.sum / aggregated.count : null,
      };
    })
  );

  const categoryLookup = Object.fromEntries(allCategories.map((c) => [c.key, c]));
  const hasFilters = Boolean(validCategory || qTrim);
  const totalStores = storesWithProducts.length;

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-20 pt-10 lg:pt-14">
      <header>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Tiendas en Ocoyoacac</h1>
        <p className="mt-3 max-w-xl text-[color:var(--muted)]">
          {qTrim
            ? `Resultados para “${q.trim()}”`
            : "Compra directo a negocios locales, con entrega a domicilio."}
        </p>
      </header>

      <div className="mt-8 flex flex-col gap-3">
        <form
          action="/tiendas"
          method="get"
          role="search"
          className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--card-bg)] p-1.5 pl-4 shadow-sm transition-colors focus-within:border-[var(--accent)]/50"
        >
          <svg
            aria-hidden="true"
            className="h-5 w-5 shrink-0 text-[color:var(--muted)]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <label htmlFor="tiendas-search" className="sr-only">
            Buscar tiendas o productos
          </label>
          <input
            id="tiendas-search"
            name="q"
            defaultValue={q}
            type="search"
            placeholder="Busca una tienda, producto o antojito…"
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent py-2.5 text-sm text-[color:var(--foreground)] outline-none placeholder:text-[color:var(--muted)] sm:text-base"
          />
          {validCategory ? <input type="hidden" name="category" value={validCategory} /> : null}
          <button
            type="submit"
            className="inline-flex shrink-0 items-center justify-center rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-[var(--on-accent)] transition-colors hover:bg-[var(--accent-hover)]"
          >
            Buscar
          </button>
        </form>

        <CategoryFilter
          categories={allCategories}
          selected={validCategory}
          baseUrl="/tiendas"
          query={q}
        />
      </div>

      <div className="mt-8 flex items-center justify-between gap-4">
        <p className="text-sm text-[color:var(--muted)]">
          <span className="font-semibold text-[color:var(--foreground)]">{totalStores}</span>{" "}
          {totalStores === 1 ? "tienda" : "tiendas"}
        </p>
        {hasFilters ? (
          <Link
            href="/tiendas"
            className="text-sm font-medium text-[var(--accent-strong)] underline-offset-4 hover:underline"
          >
            Limpiar filtros
          </Link>
        ) : null}
      </div>

      <section aria-label="Listado de tiendas" className="mt-4">
        {totalStores === 0 ? (
          hasFilters ? (
            <EmptyState
              illustration="search"
              title="Sin resultados"
              description="No encontramos tiendas con esos criterios. Prueba con otra palabra o cambia de categoría."
              action={{ label: "Limpiar filtros", href: "/tiendas", variant: "primary" }}
            />
          ) : (
            <EmptyState
              illustration="store"
              title="Aún no hay tiendas"
              description="Sé el primero en registrar tu negocio en Mercadito."
              action={{ label: "Registrar mi negocio", href: "/vendor/registro", variant: "primary" }}
            />
          )
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {storesWithProducts.map((store, index) => (
              <StoreCard
                key={store.id}
                store={store}
                animationDelay={Math.min(index, 8) * 50}
                categoryLabel={categoryLookup[store.category]?.label || store.category?.replace(/_/g, " ")}
                categoryIcon={categoryLookup[store.category]?.icon || ""}
                rating={store.rating}
              />
            ))}
          </div>
        )}
      </section>

      <div className="mt-14 border-t border-[var(--border)] pt-8 text-center">
        <p className="text-sm text-[color:var(--muted)]">
          ¿Tienes un negocio?{" "}
          <Link
            href="/vendor/registro"
            className="font-semibold text-[var(--accent-strong)] underline-offset-4 hover:underline"
          >
            Regístralo en Mercadito
          </Link>
        </p>
      </div>
    </main>
  );
}
