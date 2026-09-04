import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { sendTextNotification } from "@/server/notifications";
import { sendWhatsAppMessage } from "@/server/whatsapp";
import { sendSMS } from "@/server/sns";

export const maxDuration = 60;

const REMINDER_MINUTES = 20;

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;

  if (!authHeader || authHeader !== expected) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const orders = await prisma.order.findMany({
      where: {
        readyReminderSent: false,
        OR: [
          { fulfillmentType: "PICKUP", status: "READY" },
          { fulfillmentType: "DELIVERY", status: "OUT_FOR_DELIVERY" },
        ],
      },
      select: {
        id: true,
        fulfillmentType: true,
        statusTimestamps: true,
        updatedAt: true,
        userId: true,
        customerPhone: true,
        store: { select: { name: true } },
      },
    });

    const cutoff = new Date(Date.now() - REMINDER_MINUTES * 60 * 1000);
    let sent = 0;

    for (const order of orders) {
      const ts = (order.statusTimestamps as Record<string, string> | null) || {};
      const referenceKey =
        order.fulfillmentType === "PICKUP" ? "READY" : "OUT_FOR_DELIVERY";
      const referenceRaw = ts[referenceKey] || order.updatedAt.toISOString();
      const referenceDate = new Date(referenceRaw);

      if (!referenceDate || referenceDate > cutoff) continue;

      const surveyUrl = `${process.env.NEXTAUTH_URL || ""}/mis-pedidos/${order.id}`;

      if (order.userId) {
        await sendTextNotification(order.userId, {
          title: "¿Ya recibiste tu pedido?",
          body: `Solo queremos confirmar que tu pedido de ${order.store?.name || "la tienda"} ya llegó. Si aún no, checa tu estado aquí.`,
          type: "ORDER_RECEIVED_REMINDER",
          url: `/mis-pedidos/${order.id}`,
        });
      }

      if (order.customerPhone) {
        const isPickup = order.fulfillmentType === "PICKUP";
        const message = isPickup
          ? `🔔 ¿Ya pasaste a recoger tu pedido de ${order.store?.name || "la tienda"}? Si ya lo tienes, confírmalo para cerrar tu pedido: ${surveyUrl}`
          : `🔔 ¿Ya recibiste tu pedido de ${order.store?.name || "la tienda"}? Si ya lo tienes, confírmalo para cerrar tu pedido: ${surveyUrl}`;
        await Promise.allSettled([
          sendWhatsAppMessage(order.customerPhone, message),
          sendSMS(order.customerPhone, message.replace(/[^\w\sáéíóúñ,.!¡¿?]/g, "")),
        ]);
      }

      await prisma.order.update({
        where: { id: order.id },
        data: { readyReminderSent: true },
      });

      sent += 1;
    }

    return NextResponse.json({ success: true, sent });
  } catch (error) {
    console.error("[CRON] Error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}