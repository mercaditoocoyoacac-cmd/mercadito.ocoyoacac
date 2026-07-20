import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { requireRole } from "@/server/requireUser";
import { couponCreateSchema } from "@/lib/schemas";

export async function GET() {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.res;

  const coupons = await prisma.coupon.findMany({
    include: { store: { select: { id: true, name: true, slug: true } } },
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

  const store = await prisma.store.findUnique({ where: { id: parsed.data.storeId }, select: { id: true } });
  if (!store) {
    return NextResponse.json({ ok: false, error: "Tienda no encontrada." }, { status: 404 });
  }

  const existing = await prisma.coupon.findUnique({
    where: { code_storeId: { code: parsed.data.code, storeId: parsed.data.storeId } },
  });
  if (existing) {
    return NextResponse.json({ ok: false, error: "Ya existe un cupón con ese código en esta tienda." }, { status: 409 });
  }

  const data: Record<string, unknown> = {
    code: parsed.data.code,
    discountType: parsed.data.discountType,
    discountValue: parsed.data.discountValue,
    storeId: parsed.data.storeId,
    minPurchaseCents: parsed.data.minPurchaseCents,
    maxUses: parsed.data.maxUses,
    maxUsesPerUser: parsed.data.maxUsesPerUser,
    isActive: parsed.data.isActive ?? true,
  };
  if (parsed.data.startsAt) data.startsAt = new Date(parsed.data.startsAt);
  if (parsed.data.expiresAt) data.expiresAt = new Date(parsed.data.expiresAt);

  const coupon = await prisma.coupon.create({ data: data as any });

  return NextResponse.json({ ok: true, coupon });
}
