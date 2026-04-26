import { redirect } from "next/navigation";
import { prisma } from "@/server/prisma";
import { getSession } from "@/server/session";
import VendorContractForm from "./VendorContractForm";

function formatMoney(cents: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(
    cents / 100,
  );
}

export default async function ContratoPage() {
  const session = await getSession();
  if (!session?.user?.id) redirect("/vendor/login");

  const store = await prisma.store.findFirst({
    where: { ownerId: session.user.id },
    include: { subscription: true },
  });

  if (!store) redirect("/vendor/onboarding");

  const subscription = store.subscription;
  const today = new Date();
  const isExpired = !subscription || subscription.status === "EXPIRED" || subscription.endDate < today;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Contrato de Servicio</h1>
      <p className="mt-2 text-sm text-[color:var(--muted)]">
        Tienda: <span className="font-medium">{store.name}</span>
      </p>

      {!isExpired && subscription?.contractSigned ? (
        <div className="mt-6 rounded-xl border-2 border-green-500 bg-green-50 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <div className="text-lg font-semibold text-green-700">Contrato activo</div>
              <p className="text-sm text-green-600">
                Firmado el {subscription.contractSignedAt?.toLocaleDateString("es-MX")}
              </p>
            </div>
          </div>
          
          <div className="mt-4 text-sm text-green-700">
            <p>Precio: {formatMoney(subscription.monthlyPriceCents)}/mes</p>
            {!store.isApproved && (
              <p className="mt-2 text-orange-600">
                ⚠️ Tu tienda está en espera de aprobación por un administrador.
              </p>
            )}
          </div>
        </div>
      ) : (
        <VendorContractForm store={store} subscription={subscription} />
      )}
    </main>
  );
}