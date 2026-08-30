import { prisma } from "@/server/prisma";
import { sendPushToMultiple } from "@/server/push";
import type { Campaign, CampaignSegment, User } from "@prisma/client";

type CampaignRecipient = Pick<User, "id" | "pushToken">;

export async function resolveCampaignRecipients(
  campaign: Pick<Campaign, "segment" | "storeId" | "categoryId">,
): Promise<CampaignRecipient[]> {
  let userIds: string[] | null = null;

  if (campaign.segment === "STORE_CUSTOMERS" && campaign.storeId) {
    const rows = await prisma.order.findMany({
      where: { storeId: campaign.storeId },
      select: { userId: true },
      distinct: ["userId"],
    });
    userIds = rows.map((r) => r.userId);
  } else if (campaign.segment === "BY_CATEGORY" && campaign.categoryId) {
    const category = await prisma.category.findUnique({
      where: { id: campaign.categoryId },
      select: { key: true },
    });
    if (category) {
      const stores = await prisma.store.findMany({
        where: { category: category.key },
        select: { id: true },
      });
      const storeIds = stores.map((s) => s.id);
      if (storeIds.length) {
        const rows = await prisma.order.findMany({
          where: { storeId: { in: storeIds } },
          select: { userId: true },
          distinct: ["userId"],
        });
        userIds = rows.map((r) => r.userId);
      }
    }
  }

  const where: Record<string, unknown> = { pushToken: { not: null }, isActive: true };
  if (campaign.segment === "CUSTOMERS") {
    where.role = "CUSTOMER";
  }
  if (userIds !== null) {
    where.id = { in: userIds };
  }

  return prisma.user.findMany({
    where,
    select: { id: true, pushToken: true },
  }) as Promise<CampaignRecipient[]>;
}

export async function sendCampaign(campaignId: string) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: {
      id: true,
      title: true,
      body: true,
      url: true,
      segment: true,
      storeId: true,
      categoryId: true,
      status: true,
    },
  });

  if (!campaign) {
    throw new Error("Campaña no encontrada");
  }
  if (campaign.status === "SENT") {
    throw new Error("La campaña ya fue enviada");
  }

  const recipients = await resolveCampaignRecipients(campaign);
  const tokens = recipients.map((r) => r.pushToken).filter(Boolean) as string[];

  if (recipients.length > 0) {
    await prisma.notification.createMany({
      data: recipients.map((r) => ({
        userId: r.id,
        type: "CAMPAIGN",
        title: campaign.title,
        message: campaign.body,
      })),
    });
  }

  if (tokens.length > 0) {
    await sendPushToMultiple(tokens, {
      title: campaign.title,
      body: campaign.body,
      url: campaign.url,
      type: "CAMPAIGN",
    });
  }

  await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      status: "SENT",
      sentAt: new Date(),
      recipientCount: recipients.length,
    },
  });

  return { sent: recipients.length, devices: tokens.length };
}
