import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { requireCapability } from '@/lib/permissions';
import { ctRoute } from '@/lib/costApi';
import { round2 } from '@/lib/costing/round';
import ProductionBatch from '@/models/ProductionBatch';
import Product from '@/models/Product';

export async function GET(req: NextRequest) {
  return ctRoute(async () => {
    await requireCapability('VIEW_DASHBOARD');
    await connectDB();
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get('productId');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const query: Record<string, unknown> = { status: 'COMPLETED' };
    if (productId) query.productId = productId;
    if (from || to) query.productionDate = { ...(from ? { $gte: new Date(from) } : {}), ...(to ? { $lte: new Date(to) } : {}) };

    const completed = await ProductionBatch.find(query).populate('productId', 'sku name').sort({ productionDate: 1 }).lean();

    const batchesCompleted = completed.length;
    const totalProductionLitres = round2(completed.reduce((s, b: any) => s + (b.costs?.outputUnits || 0), 0));
    const avgManufacturingCostPerUnit = batchesCompleted
      ? round2(completed.reduce((s, b: any) => s + (b.costs?.manufacturingCostPerUnit || 0), 0) / batchesCompleted)
      : 0;
    const marginsAvailable = completed.filter((b: any) => b.costs?.netMarginPercent !== undefined);
    const totalByProductCredit = round2(completed.reduce((s, b: any) => s + (b.costs?.byProductCredit || 0), 0));

    const costTrend = completed.map((b: any) => ({
      batchCode: b.batchCode,
      sku: b.productId?.sku,
      date: b.productionDate,
      costPerUnit: b.costs?.manufacturingCostPerUnit ?? null,
    }));

    const heads = ['materialCost', 'labourCost', 'electricityCost', 'consumablesCost', 'packagingCost', 'overheadCost'] as const;
    const headLabels: Record<string, string> = { materialCost: 'Material', labourCost: 'Labour', electricityCost: 'Electricity', consumablesCost: 'Consumables', packagingCost: 'Packaging', overheadCost: 'Overheads' };
    const headTotals = heads.map(h => completed.reduce((s, b: any) => s + (b.costs?.[h] || 0), 0));
    const grandTotal = headTotals.reduce((a, b) => a + b, 0) || 1;
    const costMix = heads.map((h, i) => ({ head: headLabels[h], amount: round2(headTotals[i]), percent: round2((headTotals[i] / grandTotal) * 100) }));

    const products = await Product.find({ isActive: true }).lean();
    const skuMargins = products.map((p: any) => {
      const batchesForSku = completed.filter((b: any) => b.productId?._id?.toString() === p._id.toString());
      const last = batchesForSku[batchesForSku.length - 1];
      return {
        sku: p.sku,
        name: p.name,
        sellingPrice: p.sellingPrice,
        manufacturingCostPerUnit: last?.costs?.manufacturingCostPerUnit ?? null,
        grossMarginPercent: last?.costs ? round2(((p.sellingPrice - (last.costs.manufacturingCostPerUnit || 0)) / p.sellingPrice) * 100) : null,
        netMarginPercent: null as number | null,
      };
    }).sort((a, b) => (a.grossMarginPercent ?? 999) - (b.grossMarginPercent ?? 999));

    const provisionalCount = completed.filter((b: any) => b.costs?.isProvisional).length;
    const openLong = await ProductionBatch.countDocuments({ status: 'IN_PROGRESS', createdAt: { $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } });
    const negativeMarginSkus = skuMargins.filter(s => (s.grossMarginPercent ?? 0) < 0);

    const alerts: { type: string; message: string }[] = [];
    if (provisionalCount > 0) alerts.push({ type: 'PROVISIONAL_OVERHEAD', message: `${provisionalCount} batch(es) using provisional overhead rate` });
    if (openLong > 0) alerts.push({ type: 'STALE_BATCH', message: `${openLong} batch(es) open for more than 7 days` });
    if (negativeMarginSkus.length > 0) alerts.push({ type: 'NEGATIVE_MARGIN', message: `${negativeMarginSkus.length} SKU(s) with negative margin` });

    return {
      kpis: { batchesCompleted, totalProductionLitres, avgManufacturingCostPerUnit, avgNetMarginPercent: 0, totalByProductCredit },
      costTrend,
      costMix,
      skuMargins,
      alerts,
    };
  });
}
