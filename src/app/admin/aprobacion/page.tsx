import { redirect } from "next/navigation";
import { prisma } from "@/server/prisma";
import { getSession } from "@/server/session";

function formatMoney(cents: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(
    cents / 100,
  );
}

export const dynamic = "force-dynamic";

export default async function AdminAprobarVendedoresPage() {
  const session = await getSession();

  if (!session?.user?.id || session.user.role !== "ADMIN") {
    redirect("/admin/login");
  }

  const pendingStores = await prisma.store.findMany({
    where: {
      isApproved: false,
      subscription: {
        contractSigned: true,
      },
    },
    include: {
      owner: { select: { id: true, name: true, email: true, phone: true } },
      subscription: { select: { monthlyPriceCents: true, contractSignedAt: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const approvedStores = await prisma.store.findMany({
    where: { isApproved: true },
    include: {
      owner: { select: { id: true, name: true, email: true, phone: true } },
      subscription: { select: { monthlyPriceCents: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 20,
  });

  const activeCount = await prisma.subscription.count({
    where: { status: "ACTIVE" },
  });

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">
          Aprobación de Vendedores
        </h1>
        <p className="mt-1 text-sm text-[color:var(--muted)]">
          Aprueba o rechaza solicitudes de vendedores
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        <div className="rounded-xl border border-[var(--border)] p-5">
          <div className="text-sm text-[color:var(--muted)]">En espera</div>
          <div className="mt-1 text-2xl font-semibold">
            {pendingStores.length}
          </div>
        </div>
        <div className="rounded-xl border border-[var(--border)] p-5">
          <div className="text-sm text-[color:var(--muted)]">Aprobados</div>
          <div className="mt-1 text-2xl font-semibold">
            {approvedStores.length}
          </div>
        </div>
        <div className="rounded-xl border border-green-500/30 bg-green-50 p-5">
          <div className="text-sm text-green-700">Suscripciones activas</div>
          <div className="mt-1 text-2xl font-semibold text-green-700">
            {activeCount}
          </div>
        </div>
      </div>

      {pendingStores.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Solicitudes pendientes</h2>
          <div className="space-y-4">
            {pendingStores.map((store) => (
              <div
                key={store.id}
                className="rounded-xl border border-orange-500/30 bg-orange-50 p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="font-semibold">{store.name}</div>
                    <div className="text-sm text-[color:var(--muted)]">
                      {store.owner.name || store.owner.email}
                    </div>
                    <div className="text-sm text-[color:var(--muted)]">
                      {store.owner.email}
                    </div>
                    {store.phone && (
                      <div className="text-sm text-[color:var(--muted)]">
                        Tel: {store.phone}
                      </div>
                    )}
                    {store.subscription && (
                      <div className="mt-2 text-sm">
                        <span className="text-green-600">
                          Contrato firmado: {store.subscription.contractSignedAt?.toLocaleDateString("es-MX")}
                        </span>
                        <span className="ml-3">
                          {formatMoney(store.subscription.monthlyPriceCents)}/mes
                        </span>
                      </div>
                    )}
                  </div>
                  <form
                    action={async () => {
                      "use server";
                      await prisma.store.update({
                        where: { id: store.id },
                        data: { isApproved: true, isPublished: true },
                      });
                    }}
                  >
                    <button className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">
                      Aprobar
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {pendingStores.length === 0 && (
        <div className=" rounded-xl border border-[var(--border)] p-8 text-center">
          <div className="text-lg font-medium">No hay solicitudes pendientes</div>
          <p className="mt-1 text-sm text-[color:var(--muted)]">
            Los nuevos vendedores aparecerán aquí después de firmar el contrato
          </p>
        </div>
      )}

      {approvedStores.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-4">Vendedores aprobados</h2>
          <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--accent-soft)]">
                <tr>
                  <th className="px-4 py-3 font-medium">Tienda</th>
                  <th className="px-4 py-3 font-medium">Propietario</th>
                  <th className="px-4 py-3 font-medium">Precio</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {approvedStores.map((store) => (
                  <tr key={store.id} className="border-t border-[var(--border)]">
                    <td className="px-4 py-3 font-medium">{store.name}</td>
                    <td className="px-4 py-3">{store.owner.name || store.owner.email}</td>
                    <td className="px-4 py-3">
                      {store.subscription
                        ? formatMoney(store.subscription.monthlyPriceCents)
                        : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-green-100 px-2 py-1 text-xs text-green-700">
                        Activo
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}