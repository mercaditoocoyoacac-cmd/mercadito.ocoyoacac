import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/server/requireUser";
import { createDownloadToken } from "@/server/downloadToken";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FORMATS = new Set(["xlsx", "csv", "doc", "pdf"]);

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.res;

  const body = await req.json().catch(() => null);
  const query = typeof body?.query === "string" ? body.query : "";
  const rawFormat = typeof body?.format === "string" ? body.format.toLowerCase() : "xlsx";
  const format = FORMATS.has(rawFormat) ? rawFormat : "xlsx";

  const params = new URLSearchParams(query);
  params.set("format", format);

  const token = createDownloadToken(auth.userId, params.toString());
  const deploymentHost = process.env.VERCEL_URL;
  const origin = deploymentHost ? `https://${deploymentHost}` : req.nextUrl.origin;

  return NextResponse.json({
    ok: true,
    url: `${origin}/api/admin/informes/export?${params.toString()}&token=${encodeURIComponent(token)}`,
  });
}
