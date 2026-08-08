import { redirect } from "next/navigation";
import { prisma } from "@/server/prisma";
import { getSession } from "@/server/session";
import { getUserRoles } from "@/server/requireUser";
import { AdminOrdersClient } from "./AdminOrdersClient";

export const revalidate = 0;

export default async function AdminOrdersPage() {
  const session = await getSession();

  if (!session?.user?.id || session.user.isActive === false || !getUserRoles(session).includes("ADMIN")) {
    redirect("/");
  }

  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      fulfillmentType: true,
      totalCents: true,
      currency: true,
      createdAt: true,
      user: { select: { email: true, name: true } },
      store: { select: { name: true, slug: true } },
      deliveryUser: { select: { email: true } },
    },
    take: 100,
  });

  const settings = await prisma.deliverySettings.findUnique({ where: { id: 1 } });

  return (
    <AdminOrdersClient
      orders={orders.map(o => ({ ...o, createdAt: o.createdAt.toISOString() }))}
      deliverySettings={settings ?? {
        id: 1,
        baseFeeCents: 2500,
        extraFeePerSegmentCents: 1000,
        baseDistanceKm: 2,
        segmentKm: 2,
        fallbackFeeCents: 2500,
        updatedAt: new Date(),
      }}
    />
  );
}
