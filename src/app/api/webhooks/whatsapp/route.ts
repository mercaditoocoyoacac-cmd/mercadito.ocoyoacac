import { type NextRequest, NextResponse } from "next/server";
import { sendWhatsAppMessage } from "@/server/whatsapp";

const VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || "mercadito_verify_2026";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("[WHATSAPP WEBHOOK] Verified!");
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse("Verification failed", { status: 403 });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    console.log("[WHATSAPP WEBHOOK] Received:", JSON.stringify(body).slice(0, 500));

    const entry = body?.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    if (!value) {
      return NextResponse.json({ ok: true });
    }

    // Status updates (sent, delivered, read, failed)
    if (value.statuses) {
      for (const status of value.statuses) {
        console.log(`[WHATSAPP WEBHOOK] Status: ${status.status} for msg ${status.id}`);
      }
    }

    // Incoming messages from customers
    if (value.messages) {
      for (const msg of value.messages) {
        const from = msg.from; // sender phone
        const text = msg.text?.body || "";
        const msgId = msg.id;

        console.log(`[WHATSAPP WEBHOOK] Msg from ${from}: "${text}"`);

        // Auto-reply for now
        if (text.toLowerCase().includes("hola") || text.toLowerCase().includes("buenas")) {
          await sendWhatsAppMessage(from, "¡Hola! Gracias por contactar a Mercadito Ocoyoacac. Un vendedor te atenderá pronto.");
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[WHATSAPP WEBHOOK] Error:", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
