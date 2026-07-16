import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');

export const productCreateSchema = z.object({
  name: z.string().trim().min(1).max(200),
  sku: z.string().trim().max(100).optional(),
  unit: z.string().trim().max(30).default('unit'),
});

export const productUpdateSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  sku: z.string().trim().max(100).optional(),
  unit: z.string().trim().max(30).optional(),
});

export const columnCreateSchema = z.object({
  label: z.string().trim().min(1).max(100),
  type: z.enum(['currency', 'percent', 'number']).default('currency'),
  color: z.string().trim().max(20).default('#22D3EE'),
});

export const columnUpdateSchema = z.object({
  label: z.string().trim().min(1).max(100).optional(),
  type: z.enum(['currency', 'percent', 'number']).optional(),
  color: z.string().trim().max(20).optional(),
});

export const cellBatchSchema = z.object({
  cells: z.array(z.object({
    productId: objectId,
    columnId: objectId,
    rawValue: z.string().max(500),
  })).min(1).max(500),
});
