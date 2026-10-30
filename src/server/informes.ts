import { prisma } from '@/server/prisma';

export type ReportKey = 'resumen' | 'ventas' | 'productos' | 'pedidos' | 'clientes' | 'costos';
export type MetricKind = 'text' | 'money' | 'count' | 'percent';

export const REPORT_KEYS: ReportKey[] = ['resumen', 'ventas', 'productos', 'pedidos', 'clientes', 'costos'];

export const REPORT_LABELS: Record<ReportKey, string> = {
  resumen: 'Resumen ejecutivo',
  ventas: 'Ventas',
  productos: 'Productos',
  pedidos: 'Pedidos',
  clientes: 'Clientes',
  costos: 'Costos y envíos',
};

export const ORDER_STATUSES = ['PENDING', 'CONFIRMED', 'READY', 'OUT_FOR_DELIVERY', 'COMPLETED', 'CANCELLED'] as const;

export const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmado',
  READY: 'Listo',
  OUT_FOR_DELIVERY: 'En camino',
  COMPLETED: 'Completado',
  CANCELLED: 'Cancelado',
};

export const FULFILLMENT_LABELS: Record<string, string> = {
  DELIVERY: 'Entrega a domicilio',
  PICKUP: 'Recoger en tienda',
};

const ACTIVE_STATUSES = new Set(['PENDING', 'CONFIRMED', 'READY', 'OUT_FOR_DELIVERY']);
const TIME_ZONE = 'America/Mexico_City';
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

const dayKeyFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const humanDayFormatter = new Intl.DateTimeFormat('es-MX', {
  timeZone: TIME_ZONE,
  day: '2-digit',
  month: 'long',
  year: 'numeric',
});

const dateTimeFormatter = new Intl.DateTimeFormat('es-MX', {
  timeZone: TIME_ZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const moneyFormatter = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  minimumFractionDigits: 2,
});

const countFormatter = new Intl.NumberFormat('es-MX');

export function formatMoneyCents(cents: number) {
  return moneyFormatter.format((Number(cents) || 0) / 100);
}

export function formatCount(value: number) {
  return countFormatter.format(Number(value) || 0);
}

export function formatPercent(value: number) {
  return `${(Number(value) || 0).toFixed(1)}%`;
}

export function displayMetric(value: string | number, kind: MetricKind) {
  if (kind === 'money') return formatMoneyCents(Number(value));
  if (kind === 'count') return formatCount(Number(value));
  if (kind === 'percent') return formatPercent(Number(value));
  return String(value ?? '');
}

export function formatDateTime(value: Date | string) {
  return dateTimeFormatter.format(new Date(value));
}

export function todayMexico() {
  return dayKeyFormatter.format(new Date());
}

export function addDays(day: string, amount: number) {
  const [year, month, date] = day.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, date + amount)).toISOString().slice(0, 10);
}

