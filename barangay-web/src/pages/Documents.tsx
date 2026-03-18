import { useEffect, useState } from 'react';
import { get, post, del } from '../api';
import type { Document, DocumentVersion, Resident, Official, Blotter } from '../types';
import ResidentPicker from '../components/ResidentPicker';
import '../components/ResidentPicker.css';
import './Documents.css';

const DOC_TYPES = [
  { key: 'Barangay Clearance',             icon: '🔵', desc: 'Good moral character for jobs, IDs, or loans' },
  { key: 'Certificate of Residency',       icon: '🟢', desc: 'Proves residency for school enrollment' },
  { key: 'Certificate of Indigency',       icon: '🟡', desc: 'Financial/medical assistance from DSWD' },
  { key: 'Barangay Business Clearance',    icon: '🟠', desc: 'Required for city/municipal business permit' },
  { key: 'Barangay Blotter Certification', icon: '🔴', desc: 'Documents police incidents in the community' },
];

const STATUS_BADGE: Record<string, string> = {
  Pending: 'badge-pending', Settled: 'badge-settled', Escalated: 'badge-escalated',
};

const ACTION_STYLE: Record<string, { bg: string; color: string }> = {
  Issued:   { bg: '#d1fae5', color: '#065f46' },
  Reissued: { bg: '#dbeafe', color: '#1e40af' },
  Edited:   { bg: '#fef3c7', color: '#92400e' },
};

interface IssueForm {
  residentId: number; documentType: string; purpose: string; issuedBy: string;
  caseNumber?: string; complainant?: string; respondent?: string;
  incident?: string; details?: string; incidentDate?: string;
}

type MainTab = 'issue' | 'history';

