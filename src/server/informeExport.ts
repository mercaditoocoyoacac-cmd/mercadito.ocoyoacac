import {
  displayMetric,
  REPORT_LABELS,
  type Informe,
  type InformeOrder,
  type MetricKind,
} from './informes';
import { renderPdf, type PdfTableSection } from './pdfReport';

export interface ReportColumn {
  label: string;
  kind: MetricKind;
  width?: number;
}

export interface ReportRow {
  values: (string | number)[];
  kinds?: MetricKind[];
}

export interface ReportTableData {
  title: string;
  columns: ReportColumn[];
  rows: ReportRow[];
}

function dayDisplay(value: string) {
  return new Intl.DateTimeFormat('es-MX', {
    timeZone: 'America/Mexico_City',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
}

function dateTimeDisplay(value: string) {
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

function paymentDisplay(order: InformeOrder) {
  const method = order.paymentMethod === 'CASH' ? 'Efectivo' : order.paymentMethod === 'TRANSFER' ? 'Transferencia' : order.paymentMethod || 'Sin dato';
  return order.paymentVerified ? `${method} (verificado)` : method;
}

function kpiTable(informe: Informe): ReportTableData {
  return {
    title: 'Resumen de KPIs',
    columns: [
      { label: 'Indicador', kind: 'text', width: 34 },
      { label: 'Valor', kind: 'text', width: 16 },
      { label: 'Detalle', kind: 'text', width: 50 },
    ],
    rows: informe.kpis.map((kpi) => ({
      values: [kpi.label, kpi.value, kpi.hint],
      kinds: ['text', kpi.kind, 'text'],
    })),
  };
}

function dailyTable(informe: Informe, compact: boolean): ReportTableData {
  const rows = compact
    ? informe.daily.filter((row) => row.orders > 0 || row.membershipCents > 0)
    : informe.daily;

  return {
    title: 'Serie diaria',
    columns: [
      { label: 'Fecha', kind: 'text', width: 13 },
      { label: 'Pedidos', kind: 'count', width: 9 },
      { label: 'Completados', kind: 'count', width: 11 },
      { label: 'Cancelados', kind: 'count', width: 11 },
      { label: 'Ventas', kind: 'money', width: 14 },
      { label: 'Envíos', kind: 'money', width: 12 },
      { label: 'Membresías', kind: 'money', width: 13 },
    ],
    rows: rows.map((row) => ({
      values: [dayDisplay(`${row.date}T12:00:00.000-06:00`), row.orders, row.completed, row.cancelled, row.salesCents, row.deliveryCents, row.membershipCents],
    })),
  };
}

function storeTable(informe: Informe): ReportTableData {
  return {
    title: 'Por tienda',
    columns: [
      { label: 'Tienda', kind: 'text', width: 24 },
      { label: 'Pedidos', kind: 'count', width: 8 },
      { label: 'Completados', kind: 'count', width: 10 },
      { label: 'Cancelados', kind: 'count', width: 10 },
      { label: 'Ventas', kind: 'money', width: 13 },
      { label: 'Envíos', kind: 'money', width: 11 },
      { label: 'A vendedores', kind: 'money', width: 13 },
      { label: 'Membresías', kind: 'money', width: 12 },
      { label: 'Utilidad', kind: 'money', width: 11 },
    ],
    rows: informe.byStore.map((row) => ({
      values: [
        row.storeName,
        row.orders,
        row.completed,
        row.cancelled,
        row.salesCents,
        row.deliveryCents,
        row.vendorPayoutCents,
        row.membershipCents,
        row.marginCents,
      ],
    })),
  };
}

function ventasTable(informe: Informe): ReportTableData {
  return {
    title: 'Ventas',
    columns: [
      { label: 'Fecha', kind: 'text', width: 13 },
      { label: 'Pedido', kind: 'text', width: 8 },
      { label: 'Tienda', kind: 'text', width: 16 },
      { label: 'Cliente', kind: 'text', width: 15 },
      { label: 'Estado', kind: 'text', width: 9 },
      { label: 'Tipo', kind: 'text', width: 10 },
      { label: 'Subtotal', kind: 'money', width: 9 },
      { label: 'Envío', kind: 'money', width: 8 },
      { label: 'Cupón', kind: 'money', width: 8 },
      { label: 'A vendedor', kind: 'money', width: 9 },
      { label: 'Total', kind: 'money', width: 9 },
    ],
    rows: informe.orders.map((order) => ({
      values: [
        dateTimeDisplay(order.createdAt),
        order.code,
        order.storeName,
        order.customerName,
        order.statusLabel,
        order.fulfillmentLabel,
        order.subtotalCents,
        order.deliveryCents,
        order.couponDiscountCents,
        order.vendorPayoutCents,
        order.totalCents,
      ],
    })),
  };
}

function pedidosTable(informe: Informe): ReportTableData {
  return {
    title: 'Pedidos',
    columns: [
      { label: 'Fecha', kind: 'text', width: 13 },
      { label: 'Pedido', kind: 'text', width: 8 },
      { label: 'Tienda', kind: 'text', width: 15 },
      { label: 'Cliente', kind: 'text', width: 14 },
      { label: 'Teléfono', kind: 'text', width: 11 },
      { label: 'Estado', kind: 'text', width: 9 },
      { label: 'Tipo', kind: 'text', width: 10 },
      { label: 'Pago', kind: 'text', width: 12 },
      { label: 'Artículos', kind: 'text', width: 24 },
      { label: 'Total', kind: 'money', width: 9 },
    ],
    rows: informe.orders.map((order) => ({
      values: [
        dateTimeDisplay(order.createdAt),
        order.code,
        order.storeName,
        order.customerName,
        order.customerPhone,
        order.statusLabel,
        order.fulfillmentLabel,
        paymentDisplay(order),
        order.itemsLabel || `${order.itemCount} artículo(s)`,
        order.totalCents,
      ],
    })),
  };
}

function productosTable(informe: Informe): ReportTableData {
  return {
    title: 'Productos',
    columns: [
      { label: 'Producto', kind: 'text', width: 36 },
      { label: 'Tienda', kind: 'text', width: 28 },
      { label: 'Cantidad', kind: 'count', width: 10 },
      { label: 'Ingresos', kind: 'money', width: 14 },
    ],
    rows: informe.topProducts.map((product) => ({
      values: [product.name, product.storeName, product.quantity, product.revenueCents],
    })),
  };
}

function clientesTable(informe: Informe): ReportTableData {
  return {
    title: 'Clientes',
    columns: [
      { label: 'Cliente', kind: 'text', width: 30 },
      { label: 'Pedidos', kind: 'count', width: 9 },
      { label: 'Total', kind: 'money', width: 14 },
      { label: 'Ticket promedio', kind: 'money', width: 14 },
      { label: 'Último pedido', kind: 'text', width: 15 },
    ],
    rows: informe.topCustomers.map((customer) => ({
      values: [
        customer.customerName,
        customer.orders,
        customer.totalCents,
        customer.averageCents,
        dateTimeDisplay(customer.lastOrderAt),
      ],
    })),
  };
}

function costosTable(informe: Informe): ReportTableData {
  return {
    title: 'Costos y envíos',
    columns: [
      { label: 'Fecha', kind: 'text', width: 13 },
      { label: 'Pedido', kind: 'text', width: 8 },
      { label: 'Tienda', kind: 'text', width: 18 },
      { label: 'Estado', kind: 'text', width: 10 },
      { label: 'Subtotal', kind: 'money', width: 10 },
      { label: 'Envío', kind: 'money', width: 9 },
      { label: 'Cupón', kind: 'money', width: 9 },
      { label: 'Comisión', kind: 'money', width: 10 },
      { label: 'A vendedor', kind: 'money', width: 11 },
    ],
    rows: informe.orders.map((order) => ({
      values: [
        dateTimeDisplay(order.createdAt),
        order.code,
        order.storeName,
        order.statusLabel,
        order.subtotalCents,
        order.deliveryCents,
        order.couponDiscountCents,
        order.commissionCents,
        order.vendorPayoutCents,
      ],
    })),
  };
}

function reportTable(informe: Informe): ReportTableData | null {
  switch (informe.filters.report) {
    case 'ventas':
      return ventasTable(informe);
    case 'pedidos':
      return pedidosTable(informe);
    case 'productos':
      return productosTable(informe);
    case 'clientes':
      return clientesTable(informe);
    case 'costos':
      return costosTable(informe);
    default:
      return null;
  }
}

export function exportTables(informe: Informe, mode: 'full' | 'summary'): ReportTableData[] {
  const tables: ReportTableData[] = [kpiTable(informe)];
  const primary = reportTable(informe);
  if (primary) tables.push(primary);
  if (mode === 'full' || informe.filters.report === 'resumen') {
    tables.push(dailyTable(informe, mode === 'summary'), storeTable(informe));
  }
  return tables;
}

function primaryTable(informe: Informe): ReportTableData {
  return reportTable(informe) || kpiTable(informe);
}

function sheetName(title: string) {
  return title.replace(/[\\/?*[\]:]/g, ' ').slice(0, 31);
}

export async function buildXlsx(informe: Informe): Promise<Buffer> {
  const XLSX = await import('xlsx');
  const workbook = XLSX.utils.book_new();

  for (const table of exportTables(informe, 'full')) {
    const sheet: (string | number)[][] = [];
    sheet.push([`Mercadito Ocoyoacac · ${table.title}`]);
    sheet.push([`Periodo: ${informe.periodLabel}`]);
    sheet.push([`Generado: ${informe.generatedAtLabel}`]);
    for (const scope of informe.scope) sheet.push([scope]);
    sheet.push([]);

    const headerRow = sheet.length;
    sheet.push(table.columns.map((column) => column.label));
    for (const row of table.rows) sheet.push(row.values);

    const worksheet = XLSX.utils.aoa_to_sheet(sheet);

    table.rows.forEach((row, rowIndex) => {
      row.values.forEach((raw, columnIndex) => {
        const kind = row.kinds?.[columnIndex] ?? table.columns[columnIndex].kind;
        const address = XLSX.utils.encode_cell({ r: headerRow + 1 + rowIndex, c: columnIndex });
        const cell = worksheet[address];
        if (!cell) return;
        if (kind === 'money') {
          cell.v = (Number(raw) || 0) / 100;
          cell.t = 'n';
          cell.z = '#,##0.00';
        } else if (kind === 'count') {
          cell.v = Number(raw) || 0;
          cell.t = 'n';
          cell.z = '#,##0';
        } else if (kind === 'percent') {
          cell.v = Number(raw) || 0;
          cell.t = 'n';
          cell.z = '0.0"%"';
        }
      });
    });

    worksheet['!cols'] = table.columns.map((column) => ({
      wch: Math.max(10, Math.round((column.width ?? 16) * 0.9)),
    }));

    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName(table.title));
  }

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

function csvValue(value: string | number, kind: MetricKind) {
  if (kind === 'money') return ((Number(value) || 0) / 100).toFixed(2);
  if (kind === 'count') return String(Math.round(Number(value) || 0));
  if (kind === 'percent') return (Number(value) || 0).toFixed(1);
  return String(value ?? '');
}

function csvCell(value: string) {
  if (/[";\r\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function buildCsv(informe: Informe): string {
  const table = primaryTable(informe);
  const lines: string[] = [];
  lines.push(table.columns.map((column) => csvCell(column.label)).join(';'));
  for (const row of table.rows) {
    lines.push(
      row.values
        .map((value, index) => csvCell(csvValue(value, row.kinds?.[index] ?? table.columns[index].kind)))
        .join(';')
    );
  }
  return `\uFEFF${lines.join('\r\n')}\r\n`;
}

function escapeHtml(value: string) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildDoc(informe: Informe): string {
  const tables = exportTables(informe, 'summary');
  const sections = tables
    .map((table) => {
      const head = table.columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join('');
      const body =
        table.rows.length === 0
          ? `<tr><td colspan="${table.columns.length}" class="empty">Sin resultados en el periodo seleccionado.</td></tr>`
          : table.rows
              .map((row) => {
                const cells = table.columns
                  .map((column, index) => {
                    const kind = row.kinds?.[index] ?? column.kind;
                    const value = displayMetric(row.values[index], kind);
                    const className = kind === 'text' ? '' : 'num';
                    return `<td class="${className}">${escapeHtml(value)}</td>`;
                  })
                  .join('');
                return `<tr>${cells}</tr>`;
              })
              .join('');
      return `<h2>${escapeHtml(table.title)}</h2><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<title>Mercadito Ocoyoacac · ${escapeHtml(REPORT_LABELS[informe.filters.report])}</title>
<style>
@page { size: A4 landscape; margin: 1.5cm; }
body { font-family: Calibri, Arial, sans-serif; font-size: 10pt; color: #111827; }
h1 { font-size: 18pt; margin: 0 0 4pt; color: #0f5c55; }
h2 { font-size: 12pt; margin: 16pt 0 6pt; color: #0f5c55; border-bottom: 1px solid #d1d5db; padding-bottom: 2pt; }
p.meta { margin: 0 0 2pt; font-size: 9pt; color: #4b5563; }
table { border-collapse: collapse; width: 100%; font-size: 8.5pt; }
th { background: #eef2f1; text-align: left; border: 1px solid #cbd5e1; padding: 3pt 4pt; }
td { border: 1px solid #e2e8f0; padding: 3pt 4pt; }
td.num, th.num { text-align: right; }
td.empty { text-align: center; color: #6b7280; padding: 10pt; }
</style>
</head>
<body>
<h1>Informe de ${escapeHtml(REPORT_LABELS[informe.filters.report])}</h1>
<p class="meta"><strong>Periodo:</strong> ${escapeHtml(informe.periodLabel)}</p>
<p class="meta"><strong>Generado:</strong> ${escapeHtml(informe.generatedAtLabel)}</p>
${informe.scope
  .filter((line) => !line.startsWith('Periodo:'))
  .map((line) => `<p class="meta">${escapeHtml(line)}</p>`)
  .join('\n')}
${sections}
</body>
</html>`;
}

export function buildPdf(informe: Informe): Buffer {
  const sections: PdfTableSection[] = exportTables(informe, 'summary').map((table) => ({
    title: table.title,
    columns: table.columns.map((column) => ({
      label: column.label,
      width: column.width ?? 16,
      align: column.kind === 'text' ? 'left' : 'right',
    })),
    rows: table.rows.map((row) =>
      table.columns.map((column, index) => {
        const kind = row.kinds?.[index] ?? column.kind;
        return displayMetric(row.values[index], kind);
      })
    ),
  }));

  const meta = [
    ...informe.scope.filter((line) => !line.startsWith('Periodo:') && !line.startsWith('Informe:')),
    `Generado: ${informe.generatedAtLabel}`,
  ];

  return renderPdf({
    title: `Informe de ${REPORT_LABELS[informe.filters.report]}`,
    subtitle: `Periodo: ${informe.periodLabel}`,
    meta,
    sections,
  });
}

export function fileNameFor(informe: Informe, extension: string) {
  return `informe_${informe.filters.report}_${informe.filters.from}_${informe.filters.to}.${extension}`;
}