export function isValidDay(value: string | null | undefined): value is string {
  if (!value || !DAY_RE.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00.000-06:00`);
  return !Number.isNaN(parsed.getTime());
}

export function dayKey(value: Date | string) {
  return dayKeyFormatter.format(new Date(value));
}

function dayStart(day: string) {
  return new Date(`${day}T00:00:00.000-06:00`);
}

function dayEnd(day: string) {
  return new Date(`${day}T23:59:59.999-06:00`);
}

function humanDay(day: string) {
  return humanDayFormatter.format(new Date(`${day}T12:00:00.000-06:00`));
}

function countDays(from: string, to: string) {
  const start = Date.parse(`${from}T12:00:00.000Z`);
  const end = Date.parse(`${to}T12:00:00.000Z`);
  return Math.round((end - start) / 86400000) + 1;
}

export interface InformeFilters {
  report: ReportKey;
  from: string;
  to: string;
  storeId: string;
  status: string;
}

export function parseInformeFilters(searchParams: URLSearchParams): InformeFilters {
  const fallbackTo = todayMexico();
  const to = isValidDay(searchParams.get('to')) ? (searchParams.get('to') as string) : fallbackTo;
  const from = isValidDay(searchParams.get('from')) ? (searchParams.get('from') as string) : addDays(to, -29);
  const [start, end] = from <= to ? [from, to] : [to, from];

  const rawReport = searchParams.get('report');
  const report = REPORT_KEYS.includes(rawReport as ReportKey) ? (rawReport as ReportKey) : 'resumen';

  const rawStatus = searchParams.get('status') || 'all';
  const status = (ORDER_STATUSES as readonly string[]).includes(rawStatus) ? rawStatus : 'all';

  return {
    report,
    from: start,
    to: end,
    storeId: searchParams.get('storeId') || 'all',
    status,
  };
}

export interface InformeOrder {
  id: string;
  code: string;
  createdAt: string;
  storeId: string;
  storeName: string;
  status: string;
  statusLabel: string;
  fulfillmentType: string;
  fulfillmentLabel: string;
  paymentMethod: string;
  paymentVerified: boolean;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  notes: string;
  itemCount: number;
  itemsLabel: string;
  subtotalCents: number;
  deliveryCents: number;
  couponDiscountCents: number;
  commissionCents: number;
  vendorPayoutCents: number;
  totalCents: number;
}

export interface InformeKpi {
  key: string;
  label: string;
  hint: string;
  value: number;
  kind: MetricKind;
}

export interface InformeDailyRow {
  date: string;
  orders: number;
  completed: number;
  cancelled: number;
  salesCents: number;
  deliveryCents: number;
  membershipCents: number;
}

export interface InformeStoreRow {
  storeId: string;
  storeName: string;
  orders: number;
  completed: number;
  cancelled: number;
  salesCents: number;
  deliveryCents: number;
  commissionCents: number;
  vendorPayoutCents: number;
  membershipCents: number;
  marginCents: number;
}

export interface InformeProductRow {
  name: string;
  storeName: string;
  quantity: number;
  revenueCents: number;
}

export interface InformeCustomerRow {
  customerName: string;
  orders: number;
  totalCents: number;
  averageCents: number;
  lastOrderAt: string;
}

export interface InformeTotals {
  orders: number;
  totalCents: number;
  subtotalCents: number;
  deliveryCents: number;
  shippingCents: number;
  commissionCents: number;
  vendorPayoutCents: number;
  couponDiscountCents: number;
}

export interface Informe {
  filters: InformeFilters;
  reportLabel: string;
  periodLabel: string;
  generatedAt: string;
  generatedAtLabel: string;
  scope: string[];
  orders: InformeOrder[];
  kpis: InformeKpi[];
  daily: InformeDailyRow[];
  byStore: InformeStoreRow[];
  topProducts: InformeProductRow[];
  topCustomers: InformeCustomerRow[];
  totals: InformeTotals;
}

function sumBy<T>(items: T[], pick: (item: T) => number) {
  return items.reduce((total, item) => total + (pick(item) || 0), 0);
}

function subtotalOf(order: any) {
  if (typeof order.subtotalCents === 'number' && order.subtotalCents > 0) return order.subtotalCents;
  return Math.max(0, (order.totalCents || 0) - (order.deliveryCents || 0) - (order.couponDiscountCents || 0));
}

function statusLabel(status: string) {
  return STATUS_LABELS[status] || status;
}

function emptyDaily(date: string): InformeDailyRow {
  return { date, orders: 0, completed: 0, cancelled: 0, salesCents: 0, deliveryCents: 0, membershipCents: 0 };
}

export async function buildInforme(searchParams: URLSearchParams): Promise<Informe> {
  const filters = parseInformeFilters(searchParams);

  const where: any = { createdAt: { gte: dayStart(filters.from), lte: dayEnd(filters.to) } };
  if (filters.storeId !== 'all') where.storeId = filters.storeId;
  if (filters.status !== 'all') where.status = filters.status;

  const receiptWhere: any = {
    issuedAt: { gte: dayStart(filters.from), lte: dayEnd(filters.to) },
    status: 'PAID',
  };
  if (filters.storeId !== 'all') receiptWhere.storeId = filters.storeId;

  const [orders, receipts] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        store: { select: { id: true, name: true } },
        items: { select: { name: true, quantity: true, priceCents: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.paymentReceipt.findMany({
      where: receiptWhere,
      select: {
        amountCents: true,
        issuedAt: true,
        storeId: true,
        store: { select: { name: true } },
      },
      orderBy: { issuedAt: 'desc' },
    }),
  ]);

  const orderList = orders as any[];

  const orderRows: InformeOrder[] = orderList.map((order) => {
    const items = Array.isArray(order.items) ? order.items : [];
    const itemCount = items.reduce((total: number, item: any) => total + (item.quantity || 0), 0);
    return {
      id: order.id,
      code: `#${String(order.id).slice(-6).toUpperCase()}`,
      createdAt: new Date(order.createdAt).toISOString(),
      storeId: order.storeId,
      storeName: order.store?.name || 'Sin tienda',
      status: order.status,
      statusLabel: statusLabel(order.status),
      fulfillmentType: order.fulfillmentType,
      fulfillmentLabel: FULFILLMENT_LABELS[order.fulfillmentType] || order.fulfillmentType,
      paymentMethod: order.paymentMethod || '',
      paymentVerified: Boolean(order.paymentVerified),
      customerName: order.customerName || 'Sin nombre',
      customerPhone: order.customerPhone || '',
      customerAddress: order.customerAddress || '',
      notes: order.notes || '',
      itemCount,
      itemsLabel: items.map((item: any) => `${item.quantity || 0} × ${item.name}`).join(', '),
      subtotalCents: subtotalOf(order),
      deliveryCents: order.deliveryCents || 0,
      couponDiscountCents: order.couponDiscountCents || 0,
      commissionCents: order.commissionCents || 0,
      vendorPayoutCents: order.vendorPayoutCents || 0,
      totalCents: order.totalCents || 0,
    };
  });

  const completed = orderRows.filter((order) => order.status === 'COMPLETED');
  const cancelled = orderRows.filter((order) => order.status === 'CANCELLED');
  const active = orderRows.filter((order) => ACTIVE_STATUSES.has(order.status));

  const salesCents = sumBy(completed, (order) => order.totalCents);
  const deliveryCents = sumBy(completed, (order) => order.deliveryCents);
  const commissionCents = sumBy(completed, (order) => order.commissionCents);
  const vendorPayoutCents = sumBy(completed, (order) => order.vendorPayoutCents);
  const couponDiscountCents = sumBy(completed, (order) => order.couponDiscountCents);
  const membershipCents = sumBy(receipts as any[], (receipt) => receipt.amountCents);
  const totalOrders = orderRows.length;
  const cancellationRate = totalOrders > 0 ? (cancelled.length / totalOrders) * 100 : 0;
  const averageTicketCents = completed.length > 0 ? Math.round(salesCents / completed.length) : 0;
  const platformMarginCents = commissionCents + membershipCents;
  const uniqueCustomers = new Set(
    completed.map((order) => order.customerPhone || order.customerName.toLowerCase())
  ).size;

  const totals: InformeTotals = {
    orders: totalOrders,
    totalCents: sumBy(orderRows, (order) => order.totalCents),
    subtotalCents: sumBy(orderRows, (order) => order.subtotalCents),
    deliveryCents: sumBy(orderRows, (order) => order.deliveryCents),
    shippingCents: sumBy(orderRows, (order) => order.deliveryCents),
    commissionCents: sumBy(orderRows, (order) => order.commissionCents),
    vendorPayoutCents: sumBy(orderRows, (order) => order.vendorPayoutCents),
    couponDiscountCents: sumBy(orderRows, (order) => order.couponDiscountCents),
  };

  const kpis: InformeKpi[] = [
    {
      key: 'ventas',
      label: 'Ventas brutas',
      hint: 'Pedidos completados en el periodo',
      value: salesCents,
      kind: 'money',
    },
    {
      key: 'membresias',
      label: 'Membresías',
      hint: 'Recibos pagados en el periodo',
      value: membershipCents,
      kind: 'money',
    },
    {
      key: 'ingresos',
      label: 'Ingresos totales',
      hint: 'Ventas brutas + membresías',
      value: salesCents + membershipCents,
      kind: 'money',
    },
    {
      key: 'salidas',
      label: 'Salidas a vendedores',
      hint: 'Pagos a tiendas por pedidos completados',
      value: vendorPayoutCents,
      kind: 'money',
    },
    {
      key: 'envios',
      label: 'Envíos cobrados',
      hint: 'Cargos de entrega en pedidos completados',
      value: deliveryCents,
      kind: 'money',
    },
    {
      key: 'utilidad',
      label: 'Utilidad de plataforma',
      hint: 'Comisión + membresías',
      value: platformMarginCents,
      kind: 'money',
    },
    {
      key: 'pedidos',
      label: 'Pedidos totales',
      hint: 'Todos los estados',
      value: totalOrders,
      kind: 'count',
    },
    {
      key: 'completados',
      label: 'Completados',
      hint: 'Pedidos entregados o recogidos',
      value: completed.length,
      kind: 'count',
    },
    {
      key: 'cancelados',
      label: 'Cancelados',
      hint: 'Pedidos cancelados',
      value: cancelled.length,
      kind: 'count',
    },
    {
      key: 'activos',
      label: 'En proceso',
      hint: 'Pendientes, confirmados, listos o en camino',
      value: active.length,
      kind: 'count',
    },
    {
      key: 'tasa-cancelacion',
      label: 'Tasa de cancelación',
      hint: 'Cancelados sobre pedidos totales',
      value: cancellationRate,
      kind: 'percent',
    },
    {
      key: 'ticket',
      label: 'Ticket promedio',
      hint: 'Ventas brutas entre pedidos completados',
      value: averageTicketCents,
      kind: 'money',
    },
    {
      key: 'cupones',
      label: 'Descuentos por cupón',
      hint: 'Absorbidos por la plataforma',
      value: couponDiscountCents,
      kind: 'money',
    },
    {
      key: 'clientes',
      label: 'Clientes únicos',
      hint: 'Compradores con pedidos completados',
      value: uniqueCustomers,
      kind: 'count',
    },
    {
      key: 'entrega',
      label: 'Pedidos a domicilio',
      hint: 'Completados con entrega',
      value: completed.filter((order) => order.fulfillmentType === 'DELIVERY').length,
      kind: 'count',
    },
    {
      key: 'recoger',
      label: 'Pedidos para recoger',
      hint: 'Completados en tienda',
      value: completed.filter((order) => order.fulfillmentType === 'PICKUP').length,
      kind: 'count',
    },
  ];

  const dailyMap = new Map<string, InformeDailyRow>();
  const getDaily = (date: string) => {
    const current = dailyMap.get(date);
    if (current) return current;
    const created = emptyDaily(date);
    dailyMap.set(date, created);
    return created;
  };

  for (const order of orderRows) {
    const current = getDaily(dayKey(order.createdAt));
    current.orders += 1;
    if (order.status === 'COMPLETED') {
      current.completed += 1;
      current.salesCents += order.totalCents;
      current.deliveryCents += order.deliveryCents;
    }
    if (order.status === 'CANCELLED') current.cancelled += 1;
  }

  for (const receipt of receipts as any[]) {
    const current = getDaily(dayKey(receipt.issuedAt));
    current.membershipCents += receipt.amountCents || 0;
  }

  let daily: InformeDailyRow[];
  if (countDays(filters.from, filters.to) <= 400) {
    daily = [];
    for (let day = filters.from; day <= filters.to; day = addDays(day, 1)) {
      daily.push(dailyMap.get(day) || emptyDaily(day));
    }
  } else {
    daily = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  }

  const storeMap = new Map<string, InformeStoreRow>();
  const getStore = (storeId: string, storeName: string) => {
    const key = storeId || storeName;
    const current = storeMap.get(key);
    if (current) return current;
    const created: InformeStoreRow = {
      storeId,
      storeName: storeName || 'Sin tienda',
      orders: 0,
      completed: 0,
      cancelled: 0,
      salesCents: 0,
      deliveryCents: 0,
      commissionCents: 0,
      vendorPayoutCents: 0,
      membershipCents: 0,
      marginCents: 0,
    };
    storeMap.set(key, created);
    return created;
  };

  for (const order of orderRows) {
    const current = getStore(order.storeId, order.storeName);
    current.orders += 1;
    if (order.status === 'COMPLETED') {
      current.completed += 1;
      current.salesCents += order.totalCents;
      current.deliveryCents += order.deliveryCents;
      current.commissionCents += order.commissionCents;
      current.vendorPayoutCents += order.vendorPayoutCents;
    }
    if (order.status === 'CANCELLED') current.cancelled += 1;
  }

  for (const receipt of receipts as any[]) {
    const current = getStore(receipt.storeId, receipt.store?.name || 'Sin tienda');
    current.membershipCents += receipt.amountCents || 0;
  }

  const byStore = Array.from(storeMap.values())
    .map((row) => ({ ...row, marginCents: row.commissionCents + row.membershipCents }))
    .sort((a, b) => b.salesCents - a.salesCents || b.orders - a.orders);

  const productMap = new Map<string, InformeProductRow>();
  for (const order of orderList) {
    if (order.status === 'CANCELLED') continue;
    for (const item of order.items || []) {
      const key = `${order.storeId}::${item.name}`;
      const current = productMap.get(key) || {
        name: item.name,
        storeName: order.store?.name || 'Sin tienda',
        quantity: 0,
        revenueCents: 0,
      };
      current.quantity += item.quantity || 0;
      current.revenueCents += (item.priceCents || 0) * (item.quantity || 0);
      productMap.set(key, current);
    }
  }
  const topProducts = Array.from(productMap.values())
    .sort((a, b) => b.revenueCents - a.revenueCents || b.quantity - a.quantity)
    .slice(0, 300);

  const customerMap = new Map<string, InformeCustomerRow>();
  for (const order of orderRows) {
    if (order.status === 'CANCELLED') continue;
    const key = order.customerPhone || order.customerName.toLowerCase();
    const current = customerMap.get(key) || {
      customerName: order.customerName,
      orders: 0,
      totalCents: 0,
      averageCents: 0,
      lastOrderAt: order.createdAt,
    };
    current.orders += 1;
    current.totalCents += order.totalCents;
    if (order.createdAt > current.lastOrderAt) current.lastOrderAt = order.createdAt;
    customerMap.set(key, current);
  }
  const topCustomers = Array.from(customerMap.values())
    .map((row) => ({ ...row, averageCents: row.orders > 0 ? Math.round(row.totalCents / row.orders) : 0 }))
    .sort((a, b) => b.totalCents - a.totalCents)
    .slice(0, 300);

  let storeName: string | undefined;
  if (filters.storeId !== 'all') {
    storeName =
      byStore.find((row) => row.storeId === filters.storeId)?.storeName ||
      (await prisma.store.findUnique({ where: { id: filters.storeId }, select: { name: true } }))?.name;
  }

  const scope: string[] = [];
  if (filters.report !== 'resumen') scope.push(`Informe: ${REPORT_LABELS[filters.report]}`);
  scope.push(`Periodo: ${humanDay(filters.from)}${filters.from === filters.to ? '' : ` al ${humanDay(filters.to)}`}`);
  if (storeName) scope.push(`Tienda: ${storeName}`);
  if (filters.status !== 'all') scope.push(`Estado: ${statusLabel(filters.status)}`);

  return {
    filters,
    reportLabel: REPORT_LABELS[filters.report],
    periodLabel:
      filters.from === filters.to
        ? humanDay(filters.from)
        : `${humanDay(filters.from)} al ${humanDay(filters.to)}`,
    generatedAt: new Date().toISOString(),
    generatedAtLabel: dateTimeFormatter.format(new Date()),
    scope,
    orders: orderRows,
    kpis,
    daily,
    byStore,
    topProducts,
    topCustomers,
    totals,
  };
}
