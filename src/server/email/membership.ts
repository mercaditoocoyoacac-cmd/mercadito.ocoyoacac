import { Resend } from "resend";

let resendClient: Resend | null = null;

function getResend() {
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

const FROM_EMAIL = process.env.EMAIL_FROM || "Mercadito Ocoyoacac <noreply@mercaditoocoyoacac.com>";

interface SendMembershipEmailParams {
  to: string;
  vendorName: string;
  storeName: string;
  periodStart: Date;
  periodEnd: Date;
  amountCents: number;
  couponCode?: string | null;
  couponSavings?: number | null;
  receiptNumber: string;
}

export async function sendMembershipActivationEmail(params: SendMembershipEmailParams) {
  const {
    to,
    vendorName,
    storeName,
    periodStart,
    periodEnd,
    amountCents,
    couponCode,
    couponSavings,
    receiptNumber,
  } = params;

  const fmtDate = (d: Date) =>
    d.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
  const fmtMoney = (cents: number) =>
    `$${(cents / 100).toFixed(2)} MXN`;

  const total = fmtMoney(amountCents);
  const savings = couponSavings ? fmtMoney(couponSavings) : null;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:32px 20px;">
    <!-- Header -->
    <div style="text-align:center;margin-bottom:32px;">
      <div style="font-size:32px;margin-bottom:8px;">🎉</div>
      <h1 style="font-size:24px;font-weight:700;color:#16a34a;margin:0;">¡Membresía Activada!</h1>
      <p style="color:#6b7280;margin-top:8px;font-size:14px;">Tu plan Vende+ está listo</p>
    </div>

    <!-- Receipt Card -->
    <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:24px;margin-bottom:24px;">
      <div style="border-bottom:1px solid #e5e7eb;padding-bottom:16px;margin-bottom:16px;">
        <div style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Recibo de pago</div>
        <div style="font-size:18px;font-weight:700;color:#111827;margin-top:4px;">${receiptNumber}</div>
      </div>

      <table style="width:100%;font-size:14px;border-collapse:collapse;">
        <tr>
          <td style="padding:8px 0;color:#6b7280;">Vendedor</td>
          <td style="padding:8px 0;text-align:right;font-weight:500;color:#111827;">${vendorName}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#6b7280;">Tienda</td>
          <td style="padding:8px 0;text-align:right;font-weight:500;color:#111827;">${storeName}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#6b7280;">Plan</td>
          <td style="padding:8px 0;text-align:right;font-weight:500;color:#111827;">Vende+ (Mensual)</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#6b7280;">Periodo cubierto</td>
          <td style="padding:8px 0;text-align:right;font-weight:500;color:#111827;">${fmtDate(periodStart)} — ${fmtDate(periodEnd)}</td>
        </tr>
        ${couponCode ? `
        <tr>
          <td style="padding:8px 0;color:#6b7280;">Cupón aplicado</td>
          <td style="padding:8px 0;text-align:right;font-weight:500;color:#16a34a;">${couponCode}${savings ? ` (ahorro ${savings})` : ''}</td>
        </tr>` : ''}
        <tr>
          <td style="padding:12px 0 0;color:#111827;font-weight:700;font-size:16px;border-top:2px solid #e5e7eb;">Total pagado</td>
          <td style="padding:12px 0 0;text-align:right;font-weight:700;font-size:16px;color:#16a34a;border-top:2px solid #e5e7eb;">${total}</td>
        </tr>
      </table>
    </div>

    <!-- What's included -->
    <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:24px;margin-bottom:24px;">
      <h2 style="font-size:16px;font-weight:600;color:#111827;margin:0 0 12px;">Tu plan Vende+ incluye:</h2>
      <ul style="list-style:none;padding:0;margin:0;font-size:14px;color:#374151;">
        <li style="padding:6px 0;">✅ Envío a domicilio con repartidores locales</li>
        <li style="padding:6px 0;">✅ Promociones multi-producto y cupones de descuento</li>
        <li style="padding:6px 0;">✅ Pagos en línea con MercadoPago</li>
        <li style="padding:6px 0;">✅ Notificaciones push a tus clientes</li>
      </ul>
    </div>

    <!-- Footer -->
    <div style="text-align:center;color:#9ca3af;font-size:12px;line-height:1.6;">
      <p style="margin:0;">Este es tu recibo de pago oficial. Conseralo para tus registros.</p>
      <p style="margin:8px 0 0;">Si tienes dudas, responde a este correo o contacta al administrador.</p>
      <p style="margin:16px 0 0;font-weight:500;">Mercadito Ocoyoacac — Tu mercado en línea 🛒</p>
    </div>
  </div>
</body>
</html>`;

  try {
    const result = await getResend().emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: `¡Membresía Vende+ activada! — Recibo ${receiptNumber}`,
      html,
    });
    return { ok: true, id: result.data?.id };
  } catch (error) {
    console.error("Failed to send membership email:", error);
    return { ok: false, error: String(error) };
  }
}
