import { NextRequest, NextResponse } from 'next/server';
import { requireCostAdmin } from '@/lib/costAuth';
import { isPinAdmin } from '@/lib/costPinAuth';
import { connectDB } from '@/lib/mongodb';
import CostProduct from '@/models/CostProduct';
import CostCell from '@/models/CostCell';
import CostProductPhoto from '@/models/CostProductPhoto';
import CostTotalOverride from '@/models/CostTotalOverride';
import CostSnapshot from '@/models/CostSnapshot';
import { productUpdateSchema } from '@/lib/costValidators';
import { deleteCloudinaryAsset } from '@/lib/cloudinary';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireCostAdmin();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const parsed = productUpdateSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });

  await connectDB();
  const { id } = await params;
  const product = await CostProduct.findById(id);
  if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const admin = await isPinAdmin(req);
  const { sellingPrice, priceLocked, ...rest } = parsed.data;

  // priceLocked toggle itself, and any sellingPrice edit while the pill is locked, both require the PIN session
  if (priceLocked !== undefined && !admin) {
    return NextResponse.json({ error: 'Superadmin PIN required to lock/unlock pricing' }, { status: 403 });
  }
  if (sellingPrice !== undefined && product.priceLocked && !admin) {
    return NextResponse.json({ error: 'Selling price is locked — superadmin PIN required' }, { status: 403 });
  }

  Object.assign(product, rest);
  if (sellingPrice !== undefined) product.sellingPrice = sellingPrice;
  if (priceLocked !== undefined) product.priceLocked = priceLocked;
  await product.save();

  return NextResponse.json({ product: product.toObject() });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireCostAdmin();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const admin = await isPinAdmin(_req);
  if (!admin) return NextResponse.json({ error: 'Superadmin PIN required to delete products' }, { status: 403 });

  await connectDB();
  const { id } = await params;
  const photos = await CostProductPhoto.find({ productId: id }).lean();
  await Promise.all(photos.map(p => (p.publicId ? deleteCloudinaryAsset(p.publicId) : Promise.resolve())));

  await Promise.all([
    CostCell.deleteMany({ productId: id }),
    CostProductPhoto.deleteMany({ productId: id }),
    CostTotalOverride.deleteMany({ productId: id }),
    CostSnapshot.deleteMany({ productId: id }),
    CostProduct.findByIdAndDelete(id),
  ]);
  return NextResponse.json({ success: true });
}
