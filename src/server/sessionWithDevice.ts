import crypto from "crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";

export function getSession() {
  return getServerSession(authOptions);
}

export async function getSessionWithDevice() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { ok: false, res: { status: 401 } };
  }

  const { prisma } = await import("@/server/prisma");
  const headers = (await import("next/headers")).headers;

  function getDeviceId(userAgent: string, ip: string): string {
    return crypto.createHash("sha256").update(`${userAgent}-${ip}`).digest("hex").slice(0, 32);
  }

  const userAgent = (await headers()).get("user-agent") || "unknown";
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0] || "unknown";
  const deviceIdHash = getDeviceId(userAgent, ip);

  const device = await prisma.deviceAuthorization.findFirst({
    where: { userId: session.user.id, deviceId: deviceIdHash },
  });

  if (!device?.isApproved) {
    return { 
      ok: false, 
      res: { status: 403 }, 
      error: "device-not-approved",
      deviceId: device?.id 
    };
  }

  await prisma.deviceAuthorization.update({
    where: { id: device.id },
    data: { lastSeen: new Date() },
  });

  return { ok: true, session };
}