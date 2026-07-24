import { describe, it, expect } from 'vitest';
import { computeSellingCost } from '../selling';

describe('computeSellingCost', () => {
  it('T20: selling cost per unit (D2C channel) -> ₹179.98', () => {
    const result = computeSellingCost({
      sellingPrice: 649,
      shippingPerUnit: 65,
      adSpendPerUnit: 48,
      paymentGatewayPercent: 2,
      rtoProvisionPerUnit: 18,
      discountPerUnit: 30,
      supportCostPerUnit: 6,
    });
    expect(result.paymentGatewayPerUnit).toBe(12.98);
    expect(result.sellingCostPerUnit).toBe(179.98);
  });
});
