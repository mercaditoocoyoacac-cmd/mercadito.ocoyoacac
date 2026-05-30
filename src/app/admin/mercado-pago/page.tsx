import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/server/prisma";
import { getSession } from "@/server/session";

export const revalidate = 30;

async function approvePaymentMethod(methodId: string, storeId: string) {
  "use server";
  const session = await getSession();
  if (!session?.user?.id || session.user.role !== "ADMIN") return;

  await prisma.storePaymentMethod.update({
    where: { id: methodId },
    data: { status: "APPROVED", isActive: true },
  });

  await prisma.store.update({
    where: { id: storeId },
    data: { acceptsMercadoPago: true },
  });

  revalidatePath("/admin/mercado-pago");
}

async function rejectPaymentMethod(methodId: string) {
  "use server";
  const session = await getSession();
  if (!session?.user?.id || session.user.role !== "ADMIN") return;

  await prisma.storePaymentMethod.update({
    where: { id: methodId },
    data: { status: "REJECTED", isActive: false },
  });

  revalidatePath("/admin/mercado-pago");
}

export default async function AdminPaymentMethodsPage() {
  const session = await getSession();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    redirect("/");
  }

  const pendingMethods = await prisma.storePaymentMethod.findMany({
    where: { status: "PENDING" },
    select: {
      id: true,
      processor: true,
      label: true,
      store: {
        select: { id: true, name: true, owner: { select: { email: true, name: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const approvedMethods = await prisma.storePaymentMethod.findMany({
    where: { status: "APPROVED" },
    select: {
      id: true,
      processor: true,
      label: true,
      store: {
        select: { name: true, owner: { select: { email: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">
          Métodos de pago - Solicitudes
        </h1>
        <p className="mt-1 text-sm text-[color:var(--muted)]">
          Aprueba o rechaza solicitudes de tiendas que quieren aceptar pagos en línea.
        </p>
      </div>

      <div className="rounded-xl border border-[var(--border)] mb-8">
        <div className="border-b border-[var(--border)] px-5 py-4">
          <h2 className="font-semibold">Solicitudes pendientes ({pendingMethods.length})</h2>
        </div>
        {pendingMethods.length === 0 ? (
          <div className="p-5 text-center text-sm text-[color:var(--muted)]">
            No hay solicitudes pendientes.
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {pendingMethods.map((method) => (
              <div key={method.id} className="px-5 py-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium">{method.store.name}</div>
                    <div className="text-sm text-[color:var(--muted)]">
                      {method.store.owner.name || method.store.owner.email}
                    </div>
                    <div className="text-xs text-[color:var(--muted)]">
                      Procesador: {method.label}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <form action={approvePaymentMethod.bind(null, method.id, method.store.id)}>
                      <button className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700">
                        Aprobar
                      </button>
                    </form>
                    <form action={rejectPaymentMethod.bind(null, method.id)}>
                      <button className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700">
                        Rechazar
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-[var(--border)]">
        <div className="border-b border-[var(--border)] px-5 py-4">
          <h2 className="font-semibold">Aprobados ({approvedMethods.length})</h2>
        </div>
        {approvedMethods.length === 0 ? (
          <div className="p-5 text-center text-sm text-[color:var(--muted)]">
            No hay métodos aprobados.
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {approvedMethods.map((method) => (
              <div key={method.id} className="px-5 py-4">
                <div className="font-medium">{method.store.name}</div>
                <div className="text-sm text-[color:var(--muted)]">
                  {method.label} · {method.store.owner.email}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
