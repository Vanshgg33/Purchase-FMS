// Naturelite Manufacturing Cost Tracker — shared enums & types (spec Appendix A)

export const CT_ROLE = ['ADMIN', 'PRODUCTION'] as const;
export type CtRole = (typeof CT_ROLE)[number];

export const UOM = ['KG', 'LITRE', 'PCS', 'HOUR', 'UNIT', 'GRAM', 'ML'] as const;
export type Uom = (typeof UOM)[number];

export const PURCHASE_STATUS = ['DRAFT', 'POSTED', 'REVERSED'] as const;
export type PurchaseStatus = (typeof PURCHASE_STATUS)[number];

export const LOT_STATUS = ['AVAILABLE', 'PARTIAL', 'EXHAUSTED', 'REVERSED'] as const;
export type LotStatus = (typeof LOT_STATUS)[number];

export const BATCH_STATUS = ['DRAFT', 'IN_PROGRESS', 'COMPLETED', 'REOPENED', 'CANCELLED'] as const;
export type BatchStatus = (typeof BATCH_STATUS)[number];

export const OUTPUT_TYPE = ['PRIMARY', 'BY_PRODUCT'] as const;
export type OutputType = (typeof OUTPUT_TYPE)[number];

export const LABOUR_TYPE = ['SKILLED', 'UNSKILLED', 'CONTRACT'] as const;
export type LabourType = (typeof LABOUR_TYPE)[number];

export const RM_CATEGORY = ['SEED', 'NUT', 'ADDITIVE', 'OTHER'] as const;
export type RmCategory = (typeof RM_CATEGORY)[number];

export const PKG_TYPE = ['BOTTLE', 'CAP', 'LABEL', 'CARTON', 'SHRINK', 'OTHER'] as const;
export type PkgType = (typeof PKG_TYPE)[number];

export const CHANNEL = ['D2C', 'MARKETPLACE', 'RETAIL', 'WHOLESALE'] as const;
export type Channel = (typeof CHANNEL)[number];

export const RATE_TYPE = ['LABOUR_SKILLED', 'LABOUR_UNSKILLED', 'LABOUR_CONTRACT', 'ELECTRICITY', 'MACHINE'] as const;
export type RateType = (typeof RATE_TYPE)[number];

export const AUDIT_ACTION = ['CREATE', 'UPDATE', 'DELETE', 'POST', 'REVERSE', 'COMPLETE', 'REOPEN', 'RECOST'] as const;
export type AuditAction = (typeof AUDIT_ACTION)[number];

export const GST_TREATMENT = ['INCLUSIVE', 'CREDITABLE'] as const;
export type GstTreatment = (typeof GST_TREATMENT)[number];

export const SHIFT = ['DAY', 'NIGHT'] as const;
export type Shift = (typeof SHIFT)[number];

export interface BatchFlags {
  hasMaterialConsumed: boolean;
  hasLabourRecorded: boolean;
  hasMachineRecorded: boolean;
  hasConsumablesRecorded: boolean;
  hasYieldRecorded: boolean;
  hasPackagingRecorded: boolean;
  hasOverheadAllocated: boolean;
}

export interface BatchCosts {
  materialCost: number;
  labourCost: number;
  electricityCost: number;
  consumablesCost: number;
  packagingCost: number;
  overheadCost: number;
  byProductCredit: number;
  grossManufacturingCost: number;
  manufacturingCost: number;
  manufacturingCostPerUnit: number | null;
  outputUnits: number;
  isProvisional: boolean;
  lastComputedAt: string | null;
}

export interface BatchSnapshot {
  labourRates: Record<string, number>;
  electricityRate: number;
  overheadRatePerUnit: number;
  overheadIsProvisional: boolean;
  packagingRates: { code: string; rate: number }[];
  lotCosts: { lotCode: string; rate: number }[];
  frozenAt: string;
}
