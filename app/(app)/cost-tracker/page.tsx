import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import CostProduct from '@/models/CostProduct';
import CostColumn from '@/models/CostColumn';
import CostCell from '@/models/CostCell';
import CostTrackerClient from './CostTrackerClient';

export default async function CostTrackerPage() {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== 'SUPERADMIN') redirect('/dashboard');

  await connectDB();
  const [products, columns, cells] = await Promise.all([
    CostProduct.find().sort({ position: 1 }).lean(),
    CostColumn.find().sort({ position: 1 }).lean(),
    CostCell.find().lean(),
  ]);

  return (
    <CostTrackerClient
      initialProducts={products.map((p: any) => ({
        _id: p._id.toString(),
        name: p.name,
        sku: p.sku,
        unit: p.unit,
        position: p.position,
      }))}
      initialColumns={columns.map((c: any) => ({
        _id: c._id.toString(),
        label: c.label,
        type: c.type,
        color: c.color,
        position: c.position,
      }))}
      initialCells={cells.map((c: any) => ({
        productId: c.productId.toString(),
        columnId: c.columnId.toString(),
        rawValue: c.rawValue,
      }))}
    />
  );
}
