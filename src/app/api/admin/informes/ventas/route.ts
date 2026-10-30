import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/server/requireUser';
import { buildInforme } from '@/server/informes';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.res;

  try {
    const informe = await buildInforme(new URL(req.url).searchParams);
    return NextResponse.json(
      {
        ok: true,
        summary: {
          orders: informe.orders,
          topProducts: informe.topProducts,
          topCustomers: informe.topCustomers,
          totals: informe.totals,
          kpis: informe.kpis,
          daily: informe.daily,
          byStore: informe.byStore,
          filters: informe.filters,
          period: informe.periodLabel,
          generatedAt: informe.generatedAtLabel,
          scope: informe.scope,
        },
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('[informes] error al generar el informe', error);
    return NextResponse.json(
      { ok: false, error: 'No se pudo generar el informe. Intenta de nuevo.' },
      { status: 500 }
    );
  }
}
