// Naturelite Manufacturing Cost Tracker — computeBatchCost() orchestrator (spec §5.1)
// Pure. No database calls anywhere in this module tree.
import { round2, round4 } from './round';
import { computeLabourCost, computeElectricityCost, computeConsumablesCost, computeTotalPackagingCostPerUnit, computePackagingCost, computeOverheadCost } from './heads';
import type { LabourLine, MachineLine, ConsumableLine, PackagingComponentLine } from './heads';
import { computeByProductCredit } from './byproduct';
import type { ByProductRow } from './byproduct';
import { computeSellingCost } from './selling';
import { computeMargins } from './margins';

export * from './round';
export * from './landed';
export * from './fifo';
export * from './byproduct';
export * from './heads';
export * from './selling';
export * from './margins';

export interface ComputeBatchCostInput {
  materialCost: number;
  labourLines: LabourLine[];
  machineLines: MachineLine[];
  consumableLines: ConsumableLine[];
  unitsProduced: number;
  packagingComponents: PackagingComponentLine[] | null;
  overheadRatePerUnit: number | null;
  overheadIsProvisional: boolean;
  primaryOutputQty: number;
  byProducts: ByProductRow[];
  sellingPrice?: number;
  sellingCostInput?: {
    shippingPerUnit: number;
    adSpendPerUnit: number;
    paymentGatewayPercent: number;
    rtoProvisionPerUnit: number;
    discountPerUnit: number;
    supportCostPerUnit: number;
  };
}

export interface ComputeBatchCostResult {
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
  sellingCostPerUnit: number | null;
  finalCogsPerUnit: number | null;
  grossProfitPerUnit: number | null;
  netProfitPerUnit: number | null;
  grossMarginPercent: number | null;
  netMarginPercent: number | null;
}

export function computeBatchCost(input: ComputeBatchCostInput): ComputeBatchCostResult {
  const labourCost = computeLabourCost(input.labourLines);
  const electricityCost = computeElectricityCost(input.machineLines);
  const consumablesCost = computeConsumablesCost(input.consumableLines);

  const totalPackagingCostPerUnit = input.packagingComponents ? computeTotalPackagingCostPerUnit(input.packagingComponents) : 0;
  const packagingCost = computePackagingCost(input.unitsProduced, totalPackagingCostPerUnit);

  const overheadCost = input.overheadRatePerUnit !== null ? computeOverheadCost(input.primaryOutputQty, input.overheadRatePerUnit) : 0;
  const byProductCredit = computeByProductCredit(input.byProducts);

  const materialCost = round2(input.materialCost);
  const grossManufacturingCost = round2(materialCost + labourCost + electricityCost + consumablesCost + packagingCost + overheadCost);
  const manufacturingCost = round2(grossManufacturingCost - byProductCredit);

  const manufacturingCostPerUnit = input.unitsProduced > 0 ? round4(manufacturingCost / input.unitsProduced) : null;

  let sellingCostPerUnit: number | null = null;
  let margins = computeMargins({ sellingPrice: 0, manufacturingCostPerUnit, sellingCostPerUnit: 0 });

  if (input.sellingPrice !== undefined && input.sellingCostInput) {
    const sc = computeSellingCost({ sellingPrice: input.sellingPrice, ...input.sellingCostInput });
    sellingCostPerUnit = sc.sellingCostPerUnit;
    margins = computeMargins({ sellingPrice: input.sellingPrice, manufacturingCostPerUnit, sellingCostPerUnit });
  }

  return {
    materialCost,
    labourCost,
    electricityCost,
    consumablesCost,
    packagingCost,
    overheadCost,
    byProductCredit,
    grossManufacturingCost,
    manufacturingCost,
    manufacturingCostPerUnit,
    outputUnits: input.unitsProduced,
    isProvisional: input.overheadIsProvisional,
    sellingCostPerUnit,
    ...margins,
  };
}
