// Naturelite Manufacturing Cost Tracker — final COGS & margins (spec §5.8)
import { round2 } from './round';

export interface MarginsInput {
  sellingPrice: number;
  manufacturingCostPerUnit: number | null;
  sellingCostPerUnit: number;
}

export interface MarginsResult {
  finalCogsPerUnit: number | null;
  grossProfitPerUnit: number | null;
  netProfitPerUnit: number | null;
  grossMarginPercent: number | null;
  netMarginPercent: number | null;
}

const NULL_MARGINS: MarginsResult = {
  finalCogsPerUnit: null,
  grossProfitPerUnit: null,
  netProfitPerUnit: null,
  grossMarginPercent: null,
  netMarginPercent: null,
};

/** Guard: sellingPrice <= 0 or no manufacturing cost yet -> margins are null, never 0 or Infinity. Negative margins are legitimate and preserved (never Math.abs()). */
export function computeMargins(input: MarginsInput): MarginsResult {
  const { sellingPrice, manufacturingCostPerUnit, sellingCostPerUnit } = input;
  if (sellingPrice <= 0 || manufacturingCostPerUnit === null) {
    return { ...NULL_MARGINS };
  }

  const finalCogsPerUnit = round2(manufacturingCostPerUnit + sellingCostPerUnit);
  const grossProfitPerUnit = round2(sellingPrice - manufacturingCostPerUnit);
  const netProfitPerUnit = round2(sellingPrice - finalCogsPerUnit);
  const grossMarginPercent = round2((grossProfitPerUnit / sellingPrice) * 100);
  const netMarginPercent = round2((netProfitPerUnit / sellingPrice) * 100);

  return { finalCogsPerUnit, grossProfitPerUnit, netProfitPerUnit, grossMarginPercent, netMarginPercent };
}
