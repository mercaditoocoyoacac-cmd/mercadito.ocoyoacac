import { NextRequest } from 'next/server';
import { prisma } from '@/server/prisma';
import { requireAdmin } from '@/server/requireUser';

export const runtime = 'nodejs';

function money(cents: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(cents / 100);
}

function escapeHtml(v: string) {
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.res;
  const { searchParams } = new URL(req.url);
  const format = searchParams.get('format') || 'pdf';
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

  const rows = orders.map((o: any) => ({
    fecha: new Date(o.createdAt).toLocaleDateString('es-MX'),
    pedido: o.id,
    tienda: o.store?.name || '',
    cliente: o.customerName || '',
    estado: o.status,
    subtotalCents: o.subtotalCents || ((o.totalCents || 0) - (o.deliveryCents || 0)),
    deliveryCents: o.deliveryCents || 0,
    commissionCents: o.commissionCents || 0,
    vendorPayoutCents: o.vendorPayoutCents || 0,
    totalCents: o.totalCents || 0,
  }));

  const totals = rows.reduce(
    (acc, r) => {
      acc.orders += 1;
      acc.totalCents += r.totalCents;
      acc.subtotalCents += r.subtotalCents;
      acc.deliveryCents += r.deliveryCents;
      acc.commissionCents += r.commissionCents;
      acc.vendorPayoutCents += r.vendorPayoutCents;
      return acc;
    },
    { orders: 0, totalCents: 0, subtotalCents: 0, deliveryCents: 0, commissionCents: 0, vendorPayoutCents: 0 }
  );

  const period = `${from || 'inicio'} a ${to || 'hoy'}`;

  if (format === 'doc') {
    const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><title>Informe ${escapeHtml(report)}</title></head>
<body style="font-family:Arial,sans-serif">
<h1>Mercadito Ocoyoacac - Informe de ${escapeHtml(report)}</h1>
<p><strong>Periodo:</strong> ${escapeHtml(period)}</p>
<p><strong>Pedidos:</strong> ${totals.orders} &nbsp; <strong>Total:</strong> ${money(totals.totalCents)} &nbsp; <strong>Comisión:</strong> ${money(totals.commissionCents)} &nbsp; <strong>A vendedor:</strong> ${money(totals.vendorPayoutCents)}</p>
<table border="1" cellspacing="0" cellpadding="4" style="border-collapse:collapse;width:100%">
<thead><tr style="background:#eee">
<th>Fecha</th><th>Pedido</th><th>Tienda</th><th>Cliente</th><th>Estado</th>
<th>Subtotal</th><th>Envío</th><th>Comisión</th><th>A vendedor</th><th>Total</th>
</tr></thead>
<tbody>
${rows
  .map(
    r => `<tr>
<td>${escapeHtml(r.fecha)}</td><td>${escapeHtml(r.pedido)}</td><td>${escapeHtml(r.tienda)}</td><td>${escapeHtml(r.cliente)}</td><td>${escapeHtml(r.estado)}</td>
<td align="right">${money(r.subtotalCents)}</td><td align="right">${money(r.deliveryCents)}</td><td align="right">${money(r.commissionCents)}</td><td align="right">${money(r.vendorPayoutCents)}</td><td align="right">${money(r.totalCents)}</td>
</tr>`
  )
  .join('')}
</tbody></table>
</body></html>`;
    return new Response(html, {
      headers: {
        'Content-Type': 'application/msword; charset=utf-8',
        'Content-Disposition': `attachment; filename="informe_${report}_${from}_${to}.doc"`,
      },
    });
  }

  const PDFDocument = (await import('pdfkit')).default;
  const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 40 });
  const chunks: Buffer[] = [];
  const pdfBuffer: Promise<Buffer> = new Promise((resolve, reject) => {
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  doc.fontSize(18).text(`Mercadito Ocoyoacac - Informe de ${report}`, { align: 'left' });
  doc.moveDown(0.3);
  doc.fontSize(10).fillColor('#444').text(`Periodo: ${period}`);
  doc.text(`Pedidos: ${totals.orders}   Total: ${money(totals.totalCents)}   Comision: ${money(totals.commissionCents)}   A vendedor: ${money(totals.vendorPayoutCents)}`);
  doc.moveDown(0.8);

  const cols = [
    { key: 'fecha', label: 'Fecha', w: 65 },
    { key: 'pedido', label: 'Pedido', w: 90 },
    { key: 'tienda', label: 'Tienda', w: 150 },
    { key: 'cliente', label: 'Cliente', w: 150 },
    { key: 'estado', label: 'Estado', w: 90 },
    { key: 'subtotalCents', label: 'Subtotal', w: 80, money: true },
    { key: 'deliveryCents', label: 'Envio', w: 70, money: true },
    { key: 'commissionCents', label: 'Comision', w: 75, money: true },
    { key: 'vendorPayoutCents', label: 'A vendedor', w: 85, money: true },
    { key: 'totalCents', label: 'Total', w: 80, money: true },
  ];

  const startX = doc.page.margins.left;
  const bottom = () => doc.page.height - doc.page.margins.bottom;

  const drawHeader = () => {
    const y = doc.y;
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#000');
    let x = startX;
    for (const c of cols) {
      doc.text(c.label, x, y, { width: c.w - 4 });
      x += c.w;
    }
    doc.y = y + 14;
    doc.moveTo(startX, doc.y - 3).lineTo(x, doc.y - 3).strokeColor('#999').stroke();
    doc.font('Helvetica');
  };

  drawHeader();

  for (const r of rows) {
    if (doc.y + 12 > bottom()) {
      doc.addPage();
      drawHeader();
    }
    const y = doc.y;
    let x = startX;
    const valueOf = (c: any) => (c.money ? money((r as any)[c.key]) : String((r as any)[c.key] ?? ''));
    doc.font('Helvetica').fontSize(8).fillColor('#222');
    for (const c of cols) {
      doc.text(valueOf(c), x, y, { width: c.w - 4, height: 11, ellipsis: true, lineBreak: false });
      x += c.w;
    }
    doc.y = y + 12;
  }

  doc.end();
  const buffer = await pdfBuffer;

  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="informe_${report}_${from}_${to}.pdf"`,
    },
  });
}
