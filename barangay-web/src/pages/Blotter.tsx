import { useEffect, useState } from 'react';
import { get, post, put, del } from '../api';
import type { Blotter as BlotterType, Resident } from '../types';
import { INCIDENT_TYPES, BLOTTER_STATUSES } from '../types';
import { useAuth } from '../auth';
import ResidentPicker from '../components/ResidentPicker';
import '../components/ResidentPicker.css';
import './Blotter.css';

interface BlotterStats {
  total: number; pending: number; underMediation: number;
  settled: number; escalated: number; thisMonth: number;
  upcomingHearings: { caseNumber: string; complainant: string; respondent: string; incident: string; hearingDate: string; status: string }[];
}

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  'Pending':         { bg: '#fef3c7', color: '#92400e' },
  'Under Mediation': { bg: '#dbeafe', color: '#1e40af' },
  'Settled':         { bg: '#d1fae5', color: '#065f46' },
  'Escalated':       { bg: '#fee2e2', color: '#991b1b' },
  'Dismissed':       { bg: '#f3f4f6', color: '#6b7280' },
};

const TYPE_ICON: Record<string, string> = {
  'Dispute': '⚖️', 'Noise Complaint': '🔊', 'Physical Violence': '🤜',
  'Theft/Robbery': '🔓', 'Trespassing': '🚧', 'Threat/Intimidation': '😠',
  'Domestic Violence': '🏠', 'Other': '📋',
};

const emptyForm = {
  complainant: '', complainantAddress: '', complainantContact: '',
  respondent: '', respondentAddress: '', respondentContact: '',
  incidentType: 'Dispute', incident: '', details: '', location: '',
  incidentDate: '', luponChairperson: '',
  hearingDate: '', hearingNotes: '', nextHearingDate: '', resolution: '',
  status: 'Pending',
};

