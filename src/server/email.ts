import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function sendEmail(opts: { to: string; subject: string; html: string }) {
  if (!resend) {
    console.log(`[EMAIL] Would send to ${opts.to}: ${opts.subject}`);
    return;
  }
  const from = process.env.EMAIL_FROM || "Mercadito Ocoacac <noreply@mercadito.app>";
  await resend.emails.send({ from, to: opts.to, subject: opts.subject, html: opts.html });
}
