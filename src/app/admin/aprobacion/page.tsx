import { redirect } from "next/navigation";
import { prisma } from "@/server/prisma";
import { getSession } from "@/server/session";
import { formatDateInMexico } from "@/lib/dates";

function formatMoney(cents: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(
    cents / 100,
  );
}

export const revalidate = 30;

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
      subscription: { select: { monthlyPriceCents: true, contractSignedAt: true, status: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const trialStores = await prisma.store.findMany({
    where: {
      isApproved: false,
      subscription: {
        status: "TRIAL",
      },
    },
    include: {
      owner: { select: { id: true, name: true, email: true, phone: true } },
      subscription: { select: { startDate: true, endDate: true, status: true, contractSigned: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const today = new Date();
  const activeTrialStores = trialStores.filter(
    (s) => s.subscription && new Date(s.subscription.endDate) > today
  );

  const approvedStores = await prisma.store.findMany({
    where: { isApproved: true },
    include: {
      owner: { select: { id: true, name: true, email: true, phone: true } },
      subscription: { select: { monthlyPriceCents: true, status: true, contractSigned: true, contractSignedAt: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });

  const trialCount = await prisma.subscription.count({
    where: { status: "TRIAL" },
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

      <div className="grid gap-4 sm:grid-cols-4 mb-8">
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-50 p-5">
          <div className="text-sm text-emerald-700">🧪 En prueba</div>
          <div className="mt-1 text-2xl font-semibold text-emerald-700">
            {trialCount}
          </div>
        </div>
        <div className="rounded-xl border border-orange-500/30 bg-orange-50 p-5">
          <div className="text-sm text-orange-700">En espera</div>
          <div className="mt-1 text-2xl font-semibold text-orange-700">
            {pendingStores.length}
          </div>
        </div>
        <div className="rounded-xl border border-blue-500/30 bg-blue-50 p-5">
          <div className="text-sm text-blue-700">Aprobados</div>
          <div className="mt-1 text-2xl font-semibold text-blue-700">
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

      {activeTrialStores.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4 text-emerald-800">
            🧪 Tiendas en prueba gratuita ({activeTrialStores.length})
          </h2>
          <div className="space-y-4">
            {activeTrialStores.map((store) => {
              const sub = store.subscription!;
              const daysLeft = Math.ceil((new Date(sub.endDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

              return (
                <div
                  key={store.id}
                  className="rounded-xl border border-emerald-500/30 bg-emerald-50 p-5"
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
                      {store.owner.phone && (
                        <div className="text-sm text-[color:var(--muted)]">
                          Tel: {store.owner.phone}
                        </div>
                      )}
                      <div className="mt-2 text-sm">
                        <span className="text-emerald-600 font-medium">
                          Prueba gratuita · {daysLeft} días restantes
                        </span>
                        <span className="ml-2 text-[color:var(--muted)]">
                          (vence: {formatDateInMexico(sub.endDate)})
                        </span>
                      </div>
                      {!sub.contractSigned && (
                        <div className="mt-1 text-xs text-orange-600">
                          ⚠ Sin contrato firmado
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
                        Aprobar tienda
                      </button>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
                          Contrato firmado: {formatDateInMexico(store.subscription.contractSignedAt)}
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
                  <th className="px-4 py-3 font-medium">Contrato</th>
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
                      {store.subscription?.contractSigned ? (
                        <span className="text-green-600">
                          ✓ {formatDateInMexico(store.subscription.contractSignedAt)}
                        </span>
                      ) : (
                        <span className="text-orange-600">✗ Sin contrato</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {store.subscription?.status === "TRIAL" ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs text-emerald-700">
                          🧪 Prueba
                        </span>
                      ) : (
                        <span className="rounded-full bg-green-100 px-2 py-1 text-xs text-green-700">
                          Activo
                        </span>
                      )}
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