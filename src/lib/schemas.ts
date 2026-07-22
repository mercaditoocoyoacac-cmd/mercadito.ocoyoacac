import { z } from "zod";

export const DAYS = [
  "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY",
] as const;

export const variantCreateSchema = z.object({
  name: z.string().min(1).max(80),
  priceCents: z.number().int().min(1),
  sortOrder: z.number().int().default(0),
});

export const variantUpdateSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(80),
  priceCents: z.number().int().min(1),
  sortOrder: z.number().int().default(0),
});

export const productCreateSchemaBase = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(2000).optional(),
  priceCents: z.number().int().min(1),
  imageUrl: z.string().url().optional(),
  isActive: z.boolean().optional(),
  sku: z.string().optional(),
  stock: z.number().int().min(-1).optional(),
  sellByWeight: z.boolean().optional(),
  minWeightGrams: z.number().int().min(1).default(100),
  maxWeightGrams: z.number().int().min(1).default(5000),
  variants: z.array(variantCreateSchema).optional(),
  isPromotion: z.boolean().optional(),
  promotionPriceCents: z.number().int().min(0).optional(),
  discountPercentage: z.number().int().min(0).max(100).optional(),
  promotionStartDate: z.date().nullable().optional(),
  promotionEndDate: z.date().nullable().optional(),
});

export const productCreateSchema = productCreateSchemaBase.extend({
  storeId: z.string().min(1),
});

export const productUpdateSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  description: z.string().max(2000).optional(),
  priceCents: z.number().int().min(1).optional(),
  imageUrl: z.string().url().nullable().optional(),
  isActive: z.boolean().optional(),
  sku: z.string().nullable().optional(),
  stock: z.number().int().min(-1).optional(),
  sellByWeight: z.boolean().optional(),
  minWeightGrams: z.number().int().min(1).optional(),
  maxWeightGrams: z.number().int().min(1).optional(),
  variants: z.array(variantUpdateSchema).optional(),
  isPromotion: z.boolean().optional(),
  promotionPriceCents: z.number().int().min(0).nullable().optional(),
  discountPercentage: z.number().int().min(0).max(100).nullable().optional(),
  promotionStartDate: z.date().nullable().optional(),
  promotionEndDate: z.date().nullable().optional(),
});

const dayScheduleSchema = z.object({
  active: z.boolean(),
  start: z.string(),
  end: z.string(),
});

const storeFields = {
  name: z.string().min(2).max(80).optional(),
  category: z.string().min(1).max(40).optional(),
  description: z.string().max(280).optional(),
  phone: z.string().max(40).optional(),
  address: z.string().max(140).optional(),
  imageUrl: z.string().url().nullable().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  openTime: z.string().regex(/^([01]?\d|2[0-3]):[0-5]\d$/).nullable().optional(),
  closeTime: z.string().regex(/^([01]?\d|2[0-3]):[0-5]\d$/).nullable().optional(),
  scheduleDays: z.array(z.enum(DAYS)).optional(),
  scheduleDetails: z.object({
    mode: z.enum(["weekly", "daily"]),
    days: z.record(z.string(), dayScheduleSchema),
  }).optional(),
};

export const updateStoreSchema = z.object(storeFields);

export const updateStoreSchemaAdmin = z.object({
  ...storeFields,
  isActive: z.boolean().optional(),
  isPublished: z.boolean().optional(),
});

export const couponCreateSchema = z.object({
  code: z.string().min(2).max(40).toUpperCase().transform((v) => v.replace(/[^A-Z0-9_-]/g, "")),
  discountType: z.enum(["PERCENTAGE", "FIXED"]),
  discountValue: z.number().int().min(1),
  storeIds: z.array(z.string().min(1)).min(1),
  userIds: z.array(z.string().min(1)).optional(),
  minPurchaseCents: z.number().int().min(0).optional(),
  maxUses: z.number().int().min(1).optional(),
  maxUsesPerUser: z.number().int().min(1).optional(),
  userRegisteredBefore: z.string().datetime().nullable().optional(),
  storeCreatedBefore: z.string().datetime().nullable().optional(),
  isActive: z.boolean().optional(),
  startsAt: z.string().datetime().nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
});

export const couponUpdateSchema = z.object({
  code: z.string().min(2).max(40).toUpperCase().transform((v) => v.replace(/[^A-Z0-9_-]/g, "")).optional(),
  discountType: z.enum(["PERCENTAGE", "FIXED"]).optional(),
  discountValue: z.number().int().min(1).optional(),
  minPurchaseCents: z.number().int().min(0).nullable().optional(),
  maxUses: z.number().int().min(1).nullable().optional(),
  maxUsesPerUser: z.number().int().min(1).nullable().optional(),
  userRegisteredBefore: z.string().datetime().nullable().optional(),
  storeCreatedBefore: z.string().datetime().nullable().optional(),
  storeIds: z.array(z.string().min(1)).min(1).optional(),
  userIds: z.array(z.string().min(1)).optional(),
  isActive: z.boolean().optional(),
  startsAt: z.string().datetime().nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
});

export const applyCouponSchema = z.object({
  code: z.string().min(1).max(40),
});
