import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";

export async function GET() {
  const stores = await prisma.store.findMany({
    select: {
      id: true,
      name: true,
      acceptsMercadoPago: true,
      mercadoPagoStatus: true,
      mercadoPagoAccessToken: true,
    },
  });

  return NextResponse.json({ stores });
}