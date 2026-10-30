import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/server/requireUser';
import { buildInforme } from '@/server/informes';
import { buildCsv, buildDoc, buildPdf, buildXlsx, fileNameFor } from '@/server/informeExport';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const FORMATS = new Set(['xlsx', 'csv', 'doc', 'pdf']);

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.res;

  const searchParams = new URL(req.url).searchParams;
  const rawFormat = (searchParams.get('format') || 'xlsx').toLowerCase();
  const format = FORMATS.has(rawFormat) ? rawFormat : 'xlsx';

  try {
    const informe = await buildInforme(searchParams);
    const fileName = fileNameFor(informe, format);

    if (format === 'csv') {
      return new Response(buildCsv(informe), {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${fileName}"`,
          'Cache-Control': 'no-store',
        },
      });
    }

    if (format === 'doc') {
      return new Response(buildDoc(informe), {
        headers: {
          'Content-Type': 'application/msword; charset=utf-8',
          'Content-Disposition': `attachment; filename="${fileName}"`,
          'Cache-Control': 'no-store',
        },
      });
    }

    if (format === 'pdf') {
      const buffer = buildPdf(informe);
      return new Response(new Uint8Array(buffer), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${fileName}"`,
          'Cache-Control': 'no-store',
        },
      });
    }

    const buffer = await buildXlsx(informe);
    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('[informes] error al exportar', error);
    return NextResponse.json(
      { ok: false, error: 'No se pudo exportar el informe. Intenta de nuevo.' },
      { status: 500 }
    );
  }
}