export default function Blotter() {
  const { can } = useAuth();
  const [blotters, setBlotters] = useState<BlotterType[]>([]);
  const [stats, setStats]       = useState<BlotterStats | null>(null);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [search, setSearch]     = useState('');
  const [statusFilter, setStatus] = useState('');
  const [typeFilter, setType]   = useState('');
  const [modal, setModal]       = useState(false);
  const [detailModal, setDetail] = useState<BlotterType | null>(null);
  const [form, setForm]         = useState({ ...emptyForm });
  const [editing, setEditing]   = useState<BlotterType | null>(null);
  const [complainantPicker, setComplainantPicker] = useState<Resident | null>(null);
  const [respondentPicker, setRespondentPicker]   = useState<Resident | null>(null);

  const load = () => {
    const qs = new URLSearchParams();
    if (search)       qs.set('search', search);
    if (statusFilter) qs.set('status', statusFilter);
    if (typeFilter)   qs.set('type', typeFilter);
    get<BlotterType[]>(`/api/blotters?${qs}`).then(setBlotters).catch(console.error);
    get<BlotterStats>('/api/blotters/stats').then(setStats).catch(console.error);
  };

  useEffect(() => {
    load();
    get<Resident[]>('/api/residents').then(setResidents).catch(console.error);
  }, [search, statusFilter, typeFilter]);

  const openAdd = () => {
    setEditing(null);
    setComplainantPicker(null);
    setRespondentPicker(null);
    setForm({ ...emptyForm });
    setModal(true);
  };
  const openEdit = (b: BlotterType) => {
    setEditing(b);
    setComplainantPicker(null);
    setRespondentPicker(null);
    setForm({
      complainant: b.complainant, complainantAddress: b.complainantAddress || '', complainantContact: b.complainantContact || '',
      respondent: b.respondent, respondentAddress: b.respondentAddress || '', respondentContact: b.respondentContact || '',
      incidentType: b.incidentType || 'Dispute', incident: b.incident, details: b.details,
      location: b.location || '', incidentDate: b.incidentDate?.slice(0, 10) || '',
      luponChairperson: b.luponChairperson || '',
      hearingDate: b.hearingDate?.slice(0, 10) || '',
      hearingNotes: b.hearingNotes || '', nextHearingDate: b.nextHearingDate?.slice(0, 10) || '',
      resolution: b.resolution || '', status: b.status,
    });
    setModal(true);
  };

  const save = async () => {
    const payload = { ...form, id: editing?.id ?? 0, caseNumber: editing?.caseNumber ?? '' };
    if (editing) await put(`/api/blotters/${editing.id}`, payload);
    else await post('/api/blotters', payload);
    setModal(false); load();
  };

  const remove = async (b: BlotterType) => {
    if (!confirm(`Delete case ${b.caseNumber}?`)) return;
    await del(`/api/blotters/${b.id}`); load();
  };

  const f = (k: keyof typeof form, v: string) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Blotter & Incident Records</h1>
          <p className="page-sub">Lupon Tagapamayapa · Barangay Damolog</p>
        </div>
        {can('edit_blotter') && <button className="btn-danger" onClick={openAdd}>+ File Blotter</button>}      </div>

      {stats && (
        <div className="blotter-stats">
          {([
            { label: 'Total Cases',   val: stats.total,          color: '#1a4f8a' },
            { label: '⏳ Pending',     val: stats.pending,        color: '#d97706' },
            { label: '⚖️ Mediation',   val: stats.underMediation, color: '#2563eb' },
            { label: '✅ Settled',      val: stats.settled,        color: '#059669' },
            { label: '🚨 Escalated',   val: stats.escalated,      color: '#dc2626' },
            { label: '📅 This Month',  val: stats.thisMonth,      color: '#8b5cf6' },
          ] as const).map(s => (
            <div key={s.label} className="blotter-stat-card" style={{ borderColor: s.color }}>
              <span className="blotter-stat-val" style={{ color: s.color }}>{s.val}</span>
              <span className="blotter-stat-lbl">{s.label}</span>
            </div>
          ))}
        </div>
      )}

      {stats?.upcomingHearings && stats.upcomingHearings.length > 0 && (
        <div className="hearing-strip">
          <span className="hearing-strip-label">📅 UPCOMING HEARINGS</span>
          {stats.upcomingHearings.map((h, i) => (
            <div key={i} className="hearing-chip">
              <span className="hearing-chip-case">{h.caseNumber}</span>
              <span className="hearing-chip-date">
                {new Date(h.hearingDate).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
              </span>
              <span className="hearing-chip-parties">{h.complainant} vs {h.respondent}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, margin: '14px 0 8px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input placeholder="Search case, parties, incident..." value={search}
          onChange={e => setSearch(e.target.value)} style={{ maxWidth: 280 }} />
        <div className="sitio-filter-row" style={{ flex: 1 }}>
          <button className={`sitio-filter-btn ${statusFilter === '' ? 'active' : ''}`} onClick={() => setStatus('')}>All</button>
          {BLOTTER_STATUSES.map(s => (
            <button key={s} className={`sitio-filter-btn ${statusFilter === s ? 'active' : ''}`}
              onClick={() => setStatus(statusFilter === s ? '' : s)}
              style={statusFilter === s ? { background: STATUS_STYLE[s].color, borderColor: STATUS_STYLE[s].color } : {}}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="sitio-filter-row" style={{ marginBottom: 14 }}>
        <button className={`sitio-filter-btn ${typeFilter === '' ? 'active' : ''}`} onClick={() => setType('')}>All Types</button>
        {INCIDENT_TYPES.map(t => (
          <button key={t} className={`sitio-filter-btn ${typeFilter === t ? 'active' : ''}`}
            onClick={() => setType(typeFilter === t ? '' : t)}>
            {TYPE_ICON[t]} {t}
          </button>
        ))}
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table>
            <thead><tr>
              <th>Case No.</th><th>Type</th><th>Complainant</th><th>Respondent</th>
              <th>Incident</th><th>Filed</th><th>Hearing</th><th>Status</th><th></th>
            </tr></thead>
            <tbody>
              {blotters.map(b => {
                const st = STATUS_STYLE[b.status] ?? STATUS_STYLE['Pending'];
                return (
                  <tr key={b.id}>
                    <td><code style={{ fontSize: 11 }}>{b.caseNumber}</code></td>
                    <td><span className="blotter-type-badge">{TYPE_ICON[b.incidentType] ?? '📋'} {b.incidentType || '—'}</span></td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{b.complainant}</div>
                      {b.complainantContact && <div style={{ fontSize: 11, color: '#9ca3af' }}>{b.complainantContact}</div>}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{b.respondent}</div>
                      {b.respondentContact && <div style={{ fontSize: 11, color: '#9ca3af' }}>{b.respondentContact}</div>}
                    </td>
                    <td style={{ maxWidth: 180 }}>
                      <div style={{ fontSize: 13 }}>{b.incident}</div>
                      {b.location && <div style={{ fontSize: 11, color: '#9ca3af' }}>📍 {b.location}</div>}
                    </td>
                    <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{b.filedDate?.slice(0, 10)}</td>
                    <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                      {b.hearingDate
                        ? <span style={{ color: '#1e40af', fontWeight: 600 }}>📅 {new Date(b.hearingDate).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        : <span style={{ color: '#9ca3af' }}>—</span>}
                    </td>
                    <td><span className="badge" style={{ background: st.bg, color: st.color }}>{b.status}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn-secondary" style={{ fontSize: 11, padding: '3px 8px' }} onClick={() => setDetail(b)}>View</button>
                        {can('edit_blotter')   && <button className="btn-secondary" style={{ fontSize: 11, padding: '3px 8px' }} onClick={() => openEdit(b)}>Edit</button>}
                        {can('delete_blotter') && <button className="btn-danger"    style={{ fontSize: 11, padding: '3px 8px' }} onClick={() => remove(b)}>✕</button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {blotters.length === 0 && <tr><td colSpan={9} className="empty-row">No blotter records found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail view modal */}
      {detailModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setDetail(null)}>
          <div className="modal blotter-detail-modal">
            <div className="blotter-detail-header">
              <div>
                <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 2 }}>CASE NUMBER</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#1a4f8a' }}>{detailModal.caseNumber}</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                  {TYPE_ICON[detailModal.incidentType] ?? '📋'} {detailModal.incidentType} · Filed {detailModal.filedDate?.slice(0, 10)}
                </div>
              </div>
              <span className="badge" style={{ fontSize: 13, padding: '5px 14px', ...(STATUS_STYLE[detailModal.status] ?? {}) }}>
                {detailModal.status}
              </span>
            </div>

            <div className="blotter-detail-grid">
              <div className="blotter-party-box">
                <div className="blotter-party-label">COMPLAINANT</div>
                <div className="blotter-party-name">{detailModal.complainant}</div>
                {detailModal.complainantAddress && <div className="blotter-party-sub">📍 {detailModal.complainantAddress}</div>}
                {detailModal.complainantContact && <div className="blotter-party-sub">📞 {detailModal.complainantContact}</div>}
              </div>
              <div className="blotter-vs">VS</div>
              <div className="blotter-party-box blotter-party-respondent">
                <div className="blotter-party-label">RESPONDENT</div>
                <div className="blotter-party-name">{detailModal.respondent}</div>
                {detailModal.respondentAddress && <div className="blotter-party-sub">📍 {detailModal.respondentAddress}</div>}
                {detailModal.respondentContact && <div className="blotter-party-sub">📞 {detailModal.respondentContact}</div>}
              </div>
            </div>

            <div className="blotter-detail-section">
              {detailModal.incident && <div className="blotter-detail-row blotter-detail-full"><span className="blotter-detail-key">Incident</span><span style={{ fontWeight: 600 }}>{detailModal.incident}</span></div>}
              {detailModal.location && <div className="blotter-detail-row"><span className="blotter-detail-key">Location</span><span>📍 {detailModal.location}</span></div>}
              <div className="blotter-detail-row"><span className="blotter-detail-key">Incident Date</span><span>{detailModal.incidentDate?.slice(0, 10)}</span></div>
              {detailModal.details && <div className="blotter-detail-row blotter-detail-full"><span className="blotter-detail-key">Details</span><span style={{ whiteSpace: 'pre-wrap' }}>{detailModal.details}</span></div>}
            </div>

            <div className="blotter-detail-section">
              <div style={{ fontSize: 11, fontWeight: 700, color: '#1a4f8a', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>⚖️ Lupon / Hearing</div>
              {detailModal.luponChairperson && <div className="blotter-detail-row"><span className="blotter-detail-key">Lupon Chairperson</span><span>{detailModal.luponChairperson}</span></div>}
              {detailModal.hearingDate && <div className="blotter-detail-row"><span className="blotter-detail-key">Hearing Date</span><span style={{ color: '#1e40af', fontWeight: 600 }}>📅 {new Date(detailModal.hearingDate).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}</span></div>}
              {detailModal.nextHearingDate && <div className="blotter-detail-row"><span className="blotter-detail-key">Next Hearing</span><span style={{ color: '#d97706', fontWeight: 600 }}>📅 {new Date(detailModal.nextHearingDate).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}</span></div>}
              {detailModal.hearingNotes && <div className="blotter-detail-row blotter-detail-full"><span className="blotter-detail-key">Hearing Notes</span><span style={{ whiteSpace: 'pre-wrap' }}>{detailModal.hearingNotes}</span></div>}
              {detailModal.resolution && <div className="blotter-detail-row blotter-detail-full"><span className="blotter-detail-key">Resolution</span><span style={{ whiteSpace: 'pre-wrap', color: '#065f46', fontWeight: 500 }}>{detailModal.resolution}</span></div>}
              {detailModal.resolvedDate && <div className="blotter-detail-row"><span className="blotter-detail-key">Resolved Date</span><span style={{ color: '#059669' }}>{detailModal.resolvedDate?.slice(0, 10)}</span></div>}
            </div>

            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setDetail(null)}>Close</button>
              <button className="btn-secondary" onClick={() => printBlotter(detailModal)}>🖨 Print</button>
              <button className="btn-primary" onClick={() => { setDetail(null); openEdit(detailModal); }}>Edit Case</button>
            </div>
          </div>
        </div>
      )}

      {/* File / Edit modal */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal blotter-form-modal">
            <h2>{editing ? `Update — ${editing.caseNumber}` : 'File New Blotter'}</h2>

            <div className="blotter-form-section-label">Incident Information</div>
            <div className="form-grid">
              <div className="form-group">
                <label>Incident Type</label>
                <select value={form.incidentType} onChange={e => f('incidentType', e.target.value)}>
                  {INCIDENT_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Incident Date</label>
                <input type="date" value={form.incidentDate} onChange={e => f('incidentDate', e.target.value)} />
              </div>
              <div className="form-group full">
                <label>Incident / Subject *</label>
                <input placeholder="Brief description of the incident" value={form.incident} onChange={e => f('incident', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Location</label>
                <input placeholder="Where it happened" value={form.location} onChange={e => f('location', e.target.value)} />
              </div>
              <div className="form-group full">
                <label>Details / Narrative</label>
                <textarea rows={3} value={form.details} onChange={e => f('details', e.target.value)} style={{ resize: 'vertical' }} placeholder="Full account of the incident..." />
              </div>
            </div>

            <div className="blotter-form-section-label" style={{ marginTop: 16 }}>Parties Involved</div>
            <div className="form-grid">
              <div className="form-group">
                <label>Complainant — search resident or type manually</label>
                <ResidentPicker
                  residents={residents}
                  value={complainantPicker}
                  onChange={r => {
                    setComplainantPicker(r);
                    if (r) {
                      f('complainant', `${r.firstName} ${r.middleName ? r.middleName + ' ' : ''}${r.lastName}`);
                      f('complainantAddress', r.address || '');
                      f('complainantContact', r.contactNumber || '');
                    }
                  }}
                  compact
                />
                {!complainantPicker && <input style={{ marginTop: 6 }} placeholder="Or type name manually…" value={form.complainant} onChange={e => f('complainant', e.target.value)} />}
              </div>
              <div className="form-group">
                <label>Respondent — search resident or type manually</label>
                <ResidentPicker
                  residents={residents}
                  value={respondentPicker}
                  onChange={r => {
                    setRespondentPicker(r);
                    if (r) {
                      f('respondent', `${r.firstName} ${r.middleName ? r.middleName + ' ' : ''}${r.lastName}`);
                      f('respondentAddress', r.address || '');
                      f('respondentContact', r.contactNumber || '');
                    }
                  }}
                  compact
                />
                {!respondentPicker && <input style={{ marginTop: 6 }} placeholder="Or type name manually…" value={form.respondent} onChange={e => f('respondent', e.target.value)} />}
              </div>
              <div className="form-group"><label>Complainant Address</label><input value={form.complainantAddress} onChange={e => f('complainantAddress', e.target.value)} /></div>
              <div className="form-group"><label>Respondent Address</label><input value={form.respondentAddress} onChange={e => f('respondentAddress', e.target.value)} /></div>
              <div className="form-group"><label>Complainant Contact</label><input value={form.complainantContact} onChange={e => f('complainantContact', e.target.value)} /></div>
              <div className="form-group"><label>Respondent Contact</label><input value={form.respondentContact} onChange={e => f('respondentContact', e.target.value)} /></div>
            </div>

            <div className="blotter-form-section-label" style={{ marginTop: 16 }}>⚖️ Lupon / Hearing</div>
            <div className="form-grid">
              <div className="form-group"><label>Lupon Chairperson</label><input value={form.luponChairperson} onChange={e => f('luponChairperson', e.target.value)} /></div>
              <div className="form-group"><label>Status</label>
                <select value={form.status} onChange={e => f('status', e.target.value)}>
                  {BLOTTER_STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group"><label>Hearing Date</label><input type="date" value={form.hearingDate} onChange={e => f('hearingDate', e.target.value)} /></div>
              <div className="form-group"><label>Next Hearing Date</label><input type="date" value={form.nextHearingDate} onChange={e => f('nextHearingDate', e.target.value)} /></div>
              <div className="form-group full"><label>Hearing Notes</label><textarea rows={2} value={form.hearingNotes} onChange={e => f('hearingNotes', e.target.value)} style={{ resize: 'vertical' }} /></div>
              <div className="form-group full"><label>Resolution</label><textarea rows={2} value={form.resolution} onChange={e => f('resolution', e.target.value)} style={{ resize: 'vertical' }} placeholder="Settlement agreement or resolution details..." /></div>
            </div>

            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={save}>Save Case</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Print blotter ─────────────────────────────────────────────────────────────
function printBlotter(b: BlotterType) {
  const html = `<!DOCTYPE html><html><head><title>Blotter ${b.caseNumber}</title>
  <style>
    @page { size: A4; margin: 25mm 20mm; }
    body { font-family: 'Times New Roman', serif; font-size: 11pt; color: #111; }
    .header { text-align: center; border-bottom: 3px double #1e3a8a; padding-bottom: 10px; margin-bottom: 16px; }
    .header-inner { display: flex; align-items: center; justify-content: center; gap: 16px; }
    .logo { width: 70px; height: 70px; object-fit: contain; }
    .brgy { font-size: 16pt; font-weight: bold; }
    .sub  { font-size: 9pt; color: #555; }
    .doc-title { font-size: 14pt; font-weight: bold; color: #1e3a8a; text-align: center; margin: 12px 0 4px; letter-spacing: 2px; text-decoration: underline; }
    .case-no { text-align: center; font-size: 11pt; color: #555; margin-bottom: 16px; }
    .section { margin-bottom: 14px; }
    .section-title { font-size: 10pt; font-weight: bold; color: #1e3a8a; border-bottom: 1px solid #e5e7eb; padding-bottom: 3px; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px; }
    .parties { display: grid; grid-template-columns: 1fr auto 1fr; gap: 10px; align-items: center; margin-bottom: 14px; }
    .party-box { border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px 14px; }
    .party-label { font-size: 8pt; font-weight: bold; color: #888; text-transform: uppercase; margin-bottom: 4px; }
    .party-name { font-size: 13pt; font-weight: bold; }
    .party-sub { font-size: 9pt; color: #666; margin-top: 2px; }
    .vs { font-size: 16pt; font-weight: bold; color: #dc2626; text-align: center; }
    .field-row { display: flex; gap: 8px; margin-bottom: 6px; font-size: 10pt; }
    .field-key { font-weight: bold; min-width: 140px; color: #374151; }
    .narrative { border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px 14px; font-size: 10pt; line-height: 1.7; min-height: 60px; margin-top: 4px; }
    .status-badge { display: inline-block; padding: 3px 14px; border-radius: 999px; font-size: 10pt; font-weight: bold; border: 1px solid currentColor; }
    .sig-row { display: flex; justify-content: space-between; margin-top: 40px; }
    .sig-block { text-align: center; min-width: 180px; }
    .sig-line { border-bottom: 1px solid #111; margin-bottom: 4px; height: 30px; }
    .sig-name { font-size: 10pt; font-weight: bold; }
    .sig-title { font-size: 9pt; color: #666; }
    .footer { border-top: 1px solid #ccc; margin-top: 20px; padding-top: 6px; display: flex; justify-content: space-between; font-size: 8pt; color: #888; }
  </style></head><body>
  <div class="header">
    <div class="header-inner">
      <img src="/logo.png" class="logo" onerror="this.style.display='none'" />
      <div>
        <div class="sub">Republic of the Philippines · Province of Cebu · Municipality of Sogod</div>
        <div class="brgy">BARANGAY DAMOLOG</div>
        <div class="sub">Barangay Hall, Damolog, Sogod, Cebu</div>
      </div>
      <img src="/sogod-logo.png" class="logo" onerror="this.style.display='none'" />
    </div>
  </div>
  <div class="doc-title">BARANGAY BLOTTER RECORD</div>
  <div class="case-no">Case No.: <strong>${b.caseNumber}</strong> &nbsp;·&nbsp; Filed: <strong>${b.filedDate?.slice(0,10)}</strong> &nbsp;·&nbsp; Status: <span class="status-badge">${b.status}</span></div>

  <div class="parties">
    <div class="party-box">
      <div class="party-label">Complainant</div>
      <div class="party-name">${b.complainant}</div>
      ${b.complainantAddress ? `<div class="party-sub">📍 ${b.complainantAddress}</div>` : ''}
      ${b.complainantContact ? `<div class="party-sub">📞 ${b.complainantContact}</div>` : ''}
    </div>
    <div class="vs">VS</div>
    <div class="party-box">
      <div class="party-label">Respondent</div>
      <div class="party-name">${b.respondent}</div>
      ${b.respondentAddress ? `<div class="party-sub">📍 ${b.respondentAddress}</div>` : ''}
      ${b.respondentContact ? `<div class="party-sub">📞 ${b.respondentContact}</div>` : ''}
    </div>
  </div>

  <div class="section">
    <div class="section-title">Incident Details</div>
    <div class="field-row"><span class="field-key">Incident Type:</span><span>${b.incidentType || '—'}</span></div>
    <div class="field-row"><span class="field-key">Incident:</span><span>${b.incident}</span></div>
    <div class="field-row"><span class="field-key">Location:</span><span>${b.location || '—'}</span></div>
    <div class="field-row"><span class="field-key">Date of Incident:</span><span>${b.incidentDate?.slice(0,10) || '—'}</span></div>
    <div style="margin-top:8px;font-size:10pt;font-weight:bold;color:#374151">Narrative:</div>
    <div class="narrative">${b.details || '(No details provided)'}</div>
  </div>

  <div class="section">
    <div class="section-title">⚖️ Lupon / Hearing Information</div>
    ${b.luponChairperson ? `<div class="field-row"><span class="field-key">Lupon Chairperson:</span><span>${b.luponChairperson}</span></div>` : ''}
    ${b.hearingDate ? `<div class="field-row"><span class="field-key">Hearing Date:</span><span>${new Date(b.hearingDate).toLocaleDateString('en-PH', { year:'numeric', month:'long', day:'numeric' })}</span></div>` : ''}
    ${b.nextHearingDate ? `<div class="field-row"><span class="field-key">Next Hearing:</span><span>${new Date(b.nextHearingDate).toLocaleDateString('en-PH', { year:'numeric', month:'long', day:'numeric' })}</span></div>` : ''}
    ${b.hearingNotes ? `<div class="field-row" style="flex-direction:column"><span class="field-key">Hearing Notes:</span><div class="narrative" style="margin-top:4px">${b.hearingNotes}</div></div>` : ''}
    ${b.resolution ? `<div class="field-row" style="flex-direction:column;margin-top:8px"><span class="field-key">Resolution:</span><div class="narrative" style="margin-top:4px;border-color:#059669">${b.resolution}</div></div>` : ''}
  </div>

  <div class="sig-row">
    <div class="sig-block"><div class="sig-line"></div><div class="sig-name">${b.complainant}</div><div class="sig-title">Complainant</div></div>
    <div class="sig-block"><div class="sig-line"></div><div class="sig-name">${b.respondent}</div><div class="sig-title">Respondent</div></div>
    <div class="sig-block"><div class="sig-line"></div><div class="sig-name">${b.luponChairperson || 'Punong Barangay'}</div><div class="sig-title">Lupon Chairperson</div></div>
  </div>

  <div class="footer">
    <span>Barangay Damolog, Municipality of Sogod, Cebu — Official Blotter Record</span>
    <span>Printed: ${new Date().toLocaleString('en-PH')}</span>
  </div>
  <script>window.onload = () => window.print();<\/script>
  </body></html>`;
  const win = window.open('', '_blank');
  if (win) { win.document.write(html); win.document.close(); }
}
