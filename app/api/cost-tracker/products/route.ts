import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { requireCapability, requireCtSession } from '@/lib/permissions';
import { ctRoute } from '@/lib/costApi';
import { writeAudit } from '@/lib/costAudit';
import { productSchema, zodFieldErrors } from '@/lib/costValidation';
import { AppError } from '@/lib/costErrors';
import Product from '@/models/Product';
import ProductPhoto from '@/models/ProductPhoto';

export async function GET() {
  return ctRoute(async () => {
    await requireCtSession();
    await connectDB();
    const products = await Product.find({ isActive: true }).sort({ name: 1 }).lean();
    const photos = await ProductPhoto.find({ productId: { $in: products.map((p: any) => p._id) } }).sort({ position: 1 }).lean();
    const byProduct = new Map<string, any[]>();
    for (const ph of photos as any[]) {
      const key = ph.productId.toString();
      if (!byProduct.has(key)) byProduct.set(key, []);
      byProduct.get(key)!.push(ph);
    }
    return products.map((p: any) => ({ ...p, photos: byProduct.get(p._id.toString()) || [] }));
  });
}

export async function POST(req: NextRequest) {
  return ctRoute(async () => {
    const session = await requireCapability('MANAGE_PRODUCTS');
    await connectDB();
    const parsed = productSchema.safeParse(await req.json());
    if (!parsed.success) throw new AppError('VALIDATION_ERROR', 'Invalid product data', { fields: zodFieldErrors(parsed.error) });

    const product = await Product.create({ ...parsed.data, createdBy: session.userId });
    await writeAudit({ entity: 'Product', entityId: product._id.toString(), action: 'CREATE', session });
    return { ...product.toObject(), photos: [] };
  });
}
