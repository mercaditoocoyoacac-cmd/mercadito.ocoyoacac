import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/prisma";
import { requireRole } from "@/server/requireUser";

const createSchema = z.object({
  code: z.string().min(2).max(30).transform((s) => s.toUpperCase().trim()),
  description: z.string().max(200).optional(),
  discountType: z.enum(["PERCENTAGE", "FIXED"]),
  discountValue: z.number().int().min(1),
  maxUses: z.number().int().min(1).optional().nullable(),
  maxUsesPerStore: z.number().int().min(1).optional().nullable(),
  userIds: z.array(z.string().min(1)).optional(),
  userRegisteredBefore: z.string().optional().nullable(),
  storeCreatedBefore: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  startsAt: z.string().optional().nullable(),
  expiresAt: z.string().optional().nullable(),
});

export async function GET() {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.res;

  const coupons = await prisma.membershipCoupon.findMany({
    include: {
      users: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ ok: true, coupons });
}

export async function POST(req: Request) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.res;

  const json = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Datos inválidos.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const existing = await prisma.membershipCoupon.findUnique({
    where: { code: parsed.data.code },
  });
  if (existing) {
    return NextResponse.json(
      { ok: false, error: "Ya existe un cupón con ese código." },
      { status: 409 },
    );
  }

  if (parsed.data.discountType === "PERCENTAGE" && parsed.data.discountValue > 100) {
    return NextResponse.json(
      { ok: false, error: "El porcentaje no puede ser mayor a 100." },
      { status: 400 },
    );
  }

  const data: Record<string, unknown> = {
    code: parsed.data.code,
    description: parsed.data.description,
    discountType: parsed.data.discountType,
    discountValue: parsed.data.discountValue,
    maxUses: parsed.data.maxUses,
    maxUsesPerStore: parsed.data.maxUsesPerStore,
    isActive: parsed.data.isActive ?? true,
  };
  if (parsed.data.startsAt) data.startsAt = new Date(parsed.data.startsAt);
  if (parsed.data.expiresAt) data.expiresAt = new Date(parsed.data.expiresAt);
  if (parsed.data.userRegisteredBefore) data.userRegisteredBefore = new Date(parsed.data.userRegisteredBefore);
  if (parsed.data.storeCreatedBefore) data.storeCreatedBefore = new Date(parsed.data.storeCreatedBefore);

  const coupon = await prisma.membershipCoupon.create({
    data: {
      ...data as any,
      users: parsed.data.userIds ? {
        create: parsed.data.userIds.map((userId) => ({ userId })),
      } : undefined,
    },
    include: {
      users: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
    },
  });

  return NextResponse.json({ ok: true, coupon });
}
