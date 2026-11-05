'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Button, Card, CardContent, Input } from '@/components/ui/design-system';

type ReportType = 'resumen' | 'ventas' | 'productos' | 'pedidos' | 'clientes' | 'costos';
type MetricKind = 'text' | 'money' | 'count' | 'percent';
type ExportFormat = 'xlsx' | 'csv' | 'pdf' | 'doc';

interface Kpi {
  key: string;
  label: string;
  hint: string;
  value: number;
  kind: MetricKind;
}

interface OrderRow {
  id: string;
  code: string;
  createdAt: string;
  storeName: string;
  status: string;
  statusLabel: string;
  fulfillmentLabel: string;
  customerName: string;
  customerPhone: string;
  paymentMethod: string;
  paymentVerified: boolean;
  itemCount: number;
  itemsLabel: string;
  totalCents: number;
  deliveryCents: number;
  couponDiscountCents: number;
  commissionCents: number;
  vendorPayoutCents: number;
  subtotalCents: number;
}

interface TopProductRow {
  name: string;
  storeName: string;
  quantity: number;
  revenueCents: number;
}

interface CustomerRow {
  customerName: string;
  orders: number;
  totalCents: number;
  averageCents: number;
  lastOrderAt: string;
}

interface DailyRow {
  date: string;
  orders: number;
  completed: number;
  cancelled: number;
  salesCents: number;
  deliveryCents: number;
  membershipCents: number;
}

interface StoreRow {
  storeId: string;
  storeName: string;
  orders: number;
  completed: number;
  cancelled: number;
  salesCents: number;
  deliveryCents: number;
  vendorPayoutCents: number;
  membershipCents: number;
  marginCents: number;
}

interface Summary {
  orders: OrderRow[];
  topProducts?: TopProductRow[];
  topCustomers?: CustomerRow[];
  kpis: Kpi[];
  daily: DailyRow[];
  byStore: StoreRow[];
  period: string;
  generatedAt: string;
  totals: {
    orders: number;
    totalCents: number;
    shippingCents: number;
    commissionCents: number;
    vendorPayoutCents: number;
    deliveryCents: number;
    subtotalCents: number;
  };
}

const REPORTS: { key: ReportType; label: string; desc: string }[] = [
  { key: 'resumen', label: 'Resumen', desc: 'KPIs, serie diaria y tiendas' },
  { key: 'ventas', label: 'Ventas', desc: 'Pedidos con montos y comisiones' },
  { key: 'pedidos', label: 'Pedidos', desc: 'Detalle operativo de pedidos' },
  { key: 'productos', label: 'Productos', desc: 'Productos más vendidos' },
  { key: 'clientes', label: 'Clientes', desc: 'Mejores compradores' },
  { key: 'costos', label: 'Costos y envíos', desc: 'Envío, cupones y pagos' },
];

const STATUSES: { value: string; label: string }[] = [
  { value: 'PENDING', label: 'Pendiente' },
  { value: 'CONFIRMED', label: 'Confirmado' },
  { value: 'READY', label: 'Listo' },
  { value: 'OUT_FOR_DELIVERY', label: 'En camino' },
  { value: 'COMPLETED', label: 'Completado' },
  { value: 'CANCELLED', label: 'Cancelado' },
];

const PRESETS: { key: string; label: string }[] = [
  { key: 'hoy', label: 'Hoy' },
  { key: '7d', label: '7 días' },
  { key: '30d', label: '30 días' },
  { key: 'mes', label: 'Este mes' },
  { key: 'mes-anterior', label: 'Mes anterior' },
  { key: 'anio', label: 'Este año' },
];

const EXPORTS: { format: ExportFormat; label: string }[] = [
  { format: 'xlsx', label: 'Excel' },
  { format: 'csv', label: 'CSV' },
  { format: 'pdf', label: 'PDF' },
  { format: 'doc', label: 'Word' },
];

function todayMexico() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function addDays(day: string, amount: number) {
  const [year, month, date] = day.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, date + amount)).toISOString().slice(0, 10);
}

