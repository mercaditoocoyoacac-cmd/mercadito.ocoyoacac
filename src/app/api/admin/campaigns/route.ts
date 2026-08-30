import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/prisma";
import { requireRole } from "@/server/requireUser";

const CreateCampaignSchema = z.object({
  title: z.string().min(3).max(120),
  body: z.string().min(3).max(500),
  url: z.string().default("/tiendas"),
  segment: z.enum(["ALL_USERS", "CUSTOMERS", "STORE_CUSTOMERS", "BY_CATEGORY"]).default("ALL_USERS"),
  storeId: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  scheduledAt: z.string().optional().nullable(),
});

export async function GET() {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.res;

  const campaigns = await prisma.campaign.findMany({
    include: {
      createdBy: { select: { name: true, email: true } },
      store: { select: { id: true, name: true } },
      category: { select: { id: true, label: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ ok: true, campaigns });
}

export async function POST(req: Request) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.res;

  const parsed = CreateCampaignSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Datos inválidos", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const campaign = await prisma.campaign.create({
    data: {
      title: data.title,
      body: data.body,
      url: data.url,
      segment: data.segment,
      storeId: data.storeId ?? null,
      categoryId: data.categoryId ?? null,
      scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
      status: data.scheduledAt ? "SCHEDULED" : "DRAFT",
      createdById: auth.userId,
    },
  });

  return NextResponse.json({ ok: true, campaign });
}
