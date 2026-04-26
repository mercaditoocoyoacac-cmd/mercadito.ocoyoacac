import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { requireUser } from "@/server/requireUser";

export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return auth.res;

  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      phone: true,
      address: true,
      city: true,
      state: true,
      zipCode: true,
      latitude: true,
      longitude: true,
      emailVerified: true,
      phoneVerified: true,
    },
  });

  return NextResponse.json({ ok: true, user });
}

export async function PUT(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.res;

  const json = await req.json().catch(() => null);
  const { name, phone, address, city, state, zipCode, latitude, longitude } = json || {};

  await prisma.user.update({
    where: { id: auth.userId },
    data: {
      name: name?.trim() || null,
      phone: phone?.trim() || null,
      address: address?.trim() || null,
      city: city?.trim() || null,
      state: state?.trim() || null,
      zipCode: zipCode?.trim() || null,
      latitude: typeof latitude === "number" ? latitude : null,
      longitude: typeof longitude === "number" ? longitude : null,
    },
  });

  return NextResponse.json({ ok: true });
}