'use client';
import { useRef, useState } from 'react';
import { Upload } from 'lucide-react';

interface Tile { kind: 'user' | 'vendor'; id: string; name: string; photo: string | null }

export default function UploadPhotosPanel({ tiles, onUploaded }: {
  tiles: Tile[];
  onUploaded: (kind: 'user' | 'vendor', id: string, url: string) => void;
}) {
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  async function handleFile(tile: Tile, file: File | undefined) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert(`${file.name} exceeds 5MB`); return; }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { alert('Only jpg/png/webp allowed'); return; }

    setUploadingId(tile.id);
    const fd = new FormData();
    fd.append('file', file);
    const url = tile.kind === 'user' ? `/api/admin/users/${tile.id}/photo` : `/api/vendors/${tile.id}/photo`;
    try {
      const res = await fetch(url, { method: 'POST', body: fd });
      const body = await res.json();
      if (res.ok) onUploaded(tile.kind, tile.id, body.url);
    } finally {
      setUploadingId(null);
    }
  }

  if (tiles.length === 0) return null;

  return (
    <div style={{ background: '#fff', border: '1px dashed var(--border-em)', borderRadius: '24px', padding: '18px', boxShadow: 'var(--shadow)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
        <Upload size={15} style={{ color: 'var(--amber)' }} />
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', margin: 0 }}>Upload Photos</h3>
      </div>
      <p style={{ fontSize: '11.5px', color: 'var(--text-3)', margin: '0 0 14px' }}>One upload per person/vendor — syncs everywhere.</p>
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        {tiles.map(tile => (
          <div key={`${tile.kind}:${tile.id}`} style={{ textAlign: 'center', flex: '1 1 60px', minWidth: '60px' }}>
            <button
              type="button"
              className="cd-upload-tile"
              onClick={() => inputRefs.current[tile.id]?.click()}
              disabled={uploadingId === tile.id}
              title={`Upload photo for ${tile.name}`}
              style={{ width: '100%', aspectRatio: '1', borderRadius: '50%', border: 'none', padding: 0, background: 'var(--bg-muted)', overflow: 'hidden', position: 'relative' }}
            >
              {tile.photo ? (
                <img src={tile.photo} alt={tile.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', fontSize: '18px', fontWeight: 700 }}>
                  {tile.name[0]}
                </div>
              )}
              {uploadingId === tile.id && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '10px' }}>…</div>
              )}
            </button>
            <div style={{ fontSize: '10px', marginTop: '6px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tile.name}</div>
            <input
              ref={el => { inputRefs.current[tile.id] = el; }}
              type="file" accept="image/jpeg,image/png,image/webp" hidden
              onChange={e => handleFile(tile, e.target.files?.[0])}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
