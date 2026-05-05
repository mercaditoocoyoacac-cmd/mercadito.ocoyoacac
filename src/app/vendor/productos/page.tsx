import Link from "next/link";
import { prisma } from "@/server/prisma";
import { getSession } from "@/server/session";
import { StockToggle } from "@/components/StockToggle";

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

export default async function VendorProductosPage() {
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

  const products = await prisma.product.findMany({
    where: { storeId: store.id },
    orderBy: { createdAt: "desc" },
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
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Productos</h1>
          <p className="mt-1 text-sm text-[color:var(--muted)]">
            {store.name} ·{" "}
            <Link className="underline" href={`/tienda/${store.slug}`}>
              ver storefront
            </Link>
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/vendor/productos/importar"
            className="inline-flex rounded-md border border-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent)] hover:bg-[var(--accent-soft)]"
          >
            Importar CSV
          </Link>
          <Link
            href="/vendor/productos/nuevo"
            className="inline-flex rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
          >
            Nuevo producto
          </Link>
        </div>
      </div>

      {products.length === 0 ? (
        <div className="rounded-xl border border-[var(--border)] p-5">
          <div className="font-medium">Aún no tienes productos</div>
          <div className="mt-1 text-sm text-[color:var(--muted)]">
            Crea tu primer producto para empezar a vender.
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--border)]">
          <table className="w-full text-left text-sm">
            <thead className="bg-[var(--accent-soft)]">
              <tr>
                <th className="px-4 py-3 font-medium">Producto</th>
                <th className="px-4 py-3 font-medium">SKU</th>
                <th className="px-4 py-3 font-medium">Precio</th>
                <th className="px-4 py-3 font-medium">Exist.</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Agotado</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {products.map((product: typeof products[number]) => (
                <tr key={product.id} className="border-t border-[var(--border)]">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {product.imageUrl && (
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md border border-[var(--border)]">
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      )}
                      <span className={!product.imageUrl ? "ml-10" : ""}>
                        {product.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-[color:var(--muted)]">
                    {product.sku || "-"}
                  </td>
                  <td className="px-4 py-3">
                    {formatMoney(product.priceCents, product.currency)}
                  </td>
                  <td className="px-4 py-3">
                    {product.stock === -1 ? (
                      <span className="text-[color:var(--muted)]">Sin control</span>
                    ) : product.stock === 0 ? (
                      <span className="text-red-600 font-medium">Agotado</span>
                    ) : product.stock !== null && product.stock <= 5 ? (
                      <span className="text-amber-600 font-medium">{product.stock}</span>
                    ) : (
                      <span>{product.stock}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {product.isActive ? (
                      <span className="text-green-600">Activo</span>
                    ) : (
                      <span className="text-red-600">Inactivo</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StockToggle productId={product.id} initial={product.isUnavailable} />
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/vendor/productos/${product.id}`}
                      className="text-[color:var(--accent)] hover:underline"
                    >
                      Editar
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
