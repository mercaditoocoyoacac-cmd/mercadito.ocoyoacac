import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/server/prisma";
import { getSession } from "@/server/session";
import { formatDateInMexico } from "@/lib/dates";

export const dynamic = "force-dynamic";

const roleLabels: Record<string, string> = {
  CUSTOMER: "Cliente",
  VENDOR: "Vendedor",
  DELIVERY: "Repartidor",
  ADMIN: "Admin",
};

const roleColors: Record<string, string> = {
  CUSTOMER: "bg-blue-100 text-blue-800",
  VENDOR: "bg-green-100 text-green-800",
  DELIVERY: "bg-orange-100 text-orange-800",
  ADMIN: "bg-purple-100 text-purple-800",
};

async function addRole(userId: string, role: string) {
  "use server";
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, additionalRoles: true },
  });
  if (!user) return;
  if (user.role === role as any) return;

  const allRoles = [user.role, ...(user.additionalRoles ? user.additionalRoles.split(",") : [])];
  if (allRoles.includes(role)) return;

  await prisma.user.update({
    where: { id: userId },
    data: {
      additionalRoles: [...allRoles, role].join(","),
    },
  });
  revalidatePath("/admin/usuarios");
}

async function removeRole(userId: string, role: string) {
  "use server";
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, additionalRoles: true },
  });
  if (!user) return;

  const allRoles = [user.role, ...(user.additionalRoles ? user.additionalRoles.split(",") : [])];
  const filtered = allRoles.filter((r) => r !== role);
  const newPrimary = filtered[0] || "CUSTOMER";
  const newAdditional = filtered.slice(1).join(",");

  await prisma.user.update({
    where: { id: userId },
    data: {
      role: newPrimary as any,
      additionalRoles: newAdditional || null,
    },
  });
  revalidatePath("/admin/usuarios");
}

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
      additionalRoles: true,
      isActive: true,
      createdAt: true,
      stores: { select: { id: true, name: true, isPublished: true } },
      orders: { select: { id: true } },
      deliveries: { select: { id: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const allRoleOptions = ["CUSTOMER", "VENDOR", "DELIVERY"];

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
            {users.filter(u => u.role === "CUSTOMER" || u.additionalRoles?.includes("CUSTOMER")).length}
          </div>
        </div>
        <div className="rounded-xl border border-[var(--border)] p-5">
          <div className="text-sm text-[color:var(--muted)]">Vendedores</div>
          <div className="mt-1 text-2xl font-semibold">
            {users.filter(u => u.role === "VENDOR" || u.additionalRoles?.includes("VENDOR")).length}
          </div>
        </div>
        <div className="rounded-xl border border-[var(--border)] p-5">
          <div className="text-sm text-[color:var(--muted)]">Repartidores</div>
          <div className="mt-1 text-2xl font-semibold">
            {users.filter(u => u.role === "DELIVERY" || u.additionalRoles?.includes("DELIVERY")).length}
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
            {users.map((user) => {
              const allRoles = [user.role, ...(user.additionalRoles ? user.additionalRoles.split(",") : [])];
              const missingRoles = allRoleOptions.filter((r) => !allRoles.includes(r));
              return (
                <div key={user.id} className="px-5 py-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium">{user.name || "Sin nombre"}</div>
                      <div className="text-sm text-[color:var(--muted)]">{user.email}</div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {allRoles.map((r) => (
                          <span key={r} className={`text-xs px-2 py-0.5 rounded-full ${roleColors[r] || "bg-gray-100 text-gray-800"}`}>
                            {roleLabels[r] || r}
                          </span>
                        ))}
                      </div>
                      <div className="text-xs text-[color:var(--muted)] mt-1">
                        Registrado: {formatDateInMexico(user.createdAt)}
                      </div>
                    </div>
                    <div className="text-right">
                      {user.role === "VENDOR" && user.stores.length > 0 && (
                        <div className="text-xs text-[color:var(--muted)]">
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
                  <div className="mt-3 flex flex-wrap gap-2">
                    {missingRoles.map((role) => (
                      <form key={role} action={addRole.bind(null, user.id, role)}>
                        <button className="rounded-lg border border-dashed border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[color:var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]">
                          +{roleLabels[role]}
                        </button>
                      </form>
                    ))}
                    {allRoles.filter((r) => r !== user.role && r !== "ADMIN").map((role) => (
                      <form key={role} action={removeRole.bind(null, user.id, role)}>
                        <button className="rounded-lg bg-red-50 border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100">
                          Quitar {roleLabels[role]}
                        </button>
                      </form>
                    ))}
                    {user.role !== "ADMIN" && (
                      <form action={async () => {
                        "use server";
                        await prisma.user.update({
                          where: { id: user.id },
                          data: { isActive: !user.isActive },
                        });
                        revalidatePath("/admin/usuarios");
                      }}>
                        <button className={`rounded-lg px-3 py-1.5 text-xs font-medium text-white ${user.isActive ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}`}>
                          {user.isActive ? "Suspender" : "Activar"}
                        </button>
                      </form>
                    )}
                  </div>
                  {!user.isActive && (
                    <div className="mt-2 text-xs text-red-600 font-medium">
                      ⚠ Usuario suspendido
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
