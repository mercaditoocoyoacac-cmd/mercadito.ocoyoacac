import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { requireUser } from "@/server/requireUser";
import { revalidatePath } from "next/cache";

function getDeviceId(userAgent: string, ip: string): string {
  const crypto = require("crypto");
  return crypto.createHash("sha256").update(`${userAgent}-${ip}`).digest("hex").slice(0, 32);
}

export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return auth.res;
  const userAgent = headers().get("user-agent") || "unknown";
  const ip = headers().get("x-forwarded-for")?.split(",")[0] || "unknown";

  const devices = await prisma.deviceAuthorization.findMany({
    where: { userId: auth.userId },
    orderBy: { lastSeen: "desc" },
  });

  return NextResponse.json({ ok: true, devices });
}

export async function POST(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.res;

  const json = await req.json().catch(() => null);
  const { deviceId, action } = json || {};

  if (action === "approve" && deviceId) {
    await prisma.deviceAuthorization.updateMany({
      where: { id: deviceId, userId: auth.userId },
      data: { isApproved: true },
    });
    revalidatePath("/perfil/dispositivos");
    return NextResponse.json({ ok: true });
  }

  if (action === "reject" && deviceId) {
    await prisma.deviceAuthorization.deleteMany({
      where: { id: deviceId, userId: auth.userId },
    });
    revalidatePath("/perfil/dispositivos");
    return NextResponse.json({ ok: true });
  }

  const userAgent = headers().get("user-agent") || "unknown";
  const ip = headers().get("x-forwarded-for")?.split(",")[0] || "unknown";
  const deviceIdHash = getDeviceId(userAgent, ip);

  const existing = await prisma.deviceAuthorization.findFirst({
    where: { userId: auth.userId, deviceId: deviceIdHash },
  });

  if (existing?.isApproved) {
    await prisma.deviceAuthorization.update({
      where: { id: existing.id },
      data: { lastSeen: new Date() },
    });
    return NextResponse.json({ ok: true, isApproved: true });
  }

  if (existing && !existing.isApproved) {
    return NextResponse.json({ ok: false, error: "Device pending approval" }, { status: 403 });
  }

  await prisma.deviceAuthorization.create({
    data: {
      userId: auth.userId,
      deviceId: deviceIdHash,
      userAgent,
      ipAddress: ip,
      isApproved: false,
    },
  });

  return NextResponse.json({ ok: false, error: "Device not authorized" }, { status: 403 });
}