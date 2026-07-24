import { describe, it, expect } from 'vitest';
import { computeBatchCost } from '../index';

const packagingComponents = [
  { qtyPerUnit: 1, rateSnapshot: 12.5 },
  { qtyPerUnit: 1, rateSnapshot: 1.8 },
  { qtyPerUnit: 1, rateSnapshot: 2.2 },
  { qtyPerUnit: 0.1111, rateSnapshot: 31.5 },
];

describe('computeBatchCost', () => {
  it('T16-T18: gross manufacturing cost, net manufacturing cost, per-unit cost', () => {
    const result = computeBatchCost({
      materialCost: 62400,
      labourLines: [{ totalHours: 24, hourlyRate: 65 }],
      machineLines: [{ hours: 7.5, electricityRatePerHour: 92 }],
      consumableLines: [{ quantity: 1, ratePerUnit: 250 }, { quantity: 1, ratePerUnit: 150 }],
      unitsProduced: 168,
      packagingComponents,
      overheadRatePerUnit: 30,
      overheadIsProvisional: false,
      primaryOutputQty: 168,
      byProducts: [{ quantity: 420, realisableRatePerUnit: 28 }],
    });

    expect(result.grossManufacturingCost).toBe(73450);
    expect(result.manufacturingCost).toBe(61690);
    expect(result.manufacturingCostPerUnit).toBe(367.2024);
  });

  it('T19: zero units produced returns null, no Infinity', () => {
    const result = computeBatchCost({
      materialCost: 62400,
      labourLines: [],
      machineLines: [],
      consumableLines: [],
      unitsProduced: 0,
      packagingComponents: null,
      overheadRatePerUnit: null,
      overheadIsProvisional: false,
      primaryOutputQty: 0,
      byProducts: [],
    });
    expect(result.manufacturingCostPerUnit).toBeNull();
  });

  it('T27: no by-product recorded -> cost/unit ₹437.20, NM 4.90%', () => {
    const result = computeBatchCost({
      materialCost: 62400,
      labourLines: [{ totalHours: 24, hourlyRate: 65 }],
      machineLines: [{ hours: 7.5, electricityRatePerHour: 92 }],
      consumableLines: [{ quantity: 1, ratePerUnit: 250 }, { quantity: 1, ratePerUnit: 150 }],
      unitsProduced: 168,
      packagingComponents,
      overheadRatePerUnit: 30,
      overheadIsProvisional: false,
      primaryOutputQty: 168,
      byProducts: [],
      sellingPrice: 649,
      sellingCostInput: {
        shippingPerUnit: 65,
        adSpendPerUnit: 48,
        paymentGatewayPercent: 2,
        rtoProvisionPerUnit: 18,
        discountPerUnit: 30,
        supportCostPerUnit: 6,
      },
    });
    expect(Math.round(result.manufacturingCostPerUnit! * 100) / 100).toBe(437.2);
    expect(result.netMarginPercent).toBe(4.9);
  });
});
