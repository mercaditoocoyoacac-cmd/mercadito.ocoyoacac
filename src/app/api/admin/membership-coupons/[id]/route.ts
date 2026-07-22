import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/prisma";
import { requireRole } from "@/server/requireUser";

const updateSchema = z.object({
  code: z.string().min(2).max(30).transform((s) => s.toUpperCase().trim()).optional(),
  description: z.string().max(200).optional().nullable(),
  discountType: z.enum(["PERCENTAGE", "FIXED"]).optional(),
  discountValue: z.number().int().min(1).optional(),
  maxUses: z.number().int().min(1).optional().nullable(),
  maxUsesPerStore: z.number().int().min(1).optional().nullable(),
  userIds: z.array(z.string().min(1)).optional(),
  userRegisteredBefore: z.string().optional().nullable(),
  storeCreatedBefore: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  startsAt: z.string().optional().nullable(),
  expiresAt: z.string().optional().nullable(),
});

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.res;

  const { id } = await params;
  const json = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Datos inválidos.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const existing = await prisma.membershipCoupon.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ ok: false, error: "Cupón no encontrado." }, { status: 404 });
  }

  if (parsed.data.code && parsed.data.code !== existing.code) {
    const dup = await prisma.membershipCoupon.findUnique({
      where: { code: parsed.data.code },
    });
    if (dup) {
      return NextResponse.json(
        { ok: false, error: "Ya existe un cupón con ese código." },
        { status: 409 },
      );
    }
  }

  const data: Record<string, unknown> = {};
  if (parsed.data.code !== undefined) data.code = parsed.data.code;
  if (parsed.data.description !== undefined) data.description = parsed.data.description;
  if (parsed.data.discountType !== undefined) data.discountType = parsed.data.discountType;
  if (parsed.data.discountValue !== undefined) data.discountValue = parsed.data.discountValue;
  if (parsed.data.maxUses !== undefined) data.maxUses = parsed.data.maxUses;
  if (parsed.data.maxUsesPerStore !== undefined) data.maxUsesPerStore = parsed.data.maxUsesPerStore;
  if (parsed.data.isActive !== undefined) data.isActive = parsed.data.isActive;
  if (parsed.data.startsAt !== undefined) data.startsAt = parsed.data.startsAt ? new Date(parsed.data.startsAt) : null;
  if (parsed.data.expiresAt !== undefined) data.expiresAt = parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null;
  if (parsed.data.userRegisteredBefore !== undefined) data.userRegisteredBefore = parsed.data.userRegisteredBefore ? new Date(parsed.data.userRegisteredBefore) : null;
  if (parsed.data.storeCreatedBefore !== undefined) data.storeCreatedBefore = parsed.data.storeCreatedBefore ? new Date(parsed.data.storeCreatedBefore) : null;

  if (parsed.data.userIds) {
    await prisma.membershipCouponUser.deleteMany({ where: { couponId: id } });
    await prisma.membershipCouponUser.createMany({
      data: parsed.data.userIds.map((userId) => ({ couponId: id, userId })),
    });
  }

  const coupon = await prisma.membershipCoupon.update({
    where: { id },
    data: data as any,
    include: {
      users: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
    },
  });

  return NextResponse.json({ ok: true, coupon });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.res;

  const { id } = await params;

  const existing = await prisma.membershipCoupon.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ ok: false, error: "Cupón no encontrado." }, { status: 404 });
  }

  await prisma.membershipCoupon.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
