import { redirect } from "next/navigation";
import { getSession } from "@/server/session";
import { getUserRoles } from "@/server/requireUser";
import PasswordResetClient from "@/components/admin/PasswordResetClient";

export const dynamic = "force-dynamic";

export default async function AdminCambiarContrasenaPage() {
  const session = await getSession();
  if (!session?.user?.id || session.user.isActive === false || !getUserRoles(session).includes("ADMIN")) {
    redirect("/");
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 fade-in">
      <div className="mb-6">
        <h2 className="text-xl font-semibold tracking-tight">Cambiar contraseñas</h2>
        <p className="mt-1 text-sm text-[color:var(--muted)]">
          Recupera el acceso de vendedores y repartidores que no reciben el correo de restablecimiento.
        </p>
      </div>
      <PasswordResetClient />
    </main>
  );
}
