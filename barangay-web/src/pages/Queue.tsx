import { useEffect, useRef, useState } from 'react';
import { get, patch, post } from '../api';
import type { QueueRequest, Resident } from '../types';
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
  const [queue, setQueue]       = useState<QueueRequest[]>([]);
  const [stats, setStats]       = useState<QueueStats | null>(null);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [modal, setModal]       = useState(false);
  const [form, setForm]         = useState({ ...emptyForm });
  const [pickerResident, setPickerResident] = useState<Resident | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [notesModal, setNotesModal] = useState<QueueRequest | null>(null);
  const [noteText, setNoteText] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = () => {
    const qs = statusFilter ? `?status=${statusFilter}` : '';
    get<QueueRequest[]>(`/api/queue/today${qs}`).then(setQueue).catch(console.error);
    get<QueueStats>('/api/queue/stats').then(setStats).catch(console.error);
  };

  useEffect(() => {
    load();
    get<Resident[]>('/api/residents').then(setResidents).catch(console.error);
    // Auto-refresh every 15s for live queue updates
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
    await patch(`/api/queue/${q.id}/status`, { status: next });
    load();
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

      {/* Stats bar */}
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

      {/* Filter pills */}
      <div className="sitio-filter-row" style={{ margin: '14px 0 16px' }}>
        <button className={`sitio-filter-btn ${statusFilter === '' ? 'active' : ''}`} onClick={() => setStatusFilter('')}>All</button>
        {STATUS_ORDER.slice(0, 3).map(s => (
          <button key={s} className={`sitio-filter-btn ${statusFilter === s ? 'active' : ''}`}
            onClick={() => setStatusFilter(statusFilter === s ? '' : s)}>
            {STATUS_STYLE[s].label}
          </button>
        ))}
      </div>

      {/* Kanban columns */}
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
                  <div key={q.id} className="queue-card">
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
              {/* Request type */}
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

              {/* Resident picker */}
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
