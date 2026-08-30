import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { isStoreOpenToday } from "@/lib/schedule";
import { sendPromotionsToStoreCustomers } from "@/server/push";

export const maxDuration = 60;

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;

  if (!authHeader || authHeader !== expected) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const stores = await prisma.store.findMany({
      where: {
        isActive: true,
        isPublished: true,
        plan: "MEMBER",
        subscription: {
          is: {
            status: { in: ["ACTIVE", "TRIAL"] },
            endDate: { gt: new Date() },
          },
        },
      },
      select: {
        id: true,
        name: true,
        openTime: true,
        closeTime: true,
        scheduleDays: true,
        scheduleDetails: true,
        promotions: {
          where: {
            isActive: true,
            OR: [
              { endDate: null },
              { endDate: { gte: new Date() } },
            ],
          },
          select: { id: true },
        },
      },
    });

    let notified = 0;

    for (const store of stores) {
      if (store.promotions.length === 0) continue;
      if (!isStoreOpenToday(store as any)) continue;

      await sendPromotionsToStoreCustomers(store.id, store.name);
      notified++;
    }

    console.log(`[CRON] promo-notify: ${notified} tiendas procesadas`);
    return NextResponse.json({ success: true, notified });
  } catch (error) {
    console.error("[CRON] Error in promo-notify:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
