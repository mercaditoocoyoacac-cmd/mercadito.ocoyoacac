import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

const snsClient = new SNSClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

export async function sendSMS(phoneNumber: string, message: string): Promise<boolean> {
  try {
    const cleanPhone = phoneNumber.replace(/\D/g, "");
    const formattedPhone = cleanPhone.startsWith("52") 
      ? `+${cleanPhone}` 
      : `+52${cleanPhone}`;

    const command = new PublishCommand({
      PhoneNumber: formattedPhone,
      Message: message,
      MessageType: "OTP",
    });

    const result = await snsClient.send(command);
    console.log(`[SMS] Sent to ${formattedPhone}, MessageId: ${result.MessageId}`);
    return true;
  } catch (error) {
    console.error("[SMS] Error sending SMS:", error);
    return false;
  }
}

export async function sendVerificationSMS(phoneNumber: string, code: string): Promise<boolean> {
  const message = `Tu código de verificación de Mercadito es: ${code}. Expira en 15 minutos.`;
  return sendSMS(phoneNumber, message);
}