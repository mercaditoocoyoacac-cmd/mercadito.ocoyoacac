import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/server/prisma";
import { getSession } from "@/server/session";

export const dynamic = "force-dynamic";

export default async function AdminMercadoPagoPage() {
  const session = await getSession();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    redirect("/");
  }

  const pendingStores = await prisma.store.findMany({
    where: { mercadoPagoStatus: "PENDING" },
    select: {
      id: true,
      name: true,
      mercadoPagoStatus: true,
      mercadoPagoAccountId: true,
      owner: { select: { email: true, name: true } },
    },
  });

  const approvedStores = await prisma.store.findMany({
    where: { mercadoPagoStatus: "APPROVED" },
    select: {
      id: true,
      name: true,
      mercadoPagoStatus: true,
      owner: { select: { email: true } },
    },
  });

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">
          MercadoPago - Solicitudes de Cobro
        </h1>
        <p className="mt-1 text-sm text-[color:var(--muted)]">
          Aprueba o rechaza solicitudes de tiendas que quieren aceptar pagos con tarjeta.
        </p>
      </div>

      <div className="rounded-xl border border-[var(--border)] mb-8">
        <div className="border-b border-[var(--border)] px-5 py-4">
          <h2 className="font-semibold">Solicitudes pendientes ({pendingStores.length})</h2>
        </div>
        {pendingStores.length === 0 ? (
          <div className="p-5 text-center text-sm text-[color:var(--muted)]">
            No hay solicitudes pendientes.
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {pendingStores.map((store) => (
              <div key={store.id} className="px-5 py-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium">{store.name}</div>
                    <div className="text-sm text-[color:var(--muted)]">
                      {store.owner.name || store.owner.email}
                    </div>
                    <div className="text-xs text-[color:var(--muted)]">
                      Account ID: {store.mercadoPagoAccountId || "No proporcionado"}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <form action={async () => {
                      "use server";
                      await fetch("/api/admin/mercado-pago", {
                        method: "POST",
                        headers: { "content-type": "application/json" },
                        body: JSON.stringify({ storeId: store.id, action: "approve" }),
                      });
                      revalidatePath("/admin/mercado-pago");
                    }}>
                      <button className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700">
                        Aprobar
                      </button>
                    </form>
                    <form action={async () => {
                      "use server";
                      await fetch("/api/admin/mercado-pago", {
                        method: "POST",
                        headers: { "content-type": "application/json" },
                        body: JSON.stringify({ storeId: store.id, action: "reject" }),
                      });
                      revalidatePath("/admin/mercado-pago");
                    }}>
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
          <h2 className="font-semibold">Tiendas aprobadas ({approvedStores.length})</h2>
        </div>
        {approvedStores.length === 0 ? (
          <div className="p-5 text-center text-sm text-[color:var(--muted)]">
            No hay tiendas aprobadas.
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {approvedStores.map((store) => (
              <div key={store.id} className="px-5 py-4">
                <div className="font-medium">{store.name}</div>
                <div className="text-sm text-[color:var(--muted)]">
                  {store.owner.email}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}