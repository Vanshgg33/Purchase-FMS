import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { requireCapability } from '@/lib/permissions';
import { ctRoute } from '@/lib/costApi';
import { AppError } from '@/lib/costErrors';
import Product from '@/models/Product';
import ProductPhoto from '@/models/ProductPhoto';
import { uploadImageToCloudinary, deleteCloudinaryAsset } from '@/lib/cloudinary';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return ctRoute(async () => {
    await requireCapability('MANAGE_PRODUCTS');
    await connectDB();
    const { id } = await params;
    return ProductPhoto.find({ productId: id }).sort({ position: 1 }).lean();
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return ctRoute(async () => {
    await requireCapability('MANAGE_PRODUCTS');
    await connectDB();
    const { id } = await params;
    const product = await Product.findById(id);
    if (!product) throw new AppError('NOT_FOUND', 'Product not found');

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) throw new AppError('VALIDATION_ERROR', 'Missing file');
    if (!ALLOWED_TYPES.includes(file.type)) throw new AppError('VALIDATION_ERROR', 'Only jpg/png/webp allowed');
    if (file.size > MAX_SIZE) throw new AppError('VALIDATION_ERROR', 'File exceeds 5MB');

    const buffer = Buffer.from(await file.arrayBuffer());
    const uploaded = await uploadImageToCloudinary(buffer, file.name, 'cost-tracker');

    const existingCount = await ProductPhoto.countDocuments({ productId: id });
    const photo = await ProductPhoto.create({
      productId: id,
      url: uploaded.url,
      publicId: uploaded.publicId,
      isPrimary: existingCount === 0,
      position: existingCount,
    });
    return { photo: photo.toObject() };
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return ctRoute(async () => {
    await requireCapability('MANAGE_PRODUCTS');
    await connectDB();
    const { id } = await params;
    const body = await req.json();
    const { photoId, isPrimary, position } = body;
    if (!photoId) throw new AppError('VALIDATION_ERROR', 'photoId is required');

    const photo = await ProductPhoto.findOne({ _id: photoId, productId: id });
    if (!photo) throw new AppError('NOT_FOUND', 'Photo not found');

    if (isPrimary) {
      await ProductPhoto.updateMany({ productId: id }, { $set: { isPrimary: false } });
      photo.isPrimary = true;
    }
    if (position !== undefined) photo.position = position;
    await photo.save();
    return { photo: photo.toObject() };
  });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return ctRoute(async () => {
    await requireCapability('MANAGE_PRODUCTS');
    await connectDB();
    const { id } = await params;
    const photoId = new URL(req.url).searchParams.get('photoId');
    if (!photoId) throw new AppError('VALIDATION_ERROR', 'photoId is required');

    const photo = await ProductPhoto.findOne({ _id: photoId, productId: id });
    if (!photo) throw new AppError('NOT_FOUND', 'Photo not found');

    if (photo.publicId) await deleteCloudinaryAsset(photo.publicId);
    await photo.deleteOne();

    if (photo.isPrimary) {
      const next = await ProductPhoto.findOne({ productId: id }).sort({ position: 1 });
      if (next) { next.isPrimary = true; await next.save(); }
    }
    return { success: true };
  });
}
