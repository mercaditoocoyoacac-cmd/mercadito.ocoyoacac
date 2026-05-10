import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";

const client = (() => {
  if (!process.env.AWS_ACCESS_KEY_ID) return null;
  return new SESv2Client({
    region: process.env.AWS_REGION || "us-east-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
})();

export async function sendEmail(opts: { to: string; subject: string; html: string }) {
  if (!client) {
    console.log(`[EMAIL] Would send to ${opts.to}: ${opts.subject}`);
    return;
  }
  const from = process.env.EMAIL_FROM || "noreply@mercadito.app";
  await client.send(
    new SendEmailCommand({
      FromEmailAddress: from,
      Destination: { ToAddresses: [opts.to] },
      Content: {
        Simple: {
          Subject: { Data: opts.subject },
          Body: { Html: { Data: opts.html } },
        },
      },
    }),
  );
}
