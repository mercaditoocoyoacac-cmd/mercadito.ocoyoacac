import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { sendCampaign } from "@/server/campaigns";

export const maxDuration = 60;

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;

  if (!authHeader || authHeader !== expected) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const due = await prisma.campaign.findMany({
      where: { status: "SCHEDULED", scheduledAt: { lte: new Date() } },
      select: { id: true },
    });

    let sent = 0;
    for (const c of due) {
      try {
        await sendCampaign(c.id);
        sent++;
      } catch (error) {
        console.error("[CRON] campaigns error:", c.id, error);
      }
    }

    console.log(`[CRON] campaigns: ${sent}/${due.length} enviadas`);
    return NextResponse.json({ success: true, sent, total: due.length });
  } catch (error) {
    console.error("[CRON] campaigns error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
