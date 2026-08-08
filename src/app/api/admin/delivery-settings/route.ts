import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { requireRole } from "@/server/requireUser";
import { z } from "zod";

const SettingsSchema = z.object({
  baseFeeCents: z.number().int().min(0).max(1000000),
  extraFeePerSegmentCents: z.number().int().min(0).max(1000000),
  baseDistanceKm: z.number().min(0).max(100),
  segmentKm: z.number().min(0.1).max(100),
  fallbackFeeCents: z.number().int().min(0).max(1000000),
});

async function getOrCreate() {
  const existing = await prisma.deliverySettings.findUnique({ where: { id: 1 } });
  if (existing) return existing;
  return prisma.deliverySettings.create({ data: { id: 1 } });
}

export async function GET() {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.res;

  const settings = await getOrCreate();
  return NextResponse.json({ ok: true, settings });
}

export async function PUT(req: Request) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.res;

  const json = await req.json().catch(() => null);
  const parsed = SettingsSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Datos inválidos" }, { status: 400 });
  }

  await getOrCreate();
  const settings = await prisma.deliverySettings.update({
    where: { id: 1 },
    data: parsed.data,
  });

  return NextResponse.json({ ok: true, settings });
}
