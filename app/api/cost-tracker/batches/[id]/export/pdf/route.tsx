import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { connectDB } from '@/lib/mongodb';
import { requireCapability } from '@/lib/permissions';
import { AppError } from '@/lib/costErrors';
import { gatherCostInputs } from '@/lib/costing/service';
import { computeBatchCost } from '@/lib/costing/index';
import ProductionBatch from '@/models/ProductionBatch';
import Product from '@/models/Product';

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 10, fontFamily: 'Helvetica' },
  h1: { fontSize: 16, fontWeight: 700, color: '#1B4332', marginBottom: 4 },
  sub: { fontSize: 10, color: '#555', marginBottom: 14 },
  section: { marginBottom: 10, borderBottom: '1px solid #ddd', paddingBottom: 6 },
  sectionTitle: { fontSize: 11, fontWeight: 700, color: '#1B4332', marginBottom: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  bold: { fontWeight: 700 },
  totalBox: { backgroundColor: '#1B4332', color: '#fff', padding: 10, marginTop: 8, borderRadius: 4 },
});

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={bold ? styles.bold : undefined}>{label}</Text>
      <Text style={bold ? styles.bold : undefined}>{value}</Text>
    </View>
  );
}

function money(n: number | null | undefined) {
  if (n === null || n === undefined) return '—';
  return `Rs. ${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    return await handle(await params);
  } catch (err) {
    const { errorResponseBody } = await import('@/lib/costErrors');
    const { status, body } = errorResponseBody(err);
    return Response.json(body, { status });
  }
}

async function handle({ id }: { id: string }) {
  await requireCapability('EXPORT');
  await connectDB();

  const batch = await ProductionBatch.findById(id).lean();
  if (!batch) throw new AppError('NOT_FOUND', 'Batch not found');
  const product = await Product.findById((batch as any).productId).lean();

  const inputs = await gatherCostInputs(id);
  const c = computeBatchCost(inputs);

  const doc = (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.h1}>Naturelite Manufacturing Cost Tracker</Text>
        <Text style={styles.sub}>
          {(batch as any).batchCode} — {(product as any)?.name} ({(product as any)?.sku}) — {new Date((batch as any).productionDate).toDateString()}
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Manufacturing Cost</Text>
          <Row label="Material Cost" value={money(c.materialCost)} />
          <Row label="Labour Cost" value={money(c.labourCost)} />
          <Row label="Electricity Cost" value={money(c.electricityCost)} />
          <Row label="Consumables Cost" value={money(c.consumablesCost)} />
          <Row label="Packaging Cost" value={money(c.packagingCost)} />
          <Row label="Overhead Cost" value={money(c.overheadCost)} />
          <Row label="Gross Manufacturing Cost" value={money(c.grossManufacturingCost)} bold />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>By-Product Credit</Text>
          <Row label="Less: By-Product Credit" value={`(${money(c.byProductCredit)})`} />
          <Row label="Net Manufacturing Cost" value={money(c.manufacturingCost)} bold />
          <Row label="Manufacturing Cost / Unit" value={money(c.manufacturingCostPerUnit)} bold />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Selling Cost</Text>
          <Row label="Selling Cost / Unit" value={money(c.sellingCostPerUnit)} />
        </View>

        <View style={styles.totalBox}>
          <Row label="Final COGS / Unit" value={money(c.finalCogsPerUnit)} bold />
          <Row label="Gross Margin %" value={c.grossMarginPercent != null ? `${c.grossMarginPercent}%` : '—'} />
          <Row label="Net Margin %" value={c.netMarginPercent != null ? `${c.netMarginPercent}%` : '—'} />
        </View>

        <Text style={{ marginTop: 16, fontSize: 8, color: '#888' }}>Generated {new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</Text>
      </Page>
    </Document>
  );

  const buffer = await renderToBuffer(doc);
  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${(batch as any).batchCode}-cost-sheet.pdf"`,
    },
  });
}
