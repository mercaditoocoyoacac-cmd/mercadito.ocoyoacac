import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/server/prisma";
import { getSession } from "@/server/session";
import { formatDateTimeInMexico } from "@/lib/dates";

export const revalidate = 30;

export default async function DispositivosPage() {
  const session = await getSession();
  if (!session?.user?.id) redirect("/login");

  const devices = await prisma.deviceAuthorization.findMany({
    where: { userId: session.user.id },
    orderBy: { lastSeen: "desc" },
  });

  const currentDevice = devices[0];

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">Mis dispositivos</h1>
        <p className="mt-1 text-sm text-[color:var(--muted)]">
          Administra los dispositivos autorizados para acceder a tu cuenta.
        </p>
      </div>

      <div className="rounded-xl border border-[var(--border)]">
        <div className="border-b border-[var(--border)] px-5 py-4">
          <h2 className="font-semibold">Dispositivos ({devices.length})</h2>
        </div>
        {devices.length === 0 ? (
          <div className="p-5 text-center text-sm text-[color:var(--muted)]">
            No hay dispositivos autorizados.
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {devices.map((device) => (
              <div key={device.id} className="px-5 py-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="font-medium">
                        {device.isApproved ? (
                          <span className="text-green-600">✓ Autorizado</span>
                        ) : (
                          <span className="text-yellow-600">⏳ Pendiente</span>
                        )}
                      </div>
                      {device.id === currentDevice?.id && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                          Este dispositivo
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-[color:var(--muted)] mt-1">
                      {device.userAgent || "Navegador desconocido"}
                    </div>
                    <div className="text-xs text-[color:var(--muted)]">
                      IP: {device.ipAddress || "desconocida"}
                    </div>
                    <div className="text-xs text-[color:var(--muted)]">
                      Último acceso: {formatDateTimeInMexico(device.lastSeen)}
                    </div>
                  </div>
                </div>
                {device.isApproved ? (
                  device.id !== currentDevice?.id && (
                    <div className="mt-3">
                      <form action={async () => {
                        "use server";
                        await prisma.deviceAuthorization.delete({
                          where: { id: device.id },
                        });
                        revalidatePath("/perfil/dispositivos");
                      }}>
                        <button className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700">
                          Revocar acceso
                        </button>
                      </form>
                    </div>
                  )
                ) : (
                  <div className="mt-3 flex gap-2">
                    <form action={async () => {
                      "use server";
                      await prisma.deviceAuthorization.update({
                        where: { id: device.id },
                        data: { isApproved: true },
                      });
                      revalidatePath("/perfil/dispositivos");
                    }}>
                      <button className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700">
                        Aprobar
                      </button>
                    </form>
                    <form action={async () => {
                      "use server";
                      await prisma.deviceAuthorization.delete({
                        where: { id: device.id },
                      });
                      revalidatePath("/perfil/dispositivos");
                    }}>
                      <button className="rounded-lg bg-gray-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-700">
                        Rechazar
                      </button>
                    </form>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 p-4 rounded-lg bg-blue-50 text-sm text-blue-800">
        <strong>Nota:</strong> Cuando inicies sesión desde un nuevo dispositivo, aparecerá aquí para que lo apruebes. 
        Los dispositivos no aprobados no podrán acceder a tu cuenta.
      </div>
    </main>
  );
}