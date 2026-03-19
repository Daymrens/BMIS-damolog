import { useEffect, useRef, useState } from 'react';
import { get, patch, post } from '../api';
import type { QueueRequest, Resident, Official, Document } from '../types';
import { FEE_SCHEDULE } from '../types';
import ResidentPicker from '../components/ResidentPicker';
import '../components/ResidentPicker.css';
import './Queue.css';

const DOC_TYPES = [
  'Barangay Clearance',
  'Certificate of Residency',
  'Certificate of Indigency',
  'Barangay Business Clearance',
  'Barangay Blotter Certification',
];

const STATUS_ORDER = ['Pending', 'Processing', 'Released', 'Cancelled'] as const;

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  Pending:    { bg: '#fef3c7', color: '#92400e', label: '⏳ Pending'    },
  Processing: { bg: '#dbeafe', color: '#1e40af', label: '⚙️ Processing' },
  Released:   { bg: '#d1fae5', color: '#065f46', label: '✅ Released'   },
  Cancelled:  { bg: '#fee2e2', color: '#991b1b', label: '✕ Cancelled'  },
};

interface QueueStats { todayTotal: number; todayPending: number; todayProcessing: number; todayReleased: number; }

const emptyForm = {
  requesterName: '', residentId: undefined as number | undefined,
  documentType: 'Barangay Clearance', purpose: '', contactNumber: '', requestType: 'Walk-in' as const,
};

