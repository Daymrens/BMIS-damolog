import { useEffect, useState, useMemo, useCallback } from 'react';
import { get, post, put, del, patch } from '../api';
import type {
  Resident, EvacuationCenter, EvacueeLog, ReliefLog,
  VulnerableResident, VulnerableSummary,
} from '../types';
import { SITIOS, EVACUATION_STATUSES, RELIEF_ITEMS } from '../types';
import { useAuth } from '../auth';
import './Emergency.css';

type Tab = 'vulnerable' | 'centers' | 'evacuees' | 'relief';
type ReliefView = 'log' | 'coverage';

interface ReliefSummary {
  disaster: string;
  totalLogs: number;
  uniqueRecipients: number;
  unlinkedLogs: number;
  byItem: { item: string; recipients: number; totalQty: number }[];
  bySitio: { sitio: string; recipients: number }[];
  doubleClaims: { residentId: number; count: number; name: string }[];
}

interface CoverageResident {
  id: number; firstName: string; lastName: string; middleName: string;
  sitio: string; address: string; householdNo: string; contactNumber: string;
  isSenior: boolean; isPWD: boolean; is4Ps: boolean; isMinor: boolean;
  age: number | null;
  logs?: { reliefItem: string; quantity: number; unit: string; distributedAt: string; distributedBy: string }[];
}

interface CoverageData {
  disaster: string;
  totalResidents: number;
  claimedCount: number;
  unclaimedCount: number;
  coveragePct: number;
  claimed: CoverageResident[];
  unclaimed: CoverageResident[];
}

