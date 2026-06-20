import { prisma } from "@/server/prisma";
import { sendPushNotification } from "@/server/push";

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

export async function getUnreadNotifications(userId: string) {
  return prisma.notification.findMany({
    where: { userId, read: false },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}