export default function Documents() {
  const [mainTab, setMainTab] = useState<MainTab>('issue');
  const [docs, setDocs] = useState<Document[]>([]);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [officials, setOfficials] = useState<Official[]>([]);
  const [blotters, setBlotters] = useState<Blotter[]>([]);
  const [search, setSearch] = useState('');

  const [modal, setModal] = useState(false);
  const [selectedResident, setSelectedResident] = useState<Resident | null>(null);
  const [selectedDocType, setSelectedDocType] = useState('');
  const [form, setForm] = useState<IssueForm>({ residentId: 0, documentType: '', purpose: '', issuedBy: '' });
  const [pickerResident, setPickerResident] = useState<Resident | null>(null);

  const [blotterModal, setBlotterModal] = useState(false);
  const [pendingDocType, setPendingDocType] = useState('');
  const [pendingResident, setPendingResident] = useState<Resident | null>(null);

  const [historyDoc, setHistoryDoc] = useState<Document | null>(null);
  const [docHistory, setDocHistory] = useState<DocumentVersion[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [reissueDoc, setReissueDoc] = useState<Document | null>(null);
  const [reissueForm, setReissueForm] = useState({ purpose: '', issuedBy: '', changeNote: '', changedBy: '' });

  const [versionLog, setVersionLog] = useState<DocumentVersion[]>([]);
  const [vlogFilter, setVlogFilter] = useState({ docType: '', action: '', year: String(new Date().getFullYear()) });
  const [vlogLoading, setVlogLoading] = useState(false);

  const loadDocs = () => get<Document[]>('/api/documents').then(setDocs).catch(console.error);

  const loadVersionLog = () => {
    setVlogLoading(true);
    const p = new URLSearchParams();
    if (vlogFilter.docType) p.set('docType', vlogFilter.docType);
    if (vlogFilter.action)  p.set('action',  vlogFilter.action);
    if (vlogFilter.year)    p.set('year',     vlogFilter.year);
    get<DocumentVersion[]>(`/api/documents/history?${p}`)
      .then(setVersionLog).catch(console.error).finally(() => setVlogLoading(false));
  };

  useEffect(() => {
    loadDocs();
    get<Resident[]>('/api/residents').then(setResidents).catch(console.error);
    get<Official[]>('/api/officials').then(o => setOfficials(o.filter(x => x.isActive))).catch(console.error);
    get<Blotter[]>('/api/blotters').then(setBlotters).catch(console.error);
  }, []);

  useEffect(() => { if (mainTab === 'history') loadVersionLog(); }, [mainTab]);

  const openIssue = (resident: Resident, docType: string) => {
    if (docType === 'Barangay Blotter Certification') {
      setPendingResident(resident); setPendingDocType(docType); setBlotterModal(true); return;
    }
    setSelectedResident(resident); setSelectedDocType(docType);
    setForm({ residentId: resident.id, documentType: docType, purpose: '', issuedBy: officials[0]?.name ?? '' });
    setModal(true);
  };

  const selectBlotter = (b: Blotter) => {
    setBlotterModal(false);
    if (!pendingResident) return;
    setSelectedResident(pendingResident); setSelectedDocType(pendingDocType);
    setForm({
      residentId: pendingResident.id, documentType: pendingDocType,
      purpose: '', issuedBy: officials[0]?.name ?? '',
      caseNumber: b.caseNumber, complainant: b.complainant, respondent: b.respondent,
      incident: b.incident, details: b.details, incidentDate: b.incidentDate?.slice(0, 10),
    });
    setModal(true);
  };

  const issueAndPrint = async () => {
    if (!form.purpose.trim()) { alert('Please enter the purpose.'); return; }
    try {
      const issued = await post<Document>('/api/documents', {
        residentId: form.residentId, documentType: form.documentType,
        purpose: form.purpose, issuedBy: form.issuedBy,
      });
      setModal(false); loadDocs();
      if (issued && selectedResident)
        printCertificate({ ...form, controlNumber: issued.controlNumber, issuedAt: issued.issuedAt }, selectedResident);
    } catch { alert('Failed to issue document. Make sure the API is running.'); }
  };

  const openHistory = async (doc: Document) => {
    setHistoryDoc(doc); setHistoryLoading(true);
    try { setDocHistory(await get<DocumentVersion[]>(`/api/documents/${doc.id}/history`)); }
    catch { setDocHistory([]); }
    setHistoryLoading(false);
  };

  const openReissue = (doc: Document) => {
    setReissueDoc(doc);
    setReissueForm({ purpose: doc.purpose, issuedBy: doc.issuedBy, changeNote: '', changedBy: officials[0]?.name ?? '' });
  };

  const submitReissue = async () => {
    if (!reissueDoc) return;
    if (!reissueForm.changeNote.trim()) { alert('Please enter a reason for reissue.'); return; }
    try {
      const res = await fetch(`http://localhost:5000/api/documents/${reissueDoc.id}/reissue`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reissueForm),
      });
      const data = await res.json();
      const r = reissueDoc.resident;
      setReissueDoc(null); loadDocs();
      if (r) printCertificate({
        residentId: r.id, documentType: reissueDoc.documentType,
        purpose: reissueForm.purpose || reissueDoc.purpose,
        issuedBy: reissueForm.issuedBy || reissueDoc.issuedBy,
        controlNumber: data.newControlNumber, issuedAt: new Date().toISOString(),
      }, r);
    } catch { alert('Failed to reissue document.'); }
  };

  const f = (k: keyof IssueForm, v: string) => setForm(p => ({ ...p, [k]: v }));
  const filtered = residents.filter(r =>
    `${r.lastName} ${r.firstName}`.toLowerCase().includes(search.toLowerCase()) ||
    r.address.toLowerCase().includes(search.toLowerCase())
  );
  const YEARS = Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - i));

  return (
    <div className="docs-page">
      <div className="docs-main-tabs">
        <button className={`docs-main-tab ${mainTab === 'issue' ? 'active' : ''}`} onClick={() => setMainTab('issue')}>📄 Issue Documents</button>
        <button className={`docs-main-tab ${mainTab === 'history' ? 'active' : ''}`} onClick={() => setMainTab('history')}>🕓 Version History</button>
      </div>

      {/* ── ISSUE TAB ── */}
      {mainTab === 'issue' && (
        <div className="docs-layout">
          <div className="docs-left">
            <div className="docs-left-header">
              <div className="page-title" style={{ fontSize: 16 }}>👥 Select Resident</div>
              <p className="docs-hint">Search a resident → choose certificate type</p>
              <ResidentPicker
                residents={residents}
                value={pickerResident}
                onChange={r => { setPickerResident(r); setSearch(''); }}
                placeholder="Search by name or ID…"
              />
              {!pickerResident && (
                <input className="docs-search" placeholder="Or browse list below…" value={search} onChange={e => setSearch(e.target.value)} style={{ marginTop: 8 }} />
              )}
            </div>
            <div className="resident-list">
              {(pickerResident ? [pickerResident] : filtered).map(r => (
                <div key={r.id} className={`resident-card ${pickerResident?.id === r.id ? 'resident-card-selected' : ''}`}>
                  <div className="resident-info">
                    <div className="resident-name">{r.lastName}, {r.firstName} {r.middleName}</div>
                    <div className="resident-addr">{r.address}</div>
                  </div>
                  <div className="doc-type-btns">
                    {DOC_TYPES.map(dt => (
                      <button key={dt.key} className="doc-type-btn" title={dt.desc} onClick={() => openIssue(r, dt.key)}>
                        {dt.icon} {dt.key.replace('Certificate of ', 'Cert. of ').replace('Barangay ', 'Bgy. ')}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {!pickerResident && filtered.length === 0 && <div className="empty-row" style={{ padding: 24 }}>No residents found.</div>}
            </div>
          </div>
          <div className="docs-right">
            <div className="page-header" style={{ marginBottom: 12 }}>
              <div className="page-title" style={{ fontSize: 16 }}>📋 Issued Documents</div>
              <button className="btn-secondary" style={{ padding: '6px 12px' }} onClick={loadDocs}>⟳ Refresh</button>
            </div>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="table-wrap">
                <table>
                  <thead><tr>
                    <th>Control No.</th><th>Resident</th><th>Type</th><th>Purpose</th><th>Issued By</th><th>Date</th><th>Actions</th>
                  </tr></thead>
                  <tbody>
                    {docs.map(d => (
                      <tr key={d.id}>
                        <td><code style={{ fontSize: 11 }}>{d.controlNumber}</code></td>
                        <td>{d.resident ? `${d.resident.lastName}, ${d.resident.firstName}` : `ID:${d.residentId}`}</td>
                        <td><span className="doc-type-tag">{DOC_TYPES.find(t => t.key === d.documentType)?.icon ?? '📄'} {d.documentType}</span></td>
                        <td>{d.purpose}</td>
                        <td>{d.issuedBy}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>{d.issuedAt?.slice(0, 10)}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            <button className="btn-secondary doc-action-btn" title="Reprint" onClick={() => { if (d.resident) printCertificate({ residentId: d.residentId, documentType: d.documentType, purpose: d.purpose, issuedBy: d.issuedBy, controlNumber: d.controlNumber, issuedAt: d.issuedAt }, d.resident); }}>🖨</button>
                            <button className="btn-secondary doc-action-btn" title="Reissue with new control number" onClick={() => openReissue(d)}>♻️</button>
                            <button className="btn-secondary doc-action-btn" title="View version history" onClick={() => openHistory(d)}>🕓</button>
                            <button className="btn-danger doc-action-btn" title="Delete" onClick={async () => { if (!confirm('Delete this document record?')) return; await del(`/api/documents/${d.id}`); loadDocs(); }}>✕</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {docs.length === 0 && <tr><td colSpan={7} className="empty-row">No documents issued yet.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── VERSION HISTORY TAB ── */}
      {mainTab === 'history' && (
        <div className="vlog-section">
          <div className="toolbar" style={{ marginBottom: 14 }}>
            <select value={vlogFilter.docType} onChange={e => setVlogFilter(p => ({ ...p, docType: e.target.value }))}>
              <option value="">All Document Types</option>
              {DOC_TYPES.map(d => <option key={d.key} value={d.key}>{d.key}</option>)}
            </select>
            <select value={vlogFilter.action} onChange={e => setVlogFilter(p => ({ ...p, action: e.target.value }))}>
              <option value="">All Actions</option>
              <option>Issued</option><option>Reissued</option><option>Edited</option>
            </select>
            <select value={vlogFilter.year} onChange={e => setVlogFilter(p => ({ ...p, year: e.target.value }))}>
              {YEARS.map(y => <option key={y}>{y}</option>)}
            </select>
            <button className="btn-primary" onClick={loadVersionLog}>🔍 Filter</button>
            <span style={{ fontSize: 12, color: '#64748b', alignSelf: 'center' }}>{versionLog.length} entries</span>
          </div>
          <div className="card" style={{ padding: 0 }}>
            <div className="table-wrap" style={{ maxHeight: 600, overflowY: 'auto' }}>
              <table>
                <thead><tr>
                  <th>Date & Time</th><th>Action</th><th>Ver.</th><th>Resident</th><th>Document Type</th>
                  <th>Control No.</th><th>Purpose</th><th>Issued By</th><th>Change Note</th><th>Changed By</th>
                </tr></thead>
                <tbody>
                  {vlogLoading && <tr><td colSpan={10} className="empty-row">Loading…</td></tr>}
                  {!vlogLoading && versionLog.map(v => (
                    <tr key={v.id}>
                      <td style={{ whiteSpace: 'nowrap', fontSize: 12 }}>{new Date(v.createdAt).toLocaleString('en-PH')}</td>
                      <td><span className="vlog-action-badge" style={{ background: ACTION_STYLE[v.action]?.bg, color: ACTION_STYLE[v.action]?.color }}>{v.action}</span></td>
                      <td style={{ textAlign: 'center', fontWeight: 700 }}>v{v.version}</td>
                      <td style={{ fontWeight: 600 }}>{v.residentName}</td>
                      <td><span className="doc-type-tag">{DOC_TYPES.find(t => t.key === v.documentType)?.icon ?? '📄'} {v.documentType}</span></td>
                      <td><code style={{ fontSize: 11 }}>{v.controlNumber}</code></td>
                      <td style={{ fontSize: 12 }}>{v.purpose}</td>
                      <td style={{ fontSize: 12 }}>{v.issuedBy}</td>
                      <td style={{ fontSize: 12, color: '#6b7280', fontStyle: 'italic' }}>{v.changeNote || '—'}</td>
                      <td style={{ fontSize: 12 }}>{v.changedBy}</td>
                    </tr>
                  ))}
                  {!vlogLoading && versionLog.length === 0 && <tr><td colSpan={10} className="empty-row">No version history found.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Issue modal */}
      {modal && selectedResident && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal" style={{ maxWidth: 560 }}>
            <h2>Issue — {selectedDocType}</h2>
            <div className="issue-resident-box">
              <div className="issue-resident-name">{selectedResident.firstName} {selectedResident.middleName} {selectedResident.lastName}</div>
              <div className="issue-resident-addr">{selectedResident.address}{selectedResident.sitio ? ` · ${selectedResident.sitio}` : ''}</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                {selectedResident.birthDate && <span className="badge" style={{ background: '#e0f2fe', color: '#0369a1' }}>Age: {Math.floor((Date.now() - new Date(selectedResident.birthDate).getTime()) / (1000*60*60*24*365.25))}</span>}
                {selectedResident.isVoter  && <span className="badge badge-active">Voter</span>}
                {selectedResident.isSenior && <span className="badge" style={{ background: '#d1fae5', color: '#065f46' }}>Senior</span>}
                {selectedResident.isPWD    && <span className="badge" style={{ background: '#e0e7ff', color: '#3730a3' }}>PWD</span>}
                {selectedResident.is4Ps    && <span className="badge" style={{ background: '#fef3c7', color: '#92400e' }}>4Ps</span>}
              </div>
            </div>
            <div className="form-grid" style={{ marginTop: 16 }}>
              {selectedDocType === 'Barangay Blotter Certification' && (
                <>
                  <div className="form-group"><label>Case Number</label><input value={form.caseNumber ?? ''} onChange={e => f('caseNumber', e.target.value)} /></div>
                  <div className="form-group"><label>Incident Date</label><input type="date" value={form.incidentDate ?? ''} onChange={e => f('incidentDate', e.target.value)} /></div>
                  <div className="form-group"><label>Complainant</label><input value={form.complainant ?? ''} onChange={e => f('complainant', e.target.value)} /></div>
                  <div className="form-group"><label>Respondent</label><input value={form.respondent ?? ''} onChange={e => f('respondent', e.target.value)} /></div>
                  <div className="form-group full"><label>Incident</label><input value={form.incident ?? ''} onChange={e => f('incident', e.target.value)} /></div>
                  <div className="form-group full"><label>Details</label><textarea rows={2} value={form.details ?? ''} onChange={e => f('details', e.target.value)} style={{ resize: 'vertical' }} /></div>
                </>
              )}
              <div className="form-group full">
                <label>Purpose <span style={{ color: '#dc2626' }}>*</span></label>
                <input autoFocus placeholder="e.g. Employment, School Enrollment, Medical Assistance..." value={form.purpose} onChange={e => f('purpose', e.target.value)} />
              </div>
              <div className="form-group full">
                <label>Issued By</label>
                <select value={form.issuedBy} onChange={e => f('issuedBy', e.target.value)}>
                  {officials.map(o => <option key={o.id} value={o.name}>{o.name} — {o.position}</option>)}
                  {officials.length === 0 && <option>No active officials</option>}
                </select>
              </div>
              <div className="form-group full">
                <label>Date Issued</label>
                <input value={new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })} readOnly style={{ background: '#f3f4f6', color: '#1e64c8', fontWeight: 600 }} />
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={issueAndPrint}>📄 Issue & Print PDF</button>
            </div>
          </div>
        </div>
      )}

      {/* Blotter picker */}
      {blotterModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setBlotterModal(false)}>
          <div className="modal" style={{ maxWidth: 620 }}>
            <h2>Select Blotter Case</h2>
            <div className="table-wrap" style={{ maxHeight: 320, overflowY: 'auto' }}>
              <table>
                <thead><tr><th>Case No.</th><th>Complainant</th><th>Respondent</th><th>Incident</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {blotters.map(b => (
                    <tr key={b.id}>
                      <td><code style={{ fontSize: 11 }}>{b.caseNumber}</code></td>
                      <td>{b.complainant}</td><td>{b.respondent}</td><td>{b.incident}</td>
                      <td><span className={`badge ${STATUS_BADGE[b.status] ?? ''}`}>{b.status}</span></td>
                      <td><button className="btn-primary" style={{ padding: '3px 10px', fontSize: 12 }} onClick={() => selectBlotter(b)}>Select</button></td>
                    </tr>
                  ))}
                  {blotters.length === 0 && <tr><td colSpan={6} className="empty-row">No blotter records.</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="modal-actions"><button className="btn-secondary" onClick={() => setBlotterModal(false)}>Cancel</button></div>
          </div>
        </div>
      )}

      {/* History drawer */}
      {historyDoc && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setHistoryDoc(null)}>
          <div className="modal" style={{ maxWidth: 640 }}>
            <h2>🕓 Version History</h2>
            <div style={{ marginBottom: 12, fontSize: 13, color: '#6b7280' }}>
              <code>{historyDoc.controlNumber}</code> · {historyDoc.documentType} · {historyDoc.resident ? `${historyDoc.resident.lastName}, ${historyDoc.resident.firstName}` : ''}
            </div>
            {historyLoading ? <div className="empty-row">Loading…</div> : (
              <div className="history-timeline">
                {docHistory.map((v, i) => (
                  <div key={v.id} className="history-entry">
                    <div className="history-line-col">
                      <div className="history-dot" style={{ background: ACTION_STYLE[v.action]?.color ?? '#6b7280' }} />
                      {i < docHistory.length - 1 && <div className="history-connector" />}
                    </div>
                    <div className="history-body">
                      <div className="history-header-row">
                        <span className="vlog-action-badge" style={{ background: ACTION_STYLE[v.action]?.bg, color: ACTION_STYLE[v.action]?.color }}>{v.action}</span>
                        <span className="history-version">v{v.version}</span>
                        <span className="history-date">{new Date(v.createdAt).toLocaleString('en-PH')}</span>
                      </div>
                      <div className="history-detail-row"><span>Control No.</span><code style={{ fontSize: 11 }}>{v.controlNumber}</code></div>
                      <div className="history-detail-row"><span>Purpose</span><span>{v.purpose}</span></div>
                      <div className="history-detail-row"><span>Issued By</span><span>{v.issuedBy}</span></div>
                      {v.changeNote && <div className="history-detail-row"><span>Note</span><span style={{ fontStyle: 'italic', color: '#6b7280' }}>{v.changeNote}</span></div>}
                      {v.changedBy  && <div className="history-detail-row"><span>By</span><span>{v.changedBy}</span></div>}
                    </div>
                  </div>
                ))}
                {docHistory.length === 0 && <div className="empty-row">No history found.</div>}
              </div>
            )}
            <div className="modal-actions"><button className="btn-secondary" onClick={() => setHistoryDoc(null)}>Close</button></div>
          </div>
        </div>
      )}

      {/* Reissue modal */}
      {reissueDoc && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setReissueDoc(null)}>
          <div className="modal" style={{ maxWidth: 500 }}>
            <h2>♻️ Reissue Document</h2>
            <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>
              <div style={{ fontWeight: 700 }}>{reissueDoc.documentType}</div>
              <div style={{ color: '#6b7280' }}>{reissueDoc.resident ? `${reissueDoc.resident.lastName}, ${reissueDoc.resident.firstName}` : ''}</div>
              <div style={{ color: '#6b7280', fontSize: 11, marginTop: 4 }}>Current: <code>{reissueDoc.controlNumber}</code></div>
            </div>
            <div className="form-grid">
              <div className="form-group full">
                <label>Purpose <span style={{ fontSize: 11, color: '#6b7280' }}>(leave blank to keep current)</span></label>
                <input value={reissueForm.purpose} onChange={e => setReissueForm(p => ({ ...p, purpose: e.target.value }))} placeholder={reissueDoc.purpose} />
              </div>
              <div className="form-group full">
                <label>Issued By</label>
                <select value={reissueForm.issuedBy} onChange={e => setReissueForm(p => ({ ...p, issuedBy: e.target.value }))}>
                  {officials.map(o => <option key={o.id} value={o.name}>{o.name} — {o.position}</option>)}
                </select>
              </div>
              <div className="form-group full">
                <label>Reason for Reissue <span style={{ color: '#dc2626' }}>*</span></label>
                <input value={reissueForm.changeNote} onChange={e => setReissueForm(p => ({ ...p, changeNote: e.target.value }))} placeholder="e.g. Lost original, damaged copy, correction of purpose..." />
              </div>
              <div className="form-group full">
                <label>Processed By</label>
                <select value={reissueForm.changedBy} onChange={e => setReissueForm(p => ({ ...p, changedBy: e.target.value }))}>
                  {officials.map(o => <option key={o.id} value={o.name}>{o.name}</option>)}
                </select>
              </div>
            </div>
            <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#92400e', marginTop: 8 }}>
              A new control number will be generated. The original record is preserved in version history.
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setReissueDoc(null)}>Cancel</button>
              <button className="btn-primary" onClick={submitReissue}>♻️ Reissue & Print</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function printCertificate(form: IssueForm & { controlNumber: string; issuedAt: string }, resident: Resident) {
  const date = new Date(form.issuedAt || Date.now()).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
  const fullName = `${resident.firstName} ${resident.middleName ? resident.middleName + ' ' : ''}${resident.lastName}`.trim().toUpperCase();
  const age = resident.birthDate ? Math.floor((Date.now() - new Date(resident.birthDate).getTime()) / (1000*60*60*24*365.25)) : null;
  const body = getBodyText(form.documentType, fullName, resident.address, resident.sitio, age);
  const qrData = encodeURIComponent(`BRGY-DAMOLOG|${form.controlNumber}|${form.documentType}|${fullName}|${date}`);
  const qrUrl = `https://chart.googleapis.com/chart?chs=100x100&cht=qr&chl=${qrData}&choe=UTF-8`;
  const blotterTable = form.documentType === 'Barangay Blotter Certification' ? `
    <table class="blotter-table">
      <tr><td><b>Case Number</b></td><td>${form.caseNumber ?? ''}</td></tr>
      <tr><td><b>Complainant</b></td><td>${form.complainant ?? ''}</td></tr>
      <tr><td><b>Respondent</b></td><td>${form.respondent ?? ''}</td></tr>
      <tr><td><b>Incident</b></td><td>${form.incident ?? ''}</td></tr>
      <tr><td><b>Incident Date</b></td><td>${form.incidentDate ?? ''}</td></tr>
      <tr><td><b>Details</b></td><td>${form.details ?? ''}</td></tr>
    </table>` : '';
  const html = `<!DOCTYPE html><html><head><title>${form.documentType}</title>
  <style>
    @page { size: A4; margin: 28mm 20mm 20mm 20mm; }
    * { box-sizing: border-box; }
    body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; color: #111; margin: 0; }
    .header { text-align: center; border-bottom: 3px double #1e3a8a; padding-bottom: 12px; margin-bottom: 18px; }
    .header-inner { display: flex; align-items: center; justify-content: center; gap: 20px; }
    .header-logo { width: 80px; height: 80px; object-fit: contain; }
    .header-text .republic { font-size: 9pt; font-style: italic; color: #555; }
    .header-text .province { font-size: 9pt; color: #555; }
    .header-text .barangay { font-size: 17pt; font-weight: bold; letter-spacing: 1px; margin: 4px 0 2px; }
    .header-text .address { font-size: 9pt; color: #555; }
    .doc-title { font-size: 16pt; font-weight: bold; color: #1e3a8a; text-align: center; margin: 14px 0 4px; letter-spacing: 2px; text-decoration: underline; }
    .meta-row { display: flex; justify-content: space-between; font-size: 9pt; color: #555; margin-bottom: 20px; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; }
    .salutation { font-weight: bold; margin-bottom: 14px; font-size: 11pt; }
    .body-text { line-height: 2; margin-bottom: 14px; text-align: justify; }
    .purpose-line { line-height: 2; margin-bottom: 30px; text-align: justify; }
    .blotter-table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 10pt; }
    .blotter-table td { border: 1px solid #ddd; padding: 6px 10px; }
    .blotter-table td:first-child { background: #f5f5f5; width: 35%; font-weight: bold; }
    .sig-section { display: flex; justify-content: flex-end; margin-top: 50px; }
    .sig-block { text-align: center; min-width: 240px; }
    .sig-name { font-weight: bold; font-size: 13pt; border-bottom: 2px solid #111; padding-bottom: 2px; display: block; }
    .sig-title { font-size: 10pt; font-style: italic; margin-top: 4px; }
    .bottom-row { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 30px; }
    .or-box { border: 1px solid #ccc; padding: 8px 14px; font-size: 9pt; line-height: 2; }
    .or-box b { display: inline-block; min-width: 100px; }
    .qr-block { text-align: center; }
    .qr-block img { width: 90px; height: 90px; }
    .qr-block .qr-label { font-size: 7pt; color: #888; margin-top: 2px; }
    .footer { border-top: 1px solid #ccc; margin-top: 16px; padding-top: 6px; display: flex; justify-content: space-between; font-size: 8pt; color: #888; font-style: italic; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style></head><body>
  <div class="header"><div class="header-inner">
    <img src="/logo.png" alt="Seal" class="header-logo" onerror="this.style.display='none'" />
    <div class="header-text">
      <div class="republic">Republic of the Philippines</div>
      <div class="province">Province of Cebu &nbsp;·&nbsp; Municipality of Sogod</div>
      <div class="barangay">BARANGAY DAMOLOG</div>
      <div class="address">Barangay Hall, Damolog, Sogod, Cebu</div>
    </div>
    <img src="/sogod-logo.png" alt="Sogod Seal" class="header-logo" onerror="this.style.display='none'" />
  </div></div>
  <div class="doc-title">${form.documentType.toUpperCase()}</div>
  <div class="meta-row">
    <span>Control No.: &nbsp;<b>${form.controlNumber}</b></span>
    <span>Date Issued: &nbsp;<b>${date}</b></span>
  </div>
  <div class="salutation">TO WHOM IT MAY CONCERN:</div>
  <div class="body-text">${body}</div>
  ${blotterTable}
  <div class="purpose-line">This certification is issued upon the request of the above-named person for the purpose of <b><u>${form.purpose}</u></b> and for whatever legal purpose it may serve.</div>
  <div class="sig-section"><div class="sig-block">
    <span class="sig-name">${form.issuedBy}</span>
    <div class="sig-title">Punong Barangay</div>
    <div class="sig-title">Barangay Damolog, Sogod, Cebu</div>
  </div></div>
  <div class="bottom-row">
    <div class="or-box">
      <div><b>O.R. No.:</b> _______________________</div>
      <div><b>Amount Paid:</b> ₱ ________________</div>
      <div><b>Date Paid:</b> ___________________</div>
      <div><b>Received by:</b> _________________</div>
    </div>
    <div class="qr-block">
      <img src="${qrUrl}" alt="QR Code" />
      <div class="qr-label">Scan to verify authenticity</div>
      <div class="qr-label">${form.controlNumber}</div>
    </div>
  </div>
  <div class="footer">
    <span>Barangay Damolog, Municipality of Sogod, Cebu — Official Document</span>
    <span>Printed: ${new Date().toLocaleString('en-PH')}</span>
  </div>
  <script>window.onload = () => { window.print(); }<\/script>
  </body></html>`;
  const win = window.open('', '_blank');
  if (win) { win.document.write(html); win.document.close(); }
}

function getBodyText(docType: string, fullName: string, address: string, sitio?: string, age?: number | null): string {
  const loc = sitio ? `${address}, ${sitio}, Barangay Damolog, Sogod, Cebu` : `${address}, Barangay Damolog, Sogod, Cebu`;
  const ageStr = age ? `, ${age} years of age` : '';
  switch (docType) {
    case 'Barangay Clearance':
      return `This is to certify that <b>${fullName}</b>${ageStr}, a bonafide resident of ${loc}, is personally known to this office and is a person of <b>good moral character</b> and has <b>no derogatory record</b> on file in this barangay as of this date.`;
    case 'Certificate of Residency':
      return `This is to certify that <b>${fullName}</b>${ageStr}, is a bonafide resident of ${loc}, and has been residing in this barangay for a considerable period of time.`;
    case 'Certificate of Indigency':
      return `This is to certify that <b>${fullName}</b>${ageStr}, a resident of ${loc}, belongs to an <b>indigent family</b> in this barangay and does not have sufficient income to meet their basic daily needs.`;
    case 'Barangay Business Clearance':
      return `This is to certify that <b>${fullName}</b>${ageStr}, a resident of ${loc}, has been granted clearance by this barangay to operate a business establishment within the jurisdiction of Barangay Damolog and has <b>no pending case or complaint</b> on file as of this date.`;
    case 'Barangay Blotter Certification':
      return `This is to certify that the incident described below has been duly recorded in the <b>Barangay Blotter Book</b> of Barangay Damolog, Municipality of Sogod, Cebu.`;
    default:
      return `This is to certify that <b>${fullName}</b>${ageStr}, a resident of ${loc}, is known to this office and this certification is issued as requested.`;
  }
}
