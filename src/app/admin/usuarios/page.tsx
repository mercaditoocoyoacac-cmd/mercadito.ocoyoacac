import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/server/prisma";
import { getSession } from "@/server/session";
import { formatDateInMexico } from "@/lib/dates";
import Link from "next/link";

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

const filterTabs = [
  { key: "", label: "Todos" },
  { key: "CUSTOMER", label: "Clientes" },
  { key: "VENDOR", label: "Vendedores" },
  { key: "DELIVERY", label: "Repartidores" },
];

function hasRole(user: { role: string; additionalRoles: string | null }, role: string): boolean {
  return user.role === role || (user.additionalRoles ?? "").split(",").includes(role);
}

async function addRole(userId: string, role: string) {
  "use server";
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, additionalRoles: true },
  });
  if (!user) return;
  if (user.role === role) return;

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
      role: newPrimary as "CUSTOMER" | "VENDOR" | "DELIVERY" | "ADMIN",
      additionalRoles: newAdditional || null,
    },
  });
  revalidatePath("/admin/usuarios");
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ filtro?: string; q?: string }>;
}) {
  const session = await getSession();

  if (!session?.user?.id || session.user.role !== "ADMIN") {
    redirect("/");
  }

  const { filtro = "", q = "" } = await searchParams;

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      additionalRoles: true,
      isActive: true,
      createdAt: true,
      phone: true,
      address: true,
      city: true,
      state: true,
      stores: { select: { id: true, name: true, isPublished: true } },
      orders: { select: { id: true } },
      deliveries: { select: { id: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const filtered = users.filter((u) => {
    if (filtro && !hasRole(u, filtro)) return false;
    if (q) {
      const term = q.toLowerCase();
      const matchName = u.name?.toLowerCase().includes(term);
      const matchEmail = u.email.toLowerCase().includes(term);
      if (!matchName && !matchEmail) return false;
    }
    return true;
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
            {users.filter(u => hasRole(u, "CUSTOMER")).length}
          </div>
        </div>
        <div className="rounded-xl border border-[var(--border)] p-5">
          <div className="text-sm text-[color:var(--muted)]">Vendedores</div>
          <div className="mt-1 text-2xl font-semibold">
            {users.filter(u => hasRole(u, "VENDOR")).length}
          </div>
        </div>
        <div className="rounded-xl border border-[var(--border)] p-5">
          <div className="text-sm text-[color:var(--muted)]">Repartidores</div>
          <div className="mt-1 text-2xl font-semibold">
            {users.filter(u => hasRole(u, "DELIVERY")).length}
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {filterTabs.map((t) => {
          const isActive = filtro === t.key;
          const params = new URLSearchParams();
          if (t.key) params.set("filtro", t.key);
          if (q) params.set("q", q);
          const href = `/admin/usuarios${params.toString() ? `?${params.toString()}` : ""}`;
          return (
            <Link
              key={t.key}
              href={href}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-[var(--accent)] text-white"
                  : "border border-[var(--border)] text-[color:var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
              }`}
            >
              {t.label}
              {t.key && (
                <span className="ml-1.5 text-xs opacity-75">
                  ({users.filter(u => hasRole(u, t.key)).length})
                </span>
              )}
            </Link>
          );
        })}
        <div className="ml-auto">
          <form>
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Buscar por nombre o email…"
              className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm w-64 max-w-full bg-transparent"
            />
            <input type="hidden" name="filtro" value={filtro} />
          </form>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--border)]">
        <div className="border-b border-[var(--border)] px-5 py-4">
          <h2 className="font-semibold">
            {filtro ? roleLabels[filtro] || filtro : "Todos los usuarios"}
            <span className="ml-1.5 text-sm font-normal text-[color:var(--muted)]">({filtered.length})</span>
          </h2>
        </div>
        {filtered.length === 0 ? (
          <div className="p-5 text-center text-sm text-[color:var(--muted)]">
            No se encontraron usuarios.
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {filtered.map((user) => {
              const allRoles = [user.role, ...(user.additionalRoles ? user.additionalRoles.split(",") : [])];
              const missingRoles = allRoleOptions.filter((r) => !allRoles.includes(r));
              return (
                <div key={user.id} className="px-5 py-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium">{user.name || "Sin nombre"}</div>
                      <div className="text-sm text-[color:var(--muted)]">{user.email}</div>
                      {(user.phone || user.address) && (
                        <div className="mt-1 space-y-0.5">
                          {user.phone && <div className="text-xs text-[color:var(--muted)]">📞 {user.phone}</div>}
                          {user.address && <div className="text-xs text-[color:var(--muted)]">📍 {user.address}{user.city ? `, ${user.city}` : ""}{user.state ? `, ${user.state}` : ""}</div>}
                        </div>
                      )}
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
                    <div className="text-right shrink-0 ml-4">
                      {hasRole(user, "VENDOR") && user.stores.length > 0 && (
                        <div className="text-xs text-[color:var(--muted)]">
                          {user.stores[0].name} ({user.stores[0].isPublished ? "activa" : "inactiva"})
                        </div>
                      )}
                      {hasRole(user, "CUSTOMER") && (
                        <div className="text-xs text-[color:var(--muted)] mt-1">
                          {user.orders.length} pedidos
                        </div>
                      )}
                      {hasRole(user, "DELIVERY") && (
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
