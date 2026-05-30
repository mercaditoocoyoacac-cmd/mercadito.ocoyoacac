import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/server/prisma";
import { getSession } from "@/server/session";
import { formatDateInMexico } from "@/lib/dates";
import { EmptyState } from "@/components/ui/EmptyState";

export const revalidate = 30;

export default async function AdminContractsPage() {
  const session = await getSession();

  if (!session?.user?.id || session.user.role !== "ADMIN") {
    redirect("/");
  }

  const stores = await prisma.store.findMany({
    where: {
      subscription: {
        contractSigned: true,
      },
    },
    include: {
      owner: {
        select: {
          id: true,
          email: true,
          name: true,
          ineFrontUrl: true,
          ineBackUrl: true,
          ineNumber: true,
        },
      },
      subscription: {
        select: {
          status: true,
          contractSignedAt: true,
          contractPdfUrl: true,
          monthlyPriceCents: true,
          startDate: true,
          endDate: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">
          Contratos Firmados
        </h1>
        <p className="mt-1 text-sm text-[color:var(--muted)]">
          Revisa contratos y identificaciones de vendedores
        </p>
      </div>

      {stores.length === 0 ? (
        <EmptyState
          icon={
            <svg className="h-8 w-8 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
          title="No hay contratos firmados"
          description="Los contratos aparecerán aquí cuando los vendedores los firmen."
        />
      ) : (
        <div className="space-y-6">
          {stores.map((store) => {
            const sub = store.subscription!;
            const owner = store.owner;

            return (
              <div key={store.id} className="rounded-xl border border-[var(--border)] overflow-hidden">
                <div className="border-b border-[var(--border)] px-5 py-4 flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold">{store.name}</h2>
                    <p className="text-sm text-[color:var(--muted)]">
                      {owner.name || owner.email} &middot; {owner.email}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className={`text-xs px-2 py-1 rounded-full ${
                      sub.status === "TRIAL" ? "bg-emerald-100 text-emerald-800" :
                      sub.status === "ACTIVE" ? "bg-blue-100 text-blue-800" :
                      "bg-red-100 text-red-800"
                    }`}>
                      {sub.status === "TRIAL" ? "Prueba" :
                       sub.status === "ACTIVE" ? "Activa" : sub.status}
                    </div>
                    <p className="text-xs text-[color:var(--muted)] mt-1">
                      Firmado: {formatDateInMexico(sub.contractSignedAt)}
                    </p>
                  </div>
                </div>

                <div className="p-5 space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold mb-2">Contrato PDF</h3>
                    {sub.contractPdfUrl ? (
                      <div className="rounded-lg border border-[var(--border)] overflow-hidden">
                        <iframe
                          src={`data:application/pdf;base64,${sub.contractPdfUrl}`}
                          className="w-full h-96"
                          title={`Contrato - ${store.name}`}
                        />
                      </div>
                    ) : (
                      <p className="text-sm text-[color:var(--muted)]">Sin PDF disponible</p>
                    )}
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold mb-2">Identificaci&oacute;n oficial</h3>
                    {owner.ineNumber && (
                      <p className="text-sm text-[color:var(--muted)] mb-3">
                        N&uacute;mero de credencial: <span className="font-mono font-medium">{owner.ineNumber}</span>
                      </p>
                    )}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="text-xs font-medium mb-1">Frente</p>
                        {owner.ineFrontUrl ? (
                          <img
                            src={owner.ineFrontUrl}
                            alt="INE frente"
                            className="w-full rounded-lg border border-[var(--border)]"
                          />
                        ) : (
                          <div className="h-48 rounded-lg border border-[var(--border)] bg-gray-50 flex items-center justify-center text-[color:var(--muted)]">
                            Sin imagen
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-medium mb-1">Reverso</p>
                        {owner.ineBackUrl ? (
                          <img
                            src={owner.ineBackUrl}
                            alt="INE reverso"
                            className="w-full rounded-lg border border-[var(--border)]"
                          />
                        ) : (
                          <div className="h-48 rounded-lg border border-[var(--border)] bg-gray-50 flex items-center justify-center text-[color:var(--muted)]">
                            Sin imagen
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    {!store.isApproved && (
                      <form action={async () => {
                        "use server";
                        await prisma.store.update({
                          where: { id: store.id },
                          data: { isApproved: true, isPublished: true },
                        });
                        revalidatePath("/admin/contratos");
                      }}>
                        <button className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">
                          Aprobar tienda
                        </button>
                      </form>
                    )}
                    {store.isApproved && (
                      <form action={async () => {
                        "use server";
                        await prisma.store.update({
                          where: { id: store.id },
                          data: { isApproved: false },
                        });
                        revalidatePath("/admin/contratos");
                      }}>
                        <button className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">
                          Revocar aprobaci&oacute;n
                        </button>
                      </form>
                    )}
                    <form action={async () => {
                      "use server";
                      const endDate = new Date();
                      endDate.setMonth(endDate.getMonth() + 1);
                      await prisma.subscription.update({
                        where: { storeId: store.id },
                        data: { status: "ACTIVE", endDate },
                      });
                      revalidatePath("/admin/contratos");
                    }}>
                      <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                        Activar membres&iacute;a
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
