import { NextRequest, NextResponse } from 'next/server';
import { requireCostAdmin } from '@/lib/costAuth';
import { connectDB } from '@/lib/mongodb';
import CostProduct from '@/models/CostProduct';
import CostProductPhoto from '@/models/CostProductPhoto';
import { productCreateSchema } from '@/lib/costValidators';

export async function GET() {
  const session = await requireCostAdmin();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await connectDB();
  const [products, photos] = await Promise.all([
    CostProduct.find().sort({ position: 1 }).lean(),
    CostProductPhoto.find().sort({ position: 1 }).lean(),
  ]);
  const withPhotos = products.map(p => ({
    ...p,
    photos: photos.filter(ph => ph.productId.toString() === p._id.toString()),
  }));
  return NextResponse.json({ products: withPhotos });
}

export async function POST(req: NextRequest) {
  const session = await requireCostAdmin();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const parsed = productCreateSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });

  await connectDB();
  const last = await CostProduct.findOne().sort({ position: -1 }).lean();
  const position = last ? (last as any).position + 1 : 0;
  const product = await CostProduct.create({ ...parsed.data, position });
  return NextResponse.json({ product: { ...product.toObject(), photos: [] } });
}
