import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { requireRole } from "@/server/requireUser";
import { couponUpdateSchema } from "@/lib/schemas";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.res;

  const { id } = await params;
  const json = await req.json().catch(() => null);
  const parsed = couponUpdateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Datos inválidos." }, { status: 400 });
  }

  const existing = await prisma.coupon.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ ok: false, error: "Cupón no encontrado." }, { status: 404 });
  }

  if (parsed.data.code && parsed.data.code !== existing.code) {
    const dup = await prisma.coupon.findUnique({ where: { code: parsed.data.code } });
    if (dup && dup.id !== id) {
      return NextResponse.json({ ok: false, error: "Ya existe otro cupón con ese código." }, { status: 409 });
    }
  }

  const data: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed.data)) {
    if (key !== "storeIds" && value !== undefined) data[key] = value;
  }
  if (data.startsAt) data.startsAt = new Date(data.startsAt as string);
  if (data.expiresAt) data.expiresAt = new Date(data.expiresAt as string);
  if (data.userRegisteredBefore) data.userRegisteredBefore = new Date(data.userRegisteredBefore as string);
  if (data.storeCreatedBefore) data.storeCreatedBefore = new Date(data.storeCreatedBefore as string);

  if (parsed.data.storeIds) {
    await prisma.couponStore.deleteMany({ where: { couponId: id } });
    await prisma.couponStore.createMany({
      data: parsed.data.storeIds.map((storeId) => ({ couponId: id, storeId })),
    });
  }

  const coupon = await prisma.coupon.update({
    where: { id },
    data: data as any,
    include: {
      stores: {
        include: { store: { select: { id: true, name: true, slug: true } } },
      },
    },
  });

  return NextResponse.json({ ok: true, coupon });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.res;

  const { id } = await params;
  const existing = await prisma.coupon.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ ok: false, error: "Cupón no encontrado." }, { status: 404 });
  }

  await prisma.coupon.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
