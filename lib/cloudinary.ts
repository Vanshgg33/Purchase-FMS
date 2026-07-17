import crypto from 'crypto';

// Mirrors the raw-fetch Cloudinary pattern already used in app/api/upload/route.ts —
// no cloudinary SDK dependency, just signed REST calls.

export async function uploadImageToCloudinary(buffer: Buffer, filename: string, folder: string): Promise<{ url: string; publicId: string }> {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) throw new Error('Cloudinary not configured');

  const timestamp = Math.round(Date.now() / 1000);
  const signature = crypto.createHash('sha1').update(`folder=${folder}&timestamp=${timestamp}${apiSecret}`).digest('hex');

  const formData = new FormData();
  const blob = new Blob([new Uint8Array(buffer)], { type: 'image' });
  formData.append('file', blob, filename);
  formData.append('api_key', apiKey);
  formData.append('timestamp', timestamp.toString());
  formData.append('signature', signature);
  formData.append('folder', folder);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: formData });
  const data = await res.json();
  if (!data.secure_url) throw new Error(data.error?.message || 'Upload failed');
  return { url: data.secure_url, publicId: data.public_id };
}

export async function deleteCloudinaryAsset(publicId: string): Promise<void> {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) return;

  const timestamp = Math.round(Date.now() / 1000);
  const signature = crypto.createHash('sha1').update(`public_id=${publicId}&timestamp=${timestamp}${apiSecret}`).digest('hex');

  const formData = new FormData();
  formData.append('public_id', publicId);
  formData.append('api_key', apiKey);
  formData.append('timestamp', timestamp.toString());
  formData.append('signature', signature);

  await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, { method: 'POST', body: formData }).catch(() => {});
}
