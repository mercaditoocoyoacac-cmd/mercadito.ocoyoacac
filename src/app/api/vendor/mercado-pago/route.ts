import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/prisma";
import { requireUser } from "@/server/requireUser";

const credentialSchema = z.object({
  accessToken: z.string().min(1),
  publicKey: z.string().optional(),
  accountId: z.string().optional(),
});

function encrypt(text: string): string {
  const buffer = Buffer.from(text);
  const base64 = buffer.toString("base64");
  return Buffer.from(base64).toString("hex");
}

export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return auth.res;

  const store = await prisma.store.findFirst({
    where: { ownerId: auth.userId },
    select: {
      id: true,
      acceptsMercadoPago: true,
      mercadoPagoStatus: true,
      mercadoPagoAccountId: true,
    },
  });

  if (!store) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  return NextResponse.json({
    ok: true,
    acceptsMercadoPago: store.acceptsMercadoPago,
    status: store.mercadoPagoStatus,
    hasCredentials: !!store.mercadoPagoAccountId,
  });
}

export async function POST(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.res;

  const json = await req.json().catch(() => null);
  const parsed = credentialSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Datos inválidos" },
      { status: 400 },
    );
  }

  const store = await prisma.store.findFirst({
    where: { ownerId: auth.userId },
    select: { id: true },
  });

  if (!store) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  const encryptedToken = encrypt(parsed.data.accessToken);
  const encryptedPublicKey = parsed.data.publicKey 
    ? encrypt(parsed.data.publicKey) 
    : null;

  await prisma.store.update({
    where: { id: store.id },
    data: {
      mercadoPagoStatus: "PENDING",
      mercadoPagoAccessToken: encryptedToken,
      mercadoPagoPublicKey: encryptedPublicKey,
      mercadoPagoAccountId: parsed.data.accountId || null,
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const auth = await requireUser();
  if (!auth.ok) return auth.res;

  const store = await prisma.store.findFirst({
    where: { ownerId: auth.userId },
    select: { id: true },
  });

  if (!store) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  await prisma.store.update({
    where: { id: store.id },
    data: {
      acceptsMercadoPago: false,
      mercadoPagoAccessToken: null,
      mercadoPagoRefreshToken: null,
      mercadoPagoPublicKey: null,
      mercadoPagoAccountId: null,
    },
  });

  return NextResponse.json({ ok: true });
}