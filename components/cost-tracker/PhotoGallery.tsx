'use client';
import { useRef, useState } from 'react';
import { X, Star, Trash2, ChevronLeft, ChevronRight, Upload } from 'lucide-react';
import { ctFetch, CtClientError } from '@/lib/ctClient';
import styles from '@/app/(app)/cost-tracker/costTracker.module.css';

export interface CtPhoto { _id: string; url: string; isPrimary: boolean; position: number; }

export default function PhotoGallery({ productId, productName, photos, onChange, onClose }: {
  productId: string;
  productName: string;
  photos: CtPhoto[];
  onChange: (photos: CtPhoto[]) => void;
  onClose: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const sorted = [...photos].sort((a, b) => a.position - b.position);
  const primary = sorted.find(p => p.isPrimary) || sorted[0];

  async function uploadFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    let current = sorted;
    for (const file of Array.from(files)) {
      if (file.size > 5 * 1024 * 1024) continue;
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) continue;
      const fd = new FormData();
      fd.append('file', file);
      try {
        const res = await fetch(`/api/cost-tracker/products/${productId}/photos`, { method: 'POST', body: fd });
        const body = await res.json();
        if (!res.ok || !body.success) continue;
        current = [...current, body.data.photo];
        onChange(current);
      } catch { /* skip */ }
    }
    setUploading(false);
  }

  async function setPrimary(photoId: string) {
    await ctFetch(`/api/cost-tracker/products/${productId}/photos`, { method: 'PATCH', body: JSON.stringify({ photoId, isPrimary: true }) });
    onChange(sorted.map(p => ({ ...p, isPrimary: p._id === photoId })));
  }

  async function deletePhoto(photoId: string) {
    if (!window.confirm('Delete this photo?')) return;
    try {
      await ctFetch(`/api/cost-tracker/products/${productId}/photos?photoId=${photoId}`, { method: 'DELETE' });
      onChange(sorted.filter(p => p._id !== photoId));
    } catch (err) {
      if (err instanceof CtClientError) alert(err.message);
    }
  }

  return (
    <>
      <div className={styles.drawerBackdrop} onClick={onClose} />
      <div className={styles.drawer}>
        <div className={styles.drawerHeader}>
          <div className={styles.drawerTitle}>Photos — {productName}</div>
          <button className={styles.drawerCloseBtn} onClick={onClose}><X size={18} /></button>
        </div>
        <div className={styles.drawerBody}>
          {sorted.length === 0 ? (
            <div className={styles.emptyState} style={{ padding: '40px 0' }}>
              <div className={styles.emptyBracket}>[ NO PHOTOS YET ]</div>
            </div>
          ) : (
            <>
              {primary && (
                <img src={primary.url} alt={productName} className={styles.photoPrimary} onClick={() => setLightboxIndex(sorted.indexOf(primary))} style={{ cursor: 'pointer' }} />
              )}
              <div className={styles.photoGrid}>
                {sorted.map((p, i) => (
                  <div key={p._id} className={styles.photoThumb} onClick={() => setLightboxIndex(i)}>
                    <img src={p.url} alt="" />
                    {p.isPrimary && <span className={styles.photoPrimaryBadge}>Primary</span>}
                    <div className={styles.photoThumbActions}>
                      <button className={styles.photoIconBtn} onClick={(e) => { e.stopPropagation(); setPrimary(p._id); }} title="Set primary"><Star size={13} /></button>
                      <button className={styles.photoIconBtn} onClick={(e) => { e.stopPropagation(); deletePhoto(p._id); }} title="Delete"><Trash2 size={13} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className={styles.dropzone} onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); uploadFiles(e.dataTransfer.files); }}>
            <Upload size={18} style={{ margin: '0 auto 6px' }} />
            {uploading ? 'Uploading…' : 'Drag photos here or click to upload'}
          </div>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => uploadFiles(e.target.files)} />
        </div>
      </div>

      {lightboxIndex !== null && sorted[lightboxIndex] && (
        <div className={styles.lightboxBackdrop}
          onClick={() => setLightboxIndex(null)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setLightboxIndex(null);
            if (e.key === 'ArrowLeft') setLightboxIndex(i => (i! > 0 ? i! - 1 : sorted.length - 1));
            if (e.key === 'ArrowRight') setLightboxIndex(i => (i! < sorted.length - 1 ? i! + 1 : 0));
          }}
          tabIndex={-1}
          ref={(el) => el?.focus()}
        >
          <button className={styles.lightboxClose} onClick={() => setLightboxIndex(null)}><X size={22} /></button>
          {sorted.length > 1 && (
            <button className={styles.lightboxNav} style={{ left: 20 }} onClick={(e) => { e.stopPropagation(); setLightboxIndex(i => (i! > 0 ? i! - 1 : sorted.length - 1)); }}><ChevronLeft size={20} /></button>
          )}
          <img src={sorted[lightboxIndex].url} alt="" className={styles.lightboxImg} onClick={(e) => e.stopPropagation()} />
          {sorted.length > 1 && (
            <button className={styles.lightboxNav} style={{ right: 20 }} onClick={(e) => { e.stopPropagation(); setLightboxIndex(i => (i! < sorted.length - 1 ? i! + 1 : 0)); }}><ChevronRight size={20} /></button>
          )}
        </div>
      )}
    </>
  );
}
