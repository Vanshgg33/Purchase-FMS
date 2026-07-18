import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');
const constantName = z.string().regex(/^[A-Z][A-Z0-9_]{1,30}$/, 'Use UPPER_SNAKE_CASE, e.g. SEED_RATE');

export const productCreateSchema = z.object({
  name: z.string().trim().min(1).max(200),
  sku: z.string().trim().max(100).optional(),
  unit: z.string().trim().max(30).default('unit'),
  batchQty: z.number().positive().max(1_000_000).default(1),
  baseAmount: z.number().min(0).max(100_000_000).default(0),
  sellingPrice: z.number().min(0).max(100_000_000).default(0),
});

export const productUpdateSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  sku: z.string().trim().max(100).optional(),
  unit: z.string().trim().max(30).optional(),
  batchQty: z.number().positive().max(1_000_000).optional(),
  baseAmount: z.number().min(0).max(100_000_000).optional(),
  sellingPrice: z.number().min(0).max(100_000_000).optional(),
  priceLocked: z.boolean().optional(),
  position: z.number().int().min(0).optional(),
});

export const columnCreateSchema = z.object({
  label: z.string().trim().min(1).max(100),
  type: z.enum(['currency', 'percent', 'number']).default('currency'),
  color: z.string().trim().max(20).default('#22D3EE'),
  locked: z.boolean().default(false),
});

export const columnUpdateSchema = z.object({
  label: z.string().trim().min(1).max(100).optional(),
  type: z.enum(['currency', 'percent', 'number']).optional(),
  color: z.string().trim().max(20).optional(),
  hidden: z.boolean().optional(),
  locked: z.boolean().optional(),
  position: z.number().int().min(0).optional(),
});

export const cellBatchSchema = z.object({
  cells: z.array(z.object({
    productId: objectId,
    columnId: objectId,
    rawValue: z.string().max(500),
    note: z.string().max(300).nullable().optional(),
  })).min(1).max(500),
});

export const totalOverrideSchema = z.object({
  formula: z.string().min(1).max(500).refine(v => v.startsWith('='), 'Must be a formula starting with ='),
});

export const constantCreateSchema = z.object({
  name: constantName,
  value: z.number().finite(),
  description: z.string().trim().max(200).optional(),
});

export const constantUpdateSchema = z.object({
  name: constantName.optional(),
  value: z.number().finite().optional(),
  description: z.string().trim().max(200).optional(),
});

export const settingsUpdateSchema = z.object({
  marginThreshold: z.number().min(0).max(100).optional(),
});

export const photoPatchSchema = z.object({
  photoId: objectId,
  isPrimary: z.boolean().optional(),
  position: z.number().int().min(0).optional(),
});

export const unlockSchema = z.object({
  pin: z.string().regex(/^\d{4,8}$/, 'PIN must be numeric'),
});
