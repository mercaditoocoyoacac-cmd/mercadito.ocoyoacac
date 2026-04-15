import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { sendTextNotification } from "@/server/notifications";

export async function POST(req: Request) {
  const body = await req.json();

  if (body.topic === "payment" || body.type === "payment") {
    const paymentId = body.data?.id || body.id;
    if (!paymentId) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    try {
      const paymentInfoRes = await fetch(
        `https://api.mercadopago.com/v1/payments/${paymentId}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`,
          },
        },
      );
      const paymentInfo = await paymentInfoRes.json();

      if (paymentInfo.status === "approved") {
        const externalRef = paymentInfo.external_reference;
        if (externalRef) {
          const order = await prisma.order.findUnique({
            where: { id: externalRef },
            select: { id: true, storeId: true, status: true },
          });

          if (order && order.status === "PENDING") {
            await prisma.order.update({
              where: { id: externalRef },
              data: { status: "CONFIRMED" },
            });

            const store = await prisma.store.findUnique({
              where: { id: order.storeId },
              select: { ownerId: true, name: true },
            });

            if (store?.ownerId) {
              await sendTextNotification(store.ownerId, {
                title: "Pago recibido",
                body: `Nuevo pago aprobado para tu tienda ${store.name}. Pedido #${externalRef.slice(-8)}`,
              });
            }
          }
        }
      }
    } catch (e) {
      console.error("Webhook error:", e);
    }
  }

  return NextResponse.json({ ok: true });
}