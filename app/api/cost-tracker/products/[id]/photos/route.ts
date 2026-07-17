import { NextRequest, NextResponse } from 'next/server';
import { requireCostAdmin } from '@/lib/costAuth';
import { isPinAdmin } from '@/lib/costPinAuth';
import { connectDB } from '@/lib/mongodb';
import CostProduct from '@/models/CostProduct';
import CostProductPhoto from '@/models/CostProductPhoto';
import { photoPatchSchema } from '@/lib/costValidators';
import { uploadImageToCloudinary, deleteCloudinaryAsset } from '@/lib/cloudinary';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireCostAdmin();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await connectDB();
  const { id } = await params;
  const photos = await CostProductPhoto.find({ productId: id }).sort({ position: 1 }).lean();
  return NextResponse.json({ photos });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireCostAdmin();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const { id } = await params;
  const product = await CostProduct.findById(id);
  if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'Missing file' }, { status: 400 });
  if (!ALLOWED_TYPES.includes(file.type)) return NextResponse.json({ error: 'Only jpg/png/webp allowed' }, { status: 400 });
  if (file.size > MAX_SIZE) return NextResponse.json({ error: 'File exceeds 5MB' }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  let uploaded: { url: string; publicId: string };
  try {
    uploaded = await uploadImageToCloudinary(buffer, file.name, 'cost-tracker');
  } catch (e: any) {
    return NextResponse.json({ error: 'Upload failed: ' + e.message }, { status: 500 });
  }

  const existingCount = await CostProductPhoto.countDocuments({ productId: id });
  const photo = await CostProductPhoto.create({
    productId: id,
    url: uploaded.url,
    publicId: uploaded.publicId,
    isPrimary: existingCount === 0, // first photo auto-primary
    position: existingCount,
  });
  return NextResponse.json({ photo: photo.toObject() });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireCostAdmin();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const parsed = photoPatchSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });

  await connectDB();
  const { id } = await params;
  const { photoId, isPrimary, position } = parsed.data;

  const photo = await CostProductPhoto.findOne({ _id: photoId, productId: id });
  if (!photo) return NextResponse.json({ error: 'Photo not found' }, { status: 404 });

  if (isPrimary) {
    await CostProductPhoto.updateMany({ productId: id }, { $set: { isPrimary: false } });
    photo.isPrimary = true;
  }
  if (position !== undefined) photo.position = position;
  await photo.save();

  return NextResponse.json({ photo: photo.toObject() });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireCostAdmin();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const admin = await isPinAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Superadmin PIN required to delete photos' }, { status: 403 });

  await connectDB();
  const { id } = await params;
  const photoId = new URL(req.url).searchParams.get('photoId');
  if (!photoId) return NextResponse.json({ error: 'photoId is required' }, { status: 400 });

  const photo = await CostProductPhoto.findOne({ _id: photoId, productId: id });
  if (!photo) return NextResponse.json({ error: 'Photo not found' }, { status: 404 });

  if (photo.publicId) await deleteCloudinaryAsset(photo.publicId);
  await photo.deleteOne();

  if (photo.isPrimary) {
    const next = await CostProductPhoto.findOne({ productId: id }).sort({ position: 1 });
    if (next) { next.isPrimary = true; await next.save(); }
  }

  return NextResponse.json({ success: true });
}
