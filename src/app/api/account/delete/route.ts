import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/prisma";
import { requireUser } from "@/server/requireUser";

export async function POST(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.res;

  const json = await req.json().catch(() => null);
  const parsed = z
    .object({ password: z.string().min(1, "La contraseña es requerida.") })
    .safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message || "Datos inválidos." },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: { id: true, email: true, passwordHash: true, role: true, name: true },
  });
  if (!user) {
    return NextResponse.json(
      { ok: false, error: "Usuario no encontrado." },
      { status: 404 },
    );
  }

  const bcrypt = await import("bcryptjs");
  const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!valid) {
    return NextResponse.json(
      { ok: false, error: "Contraseña incorrecta." },
      { status: 401 },
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.cartItem.deleteMany({ where: { userId: user.id } });
    await tx.notification.deleteMany({ where: { userId: user.id } });
    await tx.deviceAuthorization.deleteMany({ where: { userId: user.id } });
    await tx.session.deleteMany({ where: { userId: user.id } });
    await tx.verification.deleteMany({ where: { userId: user.id } });

    const stores = await tx.store.findMany({
      where: { ownerId: user.id },
      select: { id: true },
    });
    for (const store of stores) {
      await tx.subscription.deleteMany({ where: { storeId: store.id } });
      await tx.order.deleteMany({ where: { storeId: store.id } });
      const products = await tx.product.findMany({
        where: { storeId: store.id },
        select: { id: true },
      });
      await tx.orderItem.deleteMany({
        where: { productId: { in: products.map(p => p.id) } },
      });
      await tx.cartItem.deleteMany({
        where: { productId: { in: products.map(p => p.id) } },
      });
      await tx.product.deleteMany({ where: { storeId: store.id } });
    }
    await tx.store.deleteMany({ where: { ownerId: user.id } });
    await tx.order.deleteMany({ where: { userId: user.id } });

    await tx.user.delete({ where: { id: user.id } });
  });

  const res = NextResponse.json({ ok: true });
  res.cookies.set("session-token", "", { maxAge: 0, path: "/" });
  return res;
}
