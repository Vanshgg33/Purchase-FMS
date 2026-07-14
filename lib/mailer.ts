import nodemailer from 'nodemailer';
import { connectDB } from './mongodb';
import User from '@/models/User';
import { toIST } from './dates';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

function emailTemplate(subject: string, poNumber: string, status: string, performer: string, materials: Array<{ name: string; requestedQty: number }>, deadline?: string, note?: string) {
  const statusColors: Record<string, string> = {
    REQUESTED: '#3b82f6', PO_CREATED: '#f59e0b', APPROVED: '#10b981',
    REJECTED: '#ef4444', SENT_TO_VENDOR: '#8b5cf6', BILL_UPLOADED: '#6366f1',
    RECEIVED: '#14b8a6', CLOSED: '#6b7280', CANCELLED: '#ef4444',
  };
  const color = statusColors[status] || '#15803d';
  const appUrl = process.env.APP_URL || 'http://localhost:3000';

  const matRows = materials.map(m => `<tr><td style="padding:6px 12px;border-bottom:1px solid #f3f4f6">${m.name}</td><td style="padding:6px 12px;border-bottom:1px solid #f3f4f6;text-align:right">${m.requestedQty} KG</td></tr>`).join('');

  return `
<!DOCTYPE html><html><body style="font-family:sans-serif;background:#f9fafb;margin:0;padding:20px">
<div style="max-width:520px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
  <div style="background:#15803d;padding:20px 24px">
    <p style="color:white;font-size:18px;font-weight:700;margin:0">Purchase FMS</p>
    <p style="color:#bbf7d0;font-size:12px;margin:4px 0 0">NatureLite Foods</p>
  </div>
  <div style="padding:24px">
    <span style="background:${color}20;color:${color};font-size:12px;font-weight:600;padding:4px 10px;border-radius:20px">${status.replace(/_/g, ' ')}</span>
    <h2 style="font-size:16px;color:#111827;margin:12px 0 4px">${subject}</h2>
    <p style="color:#6b7280;font-size:13px;margin:0">Action by: <strong>${performer}</strong> · ${toIST(new Date())}</p>
    ${note ? `<p style="color:#374151;font-size:13px;margin:12px 0;padding:10px;background:#f3f4f6;border-radius:6px">${note}</p>` : ''}
    <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:13px">
      <thead><tr style="background:#f3f4f6"><th style="padding:8px 12px;text-align:left;font-size:12px;color:#374151">Material</th><th style="padding:8px 12px;text-align:right;font-size:12px;color:#374151">Qty</th></tr></thead>
      <tbody>${matRows}</tbody>
    </table>
    ${deadline ? `<p style="font-size:12px;color:#6b7280">Deadline: <strong>${deadline}</strong></p>` : ''}
    <a href="${appUrl}/po/${poNumber}" style="display:inline-block;background:#15803d;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;font-size:13px;font-weight:600;margin-top:8px">View PO →</a>
  </div>
  <div style="background:#f9fafb;padding:12px 24px;font-size:11px;color:#9ca3af">Purchase FMS · NatureLite Foods · Auto-generated email</div>
</div></body></html>`;
}

export async function sendEmailToRoles(roles: string[], subject: string, poNumber: string, status: string, performer: string, materials: Array<{ name: string; requestedQty: number }>, deadline?: string, note?: string) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) return;
  try {
    await connectDB();
    const users = await User.find({ role: { $in: roles }, isActive: true, email: { $ne: '' } }, 'email');
    const emails = users.map(u => u.email).filter(Boolean);
    if (!emails.length) return;

    await transporter.sendMail({
      from: `"Purchase FMS" <${process.env.GMAIL_USER}>`,
      to: emails.join(', '),
      subject,
      html: emailTemplate(subject, poNumber, status, performer, materials, deadline, note),
    });
  } catch (e) {
    console.error('Email send error:', e);
  }
}
