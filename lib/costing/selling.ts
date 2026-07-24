// Naturelite Manufacturing Cost Tracker — selling cost (spec §5.7)
import { round2 } from './round';

export interface SellingCostInput {
  sellingPrice: number;
  shippingPerUnit: number;
  adSpendPerUnit: number;
  paymentGatewayPercent: number;
  rtoProvisionPerUnit: number;
  discountPerUnit: number;
  supportCostPerUnit: number;
}

export interface SellingCostResult {
  paymentGatewayPerUnit: number;
  sellingCostPerUnit: number;
}

export function computeSellingCost(input: SellingCostInput): SellingCostResult {
  const paymentGatewayPerUnit = round2((input.sellingPrice * input.paymentGatewayPercent) / 100);
  const sellingCostPerUnit = round2(
    input.shippingPerUnit +
      input.adSpendPerUnit +
      paymentGatewayPerUnit +
      input.rtoProvisionPerUnit +
      input.discountPerUnit +
      input.supportCostPerUnit
  );
  return { paymentGatewayPerUnit, sellingCostPerUnit };
}
