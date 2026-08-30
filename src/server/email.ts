import { Resend } from "resend";
import nodemailer from "nodemailer";

let resendClient: Resend | null = null;

function getResend() {
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

const FROM_EMAIL = process.env.EMAIL_FROM || "Mercadito Ocoyoacac <noreply@mercaditoocoyoacac.com>";

function getSmtpTransport() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !port || !user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port: Number(port),
    secure: Number(port) === 465,
    auth: { user, pass },
  });
}

export async function sendEmail(opts: { to: string; subject: string; html: string }) {
  // Primary: Resend (same service used for membership emails)
  if (process.env.RESEND_API_KEY) {
    try {
      await getResend().emails.send({
        from: FROM_EMAIL,
        to: [opts.to],
        subject: opts.subject,
        html: opts.html,
      });
      return;
    } catch (error) {
      console.error("[EMAIL] Resend failed, falling back to SMTP:", error);
    }
  }

  // Fallback: SMTP
  const smtpTransport = getSmtpTransport();
  if (!smtpTransport) {
    console.log(`[EMAIL] No transport configured (Resend/SMTP). Would send to ${opts.to}: ${opts.subject}`);
    return;
  }
  const from = `"Mercadito Ocoyoacac" <${process.env.EMAIL_FROM || process.env.SMTP_USER || "noreply@mercadito.app"}>`;
  await smtpTransport.sendMail({ from, to: opts.to, subject: opts.subject, html: opts.html });
}
