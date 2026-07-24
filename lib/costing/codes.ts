import { nowIST } from '@/lib/costFormat';

async function nextSequence(model: any, field: string, prefix: string, pad: number): Promise<string> {
  const regex = new RegExp(`^${prefix}-(\\d+)$`);
  const docs = await model.find({ [field]: { $regex: `^${prefix}-` } }).select(field).lean();
  let max = 0;
  for (const d of docs) {
    const m = String((d as any)[field]).match(regex);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `${prefix}-${String(max + 1).padStart(pad, '0')}`;
}

export async function generateVendorCode(model: any) {
  return nextSequence(model, 'code', 'VEN', 4);
}
export async function generatePurchaseCode(model: any) {
  const fy = nowIST().year();
  return nextSequence(model, 'code', `PUR-${fy}`, 4);
}
export async function generateLotCode(model: any) {
  const fy = nowIST().year();
  return nextSequence(model, 'lotCode', `LOT-${fy}`, 4);
}
export async function generateBatchCode(model: any) {
  const fy = nowIST().year();
  return nextSequence(model, 'batchCode', `BATCH-${fy}`, 4);
}
export async function generateRawMaterialCode(model: any) {
  return nextSequence(model, 'code', 'RM', 3);
}
export async function generatePackagingCode(model: any) {
  return nextSequence(model, 'code', 'PKG', 3);
}
