import { redirect } from "next/navigation";
import { prisma } from "@/server/prisma";
import { getSession } from "@/server/session";
import { getUserRoles } from "@/server/requireUser";
import DeliveryTracker from "@/components/orders/DeliveryTracker";
import DeliveryRating from "@/components/delivery/DeliveryRating";
import { PullToRefreshWrapper } from "@/components/ui/PullToRefreshWrapper";
import { RoleModeSwitcher } from "@/components/layout/RoleModeSwitcher";
import { missingDocs } from "@/server/driverDocs";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DeliveryDashboard() {
  const session = await getSession();
  
  if (!session?.user?.id || session.user.isActive === false || !getUserRoles(session).includes("DELIVERY")) {
    redirect("/delivery/login");
  }

  const myUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      vehiclePhotoUrl: true,
      licensePhotoUrl: true,
      personPhotoUrl: true,
      officialIdPhotoUrl: true,
    },
  });

  const pendingDocs = myUser ? missingDocs(myUser) : [];

  const myDeliveries = await prisma.order.findMany({
    where: { deliveryUserId: session.user.id, status: { not: "CANCELLED" } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      fulfillmentType: true,
      customerName: true,
      customerPhone: true,
      customerAddress: true,
      customerLat: true,
      customerLng: true,
      totalCents: true,
      deliveryCents: true,
      currency: true,
      createdAt: true,
      arrivedAt: true,
      arrivalConfirmedAt: true,
      notes: true,
      paymentMethod: true,
      userId: true,
      items: {
        select: { name: true, quantity: true, priceCents: true, weightGrams: true, variantName: true },
      },
      store: { select: { name: true, phone: true, address: true } },
    },
  });

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart.getTime() - todayStart.getDay() * 86400000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const completed = myDeliveries.filter(o => o.status === "COMPLETED");
  const earnings = {
    day: completed
      .filter(o => o.createdAt >= todayStart)
      .reduce((s, o) => s + o.deliveryCents, 0),
    week: completed
      .filter(o => o.createdAt >= weekStart)
      .reduce((s, o) => s + o.deliveryCents, 0),
    month: completed
      .filter(o => o.createdAt >= monthStart)
      .reduce((s, o) => s + o.deliveryCents, 0),
    total: completed.reduce((s, o) => s + o.deliveryCents, 0),
    completedCount: completed.length,
  };

  const availableDeliveries = await prisma.order.findMany({
    where: {
      fulfillmentType: "DELIVERY",
      status: { in: ["CONFIRMED", "READY"] },
      deliveryUserId: null,
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      status: true,
      customerName: true,
      customerPhone: true,
      customerAddress: true,
      customerLat: true,
      customerLng: true,
      totalCents: true,
      deliveryCents: true,
      currency: true,
      createdAt: true,
      arrivedAt: true,
      arrivalConfirmedAt: true,
      notes: true,
      paymentMethod: true,
      userId: true,
      items: {
        select: { name: true, quantity: true, priceCents: true, weightGrams: true, variantName: true },
      },
      store: { select: { name: true, phone: true, address: true } },
    },
  });

  const sessionRoles = getUserRoles(session);

  return (
    <PullToRefreshWrapper>
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
      {pendingDocs.length > 0 && (
        <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-amber-900">
                Te faltan documentos para repartir: {pendingDocs.join(", ")}
              </div>
              <p className="mt-1 text-xs text-amber-800/80">
                Sube tus 4 documentos antes del <strong>15 de octubre de 2026</strong> o se retirará el
                status de repartidor a tu cuenta.
              </p>
            </div>
            <Link
              href="/delivery/documentos"
              className="shrink-0 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600"
            >
              Subir documentos
            </Link>
          </div>
        </div>
      )}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Panel de Repartidor
          </h1>
          <p className="mt-1 text-sm text-[color:var(--muted)]">
            Bienvenido, {session.user.email}
          </p>
        </div>
        <div className="flex flex-col items-end gap-3">
          {sessionRoles.includes("VENDOR") && (
            <RoleModeSwitcher availableRoles={sessionRoles} />
          )}
          <DeliveryRating deliveryUserId={session.user.id} />
        </div>
      </div>

      <DeliveryTracker
        myDeliveries={myDeliveries}
        availableDeliveries={availableDeliveries}
        earnings={earnings}
      />
    </main>
    </PullToRefreshWrapper>
  );
}
