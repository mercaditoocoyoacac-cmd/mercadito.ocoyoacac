import { NextResponse } from "next/server";
import { sendEmptyStoreSuspensionWarning } from "@/server/push";

export const maxDuration = 60;

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;

  if (!authHeader || authHeader !== expected) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    await sendEmptyStoreSuspensionWarning();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[CRON] Error sending empty store warning:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}