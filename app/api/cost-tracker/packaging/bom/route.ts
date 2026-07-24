import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { requireCapability } from '@/lib/permissions';
import { ctRoute } from '@/lib/costApi';
import { writeAudit } from '@/lib/costAudit';
import { packagingBomSchema, zodFieldErrors } from '@/lib/costValidation';
import { AppError } from '@/lib/costErrors';
import { round2 } from '@/lib/costing/round';
import PackagingBom from '@/models/PackagingBom';
import PackagingComponent from '@/models/PackagingComponent';
import Product from '@/models/Product';

export async function GET(req: NextRequest) {
  return ctRoute(async () => {
    await requireCapability('MANAGE_MASTERS');
    await connectDB();
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get('productId');
    const query: Record<string, unknown> = { isActive: true };
    if (productId) query.productId = productId;
    return PackagingBom.find(query).populate('productId', 'sku name').populate('components.componentId', 'name code').lean();
  });
}

export async function POST(req: NextRequest) {
  return ctRoute(async () => {
    const session = await requireCapability('MANAGE_MASTERS');
    await connectDB();
    const parsed = packagingBomSchema.safeParse(await req.json());
    if (!parsed.success) throw new AppError('VALIDATION_ERROR', 'Invalid packaging BOM', { fields: zodFieldErrors(parsed.error) });
    const data = parsed.data;

    const components = await PackagingComponent.find({ _id: { $in: data.components.map(c => c.componentId) } }).lean();
    const bomComponents = data.components.map(c => {
      const comp = components.find((x: any) => x._id.toString() === c.componentId);
      if (!comp) throw new AppError('NOT_FOUND', 'Packaging component not found');
      return { componentId: c.componentId, qtyPerUnit: c.qtyPerUnit, rateSnapshot: (comp as any).currentRate };
    });
    const totalPackagingCostPerUnit = round2(bomComponents.reduce((s, c) => s + round2(c.qtyPerUnit * c.rateSnapshot), 0));

    // Deactivate any existing active BOM for this product (only one active BOM per product, R18).
    await PackagingBom.updateMany({ productId: data.productId, isActive: true }, { $set: { isActive: false } });

    const bom = await PackagingBom.create({
      productId: data.productId,
      components: bomComponents,
      totalPackagingCostPerUnit,
      effectiveFrom: data.effectiveFrom || new Date(),
      isActive: true,
      createdBy: session.userId,
    });
    await Product.findByIdAndUpdate(data.productId, { packagingBomId: bom._id });

    await writeAudit({ entity: 'PackagingBom', entityId: bom._id.toString(), action: 'CREATE', session });
    return bom.toObject();
  });
}
