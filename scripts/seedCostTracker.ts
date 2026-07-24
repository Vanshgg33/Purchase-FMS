// Naturelite Manufacturing Cost Tracker — seed data (spec §11).
// Idempotent: upserts masters by code/sku; the demo purchase+batch section is skipped
// entirely if it was already created on a prior run (guarded by a fixed invoice number).
import * as dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { connectDB } from '../lib/mongodb';
import User from '../models/User';
import CtVendor from '../models/CtVendor';
import CtRawMaterial from '../models/CtRawMaterial';
import PackagingComponent from '../models/PackagingComponent';
import PackagingBom from '../models/PackagingBom';
import Product from '../models/Product';
import RateMaster from '../models/RateMaster';
import Overhead from '../models/Overhead';
import SellingCost from '../models/SellingCost';
import Purchase from '../models/Purchase';
import ProductionBatch from '../models/ProductionBatch';
import FinishedGood from '../models/FinishedGood';
import { computeLandedCost } from '../lib/costing/landed';
import { generatePurchaseCode, generateLotCode, generateBatchCode } from '../lib/costing/codes';
import { executeFifoConsumption } from '../lib/costing/service';
import { resolveRate, labourRateType } from '../lib/costing/rates';
import { recostBatch, completeBatch } from '../lib/costing/recost';
import InventoryLot from '../models/InventoryLot';
import type { CtSession } from '../lib/permissions';

async function upsertUser(userId: string, name: string, email: string, role: 'SUPERADMIN' | 'PRODUCTION') {
  const passwordHash = await bcrypt.hash('Test@123', 12);
  const existing = await User.findOne({ userId });
  if (existing) return existing;
  return User.create({ userId, name, email, role, passwordHash, designation: role === 'SUPERADMIN' ? 'Growth Head' : 'Factory Supervisor', isActive: true });
}

async function upsertVendor(code: string, name: string, city: string) {
  return CtVendor.findOneAndUpdate({ code }, { code, name, city, state: 'Chhattisgarh', isActive: true }, { upsert: true, new: true });
}

async function upsertRawMaterial(code: string, name: string, category: string, standardYieldPercent: number) {
  return CtRawMaterial.findOneAndUpdate(
    { code },
    { code, name, category, uom: 'KG', defaultGstRate: 5, standardYieldPercent, isActive: true },
    { upsert: true, new: true }
  );
}

async function upsertPackagingComponent(code: string, name: string, type: string, currentRate: number) {
  return PackagingComponent.findOneAndUpdate({ code }, { code, name, type, uom: 'PCS', currentRate, isActive: true }, { upsert: true, new: true });
}

async function upsertProduct(sku: string, name: string, sellingPrice: number, primaryRawMaterialId: any) {
  return Product.findOneAndUpdate(
    { sku },
    { sku, name, category: 'Wood-Pressed Oil', packSize: 1, packUom: 'LITRE', primaryRawMaterialId, sellingPrice, isActive: true },
    { upsert: true, new: true }
  );
}

async function upsertRate(rateType: string, label: string, rate: number, effectiveFrom: Date) {
  const existing = await RateMaster.findOne({ rateType, effectiveFrom });
  if (existing) return existing;
  return RateMaster.create({ rateType, label, rate, effectiveFrom, isActive: true });
}

