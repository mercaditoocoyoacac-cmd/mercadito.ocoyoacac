import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/server/prisma";
import { getSession } from "@/server/session";
import { StockToggle } from "@/components/storefront/StockToggle";
import { VendorSortControlsWrapper } from "./SortControlsWrapper";
import { formatMoney } from "@/lib/format";
import { ReorderForm } from "./ReorderForm";

type SortMode = "date" | "name" | "manual";

export default async function VendorProductosPage({
  searchParams: searchParamsPromise,
}: {
  searchParams: Promise<{ sort?: string; dir?: string }>;
}) {
  const searchParams = await searchParamsPromise;
  const sortParam = (searchParams.sort || "date") as SortMode;
  const dirParam = searchParams.dir === "asc" ? "asc" : "desc";
  const isManual = sortParam === "manual";

  const session = await getSession();
  const userId = session!.user.id;

  const store = await prisma.store.findFirst({
    where: { ownerId: userId },
    select: { id: true, slug: true, name: true },
  });

  if (!store) {
    return (
      <div className="rounded-xl border border-[var(--border)] p-5">
        <div className="font-medium">Primero crea tu tienda</div>
        <div className="mt-1 text-sm text-[color:var(--muted)]">
          Necesitas una tienda para poder publicar productos.
        </div>
        <div className="mt-4">
          <Link
            href="/vendor/onboarding"
            className="inline-flex rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
          >
            Crear mi tienda
          </Link>
        </div>
      </div>
    );
  }

  function getOrderBy(s: SortMode, d: "asc" | "desc") {
    if (s === "manual") return { sortOrder: d } as const;
    if (s === "name") return { name: d } as const;
    return { createdAt: d } as const;
  }

  const products = await prisma.product.findMany({
    where: { storeId: store.id },
    orderBy: getOrderBy(sortParam, dirParam === "asc" ? "asc" : "desc"),
    select: {
      id: true,
      name: true,
      priceCents: true,
      currency: true,
      imageUrl: true,
      isActive: true,
      sku: true,
      stock: true,
      isUnavailable: true,
      sellByWeight: true,
      sortOrder: true,
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Productos</h1>
          <p className="mt-1 text-sm text-[color:var(--muted)]">
            {store.name} ·
            <Link className="underline ml-1" href={`/tienda/${store.slug}`}>
              ver tienda
            </Link>
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/vendor/productos/importar"
            className="inline-flex items-center gap-1.5 rounded-md border border-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent)] hover:bg-[var(--accent-soft)]"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
            </svg>
            Importar
          </Link>
          <Link
            href="/vendor/productos/nuevo"
            data-coach="new-product"
            className="inline-flex items-center gap-1.5 rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Nuevo
          </Link>
        </div>
      </div>

      <VendorSortControlsWrapper mode={sortParam} dir={dirParam} isManual={isManual} />

      {isManual ? (
        <ReorderForm products={products as unknown as Parameters<typeof ReorderForm>[0]["products"]} />
      ) : products.length === 0 ? (
        <div className="rounded-xl border border-[var(--border)] p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent-soft)]">
            <svg className="h-8 w-8 text-[var(--muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <div className="mt-4 font-medium">Aún no tienes productos</div>
          <div className="mt-1 text-sm text-[color:var(--muted)]">
            Crea tu primer producto para empezar a vender.
          </div>
          <div className="mt-6">
            <Link
              href="/vendor/productos/nuevo"
              className="inline-flex items-center gap-1.5 rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Crear primer producto
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product: typeof products[number], i: number) => (
              <div
                key={product.id}
                style={{ animationDelay: `${i * 60}ms` }}
                className="group rounded-xl border border-[var(--border)] bg-white p-4 card-hover fade-in"
              >
                <Link href={`/vendor/productos/${product.id}`} className="block">
                  <div className="flex items-start gap-4">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[var(--border)] bg-gray-50">
                      {product.imageUrl ? (
                        <Image
                          src={product.imageUrl}
                          alt={product.name}
                          width={64}
                          height={64}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <svg className="h-8 w-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate group-hover:text-[var(--accent)]">
                        {product.name}
                      </div>
                      <div className="mt-0.5 text-lg font-semibold">
                        {formatMoney(product.priceCents, product.currency)}
                      </div>
                      {(product as { sellByWeight?: boolean }).sellByWeight && (
                        <div className="text-xs text-[color:var(--muted)]">/ kg · venta por peso</div>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                      product.isActive
                        ? "bg-green-50 text-green-700"
                        : "bg-red-50 text-red-700"
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${
                        product.isActive ? "bg-green-500" : "bg-red-500"
                      }`} />
                      {product.isActive ? "Activo" : "Inactivo"}
                    </span>
                    {product.stock === -1 ? (
                      <span className="text-xs text-[color:var(--muted)]">Sin control</span>
                    ) : product.stock === 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                        Agotado
                      </span>
                    ) : product.stock <= 5 ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                        {product.stock} uds
                      </span>
                    ) : (
                      <span className="text-xs text-[color:var(--muted)]">{product.stock} uds</span>
                    )}
                  </div>

                  {product.sku && (
                    <div className="mt-2 font-mono text-xs text-[color:var(--muted)]">
                      SKU: {product.sku}
                    </div>
                  )}
                </Link>

                <div className="mt-3 flex items-center justify-between border-t border-[var(--border)] pt-3">
                  <StockToggle productId={product.id} initial={product.isUnavailable} />
                  <Link href={`/vendor/productos/${product.id}`} className="text-xs text-[var(--accent)] opacity-0 transition-opacity group-hover:opacity-100">
                    Editar &rarr;
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
