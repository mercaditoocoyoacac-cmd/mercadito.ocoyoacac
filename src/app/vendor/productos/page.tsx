import Link from "next/link";
import { prisma } from "@/server/prisma";
import { getSession } from "@/server/session";

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
        <Link
          href="/vendor/productos/nuevo"
          className="inline-flex rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
        >
          Nuevo producto
        </Link>
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
                <th className="px-4 py-3 font-medium">Precio</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-t border-[var(--border)]">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {p.imageUrl && (
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md border border-[var(--border)]">
                          <img
                            src={p.imageUrl}
                            alt={p.name}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      )}
                      <span className={!p.imageUrl ? "ml-10" : ""}>
                        {p.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {formatMoney(p.priceCents, p.currency)}
                  </td>
                  <td className="px-4 py-3">
                    {p.isActive ? "Activo" : "Inactivo"}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/vendor/productos/${p.id}`}
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
