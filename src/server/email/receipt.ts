import { prisma } from "@/server/prisma";

interface GenerateReceiptParams {
  storeId: string;
  subscriptionId?: string;
  amountCents: number;
  description: string;
  periodStart: Date;
  periodEnd: Date;
  couponCode?: string | null;
  couponSavings?: number | null;
  paymentMethod?: string;
  paymentReference?: string;
}

export async function generateReceipt(params: GenerateReceiptParams) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");

  // Get next sequential number for this month
  const prefix = `REC-${year}-${month}`;
  const lastReceipt = await prisma.paymentReceipt.findFirst({
    where: { receiptNumber: { startsWith: prefix } },
    orderBy: { receiptNumber: "desc" },
  });

  let seq = 1;
  if (lastReceipt) {
    const lastSeq = parseInt(lastReceipt.receiptNumber.split("-").pop() || "0", 10);
    seq = lastSeq + 1;
  }

  const receiptNumber = `${prefix}-${String(seq).padStart(4, "0")}`;

  const receipt = await prisma.paymentReceipt.create({
    data: {
      receiptNumber,
      amountCents: params.amountCents,
      currency: "MXN",
      description: params.description,
      periodStart: params.periodStart,
      periodEnd: params.periodEnd,
      couponCode: params.couponCode,
      couponSavings: params.couponSavings,
      paymentMethod: params.paymentMethod,
      paymentReference: params.paymentReference,
      status: "PAID",
      storeId: params.storeId,
      subscriptionId: params.subscriptionId,
    },
  });

  return receipt;
}
