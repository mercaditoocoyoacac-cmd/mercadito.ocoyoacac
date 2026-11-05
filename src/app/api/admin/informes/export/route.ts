import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/server/requireUser";
import { buildInforme } from "@/server/informes";
import { buildCsv, buildDoc, buildPdf, buildXlsx, fileNameFor } from "@/server/informeExport";
import { verifyDownloadToken } from "@/server/downloadToken";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const FORMATS = new Set(['xlsx', 'csv', 'doc', 'pdf']);

export async function GET(req: NextRequest) {
  const searchParams = new URL(req.url).searchParams;
  let params: URLSearchParams = searchParams;

  const auth = await requireAdmin();
  if (!auth.ok) {
    const token = searchParams.get('token');
    const verified = token ? await verifyDownloadToken(token) : null;
    if (!verified) return auth.res;
    params = new URLSearchParams(verified.query);
  }

  const rawFormat = (params.get('format') || 'xlsx').toLowerCase();
  const format = FORMATS.has(rawFormat) ? rawFormat : 'xlsx';

  try {
    const informe = await buildInforme(params);
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
