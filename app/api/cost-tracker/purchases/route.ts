import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { requireCapability } from '@/lib/permissions';
import { ctRoute } from '@/lib/costApi';
import { writeAudit } from '@/lib/costAudit';
import { purchaseSchema, zodFieldErrors } from '@/lib/costValidation';
import { AppError } from '@/lib/costErrors';
import { computeLandedCost } from '@/lib/costing/landed';
import { generatePurchaseCode } from '@/lib/costing/codes';
import Purchase from '@/models/Purchase';
import CtRawMaterial from '@/models/CtRawMaterial';
import CtSettings from '@/models/CtSettings';

export async function GET(req: NextRequest) {
  return ctRoute(async () => {
    await requireCapability('CREATE_PURCHASE');
    await connectDB();
    const { searchParams } = new URL(req.url);
    const query: Record<string, unknown> = {};
    if (searchParams.get('vendorId')) query.vendorId = searchParams.get('vendorId');
    if (searchParams.get('status')) query.status = searchParams.get('status');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    if (from || to) {
      query.receivedDate = {
        ...(from ? { $gte: new Date(from) } : {}),
        ...(to ? { $lte: new Date(to) } : {}),
      };
    }
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const [purchases, total] = await Promise.all([
      Purchase.find(query).populate('vendorId', 'name code').sort({ receivedDate: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Purchase.countDocuments(query),
    ]);
    return { purchases, page, total, limit };
  });
}

export async function POST(req: NextRequest) {
  return ctRoute(async () => {
    const session = await requireCapability('CREATE_PURCHASE');
    await connectDB();
    const parsed = purchaseSchema.safeParse(await req.json());
    if (!parsed.success) throw new AppError('VALIDATION_ERROR', 'Invalid purchase data', { fields: zodFieldErrors(parsed.error) });
    const data = parsed.data;

    // Validate each line's uom matches the raw material's uom (R03)
    const materials = await CtRawMaterial.find({ _id: { $in: data.items.map(i => i.rawMaterialId) } }).lean();
    for (const item of data.items) {
      const rm = materials.find((m: any) => m._id.toString() === item.rawMaterialId);
      if (!rm) throw new AppError('NOT_FOUND', 'Raw material not found');
      if ((rm as any).uom !== item.uom) throw new AppError('UOM_MISMATCH', `${(rm as any).name} is tracked in ${(rm as any).uom}, not ${item.uom}`);
    }

    const settings = await CtSettings.findOne().lean();
    const gstTreatment = (settings as any)?.gstTreatment || 'INCLUSIVE';

    // Server always recomputes landed cost — never trusts client-sent computed fields.
    const landed = computeLandedCost({
      items: data.items.map(i => ({ quantity: i.quantity, ratePerUnit: i.ratePerUnit, gstRate: i.gstRate })),
      freightCharges: data.freightCharges,
      loadingCharges: data.loadingCharges,
      otherCharges: data.otherCharges,
      gstTreatment,
    });

    const code = await generatePurchaseCode(Purchase);
    const purchase = await Purchase.create({
      code,
      vendorId: data.vendorId,
      invoiceNo: data.invoiceNo,
      invoiceDate: data.invoiceDate,
      receivedDate: data.receivedDate,
      items: data.items.map((item, i) => ({ ...item, ...landed.items[i] })),
      freightCharges: data.freightCharges,
      loadingCharges: data.loadingCharges,
      otherCharges: data.otherCharges,
      otherChargesNote: data.otherChargesNote,
      basicAmount: landed.basicAmount,
      gstAmount: landed.gstAmount,
      totalLandedAmount: landed.totalLandedAmount,
      status: 'DRAFT',
      notes: data.notes,
      createdBy: session.userId,
    });

    await writeAudit({ entity: 'Purchase', entityId: purchase._id.toString(), action: 'CREATE', session });
    return purchase.toObject();
  });
}
