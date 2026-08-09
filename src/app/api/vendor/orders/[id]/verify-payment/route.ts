import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { requireUser } from "@/server/requireUser";
import { sendTextNotification } from "@/server/notifications";
import { appendStatusTimestamp } from "@/lib/statusTimestamps";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.res;

  const { id } = await params;

  const store = await prisma.store.findFirst({
    where: { ownerId: auth.userId },
    select: { id: true, name: true },
  });
  if (!store) {
    return NextResponse.json({ ok: false, error: "No tienes tienda." }, { status: 403 });
  }

  const order = await prisma.order.findFirst({
    where: { id, storeId: store.id },
    select: { id: true, paymentMethod: true, paymentVerified: true, userId: true },
  });
  if (!order) {
    return NextResponse.json({ ok: false, error: "Pedido no encontrado." }, { status: 404 });
  }
  if (order.paymentMethod !== "TRANSFERENCIA") {
    return NextResponse.json({ ok: false, error: "Este pedido no se pagó por transferencia." }, { status: 400 });
  }
  if (order.paymentVerified) {
    return NextResponse.json({ ok: true, already: true });
  }

  const timestamps = await prisma.order
    .findUnique({ where: { id } })
    .then((o) => o?.statusTimestamps as Record<string, string> | null);

  await prisma.order.update({
    where: { id },
    data: {
      paymentVerified: true,
      paymentVerifiedAt: new Date(),
      statusTimestamps: appendStatusTimestamp(timestamps, "PAYMENT_VERIFIED"),
    },
  });

  const user = await prisma.user.findUnique({
    where: { id: order.userId },
    select: { id: true },
  });

  if (user) {
    await sendTextNotification(user.id, {
      title: "Pago verificado",
      body: `${store.name} confirmó tu transferencia. Ya prepara tu pedido.`,
      type: "PAYMENT_VERIFIED",
      url: "/pedidos",
    });
  }

  return NextResponse.json({ ok: true });
}
