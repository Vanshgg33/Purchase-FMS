import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as any;
  if (!sessionUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get('file') as File;
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) return NextResponse.json({ error: 'Cloudinary not configured' }, { status: 500 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const timestamp = Math.round(Date.now() / 1000);
  const crypto = await import('crypto');
  const signature = crypto.createHash('sha1').update(`folder=purchase-fms/profiles&timestamp=${timestamp}${apiSecret}`).digest('hex');

  const fd = new FormData();
  fd.append('file', new Blob([new Uint8Array(buffer)], { type: file.type }), file.name);
  fd.append('api_key', apiKey);
  fd.append('timestamp', timestamp.toString());
  fd.append('signature', signature);
  fd.append('folder', 'purchase-fms/profiles');

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: fd });
  const data = await res.json();
  if (!data.secure_url) return NextResponse.json({ error: 'Upload failed' }, { status: 500 });

  await connectDB();
  await User.findOneAndUpdate({ userId: sessionUser.userId }, { profilePhotoUrl: data.secure_url });
  return NextResponse.json({ url: data.secure_url });
}
