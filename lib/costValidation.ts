import { z } from 'zod';
import { UOM, RM_CATEGORY, PKG_TYPE, CHANNEL, RATE_TYPE, SHIFT, LABOUR_TYPE } from '@/types/costTracker';

export const vendorSchema = z.object({
  code: z.string().trim().min(1).optional(),
  name: z.string().trim().min(1),
  gstin: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  city: z.string().trim().min(1),
  state: z.string().trim().optional(),
  paymentTerms: z.string().trim().optional(),
});

export const rawMaterialSchema = z.object({
  code: z.string().trim().min(1).optional(),
  name: z.string().trim().min(1),
  category: z.enum(RM_CATEGORY),
  uom: z.enum(UOM),
  hsnCode: z.string().trim().optional(),
  defaultGstRate: z.number().min(0),
  reorderLevel: z.number().min(0).optional(),
  standardYieldPercent: z.number().min(0).max(100).optional(),
});

export const purchaseItemSchema = z.object({
  rawMaterialId: z.string().min(1),
  quantity: z.number().positive(),
  uom: z.enum(UOM),
  ratePerUnit: z.number().positive(),
  gstRate: z.number().min(0),
});

export const purchaseSchema = z.object({
  vendorId: z.string().min(1),
  invoiceNo: z.string().trim().min(1),
  invoiceDate: z.coerce.date(),
  receivedDate: z.coerce.date(),
  items: z.array(purchaseItemSchema).min(1, 'Purchase must have at least one line item'),
  freightCharges: z.number().min(0).default(0),
  loadingCharges: z.number().min(0).default(0),
  otherCharges: z.number().min(0).default(0),
  otherChargesNote: z.string().trim().optional(),
  notes: z.string().trim().optional(),
}).superRefine((data, ctx) => {
  if (data.otherCharges > 0 && !data.otherChargesNote) {
    ctx.addIssue({ code: 'custom', path: ['otherChargesNote'], message: 'A note is required when other charges are present' });
  }
});

export const consumeSchema = z.object({
  rawMaterialId: z.string().min(1),
  quantity: z.number().positive(),
  uom: z.enum(UOM),
});

export const labourSchema = z.object({
  labourType: z.enum(LABOUR_TYPE),
  workerCount: z.number().int().positive(),
  hours: z.number().positive(),
});

export const machineSchema = z.object({
  machineName: z.string().trim().min(1),
  hours: z.number().positive(),
});

export const consumableSchema = z.object({
  itemName: z.string().trim().min(1),
  quantity: z.number().positive(),
  uom: z.enum(UOM),
  ratePerUnit: z.number().min(0),
});

export const yieldSchema = z.object({
  primary: z.object({
    quantity: z.number().positive(),
    uom: z.enum(UOM),
    unitsProduced: z.number().int().positive(),
  }),
  byProducts: z.array(z.object({
    byProductName: z.string().trim().min(1),
    quantity: z.number().min(0),
    uom: z.enum(UOM),
    realisableRatePerUnit: z.number().min(0),
  })).default([]),
});

export const packagingApplySchema = z.object({
  packagingBomId: z.string().min(1).optional(),
});

export const batchCreateSchema = z.object({
  productId: z.string().min(1),
  productionDate: z.coerce.date(),
  shift: z.enum(SHIFT).optional(),
  plannedInputQty: z.number().positive().optional(),
  notes: z.string().trim().optional(),
});

export const reopenSchema = z.object({
  reason: z.string().trim().min(10, 'Reason must be at least 10 characters'),
});

export const productSchema = z.object({
  sku: z.string().trim().min(1),
  name: z.string().trim().min(1),
  nameHindi: z.string().trim().optional(),
  category: z.string().trim().min(1),
  packSize: z.number().positive(),
  packUom: z.enum(UOM),
  primaryRawMaterialId: z.string().min(1),
  sellingPrice: z.number().min(0),
  mrp: z.number().min(0).optional(),
});

export const packagingComponentSchema = z.object({
  code: z.string().trim().min(1).optional(),
  name: z.string().trim().min(1),
  type: z.enum(PKG_TYPE),
  uom: z.enum(UOM).default('PCS'),
  currentRate: z.number().min(0),
});

export const packagingBomSchema = z.object({
  productId: z.string().min(1),
  components: z.array(z.object({
    componentId: z.string().min(1),
    qtyPerUnit: z.number().positive(),
  })).min(1),
  effectiveFrom: z.coerce.date().optional(),
});

export const overheadSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000),
  categories: z.array(z.object({ name: z.string().trim().min(1), amount: z.number().min(0) })).min(1),
  totalProductionQty: z.number().positive(),
});

export const sellingCostSchema = z.object({
  productId: z.string().min(1),
  channel: z.enum(CHANNEL),
  effectiveFrom: z.coerce.date().optional(),
  shippingPerUnit: z.number().min(0),
  adSpendPerUnit: z.number().min(0),
  paymentGatewayPercent: z.number().min(0),
  rtoProvisionPerUnit: z.number().min(0),
  discountPerUnit: z.number().min(0),
  supportCostPerUnit: z.number().min(0),
});

export const rateMasterSchema = z.object({
  rateType: z.enum(RATE_TYPE),
  label: z.string().trim().min(1),
  rate: z.number().min(0),
  effectiveFrom: z.coerce.date(),
});

export function zodFieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    out[issue.path.join('.') || '_'] = issue.message;
  }
  return out;
}
