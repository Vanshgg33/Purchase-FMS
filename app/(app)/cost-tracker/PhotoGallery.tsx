'use client';
import { useRef, useState } from 'react';
import { X, Star, Trash2, ChevronLeft, ChevronRight, Upload } from 'lucide-react';
import { useCostGridStore, type CostProductLite } from '@/store/costGridStore';

export default function PhotoGallery({ product, styles, onClose }: {
  product: CostProductLite;
  styles: Record<string, string>;
  onClose: () => void;
}) {
  const setPhotos = useCostGridStore(s => s.setPhotos);
  const setToast = useCostGridStore(s => s.setToast);
  const isPinAdmin = useCostGridStore(s => s.isPinAdmin);
  const [uploading, setUploading] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const photos = [...product.photos].sort((a, b) => a.position - b.position);
  const primary = photos.find(p => p.isPrimary) || photos[0];

  async function uploadFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      if (file.size > 5 * 1024 * 1024) { setToast(`${file.name} exceeds 5MB`, 'error'); continue; }
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setToast(`${file.name} must be jpg/png/webp`, 'error'); continue; }
      const fd = new FormData();
      fd.append('file', file);
      try {
        const res = await fetch(`/api/cost-tracker/products/${product._id}/photos`, { method: 'POST', body: fd });
        const body = await res.json();
        if (!res.ok) { setToast(body.error || 'Upload failed', 'error'); continue; }
        setPhotos(product._id, [...useCostGridStore.getState().products.find(p => p._id === product._id)!.photos, body.photo]);
      } catch {
        setToast('Upload failed', 'error');
      }
    }
    setUploading(false);
  }

  async function setPrimary(photoId: string) {
    const res = await fetch(`/api/cost-tracker/products/${product._id}/photos`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ photoId, isPrimary: true }),
    });
    if (!res.ok) { setToast('Failed to set primary photo', 'error'); return; }
    setPhotos(product._id, photos.map(p => ({ ...p, isPrimary: p._id === photoId })));
  }

  async function deletePhoto(photoId: string) {
    if (!isPinAdmin) { setToast('Superadmin PIN required to delete photos', 'error'); return; }
    if (!window.confirm('Delete this photo?')) return;
    const res = await fetch(`/api/cost-tracker/products/${product._id}/photos?photoId=${photoId}`, { method: 'DELETE' });
    if (!res.ok) { const b = await res.json().catch(() => ({})); setToast(b.error || 'Failed to delete photo', 'error'); return; }
    setPhotos(product._id, photos.filter(p => p._id !== photoId));
  }

  return (
    <>
      <div className={styles.drawerBackdrop} onClick={onClose} />
      <div className={styles.drawer}>
        <div className={styles.drawerHeader}>
          <div className={styles.drawerTitle}>Photos — {product.name}</div>
          <button className={styles.drawerCloseBtn} onClick={onClose}><X size={18} /></button>
        </div>
        <div className={styles.drawerBody}>
          {photos.length === 0 ? (
            <div className={styles.emptyState} style={{ padding: '40px 0' }}>
              <div className={styles.emptyBracket}>[ NO PHOTOS YET ]</div>
            </div>
          ) : (
            <>
              {primary && (
                <img src={primary.url} alt={product.name} className={styles.photoPrimary} onClick={() => setLightboxIndex(photos.indexOf(primary))} style={{ cursor: 'pointer' }} />
              )}
              <div className={styles.photoGrid}>
                {photos.map((p, i) => (
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

      {lightboxIndex !== null && photos[lightboxIndex] && (
        <div className={styles.lightboxBackdrop}
          onClick={() => setLightboxIndex(null)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setLightboxIndex(null);
            if (e.key === 'ArrowLeft') setLightboxIndex(i => (i! > 0 ? i! - 1 : photos.length - 1));
            if (e.key === 'ArrowRight') setLightboxIndex(i => (i! < photos.length - 1 ? i! + 1 : 0));
          }}
          tabIndex={-1}
          ref={(el) => el?.focus()}
        >
          <button className={styles.lightboxClose} onClick={() => setLightboxIndex(null)}><X size={22} /></button>
          {photos.length > 1 && (
            <button className={styles.lightboxNav} style={{ left: 20 }} onClick={(e) => { e.stopPropagation(); setLightboxIndex(i => (i! > 0 ? i! - 1 : photos.length - 1)); }}><ChevronLeft size={20} /></button>
          )}
          <img src={photos[lightboxIndex].url} alt="" className={styles.lightboxImg} onClick={(e) => e.stopPropagation()} />
          {photos.length > 1 && (
            <button className={styles.lightboxNav} style={{ right: 20 }} onClick={(e) => { e.stopPropagation(); setLightboxIndex(i => (i! < photos.length - 1 ? i! + 1 : 0)); }}><ChevronRight size={20} /></button>
          )}
        </div>
      )}
    </>
  );
}
