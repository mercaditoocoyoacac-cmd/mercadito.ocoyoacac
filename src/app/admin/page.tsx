import { redirect } from "next/navigation";
import { prisma } from "@/server/prisma";
import { getSession } from "@/server/session";
import { getUserRoles } from "@/server/requireUser";
import AdminDashboardClient from "@/components/admin/AdminDashboardClient";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  let session;
  try {
    session = await getSession();
  } catch (e) {
    console.error("Session error:", e);
  }

  if (!session?.user?.id || session.user.isActive === false || !getUserRoles(session).includes("ADMIN")) {
    redirect("/admin/login");
  }

  const [
    totalUsers, customerCount, vendorCount, deliveryCount,
    totalStores, activeStores, totalProducts, totalOrders,
    pendingOrders, totalRevenue, activeSubscriptions,
    recentOrders,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: "CUSTOMER" } }),
    prisma.user.count({ where: { role: "VENDOR" } }),
    prisma.user.count({ where: { role: "DELIVERY" } }),
    prisma.store.count(),
    prisma.store.count({ where: { isPublished: true } }),
    prisma.product.count(),
    prisma.order.count(),
    prisma.order.count({ where: { status: "PENDING" } }),
    prisma.order.aggregate({
      where: { status: "COMPLETED" },
      _sum: { totalCents: true },
    }),
    prisma.subscription.findMany({
      where: { status: { in: ["ACTIVE", "TRIAL"] } },
      select: { monthlyPriceCents: true },
    }),
    prisma.order.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      select: {
        id: true, status: true, totalCents: true, currency: true,
        createdAt: true, paymentMethod: true, fulfillmentType: true,
        user: { select: { email: true, name: true } },
        store: { select: { name: true } },
      },
    }),
  ]);

  const monthlyRevenueCents = activeSubscriptions.reduce((sum, s) => sum + s.monthlyPriceCents, 0);

  const stats = {
    totals: {
      totalUsers, customerCount, vendorCount, deliveryCount,
      totalStores, activeStores, totalProducts, totalOrders, pendingOrders,
    },
    revenue: { totalCents: totalRevenue._sum.totalCents || 0 },
    subscriptions: {
      activeCount: activeSubscriptions.length,
      monthlyRevenueCents,
    },
    orders: {
      recentOrders: recentOrders.map((o) => ({
        ...o,
        createdAt: o.createdAt.toISOString(),
      })),
    },
  };

  return <AdminDashboardClient data={stats} />;
}
