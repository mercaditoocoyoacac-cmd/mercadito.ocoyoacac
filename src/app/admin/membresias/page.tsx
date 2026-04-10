import { redirect } from "next/navigation";
import { prisma } from "@/server/prisma";
import { getSession } from "@/server/session";

export const dynamic = "force-dynamic";

export default async function AdminSubscriptionsPage() {
  const session = await getSession();

  if (!session?.user?.id || session.user.role !== "ADMIN") {
    redirect("/");
  }

  const stores = await prisma.store.findMany({
    include: {
      owner: { select: { email: true, name: true } },
      subscription: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">
          Gestión de Membresías
        </h1>
        <p className="mt-1 text-sm text-[color:var(--muted)]">
          Administra las membresías de las tiendas
        </p>
      </div>

      <div className="rounded-xl border border-[var(--border)]">
        <div className="border-b border-[var(--border)] px-5 py-4">
          <h2 className="font-semibold">Tiendas ({stores.length})</h2>
        </div>
        {stores.length === 0 ? (
          <div className="p-5 text-center text-sm text-[color:var(--muted)]">
            No hay tiendas registradas.
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {stores.map((store) => {
              const sub = store.subscription;
              const isActive = sub?.status === "ACTIVE" && new Date(sub.endDate) > new Date();

              return (
                <div key={store.id} className="px-5 py-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium">{store.name}</div>
                      <div className="text-sm text-[color:var(--muted)]">
                        {store.owner.name || store.owner.email}
                      </div>
                      <div className="text-xs text-[color:var(--muted)]">
                        {store.owner.email}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-xs px-2 py-1 rounded-full ${
                        store.isPublished
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}>
                        {store.isPublished ? "Activa" : "Inactiva"}
                      </div>
                      {sub && (
                        <div className={`text-xs px-2 py-1 rounded-full mt-1 ${
                          isActive
                            ? "bg-blue-100 text-blue-800"
                            : "bg-red-100 text-red-800"
                        }`}>
                          {isActive ? "Membresía activa" : "Membresía vencida"}
                        </div>
                      )}
                    </div>
                  </div>
                  {sub && (
                    <div className="mt-2 text-xs text-[color:var(--muted)]">
                      Inicio: {sub.startDate.toLocaleDateString("es-MX")} | 
                      Fin: {sub.endDate.toLocaleDateString("es-MX")}
                    </div>
                  )}
                  <div className="mt-3 flex gap-2">
                    {!store.isPublished && (
                      <form action={async () => {
                        "use server";
                        await prisma.store.update({
                          where: { id: store.id },
                          data: { isPublished: true },
                        });
                      }}>
                        <button className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700">
                          Activar tienda
                        </button>
                      </form>
                    )}
                    {store.isPublished && (
                      <form action={async () => {
                        "use server";
                        await prisma.store.update({
                          where: { id: store.id },
                          data: { isPublished: false },
                        });
                      }}>
                        <button className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700">
                          Desactivar tienda
                        </button>
                      </form>
                    )}
                    <form action={async () => {
                      "use server";
                      const endDate = new Date();
                      endDate.setMonth(endDate.getMonth() + 1);
                      await prisma.subscription.upsert({
                        where: { storeId: store.id },
                        create: {
                          storeId: store.id,
                          status: "ACTIVE",
                          endDate,
                          monthlyPriceCents: 15000,
                        },
                        update: {
                          status: "ACTIVE",
                          startDate: new Date(),
                          endDate,
                        },
                      });
                      await prisma.store.update({
                        where: { id: store.id },
                        data: { isPublished: true },
                      });
                    }}>
                      <button className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700">
                        Renovar membresía
                      </button>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}