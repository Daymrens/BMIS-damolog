import { useEffect, useState } from 'react';
import { get, patch, post } from '../api';
import type { Payment, PaymentSummary, Resident, Official, QueueRequest } from '../types';
import { PAYMENT_CATEGORIES, FEE_SCHEDULE } from '../types';
import { useAuth } from '../auth';
import ResidentPicker from '../components/ResidentPicker';
import '../components/ResidentPicker.css';
import './Payments.css';

const DOC_TYPES = [
  'Barangay Clearance', 'Certificate of Residency', 'Certificate of Indigency',
  'Barangay Business Clearance', 'Barangay Blotter Certification',
];

const METHOD_ICONS: Record<string, string> = { Cash: '💵', GCash: '📱', Maya: '💙' };

const emptyForm = {
  payerName: '', residentId: undefined as number | undefined,
  category: 'Clearance Fee' as string,
  description: 'Barangay Clearance' as string,
  amount: 50,
  paymentMethod: 'Cash' as 'Cash' | 'GCash' | 'Maya',
  collectedBy: '',
};

function todayStr() { return new Date().toISOString().slice(0, 10); }
function fmtPeso(n: number) { return `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`; }

export default function Payments() {
  const { can } = useAuth();
  const [summary, setSummary]     = useState<PaymentSummary | null>(null);
  const [payments, setPayments]   = useState<Payment[]>([]);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [officials, setOfficials] = useState<Official[]>([]);
  const [dateFilter, setDate]     = useState(todayStr());
  const [catFilter, setCat]       = useState('');
  const [modal, setModal]         = useState(false);
  const [voidModal, setVoidModal] = useState<Payment | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [form, setForm]           = useState({ ...emptyForm });
  const [pickerResident, setPickerResident] = useState<Resident | null>(null);

  // Queue number lookup
  const [queueInput, setQueueInput]     = useState('');
  const [queueLookup, setQueueLookup]   = useState<QueueRequest | null>(null);
  const [queueError, setQueueError]     = useState('');
  const [queueLoading, setQueueLoading] = useState(false);

  const load = () => {
    const qs = new URLSearchParams();
    if (dateFilter) qs.set('date', dateFilter);
    if (catFilter)  qs.set('category', catFilter);
    get<Payment[]>(`/api/payments?${qs}`).then(setPayments).catch(console.error);
    get<PaymentSummary>(`/api/payments/summary?date=${dateFilter}`).then(setSummary).catch(console.error);
  };

  useEffect(() => {
    load();
    get<Resident[]>('/api/residents').then(setResidents).catch(console.error);
    get<Official[]>('/api/officials').then(o => setOfficials(o.filter(x => x.isActive))).catch(console.error);
  }, []);

  useEffect(() => { load(); }, [dateFilter, catFilter]);

  const f = (k: keyof typeof form, v: string | number | undefined) =>
    setForm(p => ({ ...p, [k]: v }));

  const onDescChange = (desc: string) => {
    f('description', desc);
    const fee = FEE_SCHEDULE[desc];
    if (fee !== undefined) f('amount', fee);
  };

  const lookupQueue = async () => {
    const num = queueInput.trim().toUpperCase();
    if (!num) { setQueueError('Enter a queue number.'); return; }
    if (!/^Q-\d{4}-\d{3}$/.test(num)) { setQueueError('Format must be Q-MMDD-NNN (e.g. Q-0319-001).'); return; }
    setQueueLoading(true);
    setQueueError('');
    setQueueLookup(null);
    try {
      const q = await get<QueueRequest>(`/api/queue/lookup?q=${encodeURIComponent(num)}`);

      // Validation: must be Released OR Processing-with-doc-issued (payment modal was closed)
      if (q.status === 'Pending') {
        setQueueError(`Queue ${num} is still Pending — document hasn't been processed yet.`);
        setQueueLoading(false);
        return;
      }
      if (q.status === 'Processing' && !q.issuedDocumentId) {
        setQueueError(`Queue ${num} is still Processing — document hasn't been issued yet.`);
        setQueueLoading(false);
        return;
      }
      if (q.status === 'Cancelled') {
        setQueueError(`Queue ${num} was cancelled.`);
        setQueueLoading(false);
        return;
      }

      // Validation: free document
      const fee = FEE_SCHEDULE[q.documentType] ?? 50;
      if (fee === 0) {
        setQueueError(`${q.documentType} is free of charge — no payment needed.`);
        setQueueLoading(false);
        return;
      }

      // Validation: already paid today
      try {
        const qs = new URLSearchParams({ description: q.documentType });
        if (q.residentId) qs.set('residentId', String(q.residentId));
        const existing = await get<Payment[]>(`/api/payments?${qs}`);
        const releaseDay = q.releasedAt ? new Date(q.releasedAt).toDateString() : new Date(q.requestedAt).toDateString();
        const alreadyPaid = existing.find(p => p.status === 'Paid' && new Date(p.paidAt).toDateString() === releaseDay);
        if (alreadyPaid) {
          setQueueError(`Payment already collected — OR ${alreadyPaid.orNumber}.`);
          setQueueLoading(false);
          return;
        }
      } catch { /* non-blocking */ }

      setQueueLookup(q);
      const fullName = q.resident
        ? `${q.resident.firstName} ${q.resident.middleName ? q.resident.middleName + ' ' : ''}${q.resident.lastName}`.trim()
        : q.requesterName;
      setForm(p => ({
        ...p,
        payerName: fullName,
        residentId: q.residentId,
        description: q.documentType,
        category: 'Clearance Fee',
        amount: fee,
      }));
      setPickerResident(q.resident ?? null);
    } catch {
      setQueueError(`Queue number "${num}" not found.`);
    } finally {
      setQueueLoading(false);
    }
  };

  const submit = async () => {
    if (!form.payerName.trim())   { alert('Enter payer name.'); return; }
    if (!form.description.trim()) { alert('Enter description.'); return; }
    if (!form.collectedBy.trim()) { alert('Select who collected the payment.'); return; }
    if (form.amount <= 0)         { alert('Amount must be greater than zero.'); return; }
    const created = await post<Payment>('/api/payments', form);
    setModal(false);
    setForm({ ...emptyForm, collectedBy: form.collectedBy });
    load();
    printOR(created);
  };

  const doVoid = async () => {
    if (!voidModal) return;
    await patch(`/api/payments/${voidModal.id}/void`, { reason: voidReason });
    setVoidModal(null);
    setVoidReason('');
    load();
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Payment & Collection</h1>
          <p className="page-sub">Official receipts · daily collection report</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="date" value={dateFilter} onChange={e => setDate(e.target.value)}
            style={{ width: 160, padding: '7px 10px' }} />
          <button className="btn-secondary" onClick={() => printDailyReport(summary, dateFilter)}>🖨 Daily Report</button>
          {can('collect_payments') && <button className="btn-primary" onClick={() => {
            setForm({ ...emptyForm, collectedBy: officials[0]?.name ?? '' });
            setPickerResident(null);
            setQueueInput(''); setQueueLookup(null); setQueueError('');
            setModal(true);
          }}>+ Collect Payment</button>}
        </div>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="pay-summary-grid">
          <div className="pay-card" style={{ borderColor: '#1a4f8a' }}>
            <div className="pay-card-val" style={{ color: '#1a4f8a' }}>{fmtPeso(summary.dailyTotal)}</div>
            <div className="pay-card-lbl">📅 Today's Collection</div>
            <div className="pay-card-sub">{summary.dailyCount} transaction{summary.dailyCount !== 1 ? 's' : ''}</div>
          </div>
          <div className="pay-card" style={{ borderColor: '#059669' }}>
            <div className="pay-card-val" style={{ color: '#059669' }}>{fmtPeso(summary.monthlyTotal)}</div>
            <div className="pay-card-lbl">📆 This Month</div>
          </div>
          <div className="pay-card" style={{ borderColor: '#d97706' }}>
            <div className="pay-card-val" style={{ color: '#d97706' }}>{fmtPeso(summary.yearlyTotal)}</div>
            <div className="pay-card-lbl">📊 This Year</div>
          </div>
          <div className="pay-card pay-card-breakdown" style={{ borderColor: '#8b5cf6' }}>
            <div className="pay-card-lbl" style={{ marginBottom: 8 }}>📋 Today by Category</div>
            {summary.byCategory.length === 0
              ? <div style={{ color: '#9ca3af', fontSize: 12 }}>No collections today</div>
              : summary.byCategory.map(c => (
                <div key={c.category} className="pay-cat-row">
                  <span className="pay-cat-name">{c.category}</span>
                  <span className="pay-cat-count">{c.count}×</span>
                  <span className="pay-cat-total">{fmtPeso(c.total)}</span>
                </div>
              ))
            }
          </div>
        </div>
      )}

      {/* Filter pills */}
      <div className="sitio-filter-row" style={{ margin: '14px 0 12px' }}>
        <button className={`sitio-filter-btn ${catFilter === '' ? 'active' : ''}`} onClick={() => setCat('')}>All</button>
        {PAYMENT_CATEGORIES.map(c => (
          <button key={c} className={`sitio-filter-btn ${catFilter === c ? 'active' : ''}`}
            onClick={() => setCat(catFilter === c ? '' : c)}>{c}</button>
        ))}
      </div>

      {/* Payments table */}
      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table>
            <thead><tr>
              <th>OR Number</th><th>Payer</th><th>Description</th><th>Category</th>
              <th>Method</th><th>Amount</th><th>Collected By</th><th>Time</th><th>Status</th><th></th>
            </tr></thead>
            <tbody>
              {payments.map(p => (
                <tr key={p.id} style={{ opacity: p.status === 'Voided' ? 0.5 : 1 }}>
                  <td><code style={{ fontSize: 11 }}>{p.orNumber}</code></td>
                  <td style={{ fontWeight: 600 }}>{p.payerName}</td>
                  <td style={{ fontSize: 12 }}>{p.description}</td>
                  <td><span className="pay-cat-badge">{p.category}</span></td>
                  <td>{METHOD_ICONS[p.paymentMethod]} {p.paymentMethod}</td>
                  <td style={{ fontWeight: 700, color: p.status === 'Voided' ? '#9ca3af' : '#059669' }}>
                    {p.status === 'Voided' ? <s>{fmtPeso(p.amount)}</s> : fmtPeso(p.amount)}
                  </td>
                  <td style={{ fontSize: 12 }}>{p.collectedBy}</td>
                  <td style={{ fontSize: 11, color: '#9ca3af', whiteSpace: 'nowrap' }}>
                    {new Date(p.paidAt).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td>
                    {p.status === 'Voided'
                      ? <span className="badge badge-escalated">Voided</span>
                      : <span className="badge badge-settled">Paid</span>}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn-secondary" style={{ fontSize: 11, padding: '3px 8px' }}
                        onClick={() => printOR(p)}>🖨</button>
                      {p.status === 'Paid' && can('void_payments') && (
                        <button className="btn-danger" style={{ fontSize: 11, padding: '3px 8px' }}
                          onClick={() => { setVoidModal(p); setVoidReason(''); }}>Void</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr><td colSpan={10} className="empty-row">No payments for this date.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Collect Payment Modal */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal" style={{ maxWidth: 560 }}>
            <h2>Collect Payment</h2>
            {/* Queue number lookup */}
            <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#0369a1', display: 'block', marginBottom: 6 }}>
                🎫 Lookup by Queue Number
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  placeholder="e.g. Q-0319-001"
                  value={queueInput}
                  onChange={e => { setQueueInput(e.target.value); setQueueError(''); setQueueLookup(null); }}
                  onKeyDown={e => e.key === 'Enter' && lookupQueue()}
                  style={{ flex: 1, textTransform: 'uppercase', fontFamily: 'monospace', letterSpacing: 1 }}
                />
                <button className="btn-primary" style={{ padding: '6px 14px', whiteSpace: 'nowrap' }}
                  onClick={lookupQueue} disabled={queueLoading}>
                  {queueLoading ? '…' : '🔍 Fetch'}
                </button>
              </div>
              {queueError && <div style={{ color: '#dc2626', fontSize: 12, marginTop: 6 }}>⚠ {queueError}</div>}
              {queueLookup && (
                <div style={{ marginTop: 8, fontSize: 12, color: '#065f46', background: '#d1fae5', borderRadius: 6, padding: '6px 10px' }}>
                  ✅ <strong>{queueLookup.queueNumber}</strong> · {queueLookup.documentType} · {queueLookup.requesterName}
                  &nbsp;·&nbsp; Fee: <strong>{fmtPeso(FEE_SCHEDULE[queueLookup.documentType] ?? 0)}</strong>
                </div>
              )}
            </div>
            <div className="form-grid">
              <div className="form-group full">
                <label>Resident (optional — auto-fills payer name)</label>
                <ResidentPicker
                  residents={residents}
                  value={pickerResident}
                  onChange={r => {
                    setPickerResident(r);
                    if (r) {
                      f('residentId', r.id);
                      f('payerName', `${r.firstName} ${r.middleName ? r.middleName + ' ' : ''}${r.lastName}`);
                    } else {
                      f('residentId', undefined);
                    }
                  }}
                  compact
                />
              </div>
              <div className="form-group full">
                <label>Payer Name *</label>
                <input value={form.payerName} onChange={e => f('payerName', e.target.value)} placeholder="Full name" />
              </div>
              <div className="form-group">
                <label>Category</label>
                <select value={form.category} onChange={e => f('category', e.target.value)}>
                  {PAYMENT_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Description</label>
                <select value={form.description} onChange={e => onDescChange(e.target.value)}>
                  {DOC_TYPES.map(d => <option key={d}>{d}</option>)}
                  <option>Business Permit Renewal</option>
                  <option>Other</option>
                </select>
              </div>
              <div className="form-group">
                <label>Amount (₱)</label>
                <input type="number" min={0} step={0.01} value={form.amount}
                  onChange={e => f('amount', parseFloat(e.target.value) || 0)} />
              </div>
              <div className="form-group">
                <label>Payment Method</label>
                <select value={form.paymentMethod} onChange={e => f('paymentMethod', e.target.value)}>
                  {['Cash', 'GCash', 'Maya'].map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div className="form-group full">
                <label>Collected By</label>
                <select value={form.collectedBy} onChange={e => f('collectedBy', e.target.value)}>
                  {officials.map(o => <option key={o.id} value={o.name}>{o.name} — {o.position}</option>)}
                  {officials.length === 0 && <option>No active officials</option>}
                </select>
              </div>
            </div>
            <div className="pay-amount-preview">
              <span>Total to collect:</span>
              <span className="pay-amount-big">{fmtPeso(Number(form.amount))}</span>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={submit}>💰 Collect & Print OR</button>
            </div>
          </div>
        </div>
      )}

      {/* Void Modal */}
      {voidModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setVoidModal(null)}>
          <div className="modal" style={{ maxWidth: 420 }}>
            <h2>Void Receipt — {voidModal.orNumber}</h2>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
              This will mark <strong>{fmtPeso(voidModal.amount)}</strong> from <strong>{voidModal.payerName}</strong> as voided.
              This cannot be undone.
            </p>
            <div className="form-group">
              <label>Reason for Voiding *</label>
              <input value={voidReason} onChange={e => setVoidReason(e.target.value)}
                placeholder="e.g. Duplicate entry, Error in amount..." />
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setVoidModal(null)}>Cancel</button>
              <button className="btn-danger" onClick={doVoid} disabled={!voidReason.trim()}>Void Receipt</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Print helpers ─────────────────────────────────────────────────────────────

function printOR(p: Payment) {
  const date = new Date(p.paidAt).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
  const time = new Date(p.paidAt).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });
  const qrData = encodeURIComponent(`BRGY-DAMOLOG|${p.orNumber}|${p.payerName}|${fmtPeso(p.amount)}|${date}`);
  const qrUrl  = `https://chart.googleapis.com/chart?chs=90x90&cht=qr&chl=${qrData}&choe=UTF-8`;

  const html = `<!DOCTYPE html><html><head><title>OR ${p.orNumber}</title>
  <style>
    @page { size: 80mm 170mm; margin: 5mm; }
    body { font-family: 'Courier New', monospace; font-size: 10pt; color: #111; margin: 0; }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .divider { border-top: 1px dashed #999; margin: 5px 0; }
    .row { display: flex; justify-content: space-between; margin: 3px 0; font-size: 9pt; }
    .or-num { font-size: 13pt; font-weight: bold; letter-spacing: 1px; margin: 5px 0; }
    .amount { font-size: 18pt; font-weight: bold; text-align: center; margin: 8px 0; }
    .footer { font-size: 7.5pt; color: #666; text-align: center; margin-top: 8px; }
    .qr { text-align: center; margin-top: 6px; }
    .qr img { width: 80px; height: 80px; }
    .void-stamp { color: red; font-size: 14pt; font-weight: bold; border: 2px solid red; padding: 2px 10px; display: inline-block; }
  </style></head><body>
  <div class="center bold">BARANGAY DAMOLOG</div>
  <div class="center" style="font-size:8pt">Municipality of Sogod, Cebu</div>
  <div class="divider"></div>
  <div class="center bold" style="font-size:9pt">OFFICIAL RECEIPT</div>
  <div class="center or-num">${p.orNumber}</div>
  ${p.status === 'Voided' ? '<div class="center"><span class="void-stamp">VOIDED</span></div>' : ''}
  <div class="divider"></div>
  <div class="row"><span>Date:</span><span>${date}</span></div>
  <div class="row"><span>Time:</span><span>${time}</span></div>
  <div class="row"><span>Payer:</span><span style="max-width:55%;text-align:right">${p.payerName}</span></div>
  <div class="divider"></div>
  <div class="row"><span>Description:</span><span style="max-width:55%;text-align:right">${p.description}</span></div>
  <div class="row"><span>Category:</span><span>${p.category}</span></div>
  <div class="row"><span>Method:</span><span>${p.paymentMethod}</span></div>
  <div class="divider"></div>
  <div class="amount">${fmtPeso(p.amount)}</div>
  <div class="divider"></div>
  <div class="row"><span>Collected by:</span><span>${p.collectedBy}</span></div>
  ${p.status === 'Voided' ? `<div class="row"><span>Void reason:</span><span>${p.voidReason}</span></div>` : ''}
  <div class="qr"><img src="${qrUrl}" alt="QR" /><div style="font-size:7pt;color:#888">Scan to verify</div></div>
  <div class="footer">This is your official receipt.<br>Barangay Damolog, Sogod, Cebu<br>Printed: ${new Date().toLocaleString('en-PH')}</div>
  <script>window.onload = () => window.print();<\/script>
  </body></html>`;

  const win = window.open('', '_blank');
  if (win) { win.document.write(html); win.document.close(); }
}

function printDailyReport(summary: PaymentSummary | null, date: string) {
  if (!summary) return;
  const rows = (summary.recentPayments ?? []).map(p => `
    <tr style="${p.status === 'Voided' ? 'color:#999;text-decoration:line-through' : ''}">
      <td>${p.orNumber}</td><td>${p.payerName}</td><td>${p.description}</td>
      <td>${p.category}</td><td>${p.paymentMethod}</td>
      <td style="text-align:right;font-weight:600">${fmtPeso(p.amount)}</td>
      <td>${p.collectedBy}</td>
      <td>${new Date(p.paidAt).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}</td>
      <td>${p.status}</td>
    </tr>`).join('');

  const catRows = summary.byCategory.map(c => `
    <tr>
      <td>${c.category}</td>
      <td style="text-align:center">${c.count}</td>
      <td style="text-align:right;font-weight:600">${fmtPeso(c.total)}</td>
    </tr>`).join('');

  const html = `<!DOCTYPE html><html><head><title>Daily Collection Report — ${date}</title>
  <style>
    @page { size: A4 landscape; margin: 18mm; }
    body { font-family: Arial, sans-serif; font-size: 10pt; color: #111; }
    h1 { font-size: 14pt; margin-bottom: 2px; }
    h2 { font-size: 11pt; margin: 14px 0 6px; color: #1a4f8a; }
    .sub { font-size: 9pt; color: #666; margin-bottom: 14px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
    th { background: #1a4f8a; color: #fff; padding: 6px 8px; font-size: 9pt; text-align: left; }
    td { padding: 5px 8px; border-bottom: 1px solid #e5e7eb; font-size: 9pt; }
    .summary-box { display: flex; gap: 20px; margin-bottom: 14px; }
    .s-item { border: 1px solid #e5e7eb; border-radius: 6px; padding: 8px 16px; text-align: center; }
    .s-val { font-size: 15pt; font-weight: bold; color: #1a4f8a; }
    .s-lbl { font-size: 8pt; color: #666; }
    .footer { margin-top: 18px; font-size: 8pt; color: #999; border-top: 1px solid #e5e7eb; padding-top: 8px; display: flex; justify-content: space-between; }
  </style></head><body>
  <h1>Daily Collection Report</h1>
  <div class="sub">Barangay Damolog, Municipality of Sogod, Cebu &nbsp;·&nbsp; Date: <strong>${date}</strong></div>
  <div class="summary-box">
    <div class="s-item"><div class="s-val">${fmtPeso(summary.dailyTotal)}</div><div class="s-lbl">Total Collected</div></div>
    <div class="s-item"><div class="s-val">${summary.dailyCount}</div><div class="s-lbl">Transactions</div></div>
    <div class="s-item"><div class="s-val">${fmtPeso(summary.monthlyTotal)}</div><div class="s-lbl">Month-to-Date</div></div>
    <div class="s-item"><div class="s-val">${fmtPeso(summary.yearlyTotal)}</div><div class="s-lbl">Year-to-Date</div></div>
  </div>
  <h2>Collection by Category</h2>
  <table style="width:360px">
    <thead><tr><th>Category</th><th>Count</th><th>Total</th></tr></thead>
    <tbody>${catRows || '<tr><td colspan="3" style="text-align:center;color:#999">No data</td></tr>'}</tbody>
    <tfoot><tr style="background:#f8fafc;font-weight:bold">
      <td>TOTAL</td><td style="text-align:center">${summary.dailyCount}</td>
      <td style="text-align:right">${fmtPeso(summary.dailyTotal)}</td>
    </tr></tfoot>
  </table>
  <h2>Transaction Details</h2>
  <table>
    <thead><tr><th>OR No.</th><th>Payer</th><th>Description</th><th>Category</th><th>Method</th><th>Amount</th><th>Collected By</th><th>Time</th><th>Status</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="9" style="text-align:center;color:#999">No transactions</td></tr>'}</tbody>
  </table>
  <div class="footer">
    <span>Prepared by: _____________________________ &nbsp;&nbsp; Signature: _____________________________</span>
    <span>Printed: ${new Date().toLocaleString('en-PH')}</span>
  </div>
  <script>window.onload = () => window.print();<\/script>
  </body></html>`;

  const win = window.open('', '_blank');
  if (win) { win.document.write(html); win.document.close(); }
}
