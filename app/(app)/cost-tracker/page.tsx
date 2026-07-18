import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import CostProduct from '@/models/CostProduct';
import CostProductPhoto from '@/models/CostProductPhoto';
import CostColumn from '@/models/CostColumn';
import CostCell from '@/models/CostCell';
import CostTotalOverride from '@/models/CostTotalOverride';
import CostConstant from '@/models/CostConstant';
import CostSetting from '@/models/CostSetting';
import { isPinAdminFromCookies } from '@/lib/costPinAuth';
import { ensureDailySnapshot } from '@/lib/costSnapshotService';
import CostTrackerClient from './CostTrackerClient';

export default async function CostTrackerPage() {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== 'SUPERADMIN') redirect('/dashboard');

  await connectDB();
  await ensureDailySnapshot().catch(() => {}); // best-effort; never block the page on this

  const [products, photos, columns, cells, overrides, constants, settingsRows, isPinAdmin] = await Promise.all([
    CostProduct.find().sort({ position: 1 }).lean(),
    CostProductPhoto.find().sort({ position: 1 }).lean(),
    CostColumn.find().sort({ position: 1 }).lean(),
    CostCell.find().lean(),
    CostTotalOverride.find().lean(),
    CostConstant.find().sort({ name: 1 }).lean(),
    CostSetting.find().lean(),
    isPinAdminFromCookies(),
  ]);

  const settingsMap: Record<string, string> = { marginThreshold: '20' };
  for (const s of settingsRows) settingsMap[s.key] = s.value;

  return (
    <CostTrackerClient
      initialProducts={products.map((p: any) => ({
        _id: p._id.toString(),
        name: p.name,
        sku: p.sku,
        unit: p.unit,
        batchQty: p.batchQty,
        baseAmount: p.baseAmount ?? 0,
        sellingPrice: p.sellingPrice,
        priceLocked: p.priceLocked,
        position: p.position,
        photos: photos
          .filter((ph: any) => ph.productId.toString() === p._id.toString())
          .map((ph: any) => ({ _id: ph._id.toString(), url: ph.url, isPrimary: ph.isPrimary, position: ph.position })),
      }))}
      initialColumns={columns.map((c: any) => ({
        _id: c._id.toString(),
        label: c.label,
        type: c.type,
        color: c.color,
        position: c.position,
        locked: c.locked,
      }))}
      initialCells={cells.map((c: any) => ({
        productId: c.productId.toString(),
        columnId: c.columnId.toString(),
        rawValue: c.rawValue,
        note: c.note || null,
      }))}
      initialTotalOverrides={overrides.map((o: any) => ({ productId: o.productId, formula: o.formula }))}
      initialConstants={constants.map((c: any) => ({ _id: c._id.toString(), name: c.name, value: c.value, description: c.description }))}
      initialSettings={{ marginThreshold: Number(settingsMap.marginThreshold) }}
      isPinAdmin={isPinAdmin}
    />
  );
}
