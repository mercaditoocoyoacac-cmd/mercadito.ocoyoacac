import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/server/requireUser";
import { buildInforme, REPORT_LABELS } from "@/server/informes";
import { buildCsv, buildDoc, buildPdf, buildXlsx, fileNameFor } from "@/server/informeExport";
import { hasEmailTransport, sendEmail, type EmailAttachment } from "@/server/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FORMATS = new Set(["xlsx", "csv", "doc", "pdf"]);

const CONTENT_TYPES: Record<string, string> = {
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  csv: "text/csv",
  doc: "application/msword",
  pdf: "application/pdf",
};

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.res;

  const to = auth.session.user?.email;
  if (!to) {
    return NextResponse.json({ ok: false, error: "La cuenta no tiene un correo registrado." }, { status: 400 });
  }

  if (!hasEmailTransport()) {
    return NextResponse.json({ ok: false, error: "El envío por correo no está configurado." }, { status: 503 });
  }

  const body = await req.json().catch(() => null);
  const query = typeof body?.query === "string" ? body.query : "";
  const rawFormat = typeof body?.format === "string" ? body.format.toLowerCase() : "xlsx";
  const format = FORMATS.has(rawFormat) ? rawFormat : "xlsx";

  const params = new URLSearchParams(query);
  params.set("format", format);

  try {
    const informe = await buildInforme(params);
    const fileName = fileNameFor(informe, format);

    let content: Buffer;
    if (format === "xlsx") {
      content = await buildXlsx(informe);
    } else if (format === "pdf") {
      content = buildPdf(informe);
    } else if (format === "csv") {
      content = Buffer.from(buildCsv(informe), "utf8");
    } else {
      content = Buffer.from(buildDoc(informe), "utf8");
    }

    const attachment: EmailAttachment = {
      filename: fileName,
      content,
      contentType: CONTENT_TYPES[format],
    };

    const label = REPORT_LABELS[informe.filters.report];
    await sendEmail({
      to,
      subject: `Informe de ${label} · ${informe.filters.from} a ${informe.filters.to}`,
      html: [
        `<p>Adjuntamos el informe de <strong>${label}</strong> del periodo ${informe.filters.from} al ${informe.filters.to}.</p>`,
        `<p>Archivo: ${fileName}</p>`,
        `<p>Este envío se generó desde la aplicación de Mercadito Ocoyoacac.</p>`,
      ].join(""),
      attachments: [attachment],
    });

    return NextResponse.json({ ok: true, to });
  } catch {
    return NextResponse.json({ ok: false, error: "No se pudo enviar el correo. Intenta de nuevo." }, { status: 502 });
  }
}
