import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import { uploadImageToCloudinary } from '@/lib/cloudinary';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== 'SUPERADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });
  if (!ALLOWED_TYPES.includes(file.type)) return NextResponse.json({ error: 'Only jpg/png/webp allowed' }, { status: 400 });
  if (file.size > MAX_SIZE) return NextResponse.json({ error: 'File exceeds 5MB' }, { status: 400 });

  await connectDB();
  const { id } = await params;
  const user = await User.findById(id);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const buffer = Buffer.from(await file.arrayBuffer());
  let uploaded: { url: string };
  try {
    uploaded = await uploadImageToCloudinary(buffer, file.name, 'purchase-fms/profiles');
  } catch (e: any) {
    return NextResponse.json({ error: 'Upload failed: ' + e.message }, { status: 500 });
  }

  user.profilePhotoUrl = uploaded.url;
  await user.save();
  return NextResponse.json({ url: uploaded.url });
}
