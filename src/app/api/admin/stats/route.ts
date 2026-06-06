import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { requireUser } from "@/server/requireUser";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return auth.res;

  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: { role: true },
  });
  if (user?.role !== "ADMIN") {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  }

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    customerCount,
    vendorCount,
    deliveryCount,
    totalStores,
    activeStores,
    totalProducts,
    totalOrders,
    pendingOrders,
    completedOrders,
    cancelledOrders,
    outForDeliveryOrders,
    confirmedOrders,
    readyOrders,
    totalRevenue,
    completedOrdersFull,
    recentOrders,
    subscriptions,
    revenueHistoryRaw,
    dailyOrdersRaw,
    storeRevenueRaw,
    categoryCounts,
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
    prisma.order.count({ where: { status: "COMPLETED" } }),
    prisma.order.count({ where: { status: "CANCELLED" } }),
    prisma.order.count({ where: { status: "OUT_FOR_DELIVERY" } }),
    prisma.order.count({ where: { status: "CONFIRMED" } }),
    prisma.order.count({ where: { status: "READY" } }),
    prisma.order.aggregate({
      where: { status: "COMPLETED" },
      _sum: { totalCents: true },
    }),
    prisma.order.findMany({
      where: { status: "COMPLETED", createdAt: { gte: thirtyDaysAgo } },
      select: { totalCents: true, deliveryCents: true, createdAt: true, storeId: true },
    }),
    prisma.order.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        totalCents: true,
        currency: true,
        createdAt: true,
        paymentMethod: true,
        fulfillmentType: true,
        user: { select: { email: true, name: true } },
        store: { select: { name: true } },
      },
    }),
    prisma.subscription.findMany({
      select: { status: true, monthlyPriceCents: true, store: { select: { name: true } } },
    }),
    prisma.order.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { totalCents: true, createdAt: true, status: true },
    }),
    prisma.order.findMany({
      where: { createdAt: { gte: fourteenDaysAgo } },
      select: { createdAt: true },
    }),
    prisma.order.groupBy({
      by: ["storeId"],
      where: { status: "COMPLETED" },
      _sum: { totalCents: true },
      orderBy: { _sum: { totalCents: "desc" } },
      take: 5,
    }),
    prisma.store.groupBy({
      by: ["category"],
      _count: true,
    }),
  ]);

  const storeNames = await prisma.store.findMany({
    where: { id: { in: storeRevenueRaw.map((s) => s.storeId) } },
    select: { id: true, name: true },
  });
  const storeNameMap = Object.fromEntries(storeNames.map((s) => [s.id, s.name]));

  const topVendors = storeRevenueRaw.map((s) => ({
    name: storeNameMap[s.storeId] || "Desconocida",
    revenueCents: s._sum.totalCents || 0,
  }));

  type DayBucket = { date: string; revenue: number; orders: number };
  const revenueByDay: DayBucket[] = [];
  const dayMap = new Map<string, { revenue: number; orders: number }>();

  for (let i = 0; i < 30; i++) {
    const d = new Date(thirtyDaysAgo.getTime() + i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    dayMap.set(key, { revenue: 0, orders: 0 });
  }

  for (const o of completedOrdersFull) {
    const key = o.createdAt.toISOString().slice(0, 10);
    if (dayMap.has(key)) {
      const entry = dayMap.get(key)!;
      entry.revenue += o.totalCents;
      entry.orders += 1;
    }
  }

  for (const [date, data] of dayMap) {
    revenueByDay.push({ date: date.slice(5), revenue: data.revenue, orders: data.orders });
  }

  type OrderBucket = { date: string; count: number };
  const ordersByDay: OrderBucket[] = [];
  const orderDayMap = new Map<string, number>();

  for (let i = 0; i < 14; i++) {
    const d = new Date(fourteenDaysAgo.getTime() + i * 24 * 60 * 60 * 1000);
    orderDayMap.set(d.toISOString().slice(0, 10), 0);
  }

  for (const o of dailyOrdersRaw) {
    const key = o.createdAt.toISOString().slice(0, 10);
    if (orderDayMap.has(key)) {
      orderDayMap.set(key, orderDayMap.get(key)! + 1);
    }
  }

  for (const [date, count] of orderDayMap) {
    ordersByDay.push({ date: date.slice(5), count });
  }

  const statusCounts = [
    { name: "Pendientes", value: pendingOrders, color: "#eab308" },
    { name: "Confirmados", value: confirmedOrders, color: "#a855f7" },
    { name: "Listos", value: readyOrders, color: "#3b82f6" },
    { name: "En camino", value: outForDeliveryOrders, color: "#f97316" },
    { name: "Completados", value: completedOrders, color: "#22c55e" },
    { name: "Cancelados", value: cancelledOrders, color: "#ef4444" },
  ];

  const subByStatus = [
    { name: "Activas", value: subscriptions.filter((s) => s.status === "ACTIVE").length, color: "#22c55e" },
    { name: "Trial", value: subscriptions.filter((s) => s.status === "TRIAL").length, color: "#3b82f6" },
    { name: "Vencidas", value: subscriptions.filter((s) => s.status === "EXPIRED").length, color: "#ef4444" },
    { name: "Canceladas", value: subscriptions.filter((s) => s.status === "CANCELLED").length, color: "#6b7280" },
  ];

  const activeSubs = subscriptions.filter((s) => s.status === "ACTIVE" || s.status === "TRIAL");
  const monthlySubRevenue = activeSubs.reduce((sum, s) => sum + s.monthlyPriceCents, 0);

  const categories = categoryCounts.map((c) => ({
    name: c.category,
    count: c._count,
  }));

  return NextResponse.json({
    ok: true,
    stats: {
      totals: { totalUsers, customerCount, vendorCount, deliveryCount, totalStores, activeStores, totalProducts, totalOrders },
      revenue: {
        totalCents: totalRevenue._sum.totalCents || 0,
        byDay: revenueByDay,
        topVendors,
      },
      orders: {
        statusCounts,
        byDay: ordersByDay,
        recentOrders,
      },
      subscriptions: {
        total: subscriptions.length,
        byStatus: subByStatus,
        activeCount: activeSubs.length,
        monthlyRevenueCents: monthlySubRevenue,
      },
      categories,
    },
  });
}
