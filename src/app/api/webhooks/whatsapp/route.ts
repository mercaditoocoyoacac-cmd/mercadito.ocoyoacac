import crypto from "crypto";
import { type NextRequest, NextResponse } from "next/server";
import { sendWhatsAppMessage } from "@/server/whatsapp";

const VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || "";
const APP_SECRET = process.env.WHATSAPP_APP_SECRET || "";

function verifySignature(rawBody: string, signatureHeader: string | null): boolean {
  if (!APP_SECRET || !signatureHeader?.startsWith("sha256=")) return false;
  const expected = "sha256=" + crypto.createHmac("sha256", APP_SECRET).update(rawBody, "utf8").digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signatureHeader);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (!VERIFY_TOKEN) {
    return new NextResponse("Webhook no configurado", { status: 503 });
  }

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse("Verification failed", { status: 403 });
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  if (!verifySignature(rawBody, req.headers.get("x-hub-signature-256"))) {
    return NextResponse.json({ ok: false, error: "Firma inválida" }, { status: 401 });
  }

  try {
    const body = JSON.parse(rawBody);

    const entry = body?.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    if (!value) {
      return NextResponse.json({ ok: true });
    }

    if (value.statuses) {
      for (const status of value.statuses) {
        console.log(`[WHATSAPP WEBHOOK] Status: ${status.status} for msg ${status.id}`);
      }
    }

    if (value.messages) {
      for (const msg of value.messages) {
        const from = msg.from;
        const text = msg.text?.body || "";

        if (text.toLowerCase().includes("hola") || text.toLowerCase().includes("buenas")) {
          await sendWhatsAppMessage(from, "¡Hola! Gracias por contactar a Mercadito Ocoyoacac. Un vendedor te atenderá pronto.");
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
