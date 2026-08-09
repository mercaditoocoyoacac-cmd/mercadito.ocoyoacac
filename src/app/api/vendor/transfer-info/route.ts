import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/prisma";
import { requireUser } from "@/server/requireUser";

const TransferInfoSchema = z.object({
  acceptsTransferencia: z.boolean(),
  transferBankName: z.string().trim().max(80).optional(),
  transferAccountHolder: z.string().trim().max(120).optional(),
  transferClabe: z.string().trim().regex(/^\d{18}$/, "La CLABE debe tener 18 dígitos").optional(),
});

export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return auth.res;

  const store = await prisma.store.findFirst({
    where: { ownerId: auth.userId },
    select: {
      acceptsTransferencia: true,
      transferBankName: true,
      transferAccountHolder: true,
      transferClabe: true,
    },
  });

  if (!store) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  return NextResponse.json({ ok: true, transfer: store });
}

export async function POST(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.res;

  const json = await req.json().catch(() => null);
  const parsed = TransferInfoSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
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

  const data = parsed.data;
  const accepts = data.acceptsTransferencia;
  if (accepts && (!data.transferClabe || !data.transferAccountHolder)) {
    return NextResponse.json(
      { ok: false, error: "Para activar la transferencia se requieren el titular y la CLABE" },
      { status: 400 },
    );
  }

  await prisma.store.update({
    where: { id: store.id },
    data: {
      acceptsTransferencia: accepts,
      transferBankName: accepts ? data.transferBankName || null : null,
      transferAccountHolder: accepts ? data.transferAccountHolder || null : null,
      transferClabe: accepts ? data.transferClabe || null : null,
    },
  });

  return NextResponse.json({ ok: true });
}
