import { prisma } from "@/server/prisma";

interface NotificationData {
  title: string;
  body: string;
  type?: string;
}

export async function sendTextNotification(userId: string, data: NotificationData) {
  await prisma.notification.create({
    data: {
      userId,
      type: data.type || "PAYMENT_RECEIVED",
      title: data.title,
      message: data.body,
    },
  });
}

export async function getUnreadNotifications(userId: string) {
  return prisma.notification.findMany({
    where: { userId, read: false },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}