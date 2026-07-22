import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { requireRole } from "@/server/requireUser";
import { couponCreateSchema } from "@/lib/schemas";

export async function GET() {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.res;

  const coupons = await prisma.coupon.findMany({
    include: {
      stores: {
        include: { store: { select: { id: true, name: true, slug: true } } },
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
  const parsed = couponCreateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Datos inválidos.", details: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.coupon.findUnique({
    where: { code: parsed.data.code },
  });
  if (existing) {
    return NextResponse.json({ ok: false, error: "Ya existe un cupón con ese código." }, { status: 409 });
  }

  const stores = await prisma.store.findMany({
    where: { id: { in: parsed.data.storeIds } },
    select: { id: true },
  });
  if (stores.length !== parsed.data.storeIds.length) {
    return NextResponse.json({ ok: false, error: "Una o más tiendas no fueron encontradas." }, { status: 404 });
  }

  const coupon = await prisma.coupon.create({
    data: {
      code: parsed.data.code,
      discountType: parsed.data.discountType,
      discountValue: parsed.data.discountValue,
      minPurchaseCents: parsed.data.minPurchaseCents,
      maxUses: parsed.data.maxUses,
      maxUsesPerUser: parsed.data.maxUsesPerUser,
      userRegisteredBefore: parsed.data.userRegisteredBefore ? new Date(parsed.data.userRegisteredBefore) : undefined,
      storeCreatedBefore: parsed.data.storeCreatedBefore ? new Date(parsed.data.storeCreatedBefore) : undefined,
      isActive: parsed.data.isActive ?? true,
      startsAt: parsed.data.startsAt ? new Date(parsed.data.startsAt) : undefined,
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : undefined,
      stores: {
        create: parsed.data.storeIds.map((storeId) => ({ storeId })),
      },
    },
    include: {
      stores: {
        include: { store: { select: { id: true, name: true, slug: true } } },
      },
    },
  });

  return NextResponse.json({ ok: true, coupon });
}
