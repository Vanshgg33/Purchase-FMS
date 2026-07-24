'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Camera, Package2 } from 'lucide-react';
import { ctFetch } from '@/lib/ctClient';
import { formatMoney } from '@/lib/costFormat';
import { UOM } from '@/types/costTracker';
import PhotoGallery, { type CtPhoto } from '@/components/cost-tracker/PhotoGallery';

const empty = { sku: '', name: '', nameHindi: '', category: '', packSize: '1', packUom: 'LITRE', primaryRawMaterialId: '', sellingPrice: '', mrp: '' };

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ ...empty });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [galleryFor, setGalleryFor] = useState<any>(null);

  const load = () => Promise.all([
    ctFetch('/api/cost-tracker/products').then(setProducts),
    ctFetch('/api/cost-tracker/raw-materials').then(setMaterials),
  ]).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      await ctFetch('/api/cost-tracker/products', {
        method: 'POST',
        body: JSON.stringify({ ...form, packSize: Number(form.packSize), sellingPrice: Number(form.sellingPrice), mrp: form.mrp ? Number(form.mrp) : undefined }),
      });
      setModal(false); setForm({ ...empty }); load();
    } catch (err: any) { setError(err.message); } finally { setSaving(false); }
  };

  const updatePhotos = (productId: string, photos: CtPhoto[]) => {
    setProducts(ps => ps.map(p => p._id === productId ? { ...p, photos } : p));
    setGalleryFor((g: any) => g && g._id === productId ? { ...g, photos } : g);
  };

  if (loading) return <div className="skeleton" style={{ height: 240, borderRadius: 12 }} />;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <p className="page-sub" style={{ margin: 0 }}>{products.length} SKU{products.length !== 1 ? 's' : ''}</p>
        <button className="btn btn-primary btn-sm" onClick={() => setModal(true)}><Plus size={14} /> Add Product</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
        {products.map((p: any) => {
          const primaryPhoto = p.photos?.find((ph: CtPhoto) => ph.isPrimary) || p.photos?.[0];
          return (
            <motion.div key={p._id} whileHover={{ y: -3 }} className="card" style={{ overflow: 'hidden' }}>
              <div style={{ position: 'relative', aspectRatio: '4/3', background: 'var(--bg-muted)', cursor: 'pointer' }} onClick={() => setGalleryFor(p)}>
                {primaryPhoto ? (
                  <img src={primaryPhoto.url} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Package2 size={28} style={{ opacity: 0.3 }} /></div>
                )}
                <div style={{ position: 'absolute', bottom: 6, right: 6, background: 'rgba(0,0,0,0.6)', borderRadius: 6, padding: '4px 7px', display: 'flex', alignItems: 'center', gap: 4, color: '#fff', fontSize: 11 }}>
                  <Camera size={11} /> {p.photos?.length || 0}
                </div>
              </div>
              <div style={{ padding: 14 }}>
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>{p.name}</div>
                <div className="mono" style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{p.sku}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-3)' }}>Selling Price</span>
                  <span style={{ fontWeight: 700, color: 'var(--ct-primary)' }}>{formatMoney(p.sellingPrice)}</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {galleryFor && (
        <PhotoGallery productId={galleryFor._id} productName={galleryFor.name} photos={galleryFor.photos || []}
          onChange={(photos) => updatePhotos(galleryFor._id, photos)} onClose={() => setGalleryFor(null)} />
      )}

      {modal && (
        <div className="modal-backdrop">
          <div className="card" style={{ width: '100%', maxWidth: 480, padding: 26, maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 className="display" style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>Add Product (SKU)</h3>
            {error && <div className="alert alert-err" style={{ marginBottom: 12 }}>{error}</div>}
            <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label className="label">SKU</label><input required className="field" value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} /></div>
                <div><label className="label">Category</label><input required className="field" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} /></div>
              </div>
              <div><label className="label">Name</label><input required className="field" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label className="label">Pack Size</label><input required type="number" step="0.001" className="field" value={form.packSize} onChange={e => setForm(f => ({ ...f, packSize: e.target.value }))} /></div>
                <div><label className="label">Pack UOM</label><select className="field" value={form.packUom} onChange={e => setForm(f => ({ ...f, packUom: e.target.value }))}>{UOM.map(u => <option key={u} value={u}>{u}</option>)}</select></div>
              </div>
              <div><label className="label">Primary Raw Material</label>
                <select required className="field" value={form.primaryRawMaterialId} onChange={e => setForm(f => ({ ...f, primaryRawMaterialId: e.target.value }))}>
                  <option value="">Select…</option>{materials.map((m: any) => <option key={m._id} value={m._id}>{m.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label className="label">Selling Price</label><input required type="number" step="0.01" className="field" value={form.sellingPrice} onChange={e => setForm(f => ({ ...f, sellingPrice: e.target.value }))} /></div>
                <div><label className="label">MRP (optional)</label><input type="number" step="0.01" className="field" value={form.mrp} onChange={e => setForm(f => ({ ...f, mrp: e.target.value }))} /></div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save Product'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </motion.div>
  );
}
