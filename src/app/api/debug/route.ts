import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { requireUser } from "@/server/requireUser";

export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return auth.res;

  const stores = await prisma.store.findMany({
    select: {
      id: true,
      name: true,
      acceptsMercadoPago: true,
      mercadoPagoStatus: true,
      mercadoPagoAccessToken: true,
    },
  });

  const storesDecoded = stores.map(s => ({
    ...s,
    mercadoPagoAccessToken: s.mercadoPagoAccessToken 
      ? "***" + Buffer.from(s.mercadoPagoAccessToken, "hex").toString("utf8").substring(0, 20) + "***"
      : null,
  }));

  return NextResponse.json({ stores: storesDecoded });
}