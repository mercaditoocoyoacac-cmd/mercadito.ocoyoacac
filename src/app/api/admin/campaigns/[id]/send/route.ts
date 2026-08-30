import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { requireRole } from "@/server/requireUser";
import { sendCampaign } from "@/server/campaigns";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.res;
  const { id } = await params;

  const existing = await prisma.campaign.findUnique({
    where: { id },
    select: { id: true, status: true },
  });
  if (!existing) {
    return NextResponse.json({ ok: false, error: "Campaña no encontrada" }, { status: 404 });
  }
  if (existing.status === "SENT") {
    return NextResponse.json({ ok: false, error: "La campaña ya fue enviada" }, { status: 400 });
  }

  try {
    const result = await sendCampaign(id);
    return NextResponse.json({ ok: true, ...result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al enviar";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
