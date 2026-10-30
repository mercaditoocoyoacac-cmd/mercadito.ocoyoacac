import { NextResponse } from "next/server";
import { requireCron } from "@/server/cronAuth";
import { sendVendorReminder } from "@/server/push";

export const maxDuration = 60;

export async function GET(req: Request) {
  const denied = requireCron(req);
  if (denied) return denied;

  try {
    await sendVendorReminder();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[CRON] Error sending vendor reminder:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
