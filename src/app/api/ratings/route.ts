import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/server/prisma";
import { requireUser } from "@/server/requireUser";

export async function POST(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.res;

  const json = await req.json().catch(() => null);
  const { orderId, storeScore, packagingScore, completenessScore, deliveryScore, timelinessScore, comment } = json || {};

  if (!orderId || !storeScore || storeScore < 1 || storeScore > 5) {
    return NextResponse.json({ ok: false, error: "storeScore requerido (1-5)" }, { status: 400 });
  }

  function validScore(v: unknown, min = 1, max = 5): boolean {
    return v === undefined || v === null || (typeof v === "number" && v >= min && v <= max);
  }
  if (!validScore(packagingScore) || !validScore(completenessScore) || !validScore(deliveryScore) || !validScore(timelinessScore)) {
    return NextResponse.json({ ok: false, error: "Scores deben ser 1-5" }, { status: 400 });
  }

  const order = await prisma.order.findFirst({
    where: { id: orderId, userId: auth.userId, status: "COMPLETED" },
    select: { id: true, fulfillmentType: true },
  });

  if (!order) {
    return NextResponse.json({ ok: false, error: "Pedido no encontrado o no completado" }, { status: 404 });
  }

  const existing = await prisma.orderRating.findUnique({ where: { orderId } });
  if (existing) {
    return NextResponse.json({ ok: false, error: "Ya calificaste este pedido" }, { status: 400 });
  }

  await prisma.orderRating.create({
    data: {
      orderId,
      storeScore,
      packagingScore: packagingScore || null,
      completenessScore: completenessScore || null,
      deliveryScore: order.fulfillmentType === "DELIVERY" ? (deliveryScore || null) : null,
      timelinessScore: order.fulfillmentType === "DELIVERY" ? (timelinessScore || null) : null,
      comment: comment || null,
    },
  });

  revalidatePath(`/mis-pedidos/${orderId}`);
  revalidatePath(`/admin/ranking`);
  revalidatePath(`/vendor`);
  revalidatePath(`/delivery`);

  return NextResponse.json({ ok: true });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const storeId = searchParams.get("storeId");
  const deliveryUserId = searchParams.get("deliveryUserId");

  if (storeId) {
    const ratings = await prisma.orderRating.findMany({
      where: { order: { storeId } },
      select: { storeScore: true, deliveryScore: true, comment: true, createdAt: true },
    });
    const avgStore = ratings.length > 0 ? ratings.reduce((a, r) => a + r.storeScore, 0) / ratings.length : 0;
    const avgDelivery = ratings.length > 0
      ? ratings.filter(r => r.deliveryScore).reduce((a, r) => a + r.deliveryScore!, 0) / ratings.filter(r => r.deliveryScore).length
      : 0;
    return NextResponse.json({ ratings, avgStore, avgDelivery, total: ratings.length });
  }

  if (deliveryUserId) {
    const ratings = await prisma.orderRating.findMany({
      where: { order: { deliveryUserId } },
      select: { deliveryScore: true, comment: true, createdAt: true },
    });
    const scores = ratings.filter(r => r.deliveryScore).map(r => r.deliveryScore!);
    const avg = scores.length > 0 ? scores.reduce((a, s) => a + s, 0) / scores.length : 0;
    return NextResponse.json({ ratings, avg, total: ratings.length });
  }

  return NextResponse.json({ ok: false, error: "storeId o deliveryUserId requerido" }, { status: 400 });
}
