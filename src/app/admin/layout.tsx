import AdminNav from "@/components/admin/AdminNav";
import { getSession } from "@/server/session";
import { getUserRoles } from "@/server/requireUser";
import { isAdmin, isDispatcher } from "@/lib/roles";

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  let roles: string[] = [];

  try {
    const session = await getSession();
    if (session?.user?.id && session.user.isActive !== false) {
      roles = getUserRoles(session);
    }
  } catch {}

  const staff = isAdmin(roles) || isDispatcher(roles);

  return (
    <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 lg:py-10">
      {staff ? <AdminNav roles={roles} /> : null}
      <div className={staff ? "mt-6" : undefined}>{children}</div>
    </div>
  );
}
