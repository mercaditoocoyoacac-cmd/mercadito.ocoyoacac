import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/prisma";
import { requireRole } from "@/server/requireUser";

const UpdateCampaignSchema = z.object({
  title: z.string().min(3).max(120).optional(),
  body: z.string().min(3).max(500).optional(),
  url: z.string().optional(),
  segment: z.enum(["ALL_USERS", "CUSTOMERS", "STORE_CUSTOMERS", "BY_CATEGORY"]).optional(),
  storeId: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  scheduledAt: z.string().optional().nullable(),
});

export async function PATCH(
  req: Request,
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
    return NextResponse.json({ ok: false, error: "No puedes editar una campaña ya enviada" }, { status: 400 });
  }

  const parsed = UpdateCampaignSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Datos inválidos", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const resolved = {
    ...(data.title !== undefined ? { title: data.title } : {}),
    ...(data.body !== undefined ? { body: data.body } : {}),
    ...(data.url !== undefined ? { url: data.url } : {}),
    ...(data.segment !== undefined ? { segment: data.segment } : {}),
    ...(data.storeId !== undefined ? { storeId: data.storeId || null } : {}),
    ...(data.categoryId !== undefined ? { categoryId: data.categoryId || null } : {}),
    ...(data.scheduledAt !== undefined
      ? { scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null }
      : {}),
  };

  const campaign = await prisma.campaign.update({
    where: { id },
    data: resolved,
  });

  return NextResponse.json({ ok: true, campaign });
}

export async function DELETE(
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
    return NextResponse.json({ ok: false, error: "No puedes borrar una campaña ya enviada" }, { status: 400 });
  }

  await prisma.campaign.update({
    where: { id },
    data: { status: "CANCELLED" },
  });

  return NextResponse.json({ ok: true });
}