export default function Queue() {
  const [queue, setQueue]         = useState<QueueRequest[]>([]);
  const [stats, setStats]         = useState<QueueStats | null>(null);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [modal, setModal]         = useState(false);
  const [form, setForm]           = useState({ ...emptyForm });
  const [pickerResident, setPickerResident] = useState<Resident | null>(null);
  const [statusFilter, setStatusFilter]     = useState('');
  const [notesModal, setNotesModal]         = useState<QueueRequest | null>(null);
  const [noteText, setNoteText]             = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Release flow: issue doc → print → collect payment
  const [officials, setOfficials]           = useState<Official[]>([]);
  const [releaseModal, setReleaseModal]     = useState<QueueRequest | null>(null);
  const [releaseIssuedBy, setReleaseIssuedBy] = useState('');
  const [releasePurpose, setReleasePurpose] = useState('');
  const [releaseStep, setReleaseStep]       = useState<'doc' | 'payment'>('doc');
  const [releaseDoc, setReleaseDoc]         = useState<Document | null>(null);
  const [payMethod, setPayMethod]           = useState<'Cash' | 'GCash' | 'Maya'>('Cash');
  const [payCollectedBy, setPayCollectedBy] = useState('');

  // Released card detail: check payment status
  const [detailModal, setDetailModal]       = useState<QueueRequest | null>(null);
  const [detailPayment, setDetailPayment]   = useState<{ orNumber: string; amount: number; paymentMethod: string; collectedBy: string; paidAt: string; status: string } | null | 'loading'>('loading');

  const load = () => {
    const qs = statusFilter ? `?status=${statusFilter}` : '';
    get<QueueRequest[]>(`/api/queue/today${qs}`).then(setQueue).catch(console.error);
    get<QueueStats>('/api/queue/stats').then(setStats).catch(console.error);
  };

  useEffect(() => {
    load();
    get<Resident[]>('/api/residents').then(setResidents).catch(console.error);
    get<Official[]>('/api/officials').then(o => setOfficials(o.filter(x => x.isActive))).catch(console.error);
    pollRef.current = setInterval(load, 15000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  useEffect(() => { load(); }, [statusFilter]);

  const f = (k: keyof typeof form, v: string | number | undefined) =>
    setForm(p => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!form.requesterName.trim()) { alert('Enter requester name.'); return; }
    if (!form.purpose.trim())       { alert('Enter purpose.'); return; }
    await post('/api/queue', form);
    setModal(false);
    setForm({ ...emptyForm });
    load();
  };

  const advance = async (q: QueueRequest) => {
    const next = q.status === 'Pending' ? 'Processing' : q.status === 'Processing' ? 'Released' : null;
    if (!next) return;
    if (next === 'Released') {
      setReleaseIssuedBy(officials[0]?.name ?? '');
      setPayCollectedBy(officials[0]?.name ?? '');
      setPayMethod('Cash');

      if (q.issuedDocumentId && q.issuedDocument) {
        // Doc already issued — payment modal was closed accidentally, skip to payment step
        setReleasePurpose(q.issuedDocument.purpose || q.purpose || '');
        setReleaseDoc(q.issuedDocument);
        setReleaseStep('payment');
      } else {
        setReleasePurpose(q.purpose || '');
        setReleaseDoc(null);
        setReleaseStep('doc');
      }
      setReleaseModal(q);
      return;
    }
    await patch(`/api/queue/${q.id}/status`, { status: next });
    load();
  };

  const doIssueAndPrint = async () => {
    if (!releaseModal) return;
    if (!releasePurpose.trim()) { alert('Enter purpose.'); return; }
    try {
      const issued = await post<Document>('/api/documents', {
        residentId: releaseModal.residentId,
        documentType: releaseModal.documentType,
        purpose: releasePurpose,
        issuedBy: releaseIssuedBy,
      });
      // Save doc ID to queue — but keep status as Processing until payment collected
      await patch(`/api/queue/${releaseModal.id}/document`, { documentId: issued.id });
      load();
      setReleaseDoc(issued);
      // Print — use linked resident if available, otherwise build a minimal resident object from queue data
      const residentForPrint = releaseModal.resident ?? {
        id: 0, firstName: releaseModal.requesterName, middleName: '', lastName: '',
        address: '', sitio: '', birthDate: '', contactNumber: '',
        isVoter: false, isSenior: false, isPWD: false, is4Ps: false,
      };
      printCertificate(
        { residentId: releaseModal.residentId ?? 0, documentType: releaseModal.documentType,
          purpose: releasePurpose, issuedBy: releaseIssuedBy,
          controlNumber: issued.controlNumber, issuedAt: issued.issuedAt },
        residentForPrint
      );
      const fee = FEE_SCHEDULE[releaseModal.documentType];
      if (fee === 0) {
        // Free doc — mark Released immediately, no payment needed
        await patch(`/api/queue/${releaseModal.id}/status`, { status: 'Released' });
        load();
        setReleaseModal(null);
        return;
      }
      setReleaseStep('payment');
    } catch { alert('Failed to issue document.'); }
  };

  const doCollectPayment = async () => {
    if (!releaseModal) return;
    const fee = FEE_SCHEDULE[releaseModal.documentType] ?? 50;
    const created = await post<{ orNumber: string; paidAt: string; amount: number; payerName: string; description: string; category: string; paymentMethod: string; collectedBy: string; status: string; id: number }>('/api/payments', {
      payerName: releaseModal.requesterName,
      residentId: releaseModal.residentId,
      documentId: releaseDoc?.id,
      category: 'Clearance Fee',
      description: releaseModal.documentType,
      amount: fee,
      paymentMethod: payMethod,
      collectedBy: payCollectedBy,
    });
    // Only mark Released after payment is collected
    await patch(`/api/queue/${releaseModal.id}/status`, { status: 'Released' });
    load();
    setReleaseModal(null);
    printOR(created);
  };

  const openDetail = async (q: QueueRequest) => {
    setDetailModal(q);
    setDetailPayment('loading');
    try {
      const qs = new URLSearchParams({ description: q.documentType });
      if (q.residentId) qs.set('residentId', String(q.residentId));
      const results = await get<Array<{ orNumber: string; amount: number; paymentMethod: string; collectedBy: string; paidAt: string; status: string }>>(`/api/payments?${qs}`);
      // Find the most recent non-voided payment matching this request (same day)
      const releaseDay = q.releasedAt ? new Date(q.releasedAt).toDateString() : new Date(q.requestedAt).toDateString();
      const match = results.find(p => p.status === 'Paid' && new Date(p.paidAt).toDateString() === releaseDay)
        ?? results.find(p => p.status === 'Paid')
        ?? null;
      setDetailPayment(match);
    } catch {
      setDetailPayment(null);
    }
  };

  const cancel = async (q: QueueRequest) => {
    if (!confirm(`Cancel queue ${q.queueNumber}?`)) return;
    await patch(`/api/queue/${q.id}/status`, { status: 'Cancelled' });
    load();
  };

  const saveNotes = async () => {
    if (!notesModal) return;
    await patch(`/api/queue/${notesModal.id}/status`, { status: notesModal.status, notes: noteText });
    setNotesModal(null);
    load();
  };

  const columns: Array<{ status: string; items: QueueRequest[] }> = [
    { status: 'Pending',    items: queue.filter(q => q.status === 'Pending')    },
    { status: 'Processing', items: queue.filter(q => q.status === 'Processing') },
    { status: 'Released',   items: queue.filter(q => q.status === 'Released')   },
  ];

  return (
    <div className="queue-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Queue Management</h1>
          <p className="page-sub">Today's document requests · auto-refreshes every 15s</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-secondary" onClick={load}>⟳ Refresh</button>
          <button className="btn-primary" onClick={() => { setPickerResident(null); setForm({ ...emptyForm }); setModal(true); }}>
            + New Request
          </button>
        </div>
      </div>

      {stats && (
        <div className="queue-stats">
          <div className="q-stat" style={{ borderColor: '#6b7280' }}>
            <span className="q-stat-val">{stats.todayTotal}</span>
            <span className="q-stat-lbl">📋 Total Today</span>
          </div>
          <div className="q-stat" style={{ borderColor: '#d97706' }}>
            <span className="q-stat-val" style={{ color: '#d97706' }}>{stats.todayPending}</span>
            <span className="q-stat-lbl">⏳ Pending</span>
          </div>
          <div className="q-stat" style={{ borderColor: '#2563eb' }}>
            <span className="q-stat-val" style={{ color: '#2563eb' }}>{stats.todayProcessing}</span>
            <span className="q-stat-lbl">⚙️ Processing</span>
          </div>
          <div className="q-stat" style={{ borderColor: '#059669' }}>
            <span className="q-stat-val" style={{ color: '#059669' }}>{stats.todayReleased}</span>
            <span className="q-stat-lbl">✅ Released</span>
          </div>
        </div>
      )}

      <div className="sitio-filter-row" style={{ margin: '14px 0 16px' }}>
        <button className={`sitio-filter-btn ${statusFilter === '' ? 'active' : ''}`} onClick={() => setStatusFilter('')}>All</button>
        {STATUS_ORDER.slice(0, 3).map(s => (
          <button key={s} className={`sitio-filter-btn ${statusFilter === s ? 'active' : ''}`}
            onClick={() => setStatusFilter(statusFilter === s ? '' : s)}>
            {STATUS_STYLE[s].label}
          </button>
        ))}
      </div>

      <div className="queue-kanban">
        {columns.map(col => {
          const st = STATUS_STYLE[col.status];
          return (
            <div key={col.status} className="queue-col">
              <div className="queue-col-header" style={{ background: st.bg, color: st.color }}>
                <span>{st.label}</span>
                <span className="queue-col-count">{col.items.length}</span>
              </div>
              <div className="queue-col-body">
                {col.items.map(q => (
                  <div key={q.id} className="queue-card"
                    onClick={q.status === 'Released' ? () => openDetail(q) : undefined}
                    style={q.status === 'Released' ? { cursor: 'pointer', borderLeft: '3px solid #059669' } : undefined}>
                    <div className="queue-card-top">
                      <span className="queue-number">{q.queueNumber}</span>
                      <span className="queue-type-badge" style={{ background: q.requestType === 'Online' ? '#ede9fe' : '#f0fdf4', color: q.requestType === 'Online' ? '#5b21b6' : '#166534' }}>
                        {q.requestType === 'Online' ? '🌐' : '🚶'} {q.requestType}
                      </span>
                    </div>
                    <div className="queue-name">{q.requesterName}</div>
                    <div className="queue-doctype">{q.documentType}</div>
                    <div className="queue-purpose">{q.purpose}</div>
                    {q.contactNumber && <div className="queue-contact">📞 {q.contactNumber}</div>}
                    {q.notes && <div className="queue-notes">📝 {q.notes}</div>}
                    <div className="queue-time">{new Date(q.requestedAt).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}</div>
                    <div className="queue-card-actions">
                      {q.status === 'Pending' && (
                        <button className="btn-primary" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => advance(q)}>
                          ▶ Process
                        </button>
                      )}
                      {q.status === 'Processing' && (
                        <button className="btn-success" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => advance(q)}>
                          ✓ Release
                        </button>
                      )}
                      <button className="btn-secondary" style={{ fontSize: 11, padding: '4px 8px' }}
                        onClick={() => { setNotesModal(q); setNoteText(q.notes || ''); }}>
                        📝
                      </button>
                      {q.status !== 'Released' && q.status !== 'Cancelled' && (
                        <button className="btn-danger" style={{ fontSize: 11, padding: '4px 8px' }} onClick={() => cancel(q)}>✕</button>
                      )}
                    </div>
                  </div>
                ))}
                {col.items.length === 0 && (
                  <div className="queue-empty">No {col.status.toLowerCase()} requests</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* New Request Modal */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal" style={{ maxWidth: 560 }}>
            <h2>New Document Request</h2>
            <div className="form-grid">
              <div className="form-group">
                <label>Request Type</label>
                <select value={form.requestType} onChange={e => f('requestType', e.target.value)}>
                  <option>Walk-in</option>
                  <option>Online</option>
                </select>
              </div>
              <div className="form-group">
                <label>Document Type</label>
                <select value={form.documentType} onChange={e => f('documentType', e.target.value)}>
                  {DOC_TYPES.map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div className="form-group full">
                <label>Resident (optional — auto-fills name & contact)</label>
                <ResidentPicker
                  residents={residents}
                  value={pickerResident}
                  onChange={r => {
                    setPickerResident(r);
                    if (r) {
                      f('residentId', r.id);
                      f('requesterName', `${r.firstName} ${r.middleName ? r.middleName + ' ' : ''}${r.lastName}`);
                      f('contactNumber', r.contactNumber || '');
                    } else {
                      f('residentId', undefined);
                    }
                  }}
                  compact
                />
              </div>
              <div className="form-group full">
                <label>Requester Name *</label>
                <input placeholder="Full name" value={form.requesterName}
                  onChange={e => f('requesterName', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Contact Number</label>
                <input placeholder="09xx-xxx-xxxx" value={form.contactNumber}
                  onChange={e => f('contactNumber', e.target.value)} />
              </div>
              <div className="form-group full">
                <label>Purpose *</label>
                <input placeholder="e.g. Employment, School Enrollment..." value={form.purpose}
                  onChange={e => f('purpose', e.target.value)} />
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={submit}>🎫 Add to Queue</button>
            </div>
          </div>
        </div>
      )}

      {/* Released Card Detail Modal */}
      {detailModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setDetailModal(null)}>
          <div className="modal" style={{ maxWidth: 460 }}>
            <h2>🧾 {detailModal.queueNumber} — Details</h2>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>
              <div style={{ fontWeight: 700 }}>{detailModal.documentType}</div>
              <div style={{ color: '#6b7280' }}>{detailModal.requesterName}</div>
              {detailModal.purpose && <div style={{ color: '#6b7280', fontSize: 12, marginTop: 2 }}>Purpose: {detailModal.purpose}</div>}
            </div>

            {detailPayment === 'loading' && (
              <div style={{ textAlign: 'center', padding: '20px 0', color: '#6b7280' }}>Checking payment status…</div>
            )}

            {detailPayment !== 'loading' && detailPayment !== null && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '12px 14px', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 18 }}>✅</span>
                  <span style={{ fontWeight: 700, color: '#065f46' }}>Payment Collected</span>
                </div>
                <div style={{ fontSize: 13, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px', color: '#374151' }}>
                  <span style={{ color: '#6b7280' }}>OR Number</span><span><code style={{ fontSize: 11 }}>{detailPayment.orNumber}</code></span>
                  <span style={{ color: '#6b7280' }}>Amount</span><span style={{ fontWeight: 700, color: '#059669' }}>₱{Number(detailPayment.amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                  <span style={{ color: '#6b7280' }}>Method</span><span>{detailPayment.paymentMethod}</span>
                  <span style={{ color: '#6b7280' }}>Collected By</span><span>{detailPayment.collectedBy}</span>
                  <span style={{ color: '#6b7280' }}>Date</span><span>{new Date(detailPayment.paidAt).toLocaleString('en-PH')}</span>
                </div>
                <button className="btn-secondary" style={{ marginTop: 12, fontSize: 12, padding: '4px 12px' }}
                  onClick={() => printOR(detailPayment)}>
                  🖨 Reprint OR
                </button>
              </div>
            )}

            {detailPayment !== 'loading' && detailPayment === null && (
              <>
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 14px', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 18 }}>⚠️</span>
                    <span style={{ fontWeight: 700, color: '#991b1b' }}>No Payment Found</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>
                    {(FEE_SCHEDULE[detailModal.documentType] ?? 0) === 0
                      ? 'This document is free of charge — no payment required.'
                      : 'Payment has not been collected yet for this request.'}
                  </div>
                </div>
                {(FEE_SCHEDULE[detailModal.documentType] ?? 0) > 0 && (
                  <div className="form-grid">
                    <div className="form-group full">
                      <label>Payment Method</label>
                      <select value={payMethod} onChange={e => setPayMethod(e.target.value as 'Cash' | 'GCash' | 'Maya')}>
                        {['Cash', 'GCash', 'Maya'].map(m => <option key={m}>{m}</option>)}
                      </select>
                    </div>
                    <div className="form-group full">
                      <label>Collected By</label>
                      <select value={payCollectedBy} onChange={e => setPayCollectedBy(e.target.value)}>
                        {officials.map(o => <option key={o.id} value={o.name}>{o.name} — {o.position}</option>)}
                      </select>
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setDetailModal(null)}>Close</button>
              {detailPayment !== 'loading' && detailPayment === null && (FEE_SCHEDULE[detailModal.documentType] ?? 0) > 0 && (
                <button className="btn-primary" onClick={async () => {
                  const fee = FEE_SCHEDULE[detailModal.documentType];
                  const created = await post<{ orNumber: string; paidAt: string; amount: number; payerName: string; description: string; paymentMethod: string; collectedBy: string; status: string; id: number }>('/api/payments', {
                    payerName: detailModal.requesterName,
                    residentId: detailModal.residentId,
                    category: 'Clearance Fee',
                    description: detailModal.documentType,
                    amount: fee,
                    paymentMethod: payMethod,
                    collectedBy: payCollectedBy,
                  });
                  setDetailModal(null);
                  printOR(created);
                }}>
                  💰 Collect ₱{FEE_SCHEDULE[detailModal.documentType]} & Print OR
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Release Flow Modal */}
      {releaseModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setReleaseModal(null)}>
          <div className="modal" style={{ maxWidth: 520 }}>
            {releaseStep === 'doc' ? (
              <>
                <h2>📄 Release — {releaseModal.queueNumber}</h2>
                <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>
                  <div style={{ fontWeight: 700 }}>{releaseModal.documentType}</div>
                  <div style={{ color: '#6b7280' }}>{releaseModal.requesterName}</div>
                </div>
                <div className="form-grid">
                  <div className="form-group full">
                    <label>Purpose <span style={{ color: '#dc2626' }}>*</span></label>
                    <input autoFocus value={releasePurpose} onChange={e => setReleasePurpose(e.target.value)}
                      placeholder="e.g. Employment, School Enrollment..." />
                  </div>
                  <div className="form-group full">
                    <label>Issued By</label>
                    <select value={releaseIssuedBy} onChange={e => setReleaseIssuedBy(e.target.value)}>
                      {officials.map(o => <option key={o.id} value={o.name}>{o.name} — {o.position}</option>)}
                      {officials.length === 0 && <option>No active officials</option>}
                    </select>
                  </div>
                </div>
                <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#92400e', marginTop: 8 }}>
                  Issues the document, marks queue Released, and prompts to print.
                  {(FEE_SCHEDULE[releaseModal.documentType] ?? 0) > 0
                    ? ` Then collect ₱${FEE_SCHEDULE[releaseModal.documentType]}.`
                    : ' This document is free of charge.'}
                </div>
                <div className="modal-actions">
                  <button className="btn-secondary" onClick={() => setReleaseModal(null)}>Cancel</button>
                  <button className="btn-primary" onClick={doIssueAndPrint}>📄 Issue & Print</button>
                </div>
              </>
            ) : (
              <>
                <h2>💰 Collect Payment — {releaseModal.queueNumber}</h2>
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>
                  <div style={{ fontWeight: 700 }}>{releaseModal.documentType}</div>
                  <div style={{ color: '#6b7280' }}>{releaseModal.requesterName}</div>
                  <div style={{ color: '#059669', fontWeight: 700, fontSize: 18, marginTop: 6 }}>
                    ₱{(FEE_SCHEDULE[releaseModal.documentType] ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                {releaseModal.issuedDocumentId && (
                  <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#92400e', marginBottom: 12 }}>
                    📄 Document already issued — payment modal was closed before collecting.
                    <button className="btn-secondary" style={{ marginLeft: 10, fontSize: 11, padding: '2px 10px' }}
                      onClick={() => {
                        if (releaseDoc) {
                          const residentForPrint = releaseModal.resident ?? {
                            id: 0, firstName: releaseModal.requesterName, middleName: '', lastName: '',
                            address: '', sitio: '', birthDate: '', contactNumber: '',
                            isVoter: false, isSenior: false, isPWD: false, is4Ps: false,
                          };
                          printCertificate(
                            { residentId: releaseModal.residentId ?? 0, documentType: releaseModal.documentType,
                              purpose: releasePurpose, issuedBy: releaseIssuedBy,
                              controlNumber: releaseDoc.controlNumber, issuedAt: releaseDoc.issuedAt },
                            residentForPrint
                          );
                        }
                      }}>
                      🖨 Reprint PDF
                    </button>
                  </div>
                )}
                <div className="form-grid">
                  <div className="form-group full">
                    <label>Payment Method</label>
                    <select value={payMethod} onChange={e => setPayMethod(e.target.value as 'Cash' | 'GCash' | 'Maya')}>
                      {['Cash', 'GCash', 'Maya'].map(m => <option key={m}>{m}</option>)}
                    </select>
                  </div>
                  <div className="form-group full">
                    <label>Collected By</label>
                    <select value={payCollectedBy} onChange={e => setPayCollectedBy(e.target.value)}>
                      {officials.map(o => <option key={o.id} value={o.name}>{o.name} — {o.position}</option>)}
                    </select>
                  </div>
                </div>
                <div className="modal-actions">
                  <button className="btn-secondary" onClick={() => setReleaseModal(null)}>Close</button>
                  <button className="btn-primary" onClick={doCollectPayment}>💰 Collect & Print OR</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Notes Modal */}
      {notesModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setNotesModal(null)}>
          <div className="modal" style={{ maxWidth: 420 }}>
            <h2>Notes — {notesModal.queueNumber}</h2>
            <div className="form-group">
              <label>Notes / Remarks</label>
              <textarea rows={4} value={noteText} onChange={e => setNoteText(e.target.value)}
                placeholder="Add notes or remarks for this request..." style={{ resize: 'vertical' }} />
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setNotesModal(null)}>Cancel</button>
              <button className="btn-primary" onClick={saveNotes}>Save Notes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Print helpers ─────────────────────────────────────────────────────────────

interface PrintForm {
  residentId: number; documentType: string; purpose: string; issuedBy: string;
  controlNumber: string; issuedAt: string;
}

function printCertificate(form: PrintForm, resident: Resident) {
  const date = new Date(form.issuedAt || Date.now()).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
  const fullName = `${resident.firstName} ${resident.middleName ? resident.middleName + ' ' : ''}${resident.lastName}`.trim().toUpperCase();
  const age = resident.birthDate ? Math.floor((Date.now() - new Date(resident.birthDate).getTime()) / (1000*60*60*24*365.25)) : null;
  const body = getBodyText(form.documentType, fullName, resident.address, resident.sitio, age);
  const qrData = encodeURIComponent(`BRGY-DAMOLOG|${form.controlNumber}|${form.documentType}|${fullName}|${date}`);
  const qrUrl = `https://chart.googleapis.com/chart?chs=100x100&cht=qr&chl=${qrData}&choe=UTF-8`;
  const html = `<!DOCTYPE html><html><head><title>${form.documentType}</title>
  <style>
    @page{size:A4;margin:28mm 20mm 20mm 20mm}*{box-sizing:border-box}
    body{font-family:'Times New Roman',serif;font-size:12pt;color:#111;margin:0}
    .header{text-align:center;border-bottom:3px double #1e3a8a;padding-bottom:12px;margin-bottom:18px}
    .header-inner{display:flex;align-items:center;justify-content:center;gap:20px}
    .header-logo{width:80px;height:80px;object-fit:contain}
    .barangay{font-size:17pt;font-weight:bold;letter-spacing:1px;margin:4px 0 2px}
    .republic,.province,.address{font-size:9pt;color:#555}
    .doc-title{font-size:16pt;font-weight:bold;color:#1e3a8a;text-align:center;margin:14px 0 4px;letter-spacing:2px;text-decoration:underline}
    .meta-row{display:flex;justify-content:space-between;font-size:9pt;color:#555;margin-bottom:20px;border-bottom:1px solid #e5e7eb;padding-bottom:6px}
    .body-text{line-height:2;margin-bottom:14px;text-align:justify}
    .sig-section{display:flex;justify-content:flex-end;margin-top:50px}
    .sig-block{text-align:center;min-width:240px}
    .sig-name{font-weight:bold;font-size:13pt;border-bottom:2px solid #111;padding-bottom:2px;display:block}
    .sig-title{font-size:10pt;font-style:italic;margin-top:4px}
    .bottom-row{display:flex;justify-content:space-between;margin-top:40px;font-size:9pt;color:#888;border-top:1px solid #e5e7eb;padding-top:8px}
    .qr-block{text-align:right}.qr-block img{width:90px;height:90px}
  </style></head><body>
  <div class="header"><div class="header-inner">
    <img class="header-logo" src="/sogod-logo.png" alt="Logo"/>
    <div><div class="republic">Republic of the Philippines &middot; Province of Cebu</div>
    <div class="barangay">BARANGAY DAMOLOG</div>
    <div class="address">Municipality of Sogod, Cebu</div></div>
  </div></div>
  <div class="doc-title">${form.documentType.toUpperCase()}</div>
  <div class="meta-row"><span>Control No.: <strong>${form.controlNumber}</strong></span><span>Date: <strong>${date}</strong></span></div>
  <div class="body-text">TO WHOM IT MAY CONCERN:</div>
  <div class="body-text">${body}</div>
  <div class="body-text">This certification is issued upon the request of the above-named person for the purpose of <strong>${form.purpose}</strong> and for whatever legal purpose it may serve.</div>
  <div class="sig-section"><div class="sig-block">
    <span class="sig-name">${form.issuedBy}</span>
    <div class="sig-title">Barangay Captain / Authorized Official</div>
  </div></div>
  <div class="bottom-row"><span>Not valid without official dry seal.</span>
    <div class="qr-block"><img src="${qrUrl}" alt="QR"/><div style="font-size:7pt;color:#888">Scan to verify</div></div>
  </div>
  <script>window.onload=()=>window.print();<\/script></body></html>`;
  const win = window.open('', '_blank');
  if (win) { win.document.write(html); win.document.close(); }
}

function getBodyText(docType: string, fullName: string, address: string, sitio: string | undefined, age: number | null): string {
  const loc = sitio ? `${address}, Sitio ${sitio}` : address;
  switch (docType) {
    case 'Barangay Clearance':
      return `This is to certify that <strong>${fullName}</strong>${age ? `, ${age} years old,` : ''} is a bonafide resident of ${loc}, and is known to be of good moral character and has no derogatory record in this barangay.`;
    case 'Certificate of Residency':
      return `This is to certify that <strong>${fullName}</strong>${age ? `, ${age} years old,` : ''} is a bonafide resident of ${loc}, Barangay Damolog, Municipality of Sogod, Province of Cebu.`;
    case 'Certificate of Indigency':
      return `This is to certify that <strong>${fullName}</strong>${age ? `, ${age} years old,` : ''} residing at ${loc}, belongs to an indigent family and is one of the underprivileged constituents of this barangay.`;
    case 'Barangay Business Clearance':
      return `This is to certify that <strong>${fullName}</strong>, residing at ${loc}, has applied for a Barangay Business Clearance and has no pending case or derogatory record in this barangay.`;
    default:
      return `This is to certify that <strong>${fullName}</strong>${age ? `, ${age} years old,` : ''} is a bonafide resident of ${loc}.`;
  }
}

function printOR(p: { orNumber: string; paidAt: string; amount: number; payerName: string; description: string; paymentMethod: string; collectedBy: string }) {
  const date = new Date(p.paidAt).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
  const time = new Date(p.paidAt).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });
  const fmtPeso = (n: number) => `\u20b1${n.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
  const qrData = encodeURIComponent(`BRGY-DAMOLOG|${p.orNumber}|${p.payerName}|${fmtPeso(p.amount)}|${date}`);
  const qrUrl = `https://chart.googleapis.com/chart?chs=90x90&cht=qr&chl=${qrData}&choe=UTF-8`;
  const html = `<!DOCTYPE html><html><head><title>OR ${p.orNumber}</title>
  <style>
    @page{size:80mm 170mm;margin:5mm}
    body{font-family:'Courier New',monospace;font-size:10pt;color:#111;margin:0}
    .center{text-align:center}.bold{font-weight:bold}
    .divider{border-top:1px dashed #999;margin:5px 0}
    .row{display:flex;justify-content:space-between;margin:3px 0;font-size:9pt}
    .or-num{font-size:13pt;font-weight:bold;letter-spacing:1px;margin:5px 0}
    .amount{font-size:18pt;font-weight:bold;text-align:center;margin:8px 0}
    .footer{font-size:7.5pt;color:#666;text-align:center;margin-top:8px}
    .qr{text-align:center;margin-top:6px}.qr img{width:80px;height:80px}
  </style></head><body>
  <div class="center bold">BARANGAY DAMOLOG</div>
  <div class="center" style="font-size:8pt">Municipality of Sogod, Cebu</div>
  <div class="divider"></div>
  <div class="center bold" style="font-size:9pt">OFFICIAL RECEIPT</div>
  <div class="center or-num">${p.orNumber}</div>
  <div class="divider"></div>
  <div class="row"><span>Date:</span><span>${date}</span></div>
  <div class="row"><span>Time:</span><span>${time}</span></div>
  <div class="row"><span>Payer:</span><span style="max-width:55%;text-align:right">${p.payerName}</span></div>
  <div class="divider"></div>
  <div class="row"><span>Description:</span><span style="max-width:55%;text-align:right">${p.description}</span></div>
  <div class="row"><span>Method:</span><span>${p.paymentMethod}</span></div>
  <div class="divider"></div>
  <div class="amount">${fmtPeso(p.amount)}</div>
  <div class="divider"></div>
  <div class="row"><span>Collected by:</span><span>${p.collectedBy}</span></div>
  <div class="qr"><img src="${qrUrl}" alt="QR"/><div style="font-size:7pt;color:#888">Scan to verify</div></div>
  <div class="footer">This is your official receipt.<br>Barangay Damolog, Sogod, Cebu<br>Printed: ${new Date().toLocaleString('en-PH')}</div>
  <script>window.onload=()=>window.print();<\/script></body></html>`;
  const win = window.open('', '_blank');
  if (win) { win.document.write(html); win.document.close(); }
}
