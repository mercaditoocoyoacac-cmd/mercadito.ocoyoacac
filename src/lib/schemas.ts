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
  scheduleDays: z.array(z.enum(DAYS)).min(1).optional(),
  scheduleDetails: z.any().optional(),
} as const;

export const updateStoreSchema = z.object(storeFields);

export const updateStoreSchemaAdmin = z.object({
  ...storeFields,
  isActive: z.boolean().optional(),
  isPublished: z.boolean().optional(),
});
