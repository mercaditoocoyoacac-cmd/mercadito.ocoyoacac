-- AlterTable: add sortOrder to Product for custom ordering
ALTER TABLE "Product" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;
