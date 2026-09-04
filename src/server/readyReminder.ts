import { prisma } from "@/server/prisma";
import { sendTextNotification } from "@/server/notifications";
import { sendWhatsAppMessage } from "@/server/whatsapp";
import { sendSMS } from "@/server/sns";

export const REMINDER_MINUTES = 20;

export async function maybeSendReadyReminder(orderId: string) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        fulfillmentType: true,
        status: true,
        statusTimestamps: true,
        updatedAt: true,
        readyReminderSent: true,
        userId: true,
        customerPhone: true,
        store: { select: { name: true } },
      },
    });

    if (!order || order.readyReminderSent) return;

    const isReady =
      (order.fulfillmentType === "PICKUP" && order.status === "READY") ||
      (order.fulfillmentType === "DELIVERY" && order.status === "OUT_FOR_DELIVERY");
    if (!isReady) return;

    const ts = (order.statusTimestamps as Record<string, string> | null) || {};
    const referenceKey =
      order.fulfillmentType === "PICKUP" ? "READY" : "OUT_FOR_DELIVERY";
    const referenceRaw = ts[referenceKey] || order.updatedAt.toISOString();
    const referenceDate = new Date(referenceRaw);
    const cutoff = new Date(Date.now() - REMINDER_MINUTES * 60 * 1000);
    if (!referenceDate || referenceDate > cutoff) return;

    const url = `/mis-pedidos/${order.id}`;

    if (order.userId) {
      await sendTextNotification(order.userId, {
        title: "¿Ya recibiste tu pedido?",
        body: `Solo queremos confirmar que tu pedido de ${order.store?.name || "la tienda"} ya llegó. Si aún no, checa tu estado aquí.`,
        type: "ORDER_RECEIVED_REMINDER",
        url,
      });
    }

    if (order.customerPhone) {
      const isPickup = order.fulfillmentType === "PICKUP";
      const message = isPickup
        ? `🔔 ¿Ya pasaste a recoger tu pedido de ${order.store?.name || "la tienda"}? Si ya lo tienes, confírmalo para cerrar tu pedido: ${url}`
        : `🔔 ¿Ya recibiste tu pedido de ${order.store?.name || "la tienda"}? Si ya lo tienes, confírmalo para cerrar tu pedido: ${url}`;
      await Promise.allSettled([
        sendWhatsAppMessage(order.customerPhone, message),
        sendSMS(order.customerPhone, message.replace(/[^\w\sáéíóúñ,.!¡¿?]/g, "")),
      ]);
    }

    await prisma.order.update({
      where: { id: order.id },
      data: { readyReminderSent: true },
    });
  } catch (error) {
    console.error("[readyReminder] Error:", error);
  }
}