function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function presetRange(preset: string) {
  const today = todayMexico();
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7));

  if (preset === 'hoy') return { from: today, to: today };
  if (preset === '7d') return { from: addDays(today, -6), to: today };
  if (preset === '30d') return { from: addDays(today, -29), to: today };
  if (preset === 'mes') return { from: `${today.slice(0, 7)}-01`, to: today };
  if (preset === 'anio') return { from: `${year}-01-01`, to: today };

  const previousMonth = month === 1 ? 12 : month - 1;
  const previousYear = month === 1 ? year - 1 : year;
  const prefix = `${previousYear}-${String(previousMonth).padStart(2, '0')}`;
  return { from: `${prefix}-01`, to: `${prefix}-${daysInMonth(previousYear, previousMonth)}` };
}

function money(cents: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format((cents || 0) / 100);
}

function number(value: number) {
  return new Intl.NumberFormat('es-MX').format(value || 0);
}

function metric(value: number, kind: MetricKind) {
  if (kind === 'money') return money(value);
  if (kind === 'count') return number(value);
  if (kind === 'percent') return `${(value || 0).toFixed(1)}%`;
  return String(value);
}

function shortDate(value: string) {
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

function dateTime(value: string) {
  return new Intl.DateTimeFormat('es-MX', {
    timeZone: 'America/Mexico_City',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value));
}

function statusTone(status: string) {
  if (status === 'COMPLETED') return 'bg-[var(--success-soft)] text-[var(--success)]';
  if (status === 'CANCELLED') return 'bg-[var(--danger-soft)] text-[var(--danger)]';
  if (status === 'OUT_FOR_DELIVERY') return 'bg-[var(--info-soft)] text-[var(--info)]';
  return 'bg-[var(--warning-soft)] text-[var(--warning)]';
}

async function copyText(text: string) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    void 0;
  }

  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.top = '0';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  } catch {
    return false;
  }
}

