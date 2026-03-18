import { useEffect, useState, useMemo } from 'react';
import { get, post, del } from '../api';
import type { BhwRecord, HouseVisitLog, MedicineDistribution, BhwSummary, Resident } from '../types';
import { BHW_CATEGORIES, BHW_STATUSES, BHW_RISK_LEVELS, VISIT_TYPES, MEDICINE_SOURCES, IMMUNIZATION_STATUSES, SITIOS } from '../types';
import { useAuth } from '../auth';
import './BHW.css';

type Tab = 'watchlist' | 'visits' | 'medicines';

const RISK_COLORS: Record<string, { bg: string; color: string }> = {
  Low:      { bg: '#dcfce7', color: '#166534' },
  Moderate: { bg: '#fef3c7', color: '#92400e' },
  High:     { bg: '#fee2e2', color: '#991b1b' },
};
const CAT_ICONS: Record<string, string> = {
  Pregnant: '🤰', Senior: '👴', Child: '👶', PWD: '♿',
};
const CAT_COLORS: Record<string, { bg: string; color: string }> = {
  Pregnant: { bg: '#fce7f3', color: '#9d174d' },
  Senior:   { bg: '#ede9fe', color: '#5b21b6' },
  Child:    { bg: '#dbeafe', color: '#1e40af' },
  PWD:      { bg: '#dcfce7', color: '#166534' },
};

function fmtDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
}
function fmtDateTime(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function daysUntil(d?: string) {
  if (!d) return null;
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
}

const emptyRecord = {
  residentId: 0, category: 'Pregnant', status: 'Active', lmpDate: '', eddDate: '',
  gravidaPara: 0, riskLevel: 'Low', immunizationStatus: 'Incomplete',
  nextImmunizationDate: '', assignedBhw: '', notes: '',
};
const emptyVisit = {
  residentId: 0, bhwRecordId: undefined as number | undefined,
  visitType: 'Routine', visitedBy: '', visitDate: new Date().toISOString().slice(0, 10),
  findings: '', actionTaken: '', nextVisitDate: '', bloodPressure: '',
  weight: '', temperature: '', notes: '',
};
const emptyMed = {
  residentId: 0, medicineName: '', quantity: '', purpose: '',
  distributedBy: '', source: 'RHU', distributedAt: new Date().toISOString().slice(0, 10),
  nextPickupDate: '', notes: '',
};
export default function BHW() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('watchlist');
  const [summary, setSummary] = useState<BhwSummary | null>(null);
  const [records, setRecords] = useState<BhwRecord[]>([]);
  const [visits, setVisits] = useState<HouseVisitLog[]>([]);
  const [medicines, setMedicines] = useState<MedicineDistribution[]>([]);
  const [allResidents, setAllResidents] = useState<Resident[]>([]);

  // filters
  const [catFilter, setCatFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('Active');
  const [sitioFilter, setSitioFilter] = useState('');
  const [search, setSearch] = useState('');
  const [visitSearch, setVisitSearch] = useState('');
  const [medSearch, setMedSearch] = useState('');

  // modals
  const [recModal, setRecModal] = useState(false);
  const [editRec, setEditRec] = useState<BhwRecord | null>(null);
  const [recForm, setRecForm] = useState<typeof emptyRecord>({ ...emptyRecord });
  const [resSearch, setResSearch] = useState('');
  const [selResident, setSelResident] = useState<Resident | null>(null);

  const [visitModal, setVisitModal] = useState(false);
  const [visitForm, setVisitForm] = useState<typeof emptyVisit>({ ...emptyVisit });
  const [visitResSearch, setVisitResSearch] = useState('');
  const [visitSelRes, setVisitSelRes] = useState<Resident | null>(null);

  const [medModal, setMedModal] = useState(false);
  const [medForm, setMedForm] = useState<typeof emptyMed>({ ...emptyMed });
  const [medResSearch, setMedResSearch] = useState('');
  const [medSelRes, setMedSelRes] = useState<Resident | null>(null);

  const loadSummary  = () => get<BhwSummary>('/api/bhw/summary').then(setSummary).catch(() => {});
  const loadRecords  = () => {
    const p = new URLSearchParams();
    if (catFilter)    p.set('category', catFilter);
    if (statusFilter) p.set('status', statusFilter);
    if (sitioFilter)  p.set('sitio', sitioFilter);
    if (search)       p.set('search', search);
    get<BhwRecord[]>('/api/bhw/records?' + p).then(setRecords).catch(() => setRecords([]));
  };
  const loadVisits   = () => get<HouseVisitLog[]>('/api/bhw/visits').then(setVisits).catch(() => setVisits([]));
  const loadMeds     = () => get<MedicineDistribution[]>('/api/bhw/medicines').then(setMedicines).catch(() => setMedicines([]));
  const loadAllRes   = () => get<Resident[]>('/api/residents').then(setAllResidents).catch(() => {});

  useEffect(() => { loadSummary(); loadAllRes(); }, []);
  useEffect(() => { loadRecords(); }, [catFilter, statusFilter, sitioFilter, search]);
  useEffect(() => { if (tab === 'visits') loadVisits(); }, [tab]);
  useEffect(() => { if (tab === 'medicines') loadMeds(); }, [tab]);

  const resResults = useMemo(() => {
    if (!resSearch.trim() || selResident) return [];
    const q = resSearch.toLowerCase();
    return allResidents.filter(r => (r.firstName + ' ' + r.lastName + ' ' + r.lastName + ' ' + r.firstName).toLowerCase().includes(q)).slice(0, 8);
  }, [allResidents, resSearch, selResident]);

  const visitResResults = useMemo(() => {
    if (!visitResSearch.trim() || visitSelRes) return [];
    const q = visitResSearch.toLowerCase();
    return allResidents.filter(r => (r.firstName + ' ' + r.lastName + ' ' + r.lastName + ' ' + r.firstName).toLowerCase().includes(q)).slice(0, 8);
  }, [allResidents, visitResSearch, visitSelRes]);

  const medResResults = useMemo(() => {
    if (!medResSearch.trim() || medSelRes) return [];
    const q = medResSearch.toLowerCase();
    return allResidents.filter(r => (r.firstName + ' ' + r.lastName + ' ' + r.lastName + ' ' + r.firstName).toLowerCase().includes(q)).slice(0, 8);
  }, [allResidents, medResSearch, medSelRes]);

  const filteredVisits = useMemo(() => {
    if (!visitSearch.trim()) return visits;
    const q = visitSearch.toLowerCase();
    return visits.filter(v => v.residentName.toLowerCase().includes(q) || v.visitedBy.toLowerCase().includes(q) || v.visitType.toLowerCase().includes(q));
  }, [visits, visitSearch]);

  const filteredMeds = useMemo(() => {
    if (!medSearch.trim()) return medicines;
    const q = medSearch.toLowerCase();
    return medicines.filter(m => m.residentName.toLowerCase().includes(q) || m.medicineName.toLowerCase().includes(q));
  }, [medicines, medSearch]);

  const saveRecord = async () => {
    if (!recForm.residentId) return alert('Select a resident.');
    const body = { ...recForm, lmpDate: recForm.lmpDate || null, eddDate: recForm.eddDate || null };
    if (editRec) await import('../api').then(a => a.put('/api/bhw/records/' + editRec.id, body));
    else await post('/api/bhw/records', body);
    setRecModal(false); loadRecords(); loadSummary();
  };

  const saveVisit = async () => {
    if (!visitForm.residentId) return alert('Select a resident.');
    await post('/api/bhw/visits', { ...visitForm, visitedBy: visitForm.visitedBy || user?.fullName });
    setVisitModal(false); loadVisits(); loadSummary();
  };

  const saveMed = async () => {
    if (!medForm.residentId) return alert('Select a resident.');
    await post('/api/bhw/medicines', { ...medForm, distributedBy: medForm.distributedBy || user?.fullName });
    setMedModal(false); loadMeds(); loadSummary();
  };
  return (
    <div className="bhw-page">
      <div className="bhw-header-row">
        <div>
          <h1 className="bhw-title">🧑‍⚕️ Barangay Health Worker System</h1>
          <p className="bhw-subtitle">Barangay Damolog — Watchlist, Visit Logs & Medicine Distribution</p>
        </div>
        <div className="bhw-header-actions">
          {tab === 'watchlist'  && <button className="btn-primary" onClick={() => { setEditRec(null); setRecForm({ ...emptyRecord, assignedBhw: user?.fullName ?? '' }); setResSearch(''); setSelResident(null); setRecModal(true); }}>+ Add to Watchlist</button>}
          {tab === 'visits'     && <button className="btn-primary" onClick={() => { setVisitForm({ ...emptyVisit, visitedBy: user?.fullName ?? '' }); setVisitResSearch(''); setVisitSelRes(null); setVisitModal(true); }}>+ Log Visit</button>}
          {tab === 'medicines'  && <button className="btn-primary" onClick={() => { setMedForm({ ...emptyMed, distributedBy: user?.fullName ?? '' }); setMedResSearch(''); setMedSelRes(null); setMedModal(true); }}>+ Log Medicine</button>}
        </div>
      </div>

      {summary && (
        <div className="bhw-stats-bar">
          <div className="bhw-stat" style={{ borderTopColor: '#ec4899' }}><div className="bhw-stat-icon">🤰</div><div className="bhw-stat-val">{summary.pregnant}</div><div className="bhw-stat-lbl">Pregnant</div></div>
          <div className="bhw-stat" style={{ borderTopColor: '#7c3aed' }}><div className="bhw-stat-icon">👴</div><div className="bhw-stat-val">{summary.seniors}</div><div className="bhw-stat-lbl">Seniors</div></div>
          <div className="bhw-stat" style={{ borderTopColor: '#1a56db' }}><div className="bhw-stat-icon">👶</div><div className="bhw-stat-val">{summary.children}</div><div className="bhw-stat-lbl">Children</div></div>
          <div className="bhw-stat" style={{ borderTopColor: '#16a34a' }}><div className="bhw-stat-icon">♿</div><div className="bhw-stat-val">{summary.pwd}</div><div className="bhw-stat-lbl">PWD</div></div>
          {summary.highRisk > 0 && <div className="bhw-stat bhw-stat-danger"><div className="bhw-stat-icon">⚠️</div><div className="bhw-stat-val">{summary.highRisk}</div><div className="bhw-stat-lbl">High Risk</div></div>}
          <div className="bhw-stat"><div className="bhw-stat-icon">🏠</div><div className="bhw-stat-val">{summary.visitsThisMonth}</div><div className="bhw-stat-lbl">Visits This Month</div></div>
          <div className="bhw-stat"><div className="bhw-stat-icon">💊</div><div className="bhw-stat-val">{summary.medsThisMonth}</div><div className="bhw-stat-lbl">Meds This Month</div></div>
        </div>
      )}

      <div className="bhw-tabs">
        <button className={`bhw-tab ${tab === 'watchlist' ? 'active' : ''}`} onClick={() => setTab('watchlist')}>📋 Watchlist</button>
        <button className={`bhw-tab ${tab === 'visits'    ? 'active' : ''}`} onClick={() => setTab('visits')}>🏠 Visit Logs</button>
        <button className={`bhw-tab ${tab === 'medicines' ? 'active' : ''}`} onClick={() => setTab('medicines')}>💊 Medicine Distribution</button>
      </div>

      {tab === 'watchlist' && (
        <div>
          <div className="bhw-toolbar">
            <input className="bhw-search" placeholder="Search name…" value={search} onChange={e => setSearch(e.target.value)} />
            <div className="bhw-pills">
              <button className={`pill ${catFilter === '' ? 'active' : ''}`} onClick={() => setCatFilter('')}>All</button>
              {BHW_CATEGORIES.map(c => <button key={c} className={`pill ${catFilter === c ? 'active' : ''}`} onClick={() => setCatFilter(c)}>{CAT_ICONS[c]} {c}</button>)}
            </div>
            <select className="bhw-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">All Statuses</option>
              {BHW_STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
            <select className="bhw-select" value={sitioFilter} onChange={e => setSitioFilter(e.target.value)}>
              <option value="">All Sitios</option>
              {SITIOS.map(s => <option key={s}>{s}</option>)}
            </select>
            <span className="bhw-count">{records.length} record{records.length !== 1 ? 's' : ''}</span>
          </div>
          {records.length === 0 && <div className="bhw-empty">No records found. Click "+ Add to Watchlist" to get started.</div>}
          <div className="bhw-card-grid">
            {records.map(r => {
              const cc = CAT_COLORS[r.category] ?? CAT_COLORS.Child;
              const rc = RISK_COLORS[r.riskLevel] ?? RISK_COLORS.Low;
              const edd = r.eddDate ? daysUntil(r.eddDate) : null;
              const nim = r.nextImmunizationDate ? daysUntil(r.nextImmunizationDate) : null;
              return (
                <div key={r.id} className="bhw-card">
                  <div className="bhw-card-top">
                    <span className="bhw-cat-badge" style={{ background: cc.bg, color: cc.color }}>{CAT_ICONS[r.category]} {r.category}</span>
                    <span className="bhw-risk-badge" style={{ background: rc.bg, color: rc.color }}>{r.riskLevel} Risk</span>
                    <span className={`bhw-status-dot ${r.status === 'Active' ? 'active' : 'inactive'}`}>{r.status}</span>
                  </div>
                  <div className="bhw-card-name">{r.residentName}</div>
                  <div className="bhw-card-meta">
                    <span>📍 {r.sitio}</span>
                    {r.age != null && <span>Age {r.age}</span>}
                    {r.contactNumber && <span>📞 {r.contactNumber}</span>}
                    {r.householdNo && <span>🏠 HH#{r.householdNo}</span>}
                  </div>
                  {r.category === 'Pregnant' && (
                    <div className="bhw-card-details">
                      {r.lmpDate && <div><span className="bhw-dl">LMP</span> {fmtDate(r.lmpDate)}</div>}
                      {r.eddDate && <div><span className="bhw-dl">EDD</span> {fmtDate(r.eddDate)} {edd !== null && <span className={`bhw-days ${edd < 14 ? 'urgent' : edd < 30 ? 'soon' : ''}`}>{edd > 0 ? `(${edd}d)` : '(overdue)'}</span>}</div>}
                      {r.gravidaPara > 0 && <div><span className="bhw-dl">G/P</span> {r.gravidaPara}</div>}
                    </div>
                  )}
                  {r.category === 'Child' && (
                    <div className="bhw-card-details">
                      <div><span className="bhw-dl">Immunization</span> {r.immunizationStatus || '—'}</div>
                      {r.nextImmunizationDate && <div><span className="bhw-dl">Next Imm.</span> {fmtDate(r.nextImmunizationDate)} {nim !== null && <span className={`bhw-days ${nim < 7 ? 'urgent' : nim < 30 ? 'soon' : ''}`}>{nim > 0 ? `(${nim}d)` : '(overdue)'}</span>}</div>}
                    </div>
                  )}
                  {r.assignedBhw && <div className="bhw-card-bhw">👩‍⚕️ {r.assignedBhw}</div>}
                  {r.notes && <div className="bhw-card-notes">{r.notes}</div>}
                  <div className="bhw-card-actions">
                    <button className="btn-sm" onClick={() => {
                      setEditRec(r);
                      setRecForm({ residentId: r.residentId, category: r.category, status: r.status, lmpDate: r.lmpDate?.slice(0,10) ?? '', eddDate: r.eddDate?.slice(0,10) ?? '', gravidaPara: r.gravidaPara, riskLevel: r.riskLevel, immunizationStatus: r.immunizationStatus, nextImmunizationDate: r.nextImmunizationDate?.slice(0,10) ?? '', assignedBhw: r.assignedBhw, notes: r.notes });
                      setSelResident(null); setResSearch(r.residentName); setRecModal(true);
                    }}>✏️ Edit</button>
                    <button className="btn-sm" onClick={() => { setVisitForm({ ...emptyVisit, residentId: r.residentId, bhwRecordId: r.id, visitedBy: user?.fullName ?? '' }); setVisitSelRes(allResidents.find(x => x.id === r.residentId) ?? null); setVisitResSearch(r.residentName); setVisitModal(true); setTab('visits'); }}>🏠 Log Visit</button>
                    <button className="btn-sm btn-danger" onClick={() => { if (confirm('Remove from watchlist?')) del('/api/bhw/records/' + r.id).then(() => { loadRecords(); loadSummary(); }); }}>✕</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {tab === 'visits' && (
        <div>
          <div className="bhw-toolbar">
            <input className="bhw-search" placeholder="Search resident or BHW…" value={visitSearch} onChange={e => setVisitSearch(e.target.value)} />
            <span className="bhw-count">{filteredVisits.length} visit{filteredVisits.length !== 1 ? 's' : ''}</span>
          </div>
          {filteredVisits.length === 0 && <div className="bhw-empty">No visit logs yet. Click "+ Log Visit" to record a house visit.</div>}
          <div className="bhw-visit-list">
            {filteredVisits.map(v => (
              <div key={v.id} className="bhw-visit-card">
                <div className="bhw-visit-top">
                  <div>
                    <div className="bhw-visit-name">{v.residentName}</div>
                    <div className="bhw-visit-meta"><span>📍 {v.sitio}</span><span>{v.address}</span></div>
                  </div>
                  <div className="bhw-visit-right">
                    <span className="bhw-visit-type">{v.visitType}</span>
                    <span className="bhw-visit-date">{fmtDateTime(v.visitDate)}</span>
                    <button className="btn-sm btn-danger" onClick={() => { if (confirm('Delete visit log?')) del('/api/bhw/visits/' + v.id).then(loadVisits); }}>✕</button>
                  </div>
                </div>
                <div className="bhw-visit-body">
                  {(v.bloodPressure || v.weight || v.temperature) && (
                    <div className="bhw-vitals">
                      {v.bloodPressure && <span>🩺 BP: {v.bloodPressure}</span>}
                      {v.weight && <span>⚖️ {v.weight}</span>}
                      {v.temperature && <span>🌡️ {v.temperature}</span>}
                    </div>
                  )}
                  {v.findings && <div className="bhw-visit-field"><span className="bhw-dl">Findings:</span> {v.findings}</div>}
                  {v.actionTaken && <div className="bhw-visit-field"><span className="bhw-dl">Action:</span> {v.actionTaken}</div>}
                  {v.nextVisitDate && <div className="bhw-visit-field"><span className="bhw-dl">Next Visit:</span> {fmtDate(v.nextVisitDate)}</div>}
                  {v.notes && <div className="bhw-visit-field bhw-notes">{v.notes}</div>}
                </div>
                <div className="bhw-visit-footer">👩‍⚕️ {v.visitedBy}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'medicines' && (
        <div>
          <div className="bhw-toolbar">
            <input className="bhw-search" placeholder="Search resident or medicine…" value={medSearch} onChange={e => setMedSearch(e.target.value)} />
            <span className="bhw-count">{filteredMeds.length} record{filteredMeds.length !== 1 ? 's' : ''}</span>
          </div>
          {filteredMeds.length === 0 && <div className="bhw-empty">No medicine distribution records yet.</div>}
          <div className="bhw-med-list">
            {filteredMeds.map(m => (
              <div key={m.id} className="bhw-med-card">
                <div className="bhw-med-top">
                  <div>
                    <div className="bhw-med-name">💊 {m.medicineName}</div>
                    <div className="bhw-med-resident">{m.residentName} — {m.sitio}</div>
                  </div>
                  <div className="bhw-med-right">
                    <span className="bhw-med-qty">{m.quantity}</span>
                    <span className="bhw-med-source">{m.source}</span>
                    <button className="btn-sm btn-danger" onClick={() => { if (confirm('Delete record?')) del('/api/bhw/medicines/' + m.id).then(loadMeds); }}>✕</button>
                  </div>
                </div>
                {m.purpose && <div className="bhw-med-purpose">{m.purpose}</div>}
                <div className="bhw-med-footer">
                  <span>📅 {fmtDate(m.distributedAt)}</span>
                  {m.nextPickupDate && <span>🔄 Next: {fmtDate(m.nextPickupDate)}</span>}
                  <span>👩‍⚕️ {m.distributedBy}</span>
                  {m.notes && <span className="bhw-notes">{m.notes}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Watchlist Modal */}
      {recModal && (
        <div className="bhw-overlay" onClick={() => setRecModal(false)}>
          <div className="bhw-modal" onClick={e => e.stopPropagation()}>
            <div className="bhw-modal-header">
              <h2>{editRec ? '✏️ Edit Record' : '+ Add to Watchlist'}</h2>
              <button className="bhw-close" onClick={() => setRecModal(false)}>✕</button>
            </div>
            <div className="bhw-modal-body">
              {!editRec && (
                <div className="bhw-fg span2">
                  <label>Resident</label>
                  <input placeholder="Search name…" value={resSearch} onChange={e => { setResSearch(e.target.value); setSelResident(null); setRecForm(f => ({ ...f, residentId: 0 })); }} />
                  {resResults.length > 0 && (
                    <div className="bhw-dropdown">
                      {resResults.map(r => (
                        <div key={r.id} className="bhw-dropdown-item" onClick={() => { setSelResident(r); setRecForm(f => ({ ...f, residentId: r.id })); setResSearch(r.lastName + ', ' + r.firstName); }}>
                          {r.lastName}, {r.firstName} — {r.sitio}
                        </div>
                      ))}
                    </div>
                  )}
                  {selResident && <div className="bhw-selected">✓ {selResident.lastName}, {selResident.firstName} — {selResident.sitio}</div>}
                </div>
              )}
              <div className="bhw-form-grid">
                <div className="bhw-fg"><label>Category<select value={recForm.category} onChange={e => setRecForm(f => ({ ...f, category: e.target.value }))}>{BHW_CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></label></div>
                <div className="bhw-fg"><label>Status<select value={recForm.status} onChange={e => setRecForm(f => ({ ...f, status: e.target.value }))}>{BHW_STATUSES.map(s => <option key={s}>{s}</option>)}</select></label></div>
                <div className="bhw-fg"><label>Risk Level<select value={recForm.riskLevel} onChange={e => setRecForm(f => ({ ...f, riskLevel: e.target.value }))}>{BHW_RISK_LEVELS.map(l => <option key={l}>{l}</option>)}</select></label></div>
                <div className="bhw-fg"><label>Assigned BHW<input value={recForm.assignedBhw} onChange={e => setRecForm(f => ({ ...f, assignedBhw: e.target.value }))} /></label></div>
                {recForm.category === 'Pregnant' && (<>
                  <div className="bhw-fg"><label>LMP Date<input type="date" value={recForm.lmpDate} onChange={e => setRecForm(f => ({ ...f, lmpDate: e.target.value }))} /></label></div>
                  <div className="bhw-fg"><label>EDD<input type="date" value={recForm.eddDate} onChange={e => setRecForm(f => ({ ...f, eddDate: e.target.value }))} /></label></div>
                  <div className="bhw-fg"><label>Gravida/Para<input type="number" min={0} value={recForm.gravidaPara} onChange={e => setRecForm(f => ({ ...f, gravidaPara: +e.target.value }))} /></label></div>
                </>)}
                {recForm.category === 'Child' && (<>
                  <div className="bhw-fg"><label>Immunization Status<select value={recForm.immunizationStatus} onChange={e => setRecForm(f => ({ ...f, immunizationStatus: e.target.value }))}>{IMMUNIZATION_STATUSES.map(s => <option key={s}>{s}</option>)}</select></label></div>
                  <div className="bhw-fg"><label>Next Immunization<input type="date" value={recForm.nextImmunizationDate} onChange={e => setRecForm(f => ({ ...f, nextImmunizationDate: e.target.value }))} /></label></div>
                </>)}
                <div className="bhw-fg span2"><label>Notes<textarea value={recForm.notes} onChange={e => setRecForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></label></div>
              </div>
            </div>
            <div className="bhw-modal-footer">
              <button className="btn-secondary" onClick={() => setRecModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={saveRecord}>💾 Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Visit Modal */}
      {visitModal && (
        <div className="bhw-overlay" onClick={() => setVisitModal(false)}>
          <div className="bhw-modal" onClick={e => e.stopPropagation()}>
            <div className="bhw-modal-header">
              <h2>🏠 Log House Visit</h2>
              <button className="bhw-close" onClick={() => setVisitModal(false)}>✕</button>
            </div>
            <div className="bhw-modal-body">
              <div className="bhw-fg span2">
                <label>Resident</label>
                <input placeholder="Search name…" value={visitResSearch} onChange={e => { setVisitResSearch(e.target.value); setVisitSelRes(null); setVisitForm(f => ({ ...f, residentId: 0 })); }} />
                {visitResResults.length > 0 && (
                  <div className="bhw-dropdown">
                    {visitResResults.map(r => (
                      <div key={r.id} className="bhw-dropdown-item" onClick={() => { setVisitSelRes(r); setVisitForm(f => ({ ...f, residentId: r.id })); setVisitResSearch(r.lastName + ', ' + r.firstName); }}>
                        {r.lastName}, {r.firstName} — {r.sitio}
                      </div>
                    ))}
                  </div>
                )}
                {visitSelRes && <div className="bhw-selected">✓ {visitSelRes.lastName}, {visitSelRes.firstName} — {visitSelRes.sitio}</div>}
              </div>
              <div className="bhw-form-grid">
                <div className="bhw-fg"><label>Visit Type<select value={visitForm.visitType} onChange={e => setVisitForm(f => ({ ...f, visitType: e.target.value }))}>{VISIT_TYPES.map(t => <option key={t}>{t}</option>)}</select></label></div>
                <div className="bhw-fg"><label>Visit Date<input type="date" value={visitForm.visitDate} onChange={e => setVisitForm(f => ({ ...f, visitDate: e.target.value }))} /></label></div>
                <div className="bhw-fg"><label>Visited By<input value={visitForm.visitedBy} onChange={e => setVisitForm(f => ({ ...f, visitedBy: e.target.value }))} /></label></div>
                <div className="bhw-fg"><label>Next Visit<input type="date" value={visitForm.nextVisitDate} onChange={e => setVisitForm(f => ({ ...f, nextVisitDate: e.target.value }))} /></label></div>
                <div className="bhw-fg"><label>Blood Pressure<input value={visitForm.bloodPressure} placeholder="e.g. 120/80" onChange={e => setVisitForm(f => ({ ...f, bloodPressure: e.target.value }))} /></label></div>
                <div className="bhw-fg"><label>Weight<input value={visitForm.weight} placeholder="e.g. 58 kg" onChange={e => setVisitForm(f => ({ ...f, weight: e.target.value }))} /></label></div>
                <div className="bhw-fg span2"><label>Temperature<input value={visitForm.temperature} placeholder="e.g. 36.5°C" onChange={e => setVisitForm(f => ({ ...f, temperature: e.target.value }))} /></label></div>
                <div className="bhw-fg span2"><label>Findings<textarea value={visitForm.findings} onChange={e => setVisitForm(f => ({ ...f, findings: e.target.value }))} rows={2} /></label></div>
                <div className="bhw-fg span2"><label>Action Taken<textarea value={visitForm.actionTaken} onChange={e => setVisitForm(f => ({ ...f, actionTaken: e.target.value }))} rows={2} /></label></div>
                <div className="bhw-fg span2"><label>Notes<textarea value={visitForm.notes} onChange={e => setVisitForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></label></div>
              </div>
            </div>
            <div className="bhw-modal-footer">
              <button className="btn-secondary" onClick={() => setVisitModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={saveVisit}>💾 Save Visit</button>
            </div>
          </div>
        </div>
      )}

      {/* Medicine Modal */}
      {medModal && (
        <div className="bhw-overlay" onClick={() => setMedModal(false)}>
          <div className="bhw-modal" onClick={e => e.stopPropagation()}>
            <div className="bhw-modal-header">
              <h2>💊 Log Medicine Distribution</h2>
              <button className="bhw-close" onClick={() => setMedModal(false)}>✕</button>
            </div>
            <div className="bhw-modal-body">
              <div className="bhw-fg span2">
                <label>Resident</label>
                <input placeholder="Search name…" value={medResSearch} onChange={e => { setMedResSearch(e.target.value); setMedSelRes(null); setMedForm(f => ({ ...f, residentId: 0 })); }} />
                {medResResults.length > 0 && (
                  <div className="bhw-dropdown">
                    {medResResults.map(r => (
                      <div key={r.id} className="bhw-dropdown-item" onClick={() => { setMedSelRes(r); setMedForm(f => ({ ...f, residentId: r.id })); setMedResSearch(r.lastName + ', ' + r.firstName); }}>
                        {r.lastName}, {r.firstName} — {r.sitio}
                      </div>
                    ))}
                  </div>
                )}
                {medSelRes && <div className="bhw-selected">✓ {medSelRes.lastName}, {medSelRes.firstName} — {medSelRes.sitio}</div>}
              </div>
              <div className="bhw-form-grid">
                <div className="bhw-fg span2"><label>Medicine Name<input value={medForm.medicineName} onChange={e => setMedForm(f => ({ ...f, medicineName: e.target.value }))} placeholder="e.g. Amlodipine 5mg" /></label></div>
                <div className="bhw-fg"><label>Quantity<input value={medForm.quantity} onChange={e => setMedForm(f => ({ ...f, quantity: e.target.value }))} placeholder="e.g. 30 tablets" /></label></div>
                <div className="bhw-fg"><label>Source<select value={medForm.source} onChange={e => setMedForm(f => ({ ...f, source: e.target.value }))}>{MEDICINE_SOURCES.map(s => <option key={s}>{s}</option>)}</select></label></div>
                <div className="bhw-fg"><label>Date Distributed<input type="date" value={medForm.distributedAt} onChange={e => setMedForm(f => ({ ...f, distributedAt: e.target.value }))} /></label></div>
                <div className="bhw-fg"><label>Next Pickup<input type="date" value={medForm.nextPickupDate} onChange={e => setMedForm(f => ({ ...f, nextPickupDate: e.target.value }))} /></label></div>
                <div className="bhw-fg"><label>Distributed By<input value={medForm.distributedBy} onChange={e => setMedForm(f => ({ ...f, distributedBy: e.target.value }))} /></label></div>
                <div className="bhw-fg span2"><label>Purpose<input value={medForm.purpose} onChange={e => setMedForm(f => ({ ...f, purpose: e.target.value }))} placeholder="e.g. Hypertension maintenance" /></label></div>
                <div className="bhw-fg span2"><label>Notes<textarea value={medForm.notes} onChange={e => setMedForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></label></div>
              </div>
            </div>
            <div className="bhw-modal-footer">
              <button className="btn-secondary" onClick={() => setMedModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={saveMed}>�� Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}