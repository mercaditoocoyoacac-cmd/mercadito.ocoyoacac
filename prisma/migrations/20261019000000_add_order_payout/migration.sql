ALTER TABLE "public"."Order" ADD COLUMN "commissionCents" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "public"."Order" ADD COLUMN "vendorPayoutCents" INTEGER NOT NULL DEFAULT 0;
