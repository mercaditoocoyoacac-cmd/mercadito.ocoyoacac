import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { requireUser } from "@/server/requireUser";
import { broadcastPromotion } from "@/server/push";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.res;
  const { id } = await ctx.params;

  const store = await prisma.store.findFirst({
    where: { ownerId: auth.userId },
    select: { id: true, name: true },
  });
  if (!store) return NextResponse.json({ ok: false }, { status: 403 });

  const product = await prisma.product.findFirst({
    where: { id, storeId: store.id, isPromotion: true },
    select: { name: true, discountPercentage: true },
  });
  if (!product) {
    return NextResponse.json(
      { ok: false, error: "Producto no encontrado o no tiene promoción activa." },
      { status: 400 },
    );
  }

  broadcastPromotion({
    storeName: store.name || "Mercadito Ocoyoacac",
    productName: product.name,
    discountPercentage: product.discountPercentage,
  });

  return NextResponse.json({ ok: true });
}
