import { describe, it, expect } from 'vitest';
import { computeMargins } from '../margins';

describe('computeMargins', () => {
  it('T21-T23: final COGS ₹547.18, gross margin 43.42%, net margin 15.69%', () => {
    const result = computeMargins({ sellingPrice: 649, manufacturingCostPerUnit: 367.2024, sellingCostPerUnit: 179.98 });
    expect(result.finalCogsPerUnit).toBe(547.18);
    expect(result.grossMarginPercent).toBe(43.42);
    expect(result.netMarginPercent).toBe(15.69);
  });

  it('T24: zero selling price -> margins null, not 0', () => {
    const result = computeMargins({ sellingPrice: 0, manufacturingCostPerUnit: 367.2024, sellingCostPerUnit: 179.98 });
    expect(result.grossMarginPercent).toBeNull();
    expect(result.netMarginPercent).toBeNull();
    expect(result.finalCogsPerUnit).toBeNull();
  });

  it('T25: negative margin (cost > price) preserves the negative sign, not absolute', () => {
    const result = computeMargins({ sellingPrice: 100, manufacturingCostPerUnit: 150, sellingCostPerUnit: 20 });
    expect(result.grossProfitPerUnit).toBe(-50);
    expect(result.grossMarginPercent).toBe(-50);
    expect(result.netMarginPercent).toBeLessThan(0);
  });
});
