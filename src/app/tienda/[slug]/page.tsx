import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/server/prisma";
import { AddToCartButton } from "@/components/AddToCartButton";
import { isStoreOpen } from "@/lib/schedule";

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency }).format(
    cents / 100,
  );
}

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

  const open = isStoreOpen(store);

  const products = await prisma.product.findMany({
    where: { storeId: store.id, isActive: true },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      description: true,
      priceCents: true,
      currency: true,
      imageUrl: true,
    },
  });

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          {store.imageUrl && (
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-[var(--border)]">
              <img
                src={store.imageUrl}
                alt={store.name}
                className="h-full w-full object-cover"
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
        <Link
          href="/carrito"
          className="inline-flex shrink-0 rounded-md border border-[var(--border)] px-4 py-2 text-sm font-medium hover:bg-[var(--accent-soft)]"
        >
          Ir al carrito
        </Link>
      </div>

      {products.length === 0 ? (
        <div className="mt-6 rounded-xl border border-[var(--border)] p-5">
          <div className="font-medium">Aún no hay productos</div>
          <div className="mt-1 text-sm text-[color:var(--muted)]">
            Vuelve pronto.
          </div>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((product: typeof products[number]) => (
            <div
              key={product.id}
              className="rounded-xl border border-[var(--border)] overflow-hidden bg-white"
            >
              {product.imageUrl && (
                <div className="h-36 overflow-hidden bg-[var(--accent-soft)]">
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
              <div className="p-3">
                <div className="text-sm font-semibold truncate">{product.name}</div>
                <div className="text-sm font-semibold text-[var(--accent)]">
                  {formatMoney(product.priceCents, product.currency)}
                </div>
                <div className="mt-2">
                  <AddToCartButton productId={product.id} disabled={!open} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
