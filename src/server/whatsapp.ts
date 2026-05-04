const WHATSAPP_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const WHATSAPP_API_URL = "https://graph.facebook.com/v18.0";

function formatPhoneForWhatsApp(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("52") && cleaned.length === 12) return cleaned;
  if (cleaned.startsWith("1") && cleaned.length === 11) return cleaned;
  if (cleaned.length === 10) return `52${cleaned}`;
  return `52${cleaned}`;
}

export async function sendWhatsAppMessage(
  toPhone: string,
  message: string
): Promise<{ ok: boolean; error?: string }> {
  if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_ID) {
    console.log("[WHATSAPP] No configurado. Mensaje:", message);
    return { ok: true };
  }

  const formattedPhone = formatPhoneForWhatsApp(toPhone);

  try {
    const response = await fetch(
      `${WHATSAPP_API_URL}/${WHATSAPP_PHONE_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: formattedPhone,
          type: "text",
          text: { body: message },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("[WHATSAPP] Error:", data);
      return { ok: false, error: data.error?.message || "Error al enviar WhatsApp" };
    }

    console.log(`[WHATSAPP] Mensaje enviado a ${formattedPhone}`);
    return { ok: true };
  } catch (e) {
    console.error("[WHATSAPP] Error de conexion:", e);
    return { ok: false, error: "Error de conexion con WhatsApp" };
  }
}

export async function notifyVendorNewOrder(params: {
  vendorPhone: string;
  storeName: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string | null;
  totalCents: number;
  currency: string;
  fulfillmentType: string;
  orderId: string;
  items: { name: string; quantity: number }[];
}): Promise<{ ok: boolean; error?: string }> {
  const total = (params.totalCents / 100).toFixed(2);
  const itemsList = params.items.map((i) => `• ${i.name} x${i.quantity}`).join("\n");

  const deliveryLabel = params.fulfillmentType === "DELIVERY" ? "🚚 Entrega a domicilio" : "🏪 Recoger en tienda";
  const addressLine = params.fulfillmentType === "DELIVERY" && params.customerAddress ? `\n📍 Direccion: ${params.customerAddress}` : "";

  const message = `🛒 *Nuevo Pedido*\n\n` +
    `📦 *Tienda:* ${params.storeName}\n` +
    `👤 *Cliente:* ${params.customerName}\n` +
    `📱 *Telefono:* ${params.customerPhone}\n` +
    `${deliveryLabel}${addressLine}\n\n` +
    `*Productos:*\n${itemsList}\n\n` +
    `💰 *Total: $${total} ${params.currency}*\n\n` +
    `Pedido: #${params.orderId.slice(-8).toUpperCase()}`;

  return sendWhatsAppMessage(params.vendorPhone, message);
}
