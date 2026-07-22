import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { sendTextNotification } from "@/server/notifications";
import { generateReceipt } from "@/server/email/receipt";
import { sendMembershipActivationEmail } from "@/server/email/membership";

export async function POST(req: Request) {
  const body = await req.json();

  if (body.topic === "payment" || body.type === "payment") {
    const paymentId = body.data?.id || body.id;
    if (!paymentId) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    try {
      const paymentInfoRes = await fetch(
        `https://api.mercadopago.com/v1/payments/${paymentId}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`,
          },
        },
      );
      const paymentInfo = await paymentInfoRes.json();

      if (paymentInfo.status === "approved") {
        const externalRef = paymentInfo.external_reference || "";

        // Subscription payment
        if (externalRef.startsWith("sub_")) {
          // Parse: sub_{storeId} or sub_{storeId}_c_{couponCode}
          const refBody = externalRef.slice(4);
          let storeId: string;
          let couponCode: string | null = null;
          const couponIdx = refBody.indexOf("_c_");
          if (couponIdx !== -1) {
            storeId = refBody.slice(0, couponIdx);
            couponCode = refBody.slice(couponIdx + 3);
          } else {
            storeId = refBody;
          }
          const now = new Date();
          const endDate = new Date();
          endDate.setMonth(endDate.getMonth() + 1);

          const sub = await prisma.subscription.findUnique({ where: { storeId } });

          if (sub) {
            // Extend by 1 month from current endDate (or from now if expired)
            const base = sub.endDate > now ? sub.endDate : now;
            const newEnd = new Date(base);
            newEnd.setMonth(newEnd.getMonth() + 1);

            await prisma.subscription.update({
              where: { storeId },
              data: {
                status: "ACTIVE",
                endDate: newEnd,
                paymentMethod: "MERCADO_PAGO",
                paymentReference: paymentInfo.id?.toString(),
                // Set discount for first payment
                discountEndDate: sub.discountEndDate ?? new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()),
              },
            });
          } else {
            // New subscription
            await prisma.subscription.create({
              data: {
                storeId,
                status: "ACTIVE",
                endDate,
                startDate: now,
                monthlyPriceCents: 83000,
                paymentMethod: "MERCADO_PAGO",
                paymentReference: paymentInfo.id?.toString(),
                discountEndDate: new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()),
              },
            });
          }

          // Re-publish store and upgrade plan
          await prisma.store.update({
            where: { id: storeId },
            data: { isPublished: true, plan: "MEMBER" },
          });

          // Track membership coupon usage
          if (couponCode) {
            await prisma.membershipCoupon.update({
              where: { code: couponCode },
              data: { usedCount: { increment: 1 } },
            }).catch(() => {});
          }

          // Get store + user info for receipt and email
          const store = await prisma.store.findUnique({
            where: { id: storeId },
            select: {
              ownerId: true,
              name: true,
              owner: { select: { name: true, email: true } },
              subscription: { select: { id: true } },
            },
          });

          // Get coupon savings if applied
          let couponSavings: number | null = null;
          if (couponCode) {
            const coupon = await prisma.membershipCoupon.findUnique({
              where: { code: couponCode },
              select: { discountType: true, discountValue: true },
            });
            if (coupon) {
              const base = 83000;
              if (coupon.discountType === "PERCENTAGE") {
                couponSavings = Math.round(base * coupon.discountValue / 100);
              } else {
                couponSavings = coupon.discountValue;
              }
            }
          }

          const amountPaid = paymentInfo.transaction_amount
            ? Math.round(paymentInfo.transaction_amount * 100)
            : 83000;

          // Generate receipt
          const receipt = await generateReceipt({
            storeId,
            subscriptionId: store?.subscription?.id,
            amountCents: amountPaid,
            description: "Membresía Vende+ — 1 mes",
            periodStart: sub ? (sub.endDate > now ? sub.endDate : now) : now,
            periodEnd: endDate,
            couponCode,
            couponSavings,
            paymentMethod: "MERCADO_PAGO",
            paymentReference: paymentInfo.id?.toString(),
          });

          // Send confirmation email
          if (store?.owner?.email) {
            await sendMembershipActivationEmail({
              to: store.owner.email,
              vendorName: store.owner.name || "Vendedor",
              storeName: store.name,
              periodStart: receipt.periodStart,
              periodEnd: receipt.periodEnd,
              amountCents: receipt.amountCents,
              couponCode: receipt.couponCode,
              couponSavings: receipt.couponSavings,
              receiptNumber: receipt.receiptNumber,
            });
          }

          // Send push notification
          if (store?.ownerId) {
            await sendTextNotification(store.ownerId, {
              title: "Membresía activada",
              body: `Pago recibido. Tu membresía para ${store.name} está activa hasta ${endDate.toLocaleDateString("es-MX")}.`,
              type: "MEMBERSHIP",
              url: "/vendor/membresia",
            });
          }
        } else if (externalRef) {
          // Order payment
          const order = await prisma.order.findUnique({
            where: { id: externalRef },
            select: { id: true, storeId: true, status: true },
          });

          if (order && order.status === "PENDING") {
            await prisma.order.update({
              where: { id: externalRef },
              data: { status: "CONFIRMED" },
            });

            const store = await prisma.store.findUnique({
              where: { id: order.storeId },
              select: { ownerId: true, name: true },
            });

            if (store?.ownerId) {
              await sendTextNotification(store.ownerId, {
                title: "Pago recibido",
                body: `Nuevo pago aprobado para tu tienda ${store.name}. Pedido #${externalRef.slice(-8)}`,
                type: "PAYMENT",
                url: "/vendor/pedidos",
              });
            }
          }
        }
      }
    } catch (e) {
      console.error("Webhook error:", e);
    }
  }

  return NextResponse.json({ ok: true });
}