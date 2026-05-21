import { redirect } from "next/navigation";
import { prisma } from "@/server/prisma";
import { getSession } from "@/server/session";
import DeliveryTracker from "@/components/orders/DeliveryTracker";
import DeliveryRating from "@/components/delivery/DeliveryRating";

export const dynamic = "force-dynamic";

export default async function DeliveryDashboard() {
  const session = await getSession();
  
  if (!session?.user?.id || session.user.role !== "DELIVERY") {
    redirect("/delivery/login");
  }

  const myDeliveries = await prisma.order.findMany({
    where: { deliveryUserId: session.user.id },
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

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Panel de Repartidor
          </h1>
          <p className="mt-1 text-sm text-[color:var(--muted)]">
            Bienvenido, {session.user.email}
          </p>
        </div>
        <DeliveryRating deliveryUserId={session.user.id} />
      </div>

      <DeliveryTracker
        myDeliveries={myDeliveries}
        availableDeliveries={availableDeliveries}
      />
    </main>
  );
}
