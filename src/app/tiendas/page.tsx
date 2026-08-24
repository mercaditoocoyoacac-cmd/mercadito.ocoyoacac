import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/server/prisma";
import { shimmerBlur } from "@/lib/images";
import { CategoryFilter } from "@/components/ui/CategoryFilter";
import { StoreCardWithProducts } from "@/components/storefront/StoreCardWithProducts";

export const dynamic = "force-dynamic";

export default async function TiendasPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const params = await searchParams;
  const category = params?.category || "";

  const allCategories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    select: { key: true, label: true, icon: true },
  });

  const validCategory = category && allCategories.some(c => c.key === category) ? category : "";

  const stores = await prisma.store.findMany({
    where: {
      isActive: true,
      isPublished: true,
      ...(validCategory ? { category: validCategory } : {}),
    },
    select: { 
      id: true, 
      name: true, 
      slug: true, 
      category: true,
      description: true, 
      address: true,
      imageUrl: true,
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
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 fade-in">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight">
          Tiendas en Ocoyoacac
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-[color:var(--muted)]">
          Descubre los mejores negocios locales y sus productos frescos.
        </p>
      </div>

      <div className="mb-6">
        <CategoryFilter
          categories={allCategories}
          selected={category}
          baseUrl="/tiendas"
        />
      </div>

      {storesWithProducts.length === 0 ? (
        <div className="rounded-2xl border border-[var(--border)] bg-white p-12 text-center shadow-sm">
          <div className="mx-auto h-16 w-16 rounded-full bg-[var(--accent-soft)] flex items-center justify-center mb-4">
            <svg className="h-8 w-8 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold">Aún no hay tiendas</h2>
          <p className="mt-2 text-[color:var(--muted)]">
            Sé el primero en registrar tu negocio en Mercadito.
          </p>
          <div className="mt-6">
            <Link
              href="/vendor/registro"
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-6 py-3 font-semibold text-white shadow-lg transition-transform hover:scale-105 hover:bg-[var(--accent-hover)]"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Registrar mi negocio
            </Link>
          </div>
        </div>
      ) : (
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
      )}

      <div className="mt-12 rounded-2xl bg-[var(--accent-soft)] p-8 text-center">
        <h3 className="text-lg font-semibold">¿Tienes un negocio?</h3>
        <p className="mt-2 text-sm text-[color:var(--muted)]">
          Llega a más clientes creando tu tienda en Mercadito. Pregunta por nuestras promociones de registro.
        </p>
        <Link
          href="/vendor/upgrade"
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-6 py-2.5 text-sm font-semibold text-white transition-transform hover:scale-105 hover:bg-[var(--accent-hover)]"
        >
          Crear tienda
        </Link>
      </div>
    </main>
  );
}
