import { redirect } from "next/navigation";
import { prisma } from "@/server/prisma";
import { getSession } from "@/server/session";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const session = await getSession();

  if (!session?.user?.id || session.user.role !== "ADMIN") {
    redirect("/");
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      stores: { select: { id: true, name: true, isPublished: true } },
      orders: { select: { id: true } },
      deliveries: { select: { id: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">
          Gestión de Usuarios
        </h1>
        <p className="mt-1 text-sm text-[color:var(--muted)]">
          Administra clientes, vendedores y repartidores
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        <div className="rounded-xl border border-[var(--border)] p-5">
          <div className="text-sm text-[color:var(--muted)]">Clientes</div>
          <div className="mt-1 text-2xl font-semibold">
            {users.filter(u => u.role === "CUSTOMER").length}
          </div>
        </div>
        <div className="rounded-xl border border-[var(--border)] p-5">
          <div className="text-sm text-[color:var(--muted)]">Vendedores</div>
          <div className="mt-1 text-2xl font-semibold">
            {users.filter(u => u.role === "VENDOR").length}
          </div>
        </div>
        <div className="rounded-xl border border-[var(--border)] p-5">
          <div className="text-sm text-[color:var(--muted)]">Repartidores</div>
          <div className="mt-1 text-2xl font-semibold">
            {users.filter(u => u.role === "DELIVERY").length}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--border)]">
        <div className="border-b border-[var(--border)] px-5 py-4">
          <h2 className="font-semibold">Todos los usuarios ({users.length})</h2>
        </div>
        {users.length === 0 ? (
          <div className="p-5 text-center text-sm text-[color:var(--muted)]">
            No hay usuarios registrados.
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {users.map((user) => (
              <div key={user.id} className="px-5 py-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-medium">{user.name || "Sin nombre"}</div>
                    <div className="text-sm text-[color:var(--muted)]">{user.email}</div>
                    <div className="text-xs text-[color:var(--muted)]">
                      Registrado: {user.createdAt.toLocaleDateString("es-MX")}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-xs px-2 py-1 rounded-full ${
                      user.role === "ADMIN" ? "bg-purple-100 text-purple-800" :
                      user.role === "VENDOR" ? "bg-green-100 text-green-800" :
                      user.role === "DELIVERY" ? "bg-orange-100 text-orange-800" :
                      "bg-blue-100 text-blue-800"
                    }`}>
                      {user.role === "ADMIN" ? "Admin" :
                       user.role === "VENDOR" ? "Vendedor" :
                       user.role === "DELIVERY" ? "Repartidor" : "Cliente"}
                    </div>
                    {user.role === "VENDOR" && user.stores.length > 0 && (
                      <div className="text-xs text-[color:var(--muted)] mt-1">
                        {user.stores[0].name} ({user.stores[0].isPublished ? "activa" : "inactiva"})
                      </div>
                    )}
                    {user.role === "CUSTOMER" && (
                      <div className="text-xs text-[color:var(--muted)] mt-1">
                        {user.orders.length} pedidos
                      </div>
                    )}
                    {user.role === "DELIVERY" && (
                      <div className="text-xs text-[color:var(--muted)] mt-1">
                        {user.deliveries.length} entregas
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}