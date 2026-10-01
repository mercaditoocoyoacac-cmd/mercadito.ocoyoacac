import { NextResponse } from "next/server";
import { DRIVER_DOCS_DEADLINE } from "@/server/driverDocs";
import { sendDriverDocsReminder, stripDriversWithoutDocs } from "@/server/push";

export const maxDuration = 60;

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;

  if (!authHeader || authHeader !== expected) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const now = new Date();

  try {
    if (now < DRIVER_DOCS_DEADLINE) {
      const isMonday = now.getUTCDay() === 1;
      if (!isMonday) {
        return NextResponse.json({ success: true, skipped: true, reason: "recordatorio solo los lunes" });
      }
      const pending = await sendDriverDocsReminder();
      return NextResponse.json({ success: true, phase: "reminder", pending });
    }

    const stripped = await stripDriversWithoutDocs();
    return NextResponse.json({ success: true, phase: "strip", stripped });
  } catch (error) {
    console.error("[CRON] driver-docs error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}