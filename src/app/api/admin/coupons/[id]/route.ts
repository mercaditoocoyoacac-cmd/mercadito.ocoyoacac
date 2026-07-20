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

  if (parsed.data.code) {
    const dup = await prisma.coupon.findUnique({
      where: { code_storeId: { code: parsed.data.code, storeId: existing.storeId } },
    });
    if (dup && dup.id !== id) {
      return NextResponse.json({ ok: false, error: "Ya existe otro cupón con ese código en esta tienda." }, { status: 409 });
    }
  }

  const data: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed.data)) {
    if (value !== undefined) data[key] = value;
  }
  if (data.startsAt) data.startsAt = new Date(data.startsAt as string);
  if (data.expiresAt) data.expiresAt = new Date(data.expiresAt as string);

  const coupon = await prisma.coupon.update({ where: { id }, data: data as any });

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
