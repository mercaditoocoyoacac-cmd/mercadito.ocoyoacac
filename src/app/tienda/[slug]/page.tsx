import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/server/prisma";
import { AddToCartButton } from "@/components/storefront/AddToCartButton";
import { ProductImageModal } from "@/components/storefront/ProductImageModal";
import { isStoreOpen } from "@/lib/schedule";
import { formatMoney } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function StorefrontPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const store = await prisma.store.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      category: true,
      description: true,
      phone: true,
      address: true,
      imageUrl: true,
      isActive: true,
      openTime: true,
      closeTime: true,
      scheduleDays: true,
    },
  });
  if (!store || !store.isActive) return notFound();

  const open = store.category === "SERVICIOS" ? true : isStoreOpen(store);

  const products = await prisma.product.findMany({
    where: { storeId: store.id, isActive: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      name: true,
      description: true,
      priceCents: true,
      currency: true,
      imageUrl: true,
      isUnavailable: true,
      sellByWeight: true,
      minWeightGrams: true,
      maxWeightGrams: true,
      variants: {
        where: { isActive: true },
        select: { id: true, name: true, priceCents: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          {store.imageUrl && (
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-[var(--border)]">
              <Image
                src={store.imageUrl}
                alt={store.name}
                fill
                className="object-cover"
                sizes="80px"
                priority
              />
            </div>
          )}
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">{store.name}</h1>
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${open ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${open ? "bg-green-500" : "bg-red-500"}`}></span>
                {open ? "Abierto" : "Cerrado"}
              </span>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--accent-soft)] px-2.5 py-0.5 text-xs font-medium text-[var(--accent)]">
              {store.category?.replace(/_/g, " ").toLowerCase()}
            </span>
            {store.description ? (
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[color:var(--muted)]">
                {store.description}
              </p>
            ) : null}
            <div className="mt-3 flex flex-col gap-1 text-xs text-[color:var(--muted)]">
              {store.address ? <div>{store.address}</div> : null}
              {store.phone ? <div>{store.phone}</div> : null}
              {store.openTime && store.closeTime && (
                <div className="flex items-center gap-1 mt-1">
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {store.openTime} – {store.closeTime}
                </div>
              )}
            </div>
          </div>
        </div>
        {store.category === "SERVICIOS" ? (
          store.phone ? (
            <a
              href={`https://wa.me/${store.phone.replace(/\D/g, "")}?text=Hola%2C%20me%20gustaría%20agendar%20una%20cita%20en%20${encodeURIComponent(store.name)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
              </svg>
              Solicitar cita
            </a>
          ) : (
            <div className="inline-flex shrink-0 items-center gap-2 rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-500">
              Teléfono no disponible
            </div>
          )
        ) : (
          <Link
            href="/carrito"
            className="inline-flex shrink-0 rounded-md border border-[var(--border)] px-4 py-2 text-sm font-medium hover:bg-[var(--accent-soft)]"
          >
            Ir al carrito
          </Link>
        )}
      </div>

      {products.length === 0 ? (
        <div className="mt-6 rounded-xl border border-[var(--border)] p-5">
          <div className="font-medium">
            {store.category === "SERVICIOS" ? "Aún no hay servicios" : "Aún no hay productos"}
          </div>
          <div className="mt-1 text-sm text-[color:var(--muted)]">
            {store.category === "SERVICIOS"
              ? "Este negocio aún no ha publicado sus servicios."
              : "Vuelve pronto."}
          </div>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((product: typeof products[number], i: number) => (
            <div
              key={product.id}
              style={{ animationDelay: `${i * 60}ms` }}
              className={`rounded-xl border border-[var(--border)] overflow-hidden bg-white card-hover fade-in ${
                product.isUnavailable ? "opacity-60" : ""
              }`}
            >
              {product.imageUrl && (
                <ProductImageModal src={product.imageUrl} alt={product.name}>
                  <div className="relative h-36 overflow-hidden bg-[var(--accent-soft)]">
                    <Image
                      src={product.imageUrl}
                      alt={product.name}
                      fill
                      className="object-cover transition-transform duration-300 hover:scale-110"
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      priority={i < 8}
                    />
                  </div>
                </ProductImageModal>
              )}
              <div className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-sm font-semibold truncate">{product.name}</div>
                  {product.isUnavailable && (
                    <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700">
                      No disponible
                    </span>
                  )}
                </div>
                <div className="text-sm font-semibold text-[var(--accent)]">
                  {product.sellByWeight
                    ? `${formatMoney(product.priceCents, product.currency)} / kg`
                    : product.variants?.length > 0
                    ? `Desde ${formatMoney(Math.min(...product.variants.map((v) => v.priceCents), product.priceCents), product.currency)}`
                    : formatMoney(product.priceCents, product.currency)}
                </div>
                <div className="mt-2">
                  {store.category === "SERVICIOS" ? (
                    store.phone ? (
                      <a
                        href={`https://wa.me/${store.phone.replace(/\D/g, "")}?text=Hola%2C%20me%20gustaría%20agendar%20una%20cita%20para%20${encodeURIComponent(product.name)}%20en%20${encodeURIComponent(store.name)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                          product.isUnavailable
                            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                            : "bg-green-600 text-white hover:bg-green-700"
                        }`}
                      >
                        Agendar cita
                      </a>
                    ) : (
                      <span className="rounded-md bg-gray-300 px-3 py-1.5 text-xs font-medium text-gray-500">
                        Tel. no disponible
                      </span>
                    )
                  ) : (
                    <AddToCartButton
                      productId={product.id}
                      variants={product.variants}
                      sellByWeight={product.sellByWeight}
                      minWeightGrams={product.minWeightGrams}
                      maxWeightGrams={product.maxWeightGrams}
                      priceCents={product.priceCents}
                      disabled={!open || product.isUnavailable}
                      disabledLabel={product.isUnavailable ? "Agotado" : !open ? "Tienda cerrada" : undefined}
                    />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
