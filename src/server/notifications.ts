import { prisma } from "@/server/prisma";
import { sendPushNotification } from "@/server/push";
import { sendWhatsAppMessage } from "@/server/whatsapp";
import { sendSMS } from "@/server/sns";

interface NotificationData {
  title: string;
  body: string;
  type?: string;
  url?: string;
}

export async function sendTextNotification(userId: string, data: NotificationData) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { pushToken: true },
  });

  await prisma.notification.create({
    data: {
      userId,
      type: data.type || "PAYMENT_RECEIVED",
      title: data.title,
      message: data.body,
    },
  });

  if (user?.pushToken) {
    await sendPushNotification(user.pushToken, { title: data.title, body: data.body, url: data.url, type: data.type });
  }
}

export async function notifyCustomerOrderCompleted(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      userId: true,
      customerPhone: true,
      store: { select: { name: true } },
    },
  });

  if (!order) return;

  const ratingUrl = `${process.env.NEXTAUTH_URL || ""}/mis-pedidos/${orderId}`;

  if (order.userId) {
    await sendTextNotification(order.userId, {
      title: "Pedido entregado",
      body: `Tu pedido en ${order.store?.name || "la tienda"} ha sido entregado. ¡Califica tu experiencia!`,
      type: "ORDER_COMPLETED",
      url: `/mis-pedidos/${orderId}`,
    });
  }

  if (order.customerPhone) {
    const message = `🛵 ¡Tu pedido de ${order.store?.name || "la tienda"} ha llegado! ¿Cómo te fue? Cuéntanos calificando tu experiencia aquí: ${ratingUrl}`;
    await Promise.allSettled([
      sendWhatsAppMessage(order.customerPhone, message),
      sendSMS(order.customerPhone, message.replace(/[^\w\sáéíóúñ,.!¡¿?]/g, "")),
    ]);
  }
}

export async function getUnreadNotifications(userId: string) {
  return prisma.notification.findMany({
    where: { userId, read: false },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}
