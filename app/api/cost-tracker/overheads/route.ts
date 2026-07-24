import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { requireCapability } from '@/lib/permissions';
import { ctRoute } from '@/lib/costApi';
import { writeAudit } from '@/lib/costAudit';
import { overheadSchema, zodFieldErrors } from '@/lib/costValidation';
import { AppError } from '@/lib/costErrors';
import { round2, round4 } from '@/lib/costing/round';
import { massRecostOnOverheadLock } from '@/lib/costing/recost';
import Overhead from '@/models/Overhead';

export async function GET() {
  return ctRoute(async () => {
    await requireCapability('MANAGE_RATES');
    await connectDB();
    return Overhead.find({}).sort({ year: -1, month: -1 }).lean();
  });
}

export async function POST(req: NextRequest) {
  return ctRoute(async () => {
    const session = await requireCapability('MANAGE_RATES');
    await connectDB();
    const parsed = overheadSchema.safeParse(await req.json());
    if (!parsed.success) throw new AppError('VALIDATION_ERROR', 'Invalid overhead data', { fields: zodFieldErrors(parsed.error) });
    const data = parsed.data;

    const existing = await Overhead.findOne({ year: data.year, month: data.month });
    if (existing?.isLocked) throw new AppError('PERIOD_LOCKED', 'This overhead month is locked');

    const totalOverhead = round2(data.categories.reduce((s, c) => s + c.amount, 0));
    const overheadRatePerUnit = round4(totalOverhead / data.totalProductionQty);

    let overhead;
    if (existing) {
      existing.categories = data.categories as any;
      existing.totalOverhead = totalOverhead;
      existing.totalProductionQty = data.totalProductionQty;
      existing.overheadRatePerUnit = overheadRatePerUnit;
      await existing.save();
      overhead = existing;
      await writeAudit({ entity: 'Overhead', entityId: overhead._id.toString(), action: 'UPDATE', session });
    } else {
      overhead = await Overhead.create({ ...data, totalOverhead, overheadRatePerUnit, isLocked: false });
      await writeAudit({ entity: 'Overhead', entityId: overhead._id.toString(), action: 'CREATE', session });
    }
    return overhead.toObject();
  });
}

export async function PATCH(req: NextRequest) {
  return ctRoute(async () => {
    const session = await requireCapability('MANAGE_RATES');
    await connectDB();
    const body = await req.json();
    if (!body.overheadId || body.lock !== true) throw new AppError('VALIDATION_ERROR', 'overheadId and lock:true are required');

    const result = await massRecostOnOverheadLock(body.overheadId, session);
    return result;
  });
}