interface ClaimCheck {
  alreadyClaimed: boolean;
  count: number;
  logs: { reliefItem: string; quantity: number; unit: string; distributedAt: string; distributedBy: string }[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmt(dt?: string) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function fmtDate(dt?: string) {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Standby: 'badge-gray', Active: 'badge-green', Full: 'badge-red',
    Closed: 'badge-dark', Present: 'badge-green', Departed: 'badge-gray',
  };
  return <span className={`em-badge ${map[status] ?? 'badge-gray'}`}>{status}</span>;
}

function VulnTag({ label, color }: { label: string; color: string }) {
  return <span className={`em-badge badge-${color}`}>{label}</span>;
}

// ── Print Vulnerable List ─────────────────────────────────────────────────────
function printVulnerable(list: VulnerableResident[], filter: string) {
  const rows = list.map(r => `
    <tr>
      <td>${r.lastName}, ${r.firstName} ${r.middleName ? r.middleName[0]+'.' : ''}</td>
      <td>${r.age ?? '—'}</td>
      <td>${r.gender}</td>
      <td>${r.sitio}</td>
      <td>${r.address}</td>
      <td>${r.householdNo || '—'}</td>
      <td>${r.contactNumber || '—'}</td>
      <td>${[r.isSenior||r.age>=60?'Senior':'', r.isPWD?'PWD':'', r.isMinor?'Minor':'', r.is4Ps?'4Ps':''].filter(Boolean).join(', ')}</td>
    </tr>`).join('');
  const w = window.open('', '_blank')!;
  w.document.write(`<!DOCTYPE html><html><head><title>Vulnerable Residents</title>
  <style>
    body{font-family:Arial,sans-serif;font-size:11px;margin:20px}
    h2,h3{text-align:center;margin:4px 0}
    table{width:100%;border-collapse:collapse;margin-top:12px}
    th,td{border:1px solid #ccc;padding:4px 6px;text-align:left}
    th{background:#f0f0f0;font-weight:600}
    @media print{body{margin:10mm}}
  </style></head><body>
  <h2>Vulnerable Residents Masterlist</h2>
  <h3>Barangay Damolog, Municipality of Sogod, Cebu</h3>
  <p style="text-align:center;color:#555">Filter: ${filter} &nbsp;|&nbsp; Total: ${list.length} &nbsp;|&nbsp; Printed: ${new Date().toLocaleDateString('en-PH',{year:'numeric',month:'long',day:'numeric'})}</p>
  <table><thead><tr><th>Name</th><th>Age</th><th>Sex</th><th>Sitio</th><th>Address</th><th>HH#</th><th>Contact</th><th>Tags</th></tr></thead>
  <tbody>${rows}</tbody></table></body></html>`);
  w.document.close(); w.print();
}

// ── Print Evacuee List ────────────────────────────────────────────────────────
function printEvacuees(logs: EvacueeLog[], centerName: string) {
  const rows = logs.map(e => `
    <tr>
      <td>${e.evacueeName}</td>
      <td>${e.sitio}</td>
      <td>${e.address}</td>
      <td style="text-align:center">${e.headCount}</td>
      <td>${[e.hasSenior?'Senior':'',e.hasPWD?'PWD':'',e.hasInfant?'Infant':'',e.hasPregnant?'Pregnant':''].filter(Boolean).join(', ')||'—'}</td>
      <td>${new Date(e.checkedInAt).toLocaleString('en-PH',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}</td>
      <td>${e.status}</td>
    </tr>`).join('');
  const w = window.open('', '_blank')!;
  w.document.write(`<!DOCTYPE html><html><head><title>Evacuee List</title>
  <style>
    body{font-family:Arial,sans-serif;font-size:11px;margin:20px}
    h2,h3{text-align:center;margin:4px 0}
    table{width:100%;border-collapse:collapse;margin-top:12px}
    th,td{border:1px solid #ccc;padding:4px 6px;text-align:left}
    th{background:#f0f0f0}
    @media print{body{margin:10mm}}
  </style></head><body>
  <h2>Evacuee Log — ${centerName}</h2>
  <h3>Barangay Damolog, Municipality of Sogod, Cebu</h3>
  <p style="text-align:center;color:#555">Total Families: ${logs.length} &nbsp;|&nbsp; Total Persons: ${logs.reduce((a,e)=>a+e.headCount,0)} &nbsp;|&nbsp; Printed: ${new Date().toLocaleDateString('en-PH',{year:'numeric',month:'long',day:'numeric'})}</p>
  <table><thead><tr><th>Name</th><th>Sitio</th><th>Address</th><th>Persons</th><th>Special Needs</th><th>Check-in</th><th>Status</th></tr></thead>
  <tbody>${rows}</tbody></table></body></html>`);
  w.document.close(); w.print();
}

// ── Print Coverage (Unclaimed) ────────────────────────────────────────────────
function printCoverage(list: CoverageResident[], disaster: string, sitio: string) {
  const rows = list.map(r => `
    <tr>
      <td>${r.lastName}, ${r.firstName} ${r.middleName ? r.middleName[0]+'.' : ''}</td>
      <td>${r.age ?? '—'}</td>
      <td>${r.sitio}</td>
      <td>${r.address}</td>
      <td>${r.householdNo || '—'}</td>
      <td>${r.contactNumber || '—'}</td>
      <td>${[r.isSenior?'Senior':'', r.isPWD?'PWD':'', r.isMinor?'Minor':'', r.is4Ps?'4Ps':''].filter(Boolean).join(', ') || '—'}</td>
      <td></td>
    </tr>`).join('');
  const w = window.open('', '_blank')!;
  w.document.write(`<!DOCTYPE html><html><head><title>Unclaimed Relief</title>
  <style>
    body{font-family:Arial,sans-serif;font-size:11px;margin:20px}
    h2,h3{text-align:center;margin:4px 0}
    table{width:100%;border-collapse:collapse;margin-top:12px}
    th,td{border:1px solid #ccc;padding:4px 6px;text-align:left}
    th{background:#f0f0f0}
    @media print{body{margin:10mm}}
  </style></head><body>
  <h2>Relief Distribution — Unclaimed Residents</h2>
  <h3>Barangay Damolog, Municipality of Sogod, Cebu</h3>
  <p style="text-align:center;color:#555">Disaster: ${disaster} &nbsp;|&nbsp; Sitio: ${sitio || 'All'} &nbsp;|&nbsp; Total: ${list.length} &nbsp;|&nbsp; Printed: ${new Date().toLocaleDateString('en-PH',{year:'numeric',month:'long',day:'numeric'})}</p>
  <table><thead><tr><th>Name</th><th>Age</th><th>Sitio</th><th>Address</th><th>HH#</th><th>Contact</th><th>Tags</th><th>Signature</th></tr></thead>
  <tbody>${rows}</tbody></table></body></html>`);
  w.document.close(); w.print();
}

// ── Print Relief Report ───────────────────────────────────────────────────────
function printRelief(logs: ReliefLog[], disaster: string) {  const rows = logs.map(r => `
    <tr>
      <td>${r.recipientName}</td>
      <td>${r.sitio}</td>
      <td>${r.address}</td>
      <td>${r.reliefItem}</td>
      <td style="text-align:center">${r.quantity} ${r.unit}</td>
      <td>${r.distributedBy}</td>
      <td>${new Date(r.distributedAt).toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'})}</td>
    </tr>`).join('');
  const w = window.open('', '_blank')!;
  w.document.write(`<!DOCTYPE html><html><head><title>Relief Distribution</title>
  <style>
    body{font-family:Arial,sans-serif;font-size:11px;margin:20px}
    h2,h3{text-align:center;margin:4px 0}
    table{width:100%;border-collapse:collapse;margin-top:12px}
    th,td{border:1px solid #ccc;padding:4px 6px;text-align:left}
    th{background:#f0f0f0}
    @media print{body{margin:10mm}}
  </style></head><body>
  <h2>Relief Distribution Report — ${disaster || 'All Events'}</h2>
  <h3>Barangay Damolog, Municipality of Sogod, Cebu</h3>
  <p style="text-align:center;color:#555">Total Recipients: ${logs.length} &nbsp;|&nbsp; Printed: ${new Date().toLocaleDateString('en-PH',{year:'numeric',month:'long',day:'numeric'})}</p>
  <table><thead><tr><th>Recipient</th><th>Sitio</th><th>Address</th><th>Item</th><th>Qty</th><th>Distributed By</th><th>Date</th></tr></thead>
  <tbody>${rows}</tbody></table></body></html>`);
  w.document.close(); w.print();
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function Emergency() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('vulnerable');

  // Vulnerable
  const [vulnerable, setVulnerable]   = useState<VulnerableResident[]>([]);
  const [vulnSummary, setVulnSummary] = useState<VulnerableSummary | null>(null);
  const [vulnFilter, setVulnFilter]   = useState('');
  const [vulnSitio, setVulnSitio]     = useState('');
  const [vulnSearch, setVulnSearch]   = useState('');

  // Centers
  const [centers, setCenters]   = useState<EvacuationCenter[]>([]);
  const [centerModal, setCenterModal] = useState(false);
  const [editCenter, setEditCenter]   = useState<EvacuationCenter | null>(null);
  const emptyCenter: Omit<EvacuationCenter,'id'|'createdAt'> = {
    name:'', location:'', sitio:'Proper', capacity:0,
    status:'Standby', contactPerson:'', contactNumber:'', notes:'',
  };
  const [centerForm, setCenterForm] = useState<Omit<EvacuationCenter,'id'|'createdAt'>>(emptyCenter);

  // Evacuees
  const [evacuees, setEvacuees]       = useState<EvacueeLog[]>([]);
  const [evacueeCenter, setEvacueeCenter] = useState<number | ''>('');
  const [evacueeModal, setEvacueeModal]   = useState(false);
  const [residents, setResidents]         = useState<Resident[]>([]);
  const [resSearch, setResSearch]         = useState('');
  const emptyEvacuee = {
    evacuationCenterId: 0, residentId: undefined as number|undefined,
    evacueeName:'', sitio:'Proper', address:'', headCount:1,
    hasSenior:false, hasPWD:false, hasInfant:false, hasPregnant:false,
    notes:'', recordedBy: user?.fullName ?? '',
  };
  const [evacueeForm, setEvacueeForm] = useState<typeof emptyEvacuee>(emptyEvacuee);

  // Relief
  const [relief, setRelief]           = useState<ReliefLog[]>([]);
  const [disasters, setDisasters]     = useState<string[]>([]);
  const [disasterFilter, setDisasterFilter] = useState('');
  const [reliefModal, setReliefModal] = useState(false);
  const [reliefResSearch, setReliefResSearch] = useState('');
  const [reliefView, setReliefView]   = useState<ReliefView>('log');
  const [reliefSummary, setReliefSummary] = useState<ReliefSummary | null>(null);
  const [coverage, setCoverage]       = useState<CoverageData | null>(null);
  const [coverageSitio, setCoverageSitio] = useState('');
  const [coverageItem, setCoverageItem]   = useState('');
  const [coverageTab, setCoverageTab]     = useState<'unclaimed' | 'claimed'>('unclaimed');
  const [coverageSearch, setCoverageSearch] = useState('');
  const [claimWarn, setClaimWarn]     = useState<ClaimCheck | null>(null);
  const emptyRelief = {
    disasterName:'', residentId: undefined as number|undefined,
    recipientName:'', sitio:'Proper', address:'',
    reliefItem:'Food Pack', quantity:1, unit:'pack',
    distributedBy: user?.fullName ?? '', notes:'',
  };
  const [reliefForm, setReliefForm] = useState<typeof emptyRelief>(emptyRelief);

  const loadVulnerable = () =>
    get<{ vulnerable: VulnerableResident[]; summary: VulnerableSummary }>('/api/emergency/vulnerable')
      .then(d => { setVulnerable(d.vulnerable); setVulnSummary(d.summary); });

  const loadCenters  = () => get<EvacuationCenter[]>('/api/emergency/centers').then(setCenters);
  const loadEvacuees = (cid?: number) => {
    const q = cid ? `?centerId=${cid}` : '';
    get<EvacueeLog[]>(`/api/emergency/evacuees${q}`).then(setEvacuees);
  };
  const loadRelief = (d?: string) => {
    const q = d ? `?disaster=${encodeURIComponent(d)}` : '';
    get<ReliefLog[]>(`/api/emergency/relief${q}`).then(setRelief);
    get<string[]>('/api/emergency/relief/disasters').then(setDisasters);
  };
  const loadReliefSummary = useCallback((d: string) => {
    if (!d) { setReliefSummary(null); return; }
    get<ReliefSummary>(`/api/emergency/relief/summary?disaster=${encodeURIComponent(d)}`).then(setReliefSummary).catch(() => setReliefSummary(null));
  }, []);
  const loadCoverage = useCallback((d: string, sitio?: string, item?: string) => {
    if (!d) { setCoverage(null); return; }
    const p = new URLSearchParams({ disaster: d });
    if (sitio) p.set('sitio', sitio);
    if (item)  p.set('item', item);
    get<CoverageData>(`/api/emergency/relief/coverage?${p}`).then(setCoverage).catch(() => setCoverage(null));
  }, []);
  const loadResidents = () => get<Resident[]>('/api/residents').then(setResidents);

  useEffect(() => { loadVulnerable(); loadCenters(); loadEvacuees(); loadRelief(); loadResidents(); }, []);
  useEffect(() => { loadEvacuees(evacueeCenter || undefined); }, [evacueeCenter]);
  useEffect(() => {
    loadRelief(disasterFilter || undefined);
    loadReliefSummary(disasterFilter);
    loadCoverage(disasterFilter, coverageSitio || undefined, coverageItem || undefined);
  }, [disasterFilter]);
  useEffect(() => {
    loadCoverage(disasterFilter, coverageSitio || undefined, coverageItem || undefined);
  }, [coverageSitio, coverageItem]);

  // Filtered vulnerable
  const filteredVuln = useMemo(() => {
    let list = vulnerable;
    if (vulnFilter === 'senior')  list = list.filter(r => r.isSenior || r.age >= 60);
    if (vulnFilter === 'pwd')     list = list.filter(r => r.isPWD);
    if (vulnFilter === 'minor')   list = list.filter(r => r.isMinor);
    if (vulnFilter === '4ps')     list = list.filter(r => r.is4Ps);
    if (vulnSitio)                list = list.filter(r => r.sitio === vulnSitio);
    if (vulnSearch.trim()) {
      const q = vulnSearch.toLowerCase();
      list = list.filter(r => `${r.firstName} ${r.lastName}`.toLowerCase().includes(q) || r.address.toLowerCase().includes(q));
    }
    return list;
  }, [vulnerable, vulnFilter, vulnSitio, vulnSearch]);

  // Resident search results
  const resResults = useMemo(() => {
    if (!resSearch.trim()) return [];
    const q = resSearch.toLowerCase();
    return residents.filter(r => `${r.firstName} ${r.lastName}`.toLowerCase().includes(q) || r.householdNo.toLowerCase().includes(q)).slice(0, 8);
  }, [residents, resSearch]);

  const reliefResResults = useMemo(() => {
    if (!reliefResSearch.trim()) return [];
    const q = reliefResSearch.toLowerCase();
    return residents.filter(r => `${r.firstName} ${r.lastName}`.toLowerCase().includes(q)).slice(0, 8);
  }, [residents, reliefResSearch]);

  // Center occupancy
  const occupancy = (centerId: number) => evacuees.filter(e => e.evacuationCenterId === centerId && e.status === 'Present').reduce((a, e) => a + e.headCount, 0);

  return (
    <div className="em-page">
      <div className="em-header-row">
        <div>
          <h1 className="em-title">🆘 Emergency & Disaster Module</h1>
          <p className="em-subtitle">Barangay Damolog — Vulnerable Residents, Evacuation & Relief</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="em-tabs">
        {(['vulnerable','centers','evacuees','relief'] as Tab[]).map(t => (
          <button key={t} className={`em-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t === 'vulnerable' ? '⚠️ Vulnerable' : t === 'centers' ? '🏫 Evacuation Centers' : t === 'evacuees' ? '🏃 Evacuees' : '📦 Relief Distribution'}
          </button>
        ))}
      </div>

      {/* ── VULNERABLE TAB ── */}
      {tab === 'vulnerable' && (
        <div>
          {vulnSummary && (
            <div className="em-stats-bar">
              <div className="em-stat-card"><div className="em-stat-val">{vulnSummary.total}</div><div className="em-stat-lbl">Total Vulnerable</div></div>
              <div className="em-stat-card em-stat-orange"><div className="em-stat-val">{vulnSummary.seniors}</div><div className="em-stat-lbl">Seniors (60+)</div></div>
              <div className="em-stat-card em-stat-purple"><div className="em-stat-val">{vulnSummary.pWD}</div><div className="em-stat-lbl">PWD</div></div>
              <div className="em-stat-card em-stat-blue"><div className="em-stat-val">{vulnSummary.minors}</div><div className="em-stat-lbl">Minors (&lt;18)</div></div>
              <div className="em-stat-card em-stat-green"><div className="em-stat-val">{vulnSummary.fourPs}</div><div className="em-stat-lbl">4Ps Beneficiaries</div></div>
            </div>
          )}
          <div className="em-filter-row">
            <input className="em-search" placeholder="Search name or address…" value={vulnSearch} onChange={e => setVulnSearch(e.target.value)} />
            <div className="em-pills">
              {[['','All'],['senior','Seniors'],['pwd','PWD'],['minor','Minors'],['4ps','4Ps']].map(([v,l]) => (
                <button key={v} className={`pill ${vulnFilter===v?'active':''}`} onClick={() => setVulnFilter(v)}>{l}</button>
              ))}
            </div>
            <select className="em-select" value={vulnSitio} onChange={e => setVulnSitio(e.target.value)}>
              <option value="">All Sitios</option>
              {SITIOS.map(s => <option key={s}>{s}</option>)}
            </select>
            <button className="btn-print" onClick={() => printVulnerable(filteredVuln, vulnFilter || 'All')}>🖨️ Print List</button>
          </div>
          <div className="em-count">{filteredVuln.length} resident{filteredVuln.length !== 1 ? 's' : ''}</div>
          <div className="em-table-wrap">
            <table className="em-table">
              <thead><tr><th>Name</th><th>Age</th><th>Sex</th><th>Sitio</th><th>Address</th><th>HH#</th><th>Contact</th><th>Tags</th></tr></thead>
              <tbody>
                {filteredVuln.length === 0 && <tr><td colSpan={8} className="em-empty">No records found.</td></tr>}
                {filteredVuln.map(r => (
                  <tr key={r.id}>
                    <td>{r.lastName}, {r.firstName} {r.middleName ? r.middleName[0]+'.' : ''}</td>
                    <td>{r.age}</td>
                    <td>{r.gender}</td>
                    <td>{r.sitio}</td>
                    <td>{r.address}</td>
                    <td>{r.householdNo || '—'}</td>
                    <td>{r.contactNumber || '—'}</td>
                    <td>
                      {(r.isSenior || r.age >= 60) && <VulnTag label="Senior" color="orange" />}
                      {r.isPWD    && <VulnTag label="PWD"    color="purple" />}
                      {r.isMinor  && <VulnTag label="Minor"  color="blue"   />}
                      {r.is4Ps   && <VulnTag label="4Ps"    color="green"  />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── EVACUATION CENTERS TAB ── */}
      {tab === 'centers' && (
        <div>
          <div className="em-toolbar">
            <button className="btn-primary" onClick={() => { setEditCenter(null); setCenterForm(emptyCenter); setCenterModal(true); }}>+ Add Center</button>
          </div>
          <div className="em-center-grid">
            {centers.length === 0 && <div className="em-empty-box">No evacuation centers registered.</div>}
            {centers.map(c => (
              <div key={c.id} className="em-center-card">
                <div className="em-center-top">
                  <div>
                    <div className="em-center-name">{c.name}</div>
                    <div className="em-center-loc">📍 {c.location} — {c.sitio}</div>
                  </div>
                  <StatusBadge status={c.status} />
                </div>
                <div className="em-center-stats">
                  <span>🏠 Capacity: {c.capacity}</span>
                  <span>🏃 Present: {occupancy(c.id)}</span>
                  {c.contactPerson && <span>👤 {c.contactPerson}</span>}
                  {c.contactNumber && <span>📞 {c.contactNumber}</span>}
                </div>
                {c.notes && <div className="em-center-notes">{c.notes}</div>}
                <div className="em-center-actions">
                  <button className="btn-sm" onClick={() => { setEditCenter(c); setCenterForm({ name:c.name, location:c.location, sitio:c.sitio, capacity:c.capacity, status:c.status, contactPerson:c.contactPerson, contactNumber:c.contactNumber, notes:c.notes }); setCenterModal(true); }}>Edit</button>
                  <button className="btn-sm btn-danger" onClick={async () => { if (confirm('Delete this center?')) { await del(`/api/emergency/centers/${c.id}`); loadCenters(); } }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Center Modal */}
      {centerModal && (
        <div className="em-overlay" onClick={() => setCenterModal(false)}>
          <div className="em-modal" onClick={e => e.stopPropagation()}>
            <div className="em-modal-header">
              <h2>{editCenter ? 'Edit Center' : 'Add Evacuation Center'}</h2>
              <button className="em-close" onClick={() => setCenterModal(false)}>✕</button>
            </div>
            <div className="em-modal-body">
              <div className="em-form-grid">
                <label>Name<input value={centerForm.name} onChange={e => setCenterForm(f=>({...f,name:e.target.value}))} /></label>
                <label>Location<input value={centerForm.location} onChange={e => setCenterForm(f=>({...f,location:e.target.value}))} /></label>
                <label>Sitio
                  <select value={centerForm.sitio} onChange={e => setCenterForm(f=>({...f,sitio:e.target.value}))}>
                    {SITIOS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </label>
                <label>Capacity<input type="number" value={centerForm.capacity} onChange={e => setCenterForm(f=>({...f,capacity:+e.target.value}))} /></label>
                <label>Status
                  <select value={centerForm.status} onChange={e => setCenterForm(f=>({...f,status:e.target.value}))}>
                    {EVACUATION_STATUSES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </label>
                <label>Contact Person<input value={centerForm.contactPerson} onChange={e => setCenterForm(f=>({...f,contactPerson:e.target.value}))} /></label>
                <label>Contact Number<input value={centerForm.contactNumber} onChange={e => setCenterForm(f=>({...f,contactNumber:e.target.value}))} /></label>
                <label className="span2">Notes<textarea value={centerForm.notes} onChange={e => setCenterForm(f=>({...f,notes:e.target.value}))} rows={2} /></label>
              </div>
            </div>
            <div className="em-modal-footer">
              <button className="btn-secondary" onClick={() => setCenterModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={async () => {
                if (editCenter) await put(`/api/emergency/centers/${editCenter.id}`, centerForm);
                else await post('/api/emergency/centers', centerForm);
                setCenterModal(false); loadCenters();
              }}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* ── EVACUEES TAB ── */}
      {tab === 'evacuees' && (
        <div>
          <div className="em-toolbar">
            <select className="em-select" value={evacueeCenter} onChange={e => setEvacueeCenter(e.target.value ? +e.target.value : '')}>
              <option value="">All Centers</option>
              {centers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button className="btn-primary" onClick={() => { setEvacueeForm({...emptyEvacuee, evacuationCenterId: evacueeCenter || 0}); setResSearch(''); setEvacueeModal(true); }}>+ Check In</button>
            <button className="btn-print" onClick={() => printEvacuees(evacuees, centers.find(c=>c.id===evacueeCenter)?.name ?? 'All Centers')}>🖨️ Print</button>
            <div className="em-evac-summary">
              <span>👨‍👩‍👧 Families: {evacuees.filter(e=>e.status==='Present').length}</span>
              <span>👥 Persons: {evacuees.filter(e=>e.status==='Present').reduce((a,e)=>a+e.headCount,0)}</span>
            </div>
          </div>
          <div className="em-table-wrap">
            <table className="em-table">
              <thead><tr><th>Name</th><th>Center</th><th>Sitio</th><th>Address</th><th>Persons</th><th>Special Needs</th><th>Check-in</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {evacuees.length === 0 && <tr><td colSpan={9} className="em-empty">No evacuees logged.</td></tr>}
                {evacuees.map(e => (
                  <tr key={e.id}>
                    <td>{e.evacueeName}</td>
                    <td>{e.centerName}</td>
                    <td>{e.sitio}</td>
                    <td>{e.address}</td>
                    <td style={{textAlign:'center'}}>{e.headCount}</td>
                    <td>
                      {e.hasSenior   && <span className="em-badge badge-orange">Senior</span>}
                      {e.hasPWD      && <span className="em-badge badge-purple">PWD</span>}
                      {e.hasInfant   && <span className="em-badge badge-blue">Infant</span>}
                      {e.hasPregnant && <span className="em-badge badge-pink">Pregnant</span>}
                    </td>
                    <td>{fmt(e.checkedInAt)}</td>
                    <td><StatusBadge status={e.status} /></td>
                    <td>
                      {e.status === 'Present' && (
                        <button className="btn-sm" onClick={async () => { await patch(`/api/emergency/evacuees/${e.id}/checkout`); loadEvacuees(evacueeCenter || undefined); }}>Check Out</button>
                      )}
                      <button className="btn-sm btn-danger" onClick={async () => { if (confirm('Remove this record?')) { await del(`/api/emergency/evacuees/${e.id}`); loadEvacuees(evacueeCenter || undefined); } }}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Evacuee Modal */}
      {evacueeModal && (
        <div className="em-overlay" onClick={() => setEvacueeModal(false)}>
          <div className="em-modal" onClick={e => e.stopPropagation()}>
            <div className="em-modal-header">
              <h2>Check In Evacuee</h2>
              <button className="em-close" onClick={() => setEvacueeModal(false)}>✕</button>
            </div>
            <div className="em-modal-body">
              <div className="em-form-grid">
                <label className="span2">Search Resident (optional)
                  <input placeholder="Type name to search…" value={resSearch} onChange={e => setResSearch(e.target.value)} />
                  {resResults.length > 0 && (
                    <div className="em-res-dropdown">
                      {resResults.map(r => (
                        <div key={r.id} className="em-res-item" onClick={() => {
                          setEvacueeForm(f => ({...f, residentId:r.id, evacueeName:`${r.lastName}, ${r.firstName}`, sitio:r.sitio, address:r.address, hasSenior:r.isSenior, hasPWD:r.isPWD}));
                          setResSearch(`${r.lastName}, ${r.firstName}`);
                        }}>
                          {r.lastName}, {r.firstName} — {r.sitio} — {r.address}
                        </div>
                      ))}
                    </div>
                  )}
                </label>
                <label>Evacuee Name<input value={evacueeForm.evacueeName} onChange={e => setEvacueeForm(f=>({...f,evacueeName:e.target.value}))} /></label>
                <label>Center
                  <select value={evacueeForm.evacuationCenterId} onChange={e => setEvacueeForm(f=>({...f,evacuationCenterId:+e.target.value}))}>
                    <option value={0}>— Select —</option>
                    {centers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </label>
                <label>Sitio
                  <select value={evacueeForm.sitio} onChange={e => setEvacueeForm(f=>({...f,sitio:e.target.value}))}>
                    {SITIOS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </label>
                <label>Address<input value={evacueeForm.address} onChange={e => setEvacueeForm(f=>({...f,address:e.target.value}))} /></label>
                <label>No. of Persons<input type="number" min={1} value={evacueeForm.headCount} onChange={e => setEvacueeForm(f=>({...f,headCount:+e.target.value}))} /></label>
                <label>Recorded By<input value={evacueeForm.recordedBy} onChange={e => setEvacueeForm(f=>({...f,recordedBy:e.target.value}))} /></label>
                <label className="span2 em-checkboxes">Special Needs
                  <div className="em-checks">
                    <label><input type="checkbox" checked={evacueeForm.hasSenior} onChange={e => setEvacueeForm(f=>({...f,hasSenior:e.target.checked}))} /> Senior</label>
                    <label><input type="checkbox" checked={evacueeForm.hasPWD} onChange={e => setEvacueeForm(f=>({...f,hasPWD:e.target.checked}))} /> PWD</label>
                    <label><input type="checkbox" checked={evacueeForm.hasInfant} onChange={e => setEvacueeForm(f=>({...f,hasInfant:e.target.checked}))} /> Infant</label>
                    <label><input type="checkbox" checked={evacueeForm.hasPregnant} onChange={e => setEvacueeForm(f=>({...f,hasPregnant:e.target.checked}))} /> Pregnant</label>
                  </div>
                </label>
                <label className="span2">Notes<textarea value={evacueeForm.notes} onChange={e => setEvacueeForm(f=>({...f,notes:e.target.value}))} rows={2} /></label>
              </div>
            </div>
            <div className="em-modal-footer">
              <button className="btn-secondary" onClick={() => setEvacueeModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={async () => {
                if (!evacueeForm.evacueeName || !evacueeForm.evacuationCenterId) return alert('Name and center are required.');
                await post('/api/emergency/evacuees', evacueeForm);
                setEvacueeModal(false); loadEvacuees(evacueeCenter || undefined);
              }}>Check In</button>
            </div>
          </div>
        </div>
      )}

      {/* ── RELIEF DISTRIBUTION TAB ── */}
      {tab === 'relief' && (
        <div>
          {/* Disaster selector + actions */}
          <div className="em-toolbar" style={{ flexWrap: 'wrap', gap: 10 }}>
            <select className="em-select" value={disasterFilter} onChange={e => setDisasterFilter(e.target.value)}>
              <option value="">— Select Disaster / Event —</option>
              {disasters.map(d => <option key={d}>{d}</option>)}
            </select>
            <button className="btn-primary" onClick={() => { setReliefForm(emptyRelief); setReliefResSearch(''); setClaimWarn(null); setReliefModal(true); }}>+ Log Distribution</button>
            <button className="btn-print" onClick={() => printRelief(relief, disasterFilter || 'All Events')}>🖨️ Print Report</button>
            {disasterFilter && (
              <div className="em-view-toggle">
                <button className={reliefView === 'log' ? 'active' : ''} onClick={() => setReliefView('log')}>📋 Log</button>
                <button className={reliefView === 'coverage' ? 'active' : ''} onClick={() => setReliefView('coverage')}>📊 Coverage</button>
              </div>
            )}
          </div>

          {/* ── Summary cards (when disaster selected) ── */}
          {disasterFilter && reliefSummary && (
            <div className="em-stats-bar" style={{ marginBottom: 16 }}>
              <div className="em-stat-card em-stat-green">
                <div className="em-stat-val">{reliefSummary.uniqueRecipients}</div>
                <div className="em-stat-lbl">Linked Recipients</div>
              </div>
              <div className="em-stat-card">
                <div className="em-stat-val">{reliefSummary.totalLogs}</div>
                <div className="em-stat-lbl">Total Logs</div>
              </div>
              {coverage && (
                <>
                  <div className="em-stat-card em-stat-blue">
                    <div className="em-stat-val">{coverage.coveragePct}%</div>
                    <div className="em-stat-lbl">Coverage</div>
                  </div>
                  <div className="em-stat-card em-stat-orange">
                    <div className="em-stat-val">{coverage.unclaimedCount}</div>
                    <div className="em-stat-lbl">Not Yet Received</div>
                  </div>
                </>
              )}
              {reliefSummary.doubleClaims.length > 0 && (
                <div className="em-stat-card" style={{ borderColor: '#fca5a5', background: '#fff1f2' }}>
                  <div className="em-stat-val" style={{ color: '#dc2626' }}>{reliefSummary.doubleClaims.length}</div>
                  <div className="em-stat-lbl" style={{ color: '#dc2626' }}>⚠️ Double Claims</div>
                </div>
              )}
              {reliefSummary.unlinkedLogs > 0 && (
                <div className="em-stat-card" style={{ borderColor: '#fde68a', background: '#fffbeb' }}>
                  <div className="em-stat-val" style={{ color: '#92400e' }}>{reliefSummary.unlinkedLogs}</div>
                  <div className="em-stat-lbl" style={{ color: '#92400e' }}>Unlinked Logs</div>
                </div>
              )}
            </div>
          )}

          {/* Double-claim alert banner */}
          {disasterFilter && reliefSummary && reliefSummary.doubleClaims.length > 0 && (
            <div className="em-warn-banner">
              ⚠️ <strong>{reliefSummary.doubleClaims.length} resident{reliefSummary.doubleClaims.length > 1 ? 's' : ''}</strong> received aid more than once for <em>{disasterFilter}</em>:&nbsp;
              {reliefSummary.doubleClaims.map(d => d.name).join(', ')}
            </div>
          )}

          {/* ── LOG VIEW ── */}
          {reliefView === 'log' && (
            <>
              {!disasterFilter && (
                <div className="em-info-hint">Select a disaster/event above to see distribution intelligence, or log a new distribution.</div>
              )}
              {/* Item breakdown */}
              {disasterFilter && reliefSummary && reliefSummary.byItem.length > 0 && (
                <div className="em-breakdown-row">
                  {reliefSummary.byItem.map(b => (
                    <div key={b.item} className="em-breakdown-chip">
                      <span className="em-breakdown-item">{b.item}</span>
                      <span className="em-breakdown-count">{b.recipients} recipients · {b.totalQty} {b.item === 'Food Pack' ? 'packs' : 'units'}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="em-table-wrap">
                <table className="em-table">
                  <thead><tr><th>Recipient</th><th>Sitio</th><th>Address</th><th>Item</th><th>Qty</th><th>Distributed By</th><th>Event</th><th>Date</th><th></th></tr></thead>
                  <tbody>
                    {relief.length === 0 && <tr><td colSpan={9} className="em-empty">No relief logs found.</td></tr>}
                    {relief.map(r => (
                      <tr key={r.id}>
                        <td style={{ fontWeight: 600 }}>{r.recipientName}</td>
                        <td>{r.sitio}</td>
                        <td>{r.address}</td>
                        <td><span className="em-badge badge-green">{r.reliefItem}</span></td>
                        <td>{r.quantity} {r.unit}</td>
                        <td>{r.distributedBy}</td>
                        <td>{r.disasterName}</td>
                        <td>{fmtDate(r.distributedAt)}</td>
                        <td><button className="btn-sm btn-danger" onClick={async () => { if (confirm('Delete this record?')) { await del(`/api/emergency/relief/${r.id}`); loadRelief(disasterFilter || undefined); loadReliefSummary(disasterFilter); loadCoverage(disasterFilter, coverageSitio || undefined, coverageItem || undefined); } }}>✕</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ── COVERAGE VIEW ── */}
          {reliefView === 'coverage' && disasterFilter && (
            <div>
              <div className="em-coverage-filters">
                <select className="em-select" value={coverageSitio} onChange={e => setCoverageSitio(e.target.value)}>
                  <option value="">All Sitios</option>
                  {SITIOS.map(s => <option key={s}>{s}</option>)}
                </select>
                <select className="em-select" value={coverageItem} onChange={e => setCoverageItem(e.target.value)}>
                  <option value="">All Items</option>
                  {RELIEF_ITEMS.map(i => <option key={i}>{i}</option>)}
                </select>
                <input className="em-search" placeholder="Search name…" value={coverageSearch} onChange={e => setCoverageSearch(e.target.value)} />
                {coverage && (
                  <button className="btn-print" onClick={() => printCoverage(coverage.unclaimed, disasterFilter, coverageSitio)}>🖨️ Print Unclaimed</button>
                )}
              </div>

              {coverage && (
                <>
                  {/* Progress bar */}
                  <div className="em-progress-wrap">
                    <div className="em-progress-label">
                      <span>Coverage: <strong>{coverage.claimedCount}</strong> of <strong>{coverage.totalResidents}</strong> residents</span>
                      <span style={{ color: coverage.coveragePct >= 80 ? '#166534' : coverage.coveragePct >= 50 ? '#92400e' : '#991b1b', fontWeight: 700 }}>{coverage.coveragePct}%</span>
                    </div>
                    <div className="em-progress-bar">
                      <div className="em-progress-fill" style={{ width: `${coverage.coveragePct}%`, background: coverage.coveragePct >= 80 ? '#16a34a' : coverage.coveragePct >= 50 ? '#d97706' : '#dc2626' }} />
                    </div>
                  </div>

                  {/* Sitio breakdown */}
                  {reliefSummary && reliefSummary.bySitio.length > 0 && (
                    <div className="em-breakdown-row" style={{ marginBottom: 14 }}>
                      {reliefSummary.bySitio.map(s => (
                        <div key={s.sitio} className="em-breakdown-chip" style={{ cursor: 'pointer', borderColor: coverageSitio === s.sitio ? '#1a56db' : undefined }}
                          onClick={() => setCoverageSitio(coverageSitio === s.sitio ? '' : s.sitio)}>
                          <span className="em-breakdown-item">{s.sitio}</span>
                          <span className="em-breakdown-count">{s.recipients} received</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Claimed / Unclaimed tabs */}
                  <div className="em-cov-tabs">
                    <button className={coverageTab === 'unclaimed' ? 'active' : ''} onClick={() => setCoverageTab('unclaimed')}>
                      ❌ Not Yet Received ({coverage.unclaimedCount})
                    </button>
                    <button className={coverageTab === 'claimed' ? 'active' : ''} onClick={() => setCoverageTab('claimed')}>
                      ✅ Already Received ({coverage.claimedCount})
                    </button>
                  </div>

                  {coverageTab === 'unclaimed' && (() => {
                    const list = coverage.unclaimed.filter(r => {
                      if (!coverageSearch.trim()) return true;
                      const q = coverageSearch.toLowerCase();
                      return `${r.firstName} ${r.lastName}`.toLowerCase().includes(q) || r.address.toLowerCase().includes(q);
                    });
                    return (
                      <div className="em-table-wrap">
                        <table className="em-table">
                          <thead><tr><th>Name</th><th>Age</th><th>Sitio</th><th>Address</th><th>HH#</th><th>Contact</th><th>Tags</th><th>Action</th></tr></thead>
                          <tbody>
                            {list.length === 0 && <tr><td colSpan={8} className="em-empty">All residents in this filter have received aid.</td></tr>}
                            {list.map(r => (
                              <tr key={r.id} className="em-unclaimed-row">
                                <td style={{ fontWeight: 600 }}>{r.lastName}, {r.firstName} {r.middleName ? r.middleName[0]+'.' : ''}</td>
                                <td>{r.age ?? '—'}</td>
                                <td>{r.sitio}</td>
                                <td>{r.address}</td>
                                <td>{r.householdNo || '—'}</td>
                                <td>{r.contactNumber || '—'}</td>
                                <td>
                                  {(r.isSenior) && <span className="em-badge badge-orange">Senior</span>}
                                  {r.isPWD     && <span className="em-badge badge-purple">PWD</span>}
                                  {r.isMinor   && <span className="em-badge badge-blue">Minor</span>}
                                  {r.is4Ps     && <span className="em-badge badge-green">4Ps</span>}
                                </td>
                                <td>
                                  <button className="btn-sm" style={{ color: '#1a56db', borderColor: '#93c5fd' }} onClick={() => {
                                    setReliefForm({ ...emptyRelief, disasterName: disasterFilter, residentId: r.id, recipientName: `${r.lastName}, ${r.firstName}`, sitio: r.sitio, address: r.address });
                                    setReliefResSearch(`${r.lastName}, ${r.firstName}`);
                                    setClaimWarn(null);
                                    setReliefModal(true);
                                  }}>+ Log</button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  })()}

                  {coverageTab === 'claimed' && (() => {
                    const list = coverage.claimed.filter(r => {
                      if (!coverageSearch.trim()) return true;
                      const q = coverageSearch.toLowerCase();
                      return `${r.firstName} ${r.lastName}`.toLowerCase().includes(q) || r.address.toLowerCase().includes(q);
                    });
                    return (
                      <div className="em-table-wrap">
                        <table className="em-table">
                          <thead><tr><th>Name</th><th>Age</th><th>Sitio</th><th>Address</th><th>Tags</th><th>Items Received</th></tr></thead>
                          <tbody>
                            {list.length === 0 && <tr><td colSpan={6} className="em-empty">No residents have received aid yet.</td></tr>}
                            {list.map(r => (
                              <tr key={r.id}>
                                <td style={{ fontWeight: 600 }}>{r.lastName}, {r.firstName} {r.middleName ? r.middleName[0]+'.' : ''}</td>
                                <td>{r.age ?? '—'}</td>
                                <td>{r.sitio}</td>
                                <td>{r.address}</td>
                                <td>
                                  {r.isSenior && <span className="em-badge badge-orange">Senior</span>}
                                  {r.isPWD    && <span className="em-badge badge-purple">PWD</span>}
                                  {r.isMinor  && <span className="em-badge badge-blue">Minor</span>}
                                  {r.is4Ps    && <span className="em-badge badge-green">4Ps</span>}
                                </td>
                                <td>
                                  {r.logs && r.logs.length > 1 && (
                                    <span className="em-badge" style={{ background: '#fee2e2', color: '#991b1b', marginRight: 6 }}>⚠️ {r.logs.length}x</span>
                                  )}
                                  {r.logs?.map((l, i) => (
                                    <span key={i} className="em-badge badge-gray" style={{ marginRight: 4 }}>{l.reliefItem} ×{l.quantity}</span>
                                  ))}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  })()}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Relief Modal */}
      {reliefModal && (
        <div className="em-overlay" onClick={() => setReliefModal(false)}>
          <div className="em-modal" onClick={e => e.stopPropagation()}>
            <div className="em-modal-header">
              <h2>📦 Log Relief Distribution</h2>
              <button className="em-close" onClick={() => setReliefModal(false)}>✕</button>
            </div>
            <div className="em-modal-body">
              {/* Double-claim warning */}
              {claimWarn?.alreadyClaimed && (
                <div className="em-warn-banner" style={{ marginBottom: 12 }}>
                  ⚠️ This resident already received <strong>{claimWarn.logs.map(l => `${l.reliefItem} ×${l.quantity}`).join(', ')}</strong> for this disaster. Logging again will count as a double claim.
                </div>
              )}
              <div className="em-form-grid">
                <label className="span2">Search Resident (optional — links for tracking)
                  <input placeholder="Type name to search…" value={reliefResSearch} onChange={e => setReliefResSearch(e.target.value)} />
                  {reliefResResults.length > 0 && (
                    <div className="em-res-dropdown">
                      {reliefResResults.map(r => (
                        <div key={r.id} className="em-res-item" onClick={async () => {
                          setReliefForm(f => ({...f, residentId:r.id, recipientName:`${r.lastName}, ${r.firstName}`, sitio:r.sitio, address:r.address}));
                          setReliefResSearch(`${r.lastName}, ${r.firstName}`);
                          // Check for double claim
                          if (reliefForm.disasterName) {
                            const check = await get<ClaimCheck>(`/api/emergency/relief/check?residentId=${r.id}&disaster=${encodeURIComponent(reliefForm.disasterName)}&item=${encodeURIComponent(reliefForm.reliefItem)}`);
                            setClaimWarn(check);
                          }
                        }}>
                          {r.lastName}, {r.firstName} — {r.sitio} — {r.address}
                        </div>
                      ))}
                    </div>
                  )}
                </label>
                <label>Recipient Name<input value={reliefForm.recipientName} onChange={e => setReliefForm(f=>({...f,recipientName:e.target.value}))} /></label>
                <label>Disaster / Event
                  <input value={reliefForm.disasterName} list="disaster-list" placeholder="e.g. Typhoon Carina"
                    onChange={e => setReliefForm(f=>({...f,disasterName:e.target.value}))} />
                  <datalist id="disaster-list">{disasters.map(d => <option key={d} value={d} />)}</datalist>
                </label>
                <label>Sitio
                  <select value={reliefForm.sitio} onChange={e => setReliefForm(f=>({...f,sitio:e.target.value}))}>
                    {SITIOS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </label>
                <label>Address<input value={reliefForm.address} onChange={e => setReliefForm(f=>({...f,address:e.target.value}))} /></label>
                <label>Relief Item
                  <select value={reliefForm.reliefItem} onChange={async e => {
                    const item = e.target.value;
                    setReliefForm(f=>({...f,reliefItem:item}));
                    if (reliefForm.residentId && reliefForm.disasterName) {
                      const check = await get<ClaimCheck>(`/api/emergency/relief/check?residentId=${reliefForm.residentId}&disaster=${encodeURIComponent(reliefForm.disasterName)}&item=${encodeURIComponent(item)}`);
                      setClaimWarn(check);
                    }
                  }}>
                    {RELIEF_ITEMS.map(i => <option key={i}>{i}</option>)}
                  </select>
                </label>
                <label>Quantity<input type="number" min={1} value={reliefForm.quantity} onChange={e => setReliefForm(f=>({...f,quantity:+e.target.value}))} /></label>
                <label>Unit<input value={reliefForm.unit} placeholder="pack, kg, bottle…" onChange={e => setReliefForm(f=>({...f,unit:e.target.value}))} /></label>
                <label>Distributed By<input value={reliefForm.distributedBy} onChange={e => setReliefForm(f=>({...f,distributedBy:e.target.value}))} /></label>
                <label className="span2">Notes<textarea value={reliefForm.notes} onChange={e => setReliefForm(f=>({...f,notes:e.target.value}))} rows={2} /></label>
              </div>
            </div>
            <div className="em-modal-footer">
              <button className="btn-secondary" onClick={() => setReliefModal(false)}>Cancel</button>
              <button className="btn-primary" style={claimWarn?.alreadyClaimed ? { background: '#d97706' } : {}} onClick={async () => {
                if (!reliefForm.recipientName || !reliefForm.disasterName) return alert('Recipient and event name are required.');
                await post('/api/emergency/relief', reliefForm);
                setReliefModal(false);
                setClaimWarn(null);
                loadRelief(disasterFilter || undefined);
                loadReliefSummary(disasterFilter);
                loadCoverage(disasterFilter, coverageSitio || undefined, coverageItem || undefined);
              }}>{claimWarn?.alreadyClaimed ? '⚠️ Save Anyway' : '💾 Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