export default function InformesClient({ stores }: { stores: { id: string; name: string }[] }) {
  const initialRange = useMemo(() => presetRange('30d'), []);
  const [report, setReport] = useState<ReportType>('resumen');
  const [from, setFrom] = useState(initialRange.from);
  const [to, setTo] = useState(initialRange.to);
  const [activePreset, setActivePreset] = useState('30d');
  const [storeId, setStoreId] = useState('all');
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState<Summary | null>(null);
  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const [notice, setNotice] = useState<{ text: string; url?: string } | null>(null);

  const params = useMemo(() => {
    const search = new URLSearchParams();
    search.set('report', report);
    if (from) search.set('from', from);
    if (to) search.set('to', to);
    if (storeId !== 'all') search.set('storeId', storeId);
    if (status !== 'all') search.set('status', status);
    return search;
  }, [report, from, to, storeId, status]);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError('');
      try {
        const response = await fetch(`/api/admin/informes/ventas?${params.toString()}`, {
          signal,
          cache: 'no-store',
        });
        if (response.status === 401 || response.status === 403) {
          setError('Tu sesión expiró. Vuelve a iniciar sesión.');
          setSummary(null);
          return;
        }
        const data = await response.json();
        if (data.ok) {
          setSummary(data.summary);
        } else {
          setError(data.error || 'No se pudo generar el informe.');
          setSummary(null);
        }
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        setError('No se pudo conectar con el servidor. Revisa tu conexión e intenta de nuevo.');
        setSummary(null);
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [params]
  );

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const applyPreset = (preset: string) => {
    const range = presetRange(preset);
    setFrom(range.from);
    setTo(range.to);
    setActivePreset(preset);
  };

  const download = async (format: ExportFormat) => {
    setExporting(format);
    setError('');
    setNotice(null);
    try {
      if (Capacitor.isNativePlatform()) {
        const linkRes = await fetch('/api/admin/informes/export-link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: params.toString(), format }),
        });
        const linkData = await linkRes.json().catch(() => null);
        if (!linkRes.ok || !linkData?.ok || !linkData?.url) throw new Error('export');

        const url = String(linkData.url);
        const copied = await copyText(url);

        try {
          const { AppLauncher } = await import('@capacitor/app-launcher');
          await AppLauncher.openUrl({ url });
          setNotice({
            text: 'Se abrió el navegador del teléfono para descargar el archivo. El enlace vence en 10 minutos.',
          });
        } catch {
          setNotice({
            text: copied
              ? 'El enlace de descarga ya está copiado. Abre Chrome en el teléfono, pégalo en la barra de direcciones y el archivo se descargará. Vence en 10 minutos.'
              : 'Copia el enlace, ábrelo en Chrome en este teléfono y el archivo se descargará. Vence en 10 minutos.',
            url,
          });
        }
        return;
      }

      const response = await fetch(`/api/admin/informes/export?${params.toString()}&format=${format}`);
      if (!response.ok) throw new Error('export');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `informe_${report}_${from}_${to}.${format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch {
      setError('No se pudo generar la descarga. Intenta de nuevo en unos segundos.');
    } finally {
      setExporting(null);
    }
  };

  const renderOrdersTable = () => {
    const rows = summary?.orders ?? [];
    const isPedidos = report === 'pedidos';

    return (
      <table className="min-w-full text-sm">
        <caption className="sr-only">Detalle de pedidos del periodo seleccionado</caption>
        <thead className="bg-[var(--surface-2)]">
          <tr>
            <th scope="col" className="px-3 py-2 text-left font-medium">Fecha</th>
            <th scope="col" className="px-3 py-2 text-left font-medium">Pedido</th>
            <th scope="col" className="px-3 py-2 text-left font-medium">Tienda</th>
            <th scope="col" className="px-3 py-2 text-left font-medium">Cliente</th>
            {isPedidos && <th scope="col" className="px-3 py-2 text-left font-medium">Teléfono</th>}
            <th scope="col" className="px-3 py-2 text-left font-medium">Estado</th>
            <th scope="col" className="px-3 py-2 text-left font-medium">Tipo</th>
            {isPedidos && <th scope="col" className="px-3 py-2 text-left font-medium">Artículos</th>}
            {!isPedidos && <th scope="col" className="px-3 py-2 text-right font-medium">Subtotal</th>}
            {!isPedidos && <th scope="col" className="px-3 py-2 text-right font-medium">Envío</th>}
            {!isPedidos && <th scope="col" className="px-3 py-2 text-right font-medium">Cupón</th>}
            {report === 'costos' && <th scope="col" className="px-3 py-2 text-right font-medium">Comisión</th>}
            {report === 'ventas' && <th scope="col" className="px-3 py-2 text-right font-medium">A vendedor</th>}
            <th scope="col" className="px-3 py-2 text-right font-medium">Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((order) => (
            <tr key={order.id} className="border-t border-[var(--border)]">
              <td className="whitespace-nowrap px-3 py-2">{dateTime(order.createdAt)}</td>
              <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">{order.code}</td>
              <td className="max-w-[190px] truncate px-3 py-2" title={order.storeName}>{order.storeName}</td>
              <td className="max-w-[190px] truncate px-3 py-2" title={order.customerName}>{order.customerName}</td>
              {isPedidos && <td className="whitespace-nowrap px-3 py-2">{order.customerPhone || '—'}</td>}
              <td className="whitespace-nowrap px-3 py-2">
                <span className={'inline-flex rounded-full px-2 py-0.5 text-xs font-medium ' + statusTone(order.status)}>
                  {order.statusLabel}
                </span>
              </td>
              <td className="whitespace-nowrap px-3 py-2">{order.fulfillmentLabel}</td>
              {isPedidos && (
                <td className="max-w-[240px] truncate px-3 py-2" title={order.itemsLabel}>
                  {order.itemsLabel || `${order.itemCount} artículo(s)`}
                </td>
              )}
              {!isPedidos && <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{money(order.subtotalCents)}</td>}
              {!isPedidos && <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{money(order.deliveryCents)}</td>}
              {!isPedidos && <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{money(order.couponDiscountCents)}</td>}
              {report === 'costos' && <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{money(order.commissionCents)}</td>}
              {report === 'ventas' && <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{money(order.vendorPayoutCents)}</td>}
              <td className="whitespace-nowrap px-3 py-2 text-right font-medium tabular-nums">{money(order.totalCents)}</td>
            </tr>
          ))}
          {rows.length === 0 && !loading && (
            <tr>
              <td colSpan={12} className="px-4 py-10 text-center text-[color:var(--muted)]">
                Sin pedidos para los filtros seleccionados.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    );
  };

  const renderProductsTable = () => {
    const rows = summary?.topProducts ?? [];
    return (
      <table className="min-w-full text-sm">
        <caption className="sr-only">Productos más vendidos del periodo seleccionado</caption>
        <thead className="bg-[var(--surface-2)]">
          <tr>
            <th scope="col" className="px-3 py-2 text-left font-medium">Producto</th>
            <th scope="col" className="px-3 py-2 text-left font-medium">Tienda</th>
            <th scope="col" className="px-3 py-2 text-right font-medium">Cantidad</th>
            <th scope="col" className="px-3 py-2 text-right font-medium">Ingresos</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((product, index) => (
            <tr key={`${product.storeName}-${product.name}-${index}`} className="border-t border-[var(--border)]">
              <td className="px-3 py-2">{product.name}</td>
              <td className="px-3 py-2">{product.storeName}</td>
              <td className="px-3 py-2 text-right tabular-nums">{number(product.quantity)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{money(product.revenueCents)}</td>
            </tr>
          ))}
          {rows.length === 0 && !loading && (
            <tr>
              <td colSpan={4} className="px-4 py-10 text-center text-[color:var(--muted)]">
                Sin productos vendidos en el periodo.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    );
  };

  const renderCustomersTable = () => {
    const rows = summary?.topCustomers ?? [];
    return (
      <table className="min-w-full text-sm">
        <caption className="sr-only">Clientes con mayor consumo en el periodo seleccionado</caption>
        <thead className="bg-[var(--surface-2)]">
          <tr>
            <th scope="col" className="px-3 py-2 text-left font-medium">Cliente</th>
            <th scope="col" className="px-3 py-2 text-right font-medium">Pedidos</th>
            <th scope="col" className="px-3 py-2 text-right font-medium">Total</th>
            <th scope="col" className="px-3 py-2 text-right font-medium">Ticket promedio</th>
            <th scope="col" className="px-3 py-2 text-left font-medium">Último pedido</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((customer, index) => (
            <tr key={`${customer.customerName}-${index}`} className="border-t border-[var(--border)]">
              <td className="px-3 py-2">{customer.customerName}</td>
              <td className="px-3 py-2 text-right tabular-nums">{number(customer.orders)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{money(customer.totalCents)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{money(customer.averageCents)}</td>
              <td className="whitespace-nowrap px-3 py-2">{dateTime(customer.lastOrderAt)}</td>
            </tr>
          ))}
          {rows.length === 0 && !loading && (
            <tr>
              <td colSpan={5} className="px-4 py-10 text-center text-[color:var(--muted)]">
                Sin clientes con pedidos en el periodo.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    );
  };

  const renderDailyTable = () => {
    const rows = summary?.daily ?? [];
    return (
      <table className="min-w-full text-sm">
        <caption className="sr-only">Serie diaria de pedidos, ventas y membresías</caption>
        <thead className="bg-[var(--surface-2)]">
          <tr>
            <th scope="col" className="px-3 py-2 text-left font-medium">Fecha</th>
            <th scope="col" className="px-3 py-2 text-right font-medium">Pedidos</th>
            <th scope="col" className="px-3 py-2 text-right font-medium">Completados</th>
            <th scope="col" className="px-3 py-2 text-right font-medium">Cancelados</th>
            <th scope="col" className="px-3 py-2 text-right font-medium">Ventas</th>
            <th scope="col" className="px-3 py-2 text-right font-medium">Envíos</th>
            <th scope="col" className="px-3 py-2 text-right font-medium">Membresías</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.date} className="border-t border-[var(--border)]">
              <td className="whitespace-nowrap px-3 py-2">{shortDate(row.date)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{number(row.orders)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{number(row.completed)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{number(row.cancelled)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{money(row.salesCents)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{money(row.deliveryCents)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{money(row.membershipCents)}</td>
            </tr>
          ))}
          {rows.length === 0 && !loading && (
            <tr>
              <td colSpan={7} className="px-4 py-10 text-center text-[color:var(--muted)]">
                Sin movimientos en el periodo.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    );
  };

  const renderStoreTable = () => {
    const rows = summary?.byStore ?? [];
    return (
      <table className="min-w-full text-sm">
        <caption className="sr-only">Resultados por tienda en el periodo seleccionado</caption>
        <thead className="bg-[var(--surface-2)]">
          <tr>
            <th scope="col" className="px-3 py-2 text-left font-medium">Tienda</th>
            <th scope="col" className="px-3 py-2 text-right font-medium">Pedidos</th>
            <th scope="col" className="px-3 py-2 text-right font-medium">Completados</th>
            <th scope="col" className="px-3 py-2 text-right font-medium">Ventas</th>
            <th scope="col" className="px-3 py-2 text-right font-medium">Envíos</th>
            <th scope="col" className="px-3 py-2 text-right font-medium">A vendedores</th>
            <th scope="col" className="px-3 py-2 text-right font-medium">Membresías</th>
            <th scope="col" className="px-3 py-2 text-right font-medium">Utilidad</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.storeId || row.storeName} className="border-t border-[var(--border)]">
              <td className="px-3 py-2">{row.storeName}</td>
              <td className="px-3 py-2 text-right tabular-nums">{number(row.orders)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{number(row.completed)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{money(row.salesCents)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{money(row.deliveryCents)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{money(row.vendorPayoutCents)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{money(row.membershipCents)}</td>
              <td className="px-3 py-2 text-right font-medium tabular-nums">{money(row.marginCents)}</td>
            </tr>
          ))}
          {rows.length === 0 && !loading && (
            <tr>
              <td colSpan={8} className="px-4 py-10 text-center text-[color:var(--muted)]">
                Sin actividad por tienda en el periodo.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    );
  };

  return (
    <main className="w-full">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Informes</h1>
          <p className="mt-1 text-sm text-[color:var(--muted)]">
            KPIs de ventas, ingresos, salidas y operación. Descarga el informe completo en Excel, CSV, PDF o Word.
          </p>
          {summary && (
            <p className="mt-2 text-xs text-[color:var(--muted)]">
              Periodo: {summary.period} · Actualizado: {summary.generatedAt}
            </p>
          )}
        </div>
        <div role="group" aria-label="Exportar informe" className="flex flex-wrap gap-2">
          {EXPORTS.map((option) => (
            <Button
              key={option.format}
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => download(option.format)}
              loading={exporting === option.format}
              disabled={exporting !== null || loading}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      <div role="group" aria-label="Tipo de informe" className="mb-4 flex flex-wrap gap-2">
        {REPORTS.map((item) => {
          const selected = report === item.key;
          return (
            <button
              key={item.key}
              type="button"
              aria-pressed={selected}
              onClick={() => setReport(item.key)}
              className={
                'rounded-xl border px-3 py-2 text-left text-sm transition ' +
                (selected
                  ? 'border-[var(--accent)] bg-[var(--accent-soft)] font-semibold text-[var(--accent-strong)]'
                  : 'border-[var(--border)] hover:bg-[var(--surface-2)]')
              }
            >
              <span className="block">{item.label}</span>
              <span className="block text-xs font-normal text-[color:var(--muted)]">{item.desc}</span>
            </button>
          );
        })}
      </div>

      <Card className="mb-5">
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-[color:var(--muted)]">Rango rápido</span>
            {PRESETS.map((preset) => (
              <button
                key={preset.key}
                type="button"
                aria-pressed={activePreset === preset.key}
                onClick={() => applyPreset(preset.key)}
                className={
                  'rounded-full border px-3 py-1 text-xs transition ' +
                  (activePreset === preset.key
                    ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--on-accent)]'
                    : 'border-[var(--border)] hover:bg-[var(--surface-2)]')
                }
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Input
              label="Desde"
              type="date"
              value={from}
              max={to}
              onChange={(event) => {
                setFrom(event.target.value);
                setActivePreset('');
              }}
            />
            <Input
              label="Hasta"
              type="date"
              value={to}
              min={from}
              onChange={(event) => {
                setTo(event.target.value);
                setActivePreset('');
              }}
            />
            <div className="space-y-1">
              <label htmlFor="informe-tienda" className="block text-sm font-medium">Tienda</label>
              <select
                id="informe-tienda"
                className="h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm"
                value={storeId}
                onChange={(event) => setStoreId(event.target.value)}
              >
                <option value="all">Todas las tiendas</option>
                {stores.map((store) => (
                  <option key={store.id} value={store.id}>{store.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label htmlFor="informe-estado" className="block text-sm font-medium">Estado del pedido</label>
              <select
                id="informe-estado"
                className="h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                <option value="all">Todos los estados</option>
                {STATUSES.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div aria-live="polite" className="sr-only">
        {loading ? 'Cargando informe' : summary ? `Informe cargado con ${summary.orders.length} pedidos` : ''}
      </div>

      {error && (
        <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--danger)]/30 bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">
          <span>{error}</span>
          <Button type="button" variant="secondary" size="sm" onClick={() => load()} disabled={loading}>
            Reintentar
          </Button>
        </div>
      )}

      {notice && (
        <div role="status" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--text)]">
          <span className="min-w-0 flex-1">
            {notice.text}
            {notice.url && (
              <span className="mt-2 block select-all break-all text-xs text-[color:var(--muted)]">
                {notice.url}
              </span>
            )}
          </span>
          {notice.url && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={async () => {
                const copied = await copyText(notice.url as string);
                setNotice({
                  text: copied
                    ? 'Enlace copiado. Ábrelo en Chrome para descargar el archivo. Vence en 10 minutos.'
                    : 'No se pudo copiar. Mantén presionado el enlace para copiarlo.',
                  url: notice.url,
                });
              }}
            >
              Copiar enlace
            </Button>
          )}
        </div>
      )}

      {loading && !summary && (
        <div className="mb-4 rounded-xl border border-[var(--border)] bg-[var(--card-bg)] px-4 py-10 text-center text-sm text-[color:var(--muted)]">
          Generando informe…
        </div>
      )}

      {summary && (
        <>
          <section aria-label="Indicadores del periodo" className="mb-6">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {summary.kpis.map((kpi) => (
                <Card key={kpi.key}>
                  <CardContent className="p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--muted)]">{kpi.label}</p>
                    <p className={'mt-1 text-xl font-semibold tabular-nums ' + (kpi.kind === 'money' ? 'text-[var(--accent-strong)]' : '')}>
                      {metric(kpi.value, kpi.kind)}
                    </p>
                    <p className="mt-1 text-xs text-[color:var(--muted)]">{kpi.hint}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {report === 'resumen' && (
            <div className="space-y-6">
              <Card>
                <CardContent className="p-0">
                  <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[var(--border)] px-4 py-3">
                    <h2 className="text-sm font-semibold">Serie diaria</h2>
                    <span className="text-xs text-[color:var(--muted)]">Pedidos, ventas y membresías por día</span>
                  </div>
                  <div className="max-h-[420px] overflow-auto">{renderDailyTable()}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-0">
                  <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[var(--border)] px-4 py-3">
                    <h2 className="text-sm font-semibold">Resultados por tienda</h2>
                    <span className="text-xs text-[color:var(--muted)]">Ventas completadas y membresías</span>
                  </div>
                  <div className="overflow-x-auto">{renderStoreTable()}</div>
                </CardContent>
              </Card>
            </div>
          )}

          {report === 'productos' && (
            <Card>
              <CardContent className="overflow-x-auto p-0">{renderProductsTable()}</CardContent>
            </Card>
          )}

          {report === 'clientes' && (
            <Card>
              <CardContent className="overflow-x-auto p-0">{renderCustomersTable()}</CardContent>
            </Card>
          )}

          {(report === 'ventas' || report === 'pedidos' || report === 'costos') && (
            <Card>
              <CardContent className="overflow-x-auto p-0">{renderOrdersTable()}</CardContent>
            </Card>
          )}
        </>
      )}
    </main>
  );
}
