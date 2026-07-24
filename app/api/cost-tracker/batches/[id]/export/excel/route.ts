import * as XLSX from 'xlsx';
import { connectDB } from '@/lib/mongodb';
import { requireCapability } from '@/lib/permissions';
import { AppError } from '@/lib/costErrors';
import { gatherCostInputs } from '@/lib/costing/service';
import { computeBatchCost } from '@/lib/costing/index';
import ProductionBatch from '@/models/ProductionBatch';
import Product from '@/models/Product';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    return await handle(await params);
  } catch (err) {
    const { errorResponseBody } = await import('@/lib/costErrors');
    const { status, body } = errorResponseBody(err);
    return Response.json(body, { status });
  }
}

async function handle({ id }: { id: string }) {
  await requireCapability('EXPORT');
  await connectDB();

  const batch = await ProductionBatch.findById(id).lean();
  if (!batch) throw new AppError('NOT_FOUND', 'Batch not found');
  const product = await Product.findById((batch as any).productId).lean();

  const inputs = await gatherCostInputs(id);
  const c = computeBatchCost(inputs);

  const rows = [
    ['Naturelite Manufacturing Cost Tracker — Cost Sheet'],
    ['Batch', (batch as any).batchCode],
    ['Product', `${(product as any)?.name} (${(product as any)?.sku})`],
    ['Production Date', new Date((batch as any).productionDate).toDateString()],
    [],
    ['Cost Head', 'Amount (₹)'],
    ['Material Cost', c.materialCost],
    ['Labour Cost', c.labourCost],
    ['Electricity Cost', c.electricityCost],
    ['Consumables Cost', c.consumablesCost],
    ['Packaging Cost', c.packagingCost],
    ['Overhead Cost', c.overheadCost],
    ['Gross Manufacturing Cost', c.grossManufacturingCost],
    ['Less: By-Product Credit', -c.byProductCredit],
    ['Manufacturing Cost', c.manufacturingCost],
    ['Manufacturing Cost / Unit', c.manufacturingCostPerUnit],
    [],
    ['Selling Cost / Unit', c.sellingCostPerUnit],
    ['Final COGS / Unit', c.finalCogsPerUnit],
    ['Gross Margin %', c.grossMarginPercent],
    ['Net Margin %', c.netMarginPercent],
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 32 }, { wch: 16 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Cost Sheet');
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${(batch as any).batchCode}-cost-sheet.xlsx"`,
    },
  });
}
