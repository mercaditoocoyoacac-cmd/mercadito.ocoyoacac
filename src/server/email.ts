import nodemailer from "nodemailer";

function getTransport() {
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
  const transport = getTransport();
  if (!transport) {
    console.log(`[EMAIL] Would send to ${opts.to}: ${opts.subject}`);
    return;
  }
  const from = `"Mercadito Ocoacac" <${process.env.EMAIL_FROM || process.env.SMTP_USER || "noreply@mercadito.app"}>`;
  await transport.sendMail({ from, to: opts.to, subject: opts.subject, html: opts.html });
}
