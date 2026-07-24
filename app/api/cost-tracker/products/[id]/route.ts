import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { requireCapability } from '@/lib/permissions';
import { ctRoute } from '@/lib/costApi';
import { writeAudit } from '@/lib/costAudit';
import { AppError } from '@/lib/costErrors';
import Product from '@/models/Product';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return ctRoute(async () => {
    const session = await requireCapability('MANAGE_PRODUCTS');
    await connectDB();
    const { id } = await params;
    const body = await req.json();
    const product = await Product.findById(id);
    if (!product) throw new AppError('NOT_FOUND', 'Product not found');

    for (const key of ['name', 'nameHindi', 'category', 'packSize', 'packUom', 'sellingPrice', 'mrp', 'isActive', 'packagingBomId'] as const) {
      if (body[key] !== undefined) (product as any)[key] = body[key];
    }
    await product.save();
    await writeAudit({ entity: 'Product', entityId: id, action: 'UPDATE', session });
    return product.toObject();
  });
}
