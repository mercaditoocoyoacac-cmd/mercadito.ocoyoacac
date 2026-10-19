import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/server/prisma";
import { shimmerBlur } from "@/lib/images";
import { CategoryFilter } from "@/components/ui/CategoryFilter";
import { StoreCardWithProducts } from "@/components/storefront/StoreCardWithProducts";
import { Card, CardContent, Button, Skeleton, SkeletonStoreCard, EmptyState, Badge } from "@/components/ui/design-system";

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

  const validCategory = category && allCategories.some(c => c.key === category) ? category : "";

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
      address: true,
      imageUrl: true,
      plan: true,
      _count: { select: { products: { where: { isActive: true } } } },
    },
  });

  // Sort by actual completed order count
  const completedCounts = await prisma.order.groupBy({
    by: ["storeId"],
    where: { status: "COMPLETED" },
    _count: { id: true },
  });
  const countMap = new Map(completedCounts.map((o) => [o.storeId, o._count.id]));
  stores.sort((a, b) => (countMap.get(b.id) || 0) - (countMap.get(a.id) || 0));

  // Fetch top-selling products for each store (max 5, or all if few products)
  const storesWithProducts = await Promise.all(
    stores.map(async (store) => {
      const products = await prisma.product.findMany({
        where: { storeId: store.id, isActive: true },
        orderBy: [{ soldCount: "desc" }, { createdAt: "desc" }],
        take: 5,
        select: {
          id: true,
          name: true,
          priceCents: true,
          currency: true,
          imageUrl: true,
          isUnavailable: true,
          sellByWeight: true,
          minWeightGrams: true,
          maxWeightGrams: true,
          soldCount: true,
          isPromotion: true,
          promotionPriceCents: true,
          discountPercentage: true,
          variants: {
            where: { isActive: true },
            select: { id: true, name: true, priceCents: true },
            orderBy: { sortOrder: "asc" },
          },
        },
      });
      return { ...store, topProducts: products };
    })
  );

  const categoryLookup = Object.fromEntries(allCategories.map(c => [c.key, c]));

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 lg:py-16">
      {/* Header */}
      <div className="mb-10 lg:mb-12">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">Tiendas en Ocoyoacac</h1>
            <p className="mt-2 text-[color:var(--muted)] max-w-lg">
              {qTrim ? `Resultados para "${qTrim}"` : "Descubre los mejores negocios locales y sus productos frescos."}
            </p>
          </div>
          <Link
            href="/vendor/registro"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[var(--accent)] px-6 py-3 font-semibold text-[var(--on-accent)] shadow-lg transition-all hover:scale-105 hover:bg-[var(--accent-hover)]"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Registrar mi negocio
          </Link>
        </div>

        <form action="/tiendas" method="get" role="search" className="mb-6 flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] px-2 py-1.5 shadow-sm">
          <input type="hidden" name="category" value={validCategory} />
          <label htmlFor="tiendas-search" className="sr-only">
            Busca productos, tiendas o antojitos
          </label>
          <input
            id="tiendas-search"
            name="q"
            defaultValue={q}
            type="search"
            placeholder="Busca productos, tiendas o antojitos..."
            autoComplete="off"
            className="w-full bg-transparent px-3 py-2 text-sm text-[color:var(--foreground)] placeholder-[color:var(--muted)] outline-none focus-visible:outline-none sm:text-base"
          />
          <button type="submit" className="btn-primary px-4 py-2">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span className="hidden sm:inline">Buscar</span>
          </button>
        </form>

        {/* Category Filter */}
        <div className="mb-6">
          <CategoryFilter
            categories={allCategories}
            selected={category}
            baseUrl="/tiendas"
          />
        </div>
      </div>

      {/* Stores Grid */}
      {storesWithProducts.length === 0 ? (
        <EmptyState
          illustration="store"
          title="Aún no hay tiendas"
          description={validCategory 
            ? `No hay tiendas en la categoría "${categoryLookup[validCategory]?.label || validCategory}"` 
            : "Sé el primero en registrar tu negocio en Mercadito."
          }
          action={{ label: "Registrar mi negocio", href: "/vendor/registro", variant: "primary" }}
          secondaryAction={{ label: "Ver todas las categorías", href: "/tiendas", variant: "outline" }}
        />
      ) : (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {storesWithProducts.map((store, i) => (
              <StoreCardWithProducts
                key={store.id}
                store={store}
                animationDelay={i * 60}
                categoryLabel={categoryLookup[store.category]?.label || store.category?.replace(/_/g, " ")}
                categoryIcon={categoryLookup[store.category]?.icon || ""}
              />
            ))}
          </div>

          {/* Stats Bar */}
          <div className="mt-12">
            <Card variant="outlined" className="bg-[var(--surface)]">
              <CardContent className="px-6 py-4">
                <div className="flex flex-wrap items-center justify-center gap-8 text-center">
                  <div>
                    <div className="text-2xl font-bold text-[var(--accent)] lg:text-3xl">{storesWithProducts.length}</div>
                    <div className="text-sm text-[color:var(--muted)]">Tiendas activas</div>
                  </div>
                  <div className="hidden h-8 w-px bg-[var(--border)] lg:block"></div>
                  <div>
                    <div className="text-2xl font-bold text-[var(--accent)] lg:text-3xl">
                      {storesWithProducts.reduce((sum, s) => sum + s._count.products, 0).toLocaleString()}
                    </div>
                    <div className="text-sm text-[color:var(--muted)]">Productos totales</div>
                  </div>
                  <div className="hidden h-8 w-px bg-[var(--border)] lg:block"></div>
                  <div>
                    <div className="text-2xl font-bold text-[var(--accent)] lg:text-3xl">
                      {storesWithProducts.filter(s => s.plan === "MEMBER").length}
                    </div>
                    <div className="text-sm text-[color:var(--muted)]">Con Vende+</div>
                  </div>
                  <div className="hidden h-8 w-px bg-[var(--border)] lg:block"></div>
                  <div>
                    <div className="text-2xl font-bold text-[#0F766E] lg:text-3xl">
                      {storesWithProducts.filter(s => s.plan === "SOLO_DELIVERY").length}
                    </div>
                    <div className="text-sm text-[color:var(--muted)]">Con Solo Delivery</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* CTA Section */}
      <div className="mt-12 rounded-2xl bg-gradient-to-br from-[#14532D] via-[#15803D] to-[#14532D] p-8 text-center text-white lg:mt-16 lg:p-12">
        <h3 className="text-lg font-semibold lg:text-xl">¿Tienes un negocio?</h3>
        <p className="mx-auto mt-2 max-w-2xl text-sm text-[#BBF7D0] lg:text-base">
          Llega a más clientes creando tu tienda en Mercadito. Pregunta por nuestras promociones de registro.
        </p>
        <Link
          href="/vendor/upgrade"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-[#15803D] shadow-lg transition-all hover:scale-105 hover:bg-[#F0FDF4]"
        >
          Crear tienda
        </Link>
      </div>
    </main>
  );
}