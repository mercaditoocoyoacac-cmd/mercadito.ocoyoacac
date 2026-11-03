import { redirect } from "next/navigation";
import { getSession } from "@/server/session";
import { getUserRoles } from "@/server/requireUser";
import { isAdmin, isDispatcher } from "@/lib/roles";
import DeliverySupervisionClient from "@/components/admin/DeliverySupervisionClient";

export const dynamic = "force-dynamic";

export default async function AdminEnviosPage() {
  let session;
  try {
    session = await getSession();
  } catch (e) {
    console.error("Session error:", e);
  }

  const roles = session && session.user.isActive !== false ? getUserRoles(session) : [];
  if (!isAdmin(roles) && !isDispatcher(roles)) {
    redirect("/admin/login");
  }

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">
          Supervisión de Envíos
        </h1>
        <p className="mt-1 text-sm text-[color:var(--muted)]">
          Monitorea y gestiona todos los pedidos con entrega a domicilio en tiempo real
        </p>
      </div>
      <DeliverySupervisionClient />
    </main>
  );
}
