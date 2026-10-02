import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/server/prisma";
import { getSession } from "@/server/session";
import { getUserRoles } from "@/server/requireUser";
import { hasCompleteDocs, missingDocs, DRIVER_DOCS_DEADLINE } from "@/server/driverDocs";
import AdminRepartidoresClient from "@/components/admin/AdminRepartidoresClient";

export const dynamic = "force-dynamic";

const DOCS_LABELS = [
  { key: "vehiclePhotoUrl", label: "Vehículo" },
  { key: "licensePhotoUrl", label: "Licencia" },
  { key: "personPhotoUrl", label: "Persona" },
  { key: "officialIdPhotoUrl", label: "Identificación" },
] as const;

export default async function AdminRepartidoresPage() {
  const session = await getSession();

  if (!session?.user?.id || session.user.isActive === false || !getUserRoles(session).includes("ADMIN")) {
    redirect("/admin/login");
  }

  const drivers = await prisma.user.findMany({
    where: {
      OR: [
        { role: "DELIVERY" },
        { additionalRoles: { contains: "DELIVERY" } },
      ],
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      additionalRoles: true,
      createdAt: true,
      vehiclePhotoUrl: true,
      licensePhotoUrl: true,
      personPhotoUrl: true,
      officialIdPhotoUrl: true,
      driverDocsSubmittedAt: true,
      driverDocsApproved: true,
      driverDocsApprovedAt: true,
      driverDocsApprovedBy: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const complete = drivers.filter((d) => hasCompleteDocs(d));
  const pending = drivers.filter((d) => !hasCompleteDocs(d));

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Repartidores y documentos</h1>
        <p className="mt-1 text-sm text-[color:var(--muted)]">
          {drivers.length} repartidores · {complete.length} con documentos · {pending.length} pendientes.
          Quienes no registren sus 4 documentos antes del {DRIVER_DOCS_DEADLINE.toLocaleDateString("es-MX", {
            day: "numeric", month: "long", year: "numeric", timeZone: "America/Mexico_City",
          })} perderán el status de repartidor.
        </p>
      </div>

      <div className="space-y-4">
        {drivers.map((d) => {
          const isComplete = hasCompleteDocs(d);
          const missing = missingDocs(d);
          const hasAnyDoc = Boolean(
            d.vehiclePhotoUrl || d.licensePhotoUrl || d.personPhotoUrl || d.officialIdPhotoUrl,
          );
          return (
            <div key={d.id} className="rounded-xl border border-[var(--border)] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold">{d.name || d.email}</div>
                  <div className="text-xs text-[color:var(--muted)]">
                    {d.email} · {d.phone ?? "sin teléfono"} · roles: {[d.role, ...(d.additionalRoles?.split(",") ?? [])].filter(Boolean).join(", ")}
                  </div>
                  <div className="mt-0.5 text-xs text-[color:var(--muted)]">
                    {isComplete
                      ? `Completo (aprobado${d.driverDocsApprovedAt ? ` el ${d.driverDocsApprovedAt.toLocaleDateString("es-MX", { timeZone: "America/Mexico_City" })}` : ""}${d.driverDocsApprovedBy ? ` por ${d.driverDocsApprovedBy}` : ""})`
                      : d.driverDocsApproved && hasAnyDoc
                      ? `Fotos cargadas, falta alguna? (${missing.join(", ") || "revisar"})`
                      : `Faltan: ${missing.join(", ") || "sin documentos"}`}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isComplete ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {isComplete ? "Completo" : "Incompleto"}
                  </span>
                  {hasAnyDoc && !d.driverDocsApproved && (
                    <AdminRepartidoresClient userId={d.id} />
                  )}
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {DOCS_LABELS.map((doc) => {
                  const url = d[doc.key as keyof typeof d] as string | null;
                  return (
                    <div key={doc.key} className="rounded-lg border border-[var(--border)] p-2">
                      <div className="text-xs font-medium text-[color:var(--muted)]">{doc.label}</div>
                      {url ? (
                        <a href={url} target="_blank" rel="noopener noreferrer" className="mt-1 block">
                          <img src={url} alt={doc.label} className="h-20 w-full rounded-md border border-[var(--border)] object-cover" loading="lazy" />
                        </a>
                      ) : (
                        <div className="mt-1 flex h-20 items-center justify-center rounded-md border border-dashed border-[var(--border)] text-xs text-[color:var(--muted)]">
                          Sin foto
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {drivers.length === 0 && (
        <div className="rounded-xl border border-[var(--border)] p-10 text-center text-sm text-[color:var(--muted)]">
          No hay repartidores registrados.
        </div>
      )}

      <div className="mt-8 text-xs text-[color:var(--muted)]">
        <Link className="underline" href="/admin/envios">← Supervisión de envíos</Link>
      </div>
    </main>
  );
}