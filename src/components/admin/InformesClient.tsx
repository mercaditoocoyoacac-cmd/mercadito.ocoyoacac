'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button, Card, CardContent, Input } from '@/components/ui/design-system';

type ReportType = 'ventas' | 'productos' | 'pedidos' | 'clientes' | 'costos';

interface OrderRow {
  id: string;
  createdAt: string;
  storeName: string;
  status: string;
  totalCents: number;
  shippingCents: number;
  commissionCents: number;
  vendorPayoutCents: number;
  customerName: string;
  deliveryCents: number;
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
}

interface Summary {
  orders: OrderRow[];
  topProducts?: TopProductRow[];
  topCustomers?: CustomerRow[];
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
  { key: 'ventas', label: 'Ventas', desc: 'Pedidos con montos y comisiones' },
  { key: 'productos', label: 'Productos', desc: 'Productos más vendidos' },
  { key: 'pedidos', label: 'Pedidos', desc: 'Detalle de todos los pedidos' },
  { key: 'clientes', label: 'Clientes', desc: 'Mejores compradores' },
  { key: 'costos', label: 'Costos y envíos', desc: 'Envío, delivery y comisiones' },
];

const STATUSES = ['PENDING', 'CONFIRMED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'];

export default function InformesClient({ stores }: { stores: { id: string; name: string }[] }) {
  const [report, setReport] = useState<ReportType>('ventas');
  const [from, setFrom] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [storeId, setStoreId] = useState<string>('all');
  const [status, setStatus] = useState<string>('all');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [summary, setSummary] = useState<Summary | null>(null);

  const buildParams = useCallback(() => {
    const params = new URLSearchParams();
    params.set('report', report);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (storeId !== 'all') params.set('storeId', storeId);
    if (status !== 'all') params.set('status', status);
    return params;
  }, [report, from, to, storeId, status]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/informes/ventas?' + buildParams().toString());
      const data = await res.json();
      if (data.ok) setSummary(data.summary);
      else setError(data.error || 'No se pudo generar el informe');
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  }, [buildParams]);

  useEffect(() => {
    load();
  }, [load]);

  const format = (c: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(c / 100);

  const download = async (format: 'xlsx' | 'doc' | 'pdf') => {
    if (format === 'xlsx') {
      const XLSX = await import('xlsx');
      const rows = summary?.orders.map(o => ({
        Fecha: new Date(o.createdAt).toLocaleDateString('es-MX'),
        Pedido: o.id,
        Tienda: o.storeName,
        Cliente: o.customerName,
        Estado: o.status,
        Subtotal: o.subtotalCents / 100,
        Envio: o.deliveryCents / 100,
        Comision: o.commissionCents / 100,
        'A Vendedor': o.vendorPayoutCents / 100,
        Total: o.totalCents / 100,
      })) ?? [];
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, report.toUpperCase());
      XLSX.writeFile(wb, `informe_${report}_${from}_${to}.xlsx`);
      return;
    }
    const res = await fetch('/api/admin/informes/export?' + buildParams().toString() + '&format=' + format);
    if (!res.ok) {
      setError('No se pudo exportar');
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `informe_${report}_${from}_${to}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderTable = () => {
    if (report === 'productos') {
      return (
        <table className="min-w-full text-sm">
          <thead className="bg-[color:var(--muted-2)]/40">
            <tr>
              <th className="px-3 py-2 text-left">Producto</th>
              <th className="px-3 py-2 text-left">Tienda</th>
              <th className="px-3 py-2 text-right">Cantidad</th>
              <th className="px-3 py-2 text-right">Ingresos</th>
            </tr>
          </thead>
          <tbody>
            {summary?.topProducts?.map((p, i) => (
              <tr key={i} className="border-t">
                <td className="px-3 py-2">{p.name}</td>
                <td className="px-3 py-2">{p.storeName}</td>
                <td className="px-3 py-2 text-right">{p.quantity}</td>
                <td className="px-3 py-2 text-right">{format(p.revenueCents)}</td>
              </tr>
            ))}
            {(!summary?.topProducts || summary.topProducts.length === 0) && !loading && (
              <tr><td className="px-4 py-8 text-center text-[color:var(--muted)]" colSpan={4}>Sin resultados</td></tr>
            )}
          </tbody>
        </table>
      );
    }
    if (report === 'clientes') {
      return (
        <table className="min-w-full text-sm">
          <thead className="bg-[color:var(--muted-2)]/40">
            <tr>
              <th className="px-3 py-2 text-left">Cliente</th>
              <th className="px-3 py-2 text-right">Pedidos</th>
              <th className="px-3 py-2 text-right">Total gastado</th>
            </tr>
          </thead>
          <tbody>
            {summary?.topCustomers?.map((c, i) => (
              <tr key={i} className="border-t">
                <td className="px-3 py-2">{c.customerName}</td>
                <td className="px-3 py-2 text-right">{c.orders}</td>
                <td className="px-3 py-2 text-right">{format(c.totalCents)}</td>
              </tr>
            ))}
            {(!summary?.topCustomers || summary.topCustomers.length === 0) && !loading && (
              <tr><td className="px-4 py-8 text-center text-[color:var(--muted)]" colSpan={3}>Sin resultados</td></tr>
            )}
          </tbody>
        </table>
      );
    }
    return (
      <table className="min-w-full text-sm">
        <thead className="bg-[color:var(--muted-2)]/40">
          <tr>
            <th className="px-3 py-2 text-left">Fecha</th>
            <th className="px-3 py-2 text-left">Pedido</th>
            <th className="px-3 py-2 text-left">Tienda</th>
            <th className="px-3 py-2 text-left">Cliente</th>
            <th className="px-3 py-2 text-left">Estado</th>
            <th className="px-3 py-2 text-right">Subtotal</th>
            <th className="px-3 py-2 text-right">Envío</th>
            <th className="px-3 py-2 text-right">Comisión</th>
            <th className="px-3 py-2 text-right">A vendedor</th>
            <th className="px-3 py-2 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {summary?.orders.map(o => (
            <tr key={o.id} className="border-t">
              <td className="px-3 py-2 whitespace-nowrap">{new Date(o.createdAt).toLocaleDateString('es-MX')}</td>
              <td className="px-3 py-2 font-mono text-xs">{o.id.slice(0, 8)}…</td>
              <td className="px-3 py-2 max-w-[180px] overflow-hidden text-ellipsis whitespace-nowrap" title={o.storeName}>{o.storeName}</td>
              <td className="px-3 py-2 max-w-[180px] overflow-hidden text-ellipsis whitespace-nowrap" title={o.customerName}>{o.customerName}</td>
              <td className="px-3 py-2 whitespace-nowrap">{o.status}</td>
              <td className="px-3 py-2 text-right whitespace-nowrap">{format(o.subtotalCents)}</td>
              <td className="px-3 py-2 text-right whitespace-nowrap">{format(o.deliveryCents)}</td>
              <td className="px-3 py-2 text-right whitespace-nowrap">{format(o.commissionCents)}</td>
              <td className="px-3 py-2 text-right whitespace-nowrap">{format(o.vendorPayoutCents)}</td>
              <td className="px-3 py-2 text-right whitespace-nowrap">{format(o.totalCents)}</td>
            </tr>
          ))}
          {summary?.orders.length === 0 && !loading && (
            <tr><td className="px-4 py-8 text-center text-[color:var(--muted)]" colSpan={10}>Sin resultados</td></tr>
          )}
          {loading && (
            <tr><td className="px-4 py-8 text-center text-[color:var(--muted)]" colSpan={10}>Cargando…</td></tr>
          )}
        </tbody>
      </table>
    );
  };

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Informes</h1>
          <p className="text-[color:var(--muted)]">Ventas, pedidos, costos y clientes. Exporta a Excel, Word o PDF.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => download('xlsx')} disabled={!summary}>Excel</Button>
          <Button variant="outline" onClick={() => download('doc')} disabled={!summary}>Word</Button>
          <Button variant="outline" onClick={() => download('pdf')} disabled={!summary}>PDF</Button>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {REPORTS.map(r => (
          <button
            key={r.key}
            onClick={() => setReport(r.key)}
            className={
              'rounded-xl border px-4 py-2 text-left text-sm transition ' +
              (report === r.key
                ? 'border-[var(--accent)] bg-[var(--accent)]/10 font-semibold'
                : 'border-[var(--border)] hover:bg-[color:var(--muted-2)]/30')
            }
          >
            <div>{r.label}</div>
            <div className="text-xs text-[color:var(--muted)]">{r.desc}</div>
          </button>
        ))}
      </div>

      <Card className="mb-6">
        <CardContent className="grid gap-4 p-4 md:grid-cols-4">
          <div className="space-y-2">
            <div className="text-sm">Desde</div>
            <Input type="date" value={from} onChange={e => setFrom(e.target.value)} />
          </div>
          <div className="space-y-2">
            <div className="text-sm">Hasta</div>
            <Input type="date" value={to} onChange={e => setTo(e.target.value)} />
          </div>
          <div className="space-y-2">
            <div className="text-sm">Tienda</div>
            <select aria-label="Tienda" className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" value={storeId} onChange={e => setStoreId(e.target.value)}>
              <option value="all">Todas las tiendas</option>
              {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <div className="text-sm">Estado</div>
            <select aria-label="Estado" className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" value={status} onChange={e => setStatus(e.target.value)}>
              <option value="all">Todos</option>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </CardContent>
      </Card>

      {error && <div className="mb-4 rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-600">{error}</div>}

      {summary && report !== 'productos' && report !== 'clientes' && (
        <div className="mb-6 grid gap-4 md:grid-cols-5">
          <Card><CardContent className="p-4"><div className="text-sm text-[color:var(--muted)]">Pedidos</div><div className="text-xl font-bold">{summary.totals.orders}</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-sm text-[color:var(--muted)]">Subtotal</div><div className="text-xl font-bold">{format(summary.totals.subtotalCents)}</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-sm text-[color:var(--muted)]">Envío / Delivery</div><div className="text-xl font-bold">{format(summary.totals.deliveryCents)}</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-sm text-[color:var(--muted)]">Comisión</div><div className="text-xl font-bold">{format(summary.totals.commissionCents)}</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-sm text-[color:var(--muted)]">A vendedor</div><div className="text-xl font-bold">{format(summary.totals.vendorPayoutCents)}</div></CardContent></Card>
        </div>
      )}

      <Card>
        <CardContent className="overflow-x-auto p-0">
          {renderTable()}
        </CardContent>
      </Card>
    </main>
  );
}
