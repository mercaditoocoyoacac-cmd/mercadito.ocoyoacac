import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/server/prisma";
import { shimmerBlur } from "@/lib/images";
import { CategoryFilter } from "@/components/ui/CategoryFilter";

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
      products: {
        where: { isActive: true },
        select: { id: true, soldCount: true }
      }
    },
  });

  stores.sort((a, b) => {
    const aSales = a.products.reduce((sum, p) => sum + p.soldCount, 0);
    const bSales = b.products.reduce((sum, p) => sum + p.soldCount, 0);
    return bSales - aSales;
  });

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

      {stores.length === 0 ? (
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
          {stores.map((store: typeof stores[number], i: number) => (
            <Link
              key={store.id}
              style={{ animationDelay: `${i * 60}ms` }}
              href={`/tienda/${store.slug}`}
              className="group rounded-2xl border border-[var(--border)] bg-white overflow-hidden shadow-sm transition-all hover:shadow-lg hover:-translate-y-1 fade-in"
            >
              <div className="relative aspect-video bg-gradient-to-br from-[var(--accent-soft)] to-[var(--accent)] flex items-center justify-center">
                {store.imageUrl ? (
                  <Image
                    src={store.imageUrl}
                    alt={store.name}
                    fill
                    className="object-cover p-4 rounded-xl"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    priority={i < 6}
                    placeholder="blur"
                    blurDataURL={shimmerBlur}
                  />
                ) : (
                  <div className="h-20 w-20 rounded-full bg-white/50 flex items-center justify-center text-3xl font-bold text-[var(--accent)]">
                    {store.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-lg font-semibold group-hover:text-[var(--accent)] transition-colors">
                    {store.name}
                  </h3>
                  {store.category && (
                    <span className="shrink-0 rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] font-medium text-[var(--accent)]">
                      {categoryLookup[store.category]?.icon || ""} {categoryLookup[store.category]?.label || store.category.replace(/_/g, " ")}
                    </span>
                  )}
                </div>
                {store.description ? (
                  <p className="mt-2 text-sm text-[color:var(--muted)] line-clamp-2">
                    {store.description}
                  </p>
                ) : null}
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-[color:var(--muted)]">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                    {store.products.length} productos
                  </div>
                  {store.address ? (
                    <div className="flex items-center gap-1 text-xs text-[color:var(--muted)]">
                      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {store.address}
                    </div>
                  ) : null}
                </div>
              </div>
            </Link>
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
