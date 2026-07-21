'use client';

export default function VendorSpotlight({ name, photo, activeCount }: {
  name: string;
  photo: string | null;
  activeCount: number;
}) {
  return (
    <div style={{ background: 'var(--cd-spotlight)', borderRadius: '24px', padding: '20px', color: '#fff', boxShadow: 'var(--shadow-lg)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
        {photo ? (
          <img src={photo} alt={name} style={{ width: '44px', height: '44px', flexShrink: 0, objectFit: 'cover', borderRadius: '50%' }} />
        ) : (
          <div style={{ width: '44px', height: '44px', flexShrink: 0, borderRadius: '50%', background: 'rgba(255,255,255,.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
            {name[0]}
          </div>
        )}
        <div>
          <div style={{ fontSize: '13px', fontWeight: 600 }}>{name}</div>
          <div style={{ fontSize: '11px', opacity: 0.75 }}>Primary vendor</div>
        </div>
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.4rem', fontWeight: 700, lineHeight: 1 }}>{activeCount}</div>
      <div style={{ fontSize: '11.5px', opacity: 0.85, marginTop: '2px' }}>Active purchase orders</div>
    </div>
  );
}