async function main() {
  await connectDB();
  console.log('Connected to MongoDB');

  // ── Users ──
  const admin = await upsertUser('ctadmin', 'Om', 'om@naturelite.in', 'SUPERADMIN');
  await upsertUser('ctproduction', 'Factory Supervisor', 'production@naturelite.in', 'PRODUCTION');
  console.log('Users ready (password: Test@123)');

  // ── Vendors ──
  const venShree = await upsertVendor('VEN-0001', 'Shree Agro Traders', 'Raipur');
  await upsertVendor('VEN-0002', 'Bilaspur Oilseeds', 'Bilaspur');
  await upsertVendor('VEN-0003', 'Durg Packaging Supplies', 'Durg');
  console.log('Vendors ready');

  // ── Raw materials ──
  const rmGns = await upsertRawMaterial('RM-GNS', 'Groundnut Seed (HPS)', 'SEED', 28);
  const rmMus = await upsertRawMaterial('RM-MUS', 'Mustard Seed', 'SEED', 33);
  const rmSes = await upsertRawMaterial('RM-SES', 'Sesame Seed', 'SEED', 42);
  const rmCoc = await upsertRawMaterial('RM-COC', 'Copra (Dried Coconut)', 'NUT', 62);
  console.log('Raw materials ready');

  // ── Packaging components ──
  const pkgBtl = await upsertPackagingComponent('PKG-BTL-1L', 'PET Bottle 1L Amber', 'BOTTLE', 12.5);
  const pkgCap = await upsertPackagingComponent('PKG-CAP-38', 'Cap 38mm with Seal', 'CAP', 1.8);
  const pkgLbl = await upsertPackagingComponent('PKG-LBL-1L', 'Label 1L (front+back)', 'LABEL', 2.2);
  const pkgCtn = await upsertPackagingComponent('PKG-CTN-9', 'Carton (9 units)', 'CARTON', 31.5);
  const pkgShr = await upsertPackagingComponent('PKG-SHR-1L', 'Shrink Sleeve', 'SHRINK', 0);
  console.log('Packaging components ready');

  // ── Products ──
  const gno = await upsertProduct('NL-GNO-1L', 'Wood-Pressed Groundnut Oil 1L', 649, rmGns._id);
  await upsertProduct('NL-MUO-1L', 'Wood-Pressed Mustard Oil 1L', 449, rmMus._id);
  await upsertProduct('NL-SEO-1L', 'Wood-Pressed Sesame Oil 1L', 899, rmSes._id);
  await upsertProduct('NL-COO-1L', 'Wood-Pressed Coconut Oil 1L', 749, rmCoc._id);
  console.log('Products ready');

  // ── Packaging BOM for NL-GNO-1L (fractional carton qty, deliberate — spec §11) ──
  const totalPackagingCostPerUnit = 20.0; // 12.50 + 1.80 + 2.20 + round2(0.1111*31.50)=3.50 + 0
  await PackagingBom.updateMany({ productId: gno._id, isActive: true }, { $set: { isActive: false } });
  const bom = await PackagingBom.create({
    productId: gno._id,
    components: [
      { componentId: pkgBtl._id, qtyPerUnit: 1, rateSnapshot: 12.5 },
      { componentId: pkgCap._id, qtyPerUnit: 1, rateSnapshot: 1.8 },
      { componentId: pkgLbl._id, qtyPerUnit: 1, rateSnapshot: 2.2 },
      { componentId: pkgCtn._id, qtyPerUnit: 0.1111, rateSnapshot: 31.5 },
      { componentId: pkgShr._id, qtyPerUnit: 1, rateSnapshot: 0 },
    ],
    totalPackagingCostPerUnit,
    effectiveFrom: new Date('2026-04-01'),
    isActive: true,
    createdBy: admin._id,
  });
  await Product.findByIdAndUpdate(gno._id, { packagingBomId: bom._id });
  console.log('Packaging BOM ready');

  // ── Rate masters ──
  const effFrom = new Date('2026-04-01');
  await upsertRate('LABOUR_SKILLED', 'Skilled Labour', 65, effFrom);
  await upsertRate('LABOUR_UNSKILLED', 'Unskilled Labour', 48, effFrom);
  await upsertRate('ELECTRICITY', 'Electricity', 92, effFrom);
  console.log('Rate masters ready');

  // ── Overheads: July 2026, locked (so the demo batch resolves a final, non-provisional rate) ──
  const categories = [
    { name: 'Rent', amount: 45000 },
    { name: 'Salaries', amount: 95000 },
    { name: 'Repairs', amount: 12000 },
    { name: 'Insurance', amount: 8000 },
    { name: 'Depreciation', amount: 15000 },
    { name: 'Misc', amount: 5000 },
  ];
  const totalOverhead = categories.reduce((s, c) => s + c.amount, 0);
  const totalProductionQty = 6000;
  const overheadRatePerUnit = Math.round((totalOverhead / totalProductionQty) * 10000) / 10000;
  await Overhead.findOneAndUpdate(
    { year: 2026, month: 7 },
    { year: 2026, month: 7, categories, totalOverhead, totalProductionQty, overheadRatePerUnit, isLocked: true },
    { upsert: true }
  );
  console.log('July 2026 overheads locked at ₹' + overheadRatePerUnit + '/L');

  // ── Selling costs: NL-GNO-1L, D2C ──
  await SellingCost.updateMany({ productId: gno._id, channel: 'D2C', isActive: true }, { $set: { isActive: false } });
  await SellingCost.create({
    productId: gno._id, channel: 'D2C', effectiveFrom: new Date('2026-04-01'),
    shippingPerUnit: 65, adSpendPerUnit: 48, paymentGatewayPercent: 2, rtoProvisionPerUnit: 18, discountPerUnit: 30, supportCostPerUnit: 6,
    isActive: true,
  });
  console.log('Selling costs ready');

  // ── Demo batch matching the §5.9 worked example exactly (skip if already seeded) ──
  const DEMO_INVOICE = 'DEMO-GNT-2026-889';
  const existingDemo = await Purchase.findOne({ invoiceNo: DEMO_INVOICE });
  if (existingDemo) {
    console.log('Demo batch already seeded — skipping.');
  } else {
    const landed = computeLandedCost({
      items: [{ quantity: 1000, ratePerUnit: 95, gstRate: 5 }],
      freightCharges: 3000, loadingCharges: 800, otherCharges: 450,
      gstTreatment: 'INCLUSIVE',
    });
    const purchaseCode = await generatePurchaseCode(Purchase);
    const purchase = await Purchase.create({
      code: purchaseCode,
      vendorId: venShree._id,
      invoiceNo: DEMO_INVOICE,
      invoiceDate: new Date('2026-07-14'),
      receivedDate: new Date('2026-07-15'),
      items: [{ rawMaterialId: rmGns._id, quantity: 1000, uom: 'KG', ratePerUnit: 95, gstRate: 5, ...landed.items[0] }],
      freightCharges: 3000, loadingCharges: 800, otherCharges: 450, otherChargesNote: 'Mandi handling',
      basicAmount: landed.basicAmount, gstAmount: landed.gstAmount, totalLandedAmount: landed.totalLandedAmount,
      status: 'DRAFT', createdBy: admin._id,
    });

    const lotCode = await generateLotCode(InventoryLot);
    await InventoryLot.create({
      lotCode, rawMaterialId: rmGns._id, purchaseId: purchase._id, vendorId: venShree._id,
      receivedDate: purchase.receivedDate, originalQuantity: 1000, availableQuantity: 1000, consumedQuantity: 0,
      uom: 'KG', landedCostPerUnit: landed.items[0].landedCostPerUnit, status: 'AVAILABLE',
    });
    purchase.status = 'POSTED';
    await purchase.save();
    console.log(`Demo purchase posted — landed cost ₹${landed.items[0].landedCostPerUnit}/kg`);

    const batchCode = await generateBatchCode(ProductionBatch);
    const batch = await ProductionBatch.create({
      batchCode, productId: gno._id, productionDate: new Date('2026-07-15'), shift: 'DAY',
      status: 'DRAFT', createdBy: admin._id,
    });

    await executeFifoConsumption({ batchId: batch._id.toString(), rawMaterialId: rmGns._id.toString(), quantity: 600, uom: 'KG' });

    const skilledRate = await resolveRate(labourRateType('SKILLED'), batch.productionDate);
    const LabourEntry = (await import('../models/LabourEntry')).default;
    await LabourEntry.create({ batchId: batch._id, labourType: 'SKILLED', workerCount: 3, hours: 8, totalHours: 24, hourlyRate: skilledRate, lineCost: 24 * skilledRate });
    await ProductionBatch.findByIdAndUpdate(batch._id, { $set: { 'flags.hasLabourRecorded': true } });

    const elecRate = await resolveRate('ELECTRICITY', batch.productionDate);
    const MachineHour = (await import('../models/MachineHour')).default;
    await MachineHour.create({ batchId: batch._id, machineName: 'Wood Press Unit 2', hours: 7.5, electricityRatePerHour: elecRate, lineCost: 7.5 * elecRate });
    await ProductionBatch.findByIdAndUpdate(batch._id, { $set: { 'flags.hasMachineRecorded': true } });

    const ConsumableEntry = (await import('../models/ConsumableEntry')).default;
    await ConsumableEntry.create({ batchId: batch._id, itemName: 'Filter Cloth', quantity: 1, uom: 'PCS', ratePerUnit: 250, lineCost: 250 });
    await ConsumableEntry.create({ batchId: batch._id, itemName: 'Cleaning Chemicals', quantity: 1, uom: 'PCS', ratePerUnit: 150, lineCost: 150 });
    await ProductionBatch.findByIdAndUpdate(batch._id, { $set: { 'flags.hasConsumablesRecorded': true } });

    await FinishedGood.create({ batchId: batch._id, outputType: 'PRIMARY', productId: gno._id, quantity: 168, uom: 'LITRE', unitsProduced: 168, yieldPercent: 28 });
    await FinishedGood.create({ batchId: batch._id, outputType: 'BY_PRODUCT', byProductName: 'Groundnut Oil Cake', quantity: 420, uom: 'KG', realisableRatePerUnit: 28, realisableValue: 11760 });
    await ProductionBatch.findByIdAndUpdate(batch._id, { $set: { 'flags.hasYieldRecorded': true } });

    await ProductionBatch.findByIdAndUpdate(batch._id, { $set: { 'flags.hasPackagingRecorded': true } });

    await recostBatch(batch._id.toString());

    const ctSession: CtSession = { userId: admin._id.toString(), userLoginId: admin.userId, name: admin.name, role: 'ADMIN' };
    const completed = await completeBatch(batch._id.toString(), ctSession);
    console.log(`Demo batch ${batchCode} completed — manufacturing cost/unit ₹${completed.costs.manufacturingCostPerUnit} (expect 367.2024)`);
  }

  console.log('\nCost Tracker seed complete.');
}

main()
  .then(() => mongoose.disconnect())
  .catch((err) => { console.error(err); mongoose.disconnect(); process.exit(1); });
