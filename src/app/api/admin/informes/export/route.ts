import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/server/requireUser";
import { buildInforme } from "@/server/informes";
import { buildCsv, buildDoc, buildPdf, buildXlsx, fileNameFor } from "@/server/informeExport";
import { verifyDownloadToken } from "@/server/downloadToken";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const FORMATS = new Set(['xlsx', 'csv', 'doc', 'pdf']);

const LINK_ERRORS: Record<string, { title: string; detail: string }> = {
  'sin-token': {
    title: 'Falta la autorización de descarga',
    detail: 'Vuelve a la app, entra a Informes y toca de nuevo el botón del archivo.',
  },
  malformed: {
    title: 'El enlace está incompleto o fue alterado',
    detail: 'Vuelve a la app, entra a Informes y genera un enlace nuevo.',
  },
  expired: {
    title: 'El enlace venció',
    detail: 'Los enlaces de descarga duran 10 minutos. Vuelve a la app y genera uno nuevo.',
  },
  inactive: {
    title: 'La cuenta está desactivada',
    detail: 'Pide al administrador que reactive la cuenta.',
  },
  forbidden: {
    title: 'Esta cuenta no puede descargar informes',
    detail: 'Solo el administrador puede descargar los informes.',
  },
  'no-secret': {
    title: 'La descarga no está configurada',
    detail: 'Falta la configuración de seguridad en el servidor. Avisa al administrador.',
  },
};

function linkErrorPage(reason: string) {
  const info = LINK_ERRORS[reason] || LINK_ERRORS.malformed;
  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex" />
<title>${info.title}</title>
<style>
  :root { color-scheme: light dark; }
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; background: #f8f7f5; color: #1f1c18; }
  main { max-width: 34rem; padding: 2rem; }
  h1 { font-size: 1.25rem; margin: 0 0 .75rem; }
  p { line-height: 1.6; margin: 0 0 .75rem; }
  .code { font-size: .75rem; opacity: .6; }
  @media (prefers-color-scheme: dark) { body { background: #171512; color: #f2efea; } }
</style>
</head>
<body>
<main>
  <h1>${info.title}</h1>
  <p>${info.detail}</p>
  <p class="code">Código: ${reason}</p>
</main>
</body>
</html>`;

  return new Response(html, {
    status: 401,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

export async function GET(req: NextRequest) {
  const searchParams = new URL(req.url).searchParams;
  let params: URLSearchParams = searchParams;

  const auth = await requireAdmin();
  if (!auth.ok) {
    const token = searchParams.get('token');
    if (!token) return linkErrorPage('sin-token');
    const verified = await verifyDownloadToken(token);
    if (!verified.ok) return linkErrorPage(verified.reason);
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
