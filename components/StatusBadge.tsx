const statusConfig: Record<string, { label: string; bg: string; color: string; dot: string }> = {
  REQUESTED:         { label: 'Requested',      bg: '#EFF6FF', color: '#1D4ED8', dot: '#3B82F6' },
  PO_CREATED:        { label: 'PO Created',     bg: '#FFFBEB', color: '#92400E', dot: '#F59E0B' },
  APPROVED:          { label: 'Approved',       bg: '#F0FDF4', color: '#166534', dot: '#22C55E' },
  REJECTED:          { label: 'Rejected',       bg: '#FEF2F2', color: '#B91C1C', dot: '#EF4444' },
  SENT_TO_VENDOR:    { label: 'Sent to Vendor', bg: '#F5F3FF', color: '#6D28D9', dot: '#8B5CF6' },
  BILL_UPLOADED:     { label: 'Bill Uploaded',  bg: '#EFF6FF', color: '#1E40AF', dot: '#60A5FA' },
  RECEIVED:          { label: 'Received',       bg: '#F0FDFA', color: '#0F766E', dot: '#14B8A6' },
  PARTIALLY_RECEIVED:{ label: 'Partial',        bg: '#FFF7ED', color: '#C2410C', dot: '#F97316' },
  CLOSED:            { label: 'Closed',         bg: '#F9FAFB', color: '#6B7280', dot: '#9CA3AF' },
  CANCELLED:         { label: 'Cancelled',      bg: '#FEF2F2', color: '#B91C1C', dot: '#F87171' },
};

export default function StatusBadge({ status }: { status: string }) {
  const c = statusConfig[status] || { label: status, bg: '#F9FAFB', color: '#6B7280', dot: '#9CA3AF' };
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '5px',
      background: c.bg,
      color: c.color,
      fontSize: '11.5px',
      fontWeight: 600,
      padding: '3px 9px',
      borderRadius: '999px',
      whiteSpace: 'nowrap',
      fontFamily: 'var(--font-body)',
    }}>
      <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: c.dot, flexShrink: 0 }} />
      {c.label}
    </span>
  );
}
