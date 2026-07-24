// T26 — full worked-example integration test (spec §5.9). Every figure below is verified
// in the spec to the paisa; computeBatchCost() must reproduce all of them exactly.
import { describe, it, expect } from 'vitest';
import { computeLandedCost } from '../landed';
import { consumeFIFO } from '../fifo';
import { computeBatchCost } from '../index';

describe('§5.9 worked example — full chain', () => {
  it('Step 1: purchase -> landed cost per kg = ₹104.0000', () => {
    const purchase = computeLandedCost({
      items: [{ quantity: 1000, ratePerUnit: 95, gstRate: 5 }],
      freightCharges: 3000,
      loadingCharges: 800,
      otherCharges: 450,
      gstTreatment: 'INCLUSIVE',
    });
    expect(purchase.items[0].landedCostPerUnit).toBe(104.0);
    expect(purchase.basicAmount).toBe(95000);
    expect(purchase.gstAmount).toBe(4750);
    expect(purchase.totalLandedAmount).toBe(104000);
  });

  it('Step 1b: FIFO consumption of 600kg from the single lot -> ₹62,400.00 material cost', () => {
    const fifo = consumeFIFO(
      [{ lotId: 'LOT-2026-0113', availableQuantity: 1000, uom: 'KG', landedCostPerUnit: 104.0, receivedDate: '2026-07-15' }],
      600,
      'KG'
    );
    expect(fifo.materialCost).toBe(62400);
  });

  it('T26: full batch -> every §5.9 figure matches to the paisa', () => {
    const result = computeBatchCost({
      materialCost: 62400.0, // 600kg @ ₹104.0000
      labourLines: [{ totalHours: 3 * 8, hourlyRate: 65 }], // 24 hrs @ ₹65
      machineLines: [{ hours: 7.5, electricityRatePerHour: 92 }],
      consumableLines: [
        { quantity: 1, ratePerUnit: 250 }, // filter cloth
        { quantity: 1, ratePerUnit: 150 }, // cleaning chemicals
      ],
      unitsProduced: 168,
      packagingComponents: [
        { qtyPerUnit: 1, rateSnapshot: 12.5 }, // PET bottle
        { qtyPerUnit: 1, rateSnapshot: 1.8 }, // cap
        { qtyPerUnit: 1, rateSnapshot: 2.2 }, // label
        { qtyPerUnit: 0.1111, rateSnapshot: 31.5 }, // carton, 9 units/carton
      ],
      overheadRatePerUnit: 30.0, // 180000 / 6000 L
      overheadIsProvisional: false,
      primaryOutputQty: 168,
      byProducts: [{ quantity: 420, realisableRatePerUnit: 28 }], // oil cake
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

    // Step 2 — cost heads & gross/net manufacturing cost
    expect(result.materialCost).toBe(62400.0);
    expect(result.labourCost).toBe(1560.0);
    expect(result.electricityCost).toBe(690.0);
    expect(result.consumablesCost).toBe(400.0);
    expect(result.packagingCost).toBe(3360.0); // 168 x 20.00
    expect(result.overheadCost).toBe(5040.0); // 168 x 30.0000
    expect(result.grossManufacturingCost).toBe(73450.0);
    expect(result.byProductCredit).toBe(11760.0);
    expect(result.manufacturingCost).toBe(61690.0);

    // Step 4 — per-unit manufacturing cost
    expect(result.manufacturingCostPerUnit).toBe(367.2024);

    // Step 5 — selling cost per unit
    expect(result.sellingCostPerUnit).toBe(179.98);

    // Step 6 — final result
    expect(result.finalCogsPerUnit).toBe(547.18);
    expect(result.grossProfitPerUnit).toBe(281.8);
    expect(result.grossMarginPercent).toBe(43.42);
    expect(result.netProfitPerUnit).toBe(101.82);
    expect(result.netMarginPercent).toBe(15.69);
  });

  it('Sanity check: omitting the by-product credit swings cost/unit to ₹437.20 and NM to 4.90%', () => {
    const result = computeBatchCost({
      materialCost: 62400.0,
      labourLines: [{ totalHours: 24, hourlyRate: 65 }],
      machineLines: [{ hours: 7.5, electricityRatePerHour: 92 }],
      consumableLines: [{ quantity: 1, ratePerUnit: 250 }, { quantity: 1, ratePerUnit: 150 }],
      unitsProduced: 168,
      packagingComponents: [
        { qtyPerUnit: 1, rateSnapshot: 12.5 },
        { qtyPerUnit: 1, rateSnapshot: 1.8 },
        { qtyPerUnit: 1, rateSnapshot: 2.2 },
        { qtyPerUnit: 0.1111, rateSnapshot: 31.5 },
      ],
      overheadRatePerUnit: 30.0,
      overheadIsProvisional: false,
      primaryOutputQty: 168,
      byProducts: [], // omitted on purpose
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
