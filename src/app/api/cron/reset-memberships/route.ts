import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";

export const maxDuration = 60;

const RUN_WINDOW_START_UTC = new Date("2026-09-01T06:00:00.000Z");
const RUN_WINDOW_END_UTC = new Date("2026-09-02T06:00:00.000Z");

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;

  if (!authHeader || authHeader !== expected) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const now = new Date();

  if (now < RUN_WINDOW_START_UTC || now >= RUN_WINDOW_END_UTC) {
    console.log("[CRON] reset-memberships fuera de ventana, omitiendo.");
    return NextResponse.json({ success: true, skipped: true });
  }

  try {
    const activeSubscriptions = await prisma.subscription.updateMany({
      where: { status: { in: ["TRIAL", "ACTIVE"] } },
      data: { status: "EXPIRED" },
    });

    const stores = await prisma.store.updateMany({
      where: { plan: "MEMBER" },
      data: { plan: "FREE" },
    });

    console.log(
      `[CRON] reset-memberships: ${activeSubscriptions.count} suscripciones expiradas, ${stores.count} tiendas a FREE`
    );

    return NextResponse.json({
      success: true,
      subscriptionsReset: activeSubscriptions.count,
      storesToFree: stores.count,
    });
  } catch (error) {
    console.error("[CRON] reset-memberships error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
