import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/prisma";
import { requireUser } from "@/server/requireUser";

const PROCESSORS = {
  MERCADO_PAGO: {
    label: "Mercado Pago",
    fields: [
      { key: "accessToken", label: "Access Token", required: true },
      { key: "publicKey", label: "Public Key", required: false },
      { key: "accountId", label: "Account ID", required: false },
    ],
  },
  CLIP: {
    label: "Clip",
    fields: [
      { key: "apiKey", label: "API Key", required: true },
      { key: "secretKey", label: "Secret Key", required: true },
      { key: "merchantId", label: "Merchant ID", required: false },
    ],
  },
  BBVA: {
    label: "BBVA",
    fields: [
      { key: "clientId", label: "Client ID", required: true },
      { key: "clientSecret", label: "Client Secret", required: true },
      { key: "affiliationId", label: "Affiliation ID", required: false },
    ],
  },
  OPENPAY: {
    label: "OpenPay",
    fields: [
      { key: "privateKey", label: "Private Key", required: true },
      { key: "publicKey", label: "Public Key", required: true },
      { key: "merchantId", label: "Merchant ID", required: true },
    ],
  },
  CONEKTRA: {
    label: "Conekta",
    fields: [
      { key: "privateKey", label: "Private Key", required: true },
      { key: "publicKey", label: "Public Key", required: true },
    ],
  },
};

function encrypt(text: string): string {
  return Buffer.from(Buffer.from(text).toString("base64")).toString("hex");
}

function decrypt(hex: string): string {
  return Buffer.from(Buffer.from(hex, "hex").toString("base64"), "base64").toString("utf8");
}

export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return auth.res;

  const store = await prisma.store.findFirst({
    where: { ownerId: auth.userId },
    select: { id: true },
  });

  if (!store) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  const methods = await prisma.storePaymentMethod.findMany({
    where: { storeId: store.id },
    select: {
      id: true,
      processor: true,
      label: true,
      isActive: true,
      status: true,
      credentials: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const result = methods.map((m) => ({
    ...m,
    hasCredentials: !!m.credentials,
    credentials: m.credentials ? JSON.parse(decrypt(m.credentials)) : null,
  }));

  return NextResponse.json({ ok: true, methods: result, processors: PROCESSORS });
}

const saveSchema = z.object({
  processor: z.enum(["MERCADO_PAGO", "CLIP", "BBVA", "OPENPAY", "CONEKTRA"]),
  credentials: z.record(z.string(), z.string().optional()),
});

export async function POST(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.res;

  const json = await req.json().catch(() => null);
  const parsed = saveSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Datos inválidos" }, { status: 400 });
  }

  const store = await prisma.store.findFirst({
    where: { ownerId: auth.userId },
    select: { id: true, acceptsMercadoPago: true },
  });

  if (!store) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  const processorDef = PROCESSORS[parsed.data.processor];
  if (!processorDef) {
    return NextResponse.json({ ok: false, error: "Procesador no válido" }, { status: 400 });
  }

  const requiredFields = processorDef.fields.filter((f) => f.required);
  for (const field of requiredFields) {
    if (!parsed.data.credentials[field.key]) {
      return NextResponse.json(
        { ok: false, error: `El campo "${field.label}" es requerido` },
        { status: 400 },
      );
    }
  }

  const cleanCredentials: Record<string, string> = {};
  for (const key of Object.keys(parsed.data.credentials)) {
    if (parsed.data.credentials[key]) {
      cleanCredentials[key] = parsed.data.credentials[key]!;
    }
  }

  const encrypted = encrypt(JSON.stringify(cleanCredentials));

  const existing = await prisma.storePaymentMethod.findFirst({
    where: { storeId: store.id, processor: parsed.data.processor },
  });

  if (existing) {
    await prisma.storePaymentMethod.update({
      where: { id: existing.id },
      data: {
        credentials: encrypted,
        label: processorDef.label,
        status: "PENDING",
        isActive: true,
      },
    });
  } else {
    await prisma.storePaymentMethod.create({
      data: {
        storeId: store.id,
        processor: parsed.data.processor,
        label: processorDef.label,
        credentials: encrypted,
        status: "PENDING",
        isActive: true,
      },
    });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.res;

  const url = new URL(req.url);
  const id = url.searchParams.get("id");

  if (!id) {
    return NextResponse.json({ ok: false, error: "ID requerido" }, { status: 400 });
  }

  const store = await prisma.store.findFirst({
    where: { ownerId: auth.userId },
    select: { id: true },
  });

  if (!store) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  await prisma.storePaymentMethod.deleteMany({
    where: { id, storeId: store.id },
  });

  const hasActive = await prisma.storePaymentMethod.findFirst({
    where: { storeId: store.id, isActive: true, status: "APPROVED" },
  });

  if (!hasActive) {
    await prisma.store.update({
      where: { id: store.id },
      data: { acceptsMercadoPago: false },
    });
  }

  return NextResponse.json({ ok: true });
}
