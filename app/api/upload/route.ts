import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import PurchaseOrder from '@/models/PurchaseOrder';
import { notifyByRole } from '@/lib/notifications';
import { sendEmailToRoles } from '@/lib/mailer';

async function uploadToCloudinary(buffer: Buffer, filename: string, mimeType: string): Promise<{ url: string; type: 'pdf' | 'image' }> {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('Cloudinary not configured');
  }

  const resourceType = mimeType === 'application/pdf' ? 'raw' : 'image';
  const timestamp = Math.round(Date.now() / 1000);
  const folder = 'purchase-fms';

  const crypto = await import('crypto');
  const signature = crypto.createHash('sha1')
    .update(`folder=${folder}&timestamp=${timestamp}${apiSecret}`)
    .digest('hex');

  const formData = new FormData();
  const blob = new Blob([new Uint8Array(buffer)], { type: mimeType });
  formData.append('file', blob, filename);
  formData.append('api_key', apiKey);
  formData.append('timestamp', timestamp.toString());
  formData.append('signature', signature);
  formData.append('folder', folder);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`, { method: 'POST', body: formData });
  const data = await res.json();

  if (!data.secure_url) throw new Error(data.error?.message || 'Upload failed');

  return { url: data.secure_url, type: mimeType === 'application/pdf' ? 'pdf' : 'image' };
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get('file') as File;
  const type = formData.get('type') as string;
  const label = (formData.get('label') as string) || 'Attachment';
  const poId = formData.get('poId') as string;

  if (!file || !poId) return NextResponse.json({ error: 'Missing file or PO ID' }, { status: 400 });

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  if (!allowedTypes.includes(file.type)) return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
  if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());

  let fileUrl: string;
  let fileType: 'pdf' | 'image';

  try {
    const result = await uploadToCloudinary(buffer, file.name, file.type);
    fileUrl = result.url;
    fileType = result.type;
  } catch (e: any) {
    // Fallback: use a placeholder URL if Cloudinary is not configured
    console.error('Upload error:', e.message);
    return NextResponse.json({ error: 'File upload failed: ' + e.message }, { status: 500 });
  }

  await connectDB();
  const po = await PurchaseOrder.findById(poId);
  if (!po) return NextResponse.json({ error: 'PO not found' }, { status: 404 });

  const attachment = { fileUrl, fileType, label, uploadedBy: user.name, uploadedAt: new Date() };

  if (type === 'vendor') {
    if (!['APPROVER', 'PO_CREATOR', 'SUPERADMIN'].includes(user.role)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    po.vendorBill = attachment;
    po.status = 'BILL_UPLOADED';
    po.timeline.push({ action: 'BILL_UPLOADED', byUserId: user.userId, byName: user.name, at: new Date(), note: 'Vendor bill uploaded' });
    const matList = po.materials.map((m: any) => ({ name: m.name, requestedQty: m.orderedQty || m.requestedQty }));
    Promise.all([
      notifyByRole(['RECEIVER', 'SUPERADMIN'], 'Vendor Bill Uploaded', `Bill for ${po.poNumber} received. Material expected soon.`, po.poNumber),
      sendEmailToRoles(['RECEIVER', 'APPROVER', 'SUPERADMIN'], `Bill received for ${po.poNumber} — material expected soon`, po.poNumber, 'BILL_UPLOADED', user.name, matList),
    ]).catch(console.error);
  } else if (type === 'physical') {
    if (!['RECEIVER', 'SUPERADMIN'].includes(user.role)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    po.physicalBill = attachment;
  } else {
    po.attachments.push(attachment);
    po.timeline.push({ action: 'ATTACHMENT_ADDED', byUserId: user.userId, byName: user.name, at: new Date(), note: label });
  }

  await po.save();
  return NextResponse.json({ success: true, fileUrl, fileType });
}
