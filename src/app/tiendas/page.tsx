import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/server/prisma";

export const revalidate = 60;

const STORES_PER_PAGE = 12;

const CATEGORIES = [
  { key: "", label: "Todas" },
  { key: "CANASTA_BASICA", label: "Canasta básica" },
  { key: "HERRAMIENTAS", label: "Herramientas" },
  { key: "FLORERIAS", label: "Florerías" },
  { key: "POSTRES", label: "Postres" },
  { key: "COMIDA_PREPARADA", label: "Comida preparada" },
  { key: "FRUTAS_VERDURAS", label: "Frutas y verduras" },
  { key: "FARMACIAS", label: "Farmacias" },
  { key: "SERVICIOS", label: "Servicios" },
] as const;

const CATEGORY_ICONS: Record<string, string> = {
  CANASTA_BASICA: "🛒",
  HERRAMIENTAS: "🔧",
  FLORERIAS: "💐",
  POSTRES: "🍰",
  COMIDA_PREPARADA: "🍲",
  FRUTAS_VERDURAS: "🥬",
  FARMACIAS: "💊",
  SERVICIOS: "📋",
};

export default async function TiendasPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; category?: string }>;
}) {
  const params = await searchParams;
  const page = parseInt(params?.page || "1");
  const category = params?.category || "";
  const skip = (page - 1) * STORES_PER_PAGE;

  const validCategory = category && CATEGORIES.some(c => c.key === category) ? category : "";

  const [stores, total] = await Promise.all([
    prisma.store.findMany({
      where: {
        isActive: true,
        isPublished: true,
        ...(validCategory ? { category: validCategory as any } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: STORES_PER_PAGE,
      skip,
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
          select: { id: true }
        }
      },
    }),
    prisma.store.count({
      where: {
        isActive: true,
        isPublished: true,
        ...(validCategory ? { category: validCategory as any } : {}),
      },
    }),
  ]);

  const totalPages = Math.ceil(total / STORES_PER_PAGE);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight">
          Tiendas en Ocoyoacac
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-[color:var(--muted)]">
          Descubre los mejores negocios locales y sus productos frescos.
        </p>
      </div>

      <div className="mb-8 flex flex-wrap justify-center gap-2">
        {CATEGORIES.map((cat) => (
          <Link
            key={cat.key}
            href={`/tiendas${cat.key ? `?category=${cat.key}` : ""}`}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              category === cat.key
                ? "bg-[var(--accent)] text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {CATEGORY_ICONS[cat.key] || ""} {cat.label}
          </Link>
        ))}
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
              href={`/tienda/${store.slug}`}
              className="group rounded-2xl border border-[var(--border)] bg-white overflow-hidden shadow-sm transition-all hover:shadow-lg hover:-translate-y-1"
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
                      {CATEGORY_ICONS[store.category] || ""} {store.category.replace(/_/g, " ").toLowerCase()}
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

      {totalPages > 1 && (
        <div className="mt-8 flex justify-center gap-2">
          {page > 1 && (
            <Link
              href={`/tiendas?page=${page - 1}${validCategory ? `&category=${validCategory}` : ""}`}
              className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm hover:bg-gray-100"
            >
              Anterior
            </Link>
          )}
          <span className="px-4 py-2 text-sm text-[color:var(--muted)]">
            {page} / {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={`/tiendas?page=${page + 1}${validCategory ? `&category=${validCategory}` : ""}`}
              className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm hover:bg-gray-100"
            >
              Siguiente
            </Link>
          )}
        </div>
      )}

      <div className="mt-12 rounded-2xl bg-[var(--accent-soft)] p-8 text-center">
        <h3 className="text-lg font-semibold">¿Tienes un negocio?</h3>
        <p className="mt-2 text-sm text-[color:var(--muted)]">
          Llega a más clientes creando tu tienda en Mercadito ($496/mes).
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
