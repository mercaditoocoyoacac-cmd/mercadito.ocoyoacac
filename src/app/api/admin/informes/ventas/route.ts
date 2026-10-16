import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/prisma';
import { requireAdmin } from '@/server/requireUser';

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.res;
  const { searchParams } = new URL(req.url);
  const report = searchParams.get('report') || 'ventas';
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const storeId = searchParams.get('storeId');
  const status = searchParams.get('status');

  const where: any = {};
  if (from) where.createdAt = { ...(where.createdAt || {}), gte: new Date(from + 'T00:00:00.000Z') };
  if (to) where.createdAt = { ...(where.createdAt || {}), lte: new Date(to + 'T23:59:59.999Z') };
  if (storeId && storeId !== 'all') where.storeId = storeId;
  if (status && status !== 'all') where.status = status as any;

  const orders = await prisma.order.findMany({
    where,
    include: {
      store: { select: { name: true } },
      items: { select: { name: true, quantity: true, priceCents: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const totals = orders.reduce(
    (acc, o: any) => {
      acc.orders += 1;
      acc.totalCents += o.totalCents || 0;
      acc.subtotalCents += o.subtotalCents || (o.totalCents || 0) - (o.deliveryCents || 0);
      acc.deliveryCents += o.deliveryCents || 0;
      acc.shippingCents += o.deliveryCents || 0;
      acc.commissionCents += o.commissionCents || 0;
      acc.vendorPayoutCents += o.vendorPayoutCents || 0;
      return acc;
    },
    { orders: 0, totalCents: 0, subtotalCents: 0, deliveryCents: 0, shippingCents: 0, commissionCents: 0, vendorPayoutCents: 0 }
  );

  const orderRows = orders.map((o: any) => ({
    id: o.id,
    createdAt: o.createdAt,
    status: o.status,
    totalCents: o.totalCents || 0,
    subtotalCents: o.subtotalCents || ((o.totalCents || 0) - (o.deliveryCents || 0)),
    deliveryCents: o.deliveryCents || 0,
    shippingCents: o.deliveryCents || 0,
    commissionCents: o.commissionCents || 0,
    vendorPayoutCents: o.vendorPayoutCents || 0,
    customerName: o.customerName,
    storeName: o.store?.name || '',
  }));

  let topProducts: { name: string; storeName: string; quantity: number; revenueCents: number }[] | undefined;
  if (report === 'productos') {
    const map = new Map<string, { name: string; storeName: string; quantity: number; revenueCents: number }>();
    for (const o of orders as any[]) {
      for (const item of o.items || []) {
        const key = `${o.store?.name || ''}::${item.name}`;
        const current = map.get(key) || { name: item.name, storeName: o.store?.name || '', quantity: 0, revenueCents: 0 };
        current.quantity += item.quantity || 0;
        current.revenueCents += (item.priceCents || 0) * (item.quantity || 0);
        map.set(key, current);
      }
    }
    topProducts = Array.from(map.values()).sort((a, b) => b.quantity - a.quantity).slice(0, 200);
  }

  let topCustomers: { customerName: string; orders: number; totalCents: number }[] | undefined;
  if (report === 'clientes') {
    const map = new Map<string, { customerName: string; orders: number; totalCents: number }>();
    for (const o of orders as any[]) {
      const name = o.customerName || 'Sin nombre';
      const current = map.get(name) || { customerName: name, orders: 0, totalCents: 0 };
      current.orders += 1;
      current.totalCents += o.totalCents || 0;
      map.set(name, current);
    }
    topCustomers = Array.from(map.values()).sort((a, b) => b.totalCents - a.totalCents).slice(0, 200);
  }

  return NextResponse.json({
    ok: true,
    summary: { orders: orderRows, totals, topProducts, topCustomers },
  });
}
