import { useEffect, useState } from 'react';
import { get, post, put, del } from '../api';
import { useAuth } from '../auth';
import { SITIOS, VACCINE_NAMES, DOSE_NUMBERS, CHRONIC_CONDITIONS, BLOOD_TYPES, HEALTH_WORKER_ROLES } from '../types';
import type { HealthResidentRow, VaccinationRecord, HealthWorker, HealthSummary, HealthRecord } from '../types';
import './Health.css';

type Tab = 'overview' | 'records' | 'vaccinations' | 'workers';

const CONDITION_COLORS = ['#1a56db','#059669','#d97706','#dc2626','#7c3aed','#0891b2','#be185d','#065f46','#92400e','#374151','#6b7280'];

export default function Health() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('overview');

  // Overview
  const [summary, setSummary] = useState<HealthSummary | null>(null);

  // Records tab
  const [residents, setResidents] = useState<HealthResidentRow[]>([]);
  const [resSearch, setResSearch] = useState('');
  const [resSitio, setResSitio] = useState('');
  const [resCondition, setResCondition] = useState('');
  const [recordModal, setRecordModal] = useState(false);
  const [editResident, setEditResident] = useState<HealthResidentRow | null>(null);
  const [rForm, setRForm] = useState<Partial<HealthRecord>>({});

  // Vaccinations tab
  const [vaccinations, setVaccinations] = useState<VaccinationRecord[]>([]);
  const [vaxSearch, setVaxSearch] = useState('');
  const [vaxVaccine, setVaxVaccine] = useState('');
  const [vaxSitio, setVaxSitio] = useState('');
  const [vaxModal, setVaxModal] = useState(false);
  const [vForm, setVForm] = useState({ residentId: 0, residentName: '', vaccineName: '', doseNumber: '1st Dose', dateGiven: '', batchNo: '', administeredBy: '', venue: 'Barangay Health Center', nextDoseDate: '', notes: '' });
  const [resPickerSearch, setResPickerSearch] = useState('');
  const [allResidents, setAllResidents] = useState<HealthResidentRow[]>([]);

  // Workers tab
  const [workers, setWorkers] = useState<HealthWorker[]>([]);
  const [workerModal, setWorkerModal] = useState(false);
  const [editWorker, setEditWorker] = useState<HealthWorker | null>(null);
  const [wForm, setWForm] = useState({ name: '', role: 'BHW', sitio: '', contactNumber: '', qualifications: '', isActive: true, notes: '' });

  const loadSummary     = () => get<HealthSummary>('/api/health/summary').then(setSummary).catch(console.error);
  const loadResidents   = () => {
    const p = new URLSearchParams();
    if (resSitio)     p.set('sitio', resSitio);
    if (resCondition) p.set('condition', resCondition);
    get<HealthResidentRow[]>(`/api/health/records?${p}`).then(r => { setResidents(r); setAllResidents(r); }).catch(console.error);
  };
  const loadVaccinations = () => {
    const p = new URLSearchParams();
    if (vaxVaccine) p.set('vaccine', vaxVaccine);
    if (vaxSitio)   p.set('sitio', vaxSitio);
    get<VaccinationRecord[]>(`/api/health/vaccinations?${p}`).then(setVaccinations).catch(console.error);
  };
  const loadWorkers = () => get<HealthWorker[]>('/api/health/workers').then(setWorkers).catch(console.error);

  useEffect(() => { loadSummary(); loadResidents(); }, []);
  useEffect(() => {
    if (tab === 'vaccinations') loadVaccinations();
    if (tab === 'workers') loadWorkers();
  }, [tab]);

  // ── Record handlers ──
  const openRecord = (r: HealthResidentRow) => {
    setEditResident(r);
    setRForm(r.healthRecord ?? { residentId: r.id, bloodType: '', allergies: '', chronicConditions: '', medications: '', philHealthNo: '', notes: '' });
    setRecordModal(true);
  };
  const saveRecord = async () => {
    if (!editResident) return;
    await post('/api/health/records', { ...rForm, residentId: editResident.id, updatedBy: user?.fullName ?? 'admin' });
    setRecordModal(false);
    loadResidents();
    loadSummary();
  };

  // ── Vaccination handlers ──
  const openVaxModal = () => {
    setVForm({ residentId: 0, residentName: '', vaccineName: '', doseNumber: '1st Dose', dateGiven: new Date().toISOString().slice(0,10), batchNo: '', administeredBy: workers.find(w => w.isActive)?.name ?? '', venue: 'Barangay Health Center', nextDoseDate: '', notes: '' });
    setResPickerSearch('');
    setVaxModal(true);
  };
  const saveVax = async () => {
    if (!vForm.residentId) { alert('Please select a resident.'); return; }
    if (!vForm.vaccineName) { alert('Please select a vaccine.'); return; }
    await post('/api/health/vaccinations', { ...vForm, nextDoseDate: vForm.nextDoseDate || null });
    setVaxModal(false);
    loadVaccinations();
    loadSummary();
  };

  // ── Worker handlers ──
  const openCreateWorker = () => {
    setEditWorker(null);
    setWForm({ name: '', role: 'BHW', sitio: '', contactNumber: '', qualifications: '', isActive: true, notes: '' });
    setWorkerModal(true);
  };
  const openEditWorker = (w: HealthWorker) => {
    setEditWorker(w);
    setWForm({ name: w.name, role: w.role, sitio: w.sitio, contactNumber: w.contactNumber, qualifications: w.qualifications, isActive: w.isActive, notes: w.notes });
    setWorkerModal(true);
  };
  const saveWorker = async () => {
    if (editWorker) await put(`/api/health/workers/${editWorker.id}`, wForm);
    else await post('/api/health/workers', wForm);
    setWorkerModal(false);
    loadWorkers();
    loadSummary();
  };
  const deleteWorker = async (w: HealthWorker) => {
    if (!confirm(`Remove ${w.name}?`)) return;
    await del(`/api/health/workers/${w.id}`);
    loadWorkers();
  };

  const filteredRes = residents.filter(r => {
    const q = resSearch.toLowerCase();
    return !q || `${r.lastName} ${r.firstName}`.toLowerCase().includes(q) || r.address.toLowerCase().includes(q);
  });

  const filteredVax = vaccinations.filter(v => {
    const q = vaxSearch.toLowerCase();
    return !q || `${v.resident?.lastName ?? ''} ${v.resident?.firstName ?? ''}`.toLowerCase().includes(q) || v.vaccineName.toLowerCase().includes(q);
  });

  const pickerFiltered = allResidents.filter(r =>
    !resPickerSearch || `${r.lastName} ${r.firstName}`.toLowerCase().includes(resPickerSearch.toLowerCase())
  ).slice(0, 30);

  const printVaxReport = () => {
    const rows = filteredVax.map(v => `
      <tr>
        <td>${v.resident ? `${v.resident.lastName}, ${v.resident.firstName}` : v.residentId}</td>
        <td>${v.resident?.sitio ?? ''}</td>
        <td>${v.vaccineName}</td>
        <td>${v.doseNumber}</td>
        <td>${v.dateGiven?.slice(0,10)}</td>
        <td>${v.administeredBy}</td>
        <td>${v.nextDoseDate?.slice(0,10) ?? '—'}</td>
      </tr>`).join('');
    const html = `<!DOCTYPE html><html><head><title>Vaccination Report</title>
    <style>body{font-family:Arial,sans-serif;font-size:11pt;}h2{text-align:center;}table{width:100%;border-collapse:collapse;}th,td{border:1px solid #ccc;padding:6px 8px;font-size:10pt;}th{background:#f0f0f0;}</style>
    </head><body>
    <h2>Barangay Damolog — Vaccination Report</h2>
    <p style="text-align:center;color:#666;">Printed: ${new Date().toLocaleString('en-PH')}</p>
    <table><thead><tr><th>Resident</th><th>Sitio</th><th>Vaccine</th><th>Dose</th><th>Date Given</th><th>Administered By</th><th>Next Dose</th></tr></thead>
    <tbody>${rows}</tbody></table>
    <script>window.onload=()=>window.print()<\/script></body></html>`;
    const w = window.open('','_blank'); if(w){w.document.write(html);w.document.close();}
  };

  const TABS: { key: Tab; label: string }[] = [
    { key: 'overview',      label: '📊 Overview' },
    { key: 'records',       label: '🩺 Health Records' },
    { key: 'vaccinations',  label: '💉 Vaccinations' },
    { key: 'workers',       label: '👩‍⚕️ Health Workers' },
  ];

  return (
    <div className="health-page">
      <div className="page-header">
        <div>
          <div className="page-title">🏥 Health Monitoring</div>
          <div className="page-sub">Vaccination records · Medical needs · Health workers</div>
        </div>
      </div>

      <div className="health-tabs">
        {TABS.map(t => (
          <button key={t.key} className={`health-tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>{t.label}</button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {tab === 'overview' && summary && (
        <div className="health-section">
          <div className="health-kpi-grid">
            {[
              { label: 'Total Residents',    val: summary.totalResidents,    color: '#1a4f8a', icon: '👥' },
              { label: 'With Health Record', val: summary.withHealthRecord,  color: '#059669', icon: '🩺' },
              { label: 'PhilHealth Enrolled',val: summary.withPhilHealth,    color: '#0891b2', icon: '🏥' },
              { label: 'With Conditions',    val: summary.withConditions,    color: '#d97706', icon: '⚕️' },
              { label: 'Vaccinations Given', val: summary.totalVaccinations, color: '#7c3aed', icon: '💉' },
              { label: 'Active BHWs',        val: summary.activeWorkers,     color: '#be185d', icon: '👩‍⚕️' },
            ].map(k => (
              <div key={k.label} className="health-kpi-card" style={{ borderTop: `4px solid ${k.color}` }}>
                <div className="health-kpi-icon">{k.icon}</div>
                <div className="health-kpi-val" style={{ color: k.color }}>{k.val}</div>
                <div className="health-kpi-lbl">{k.label}</div>
              </div>
            ))}
          </div>

          <div className="health-overview-grid">
            {/* Vaccination breakdown */}
            <div className="card">
              <div className="health-card-title">💉 Vaccinations by Type</div>
              {summary.vaxByVaccine.length === 0 && <div className="empty-row">No vaccination data yet.</div>}
              {summary.vaxByVaccine.map((v, i) => {
                const max = summary.vaxByVaccine[0]?.count ?? 1;
                return (
                  <div key={v.vaccine} className="health-bar-row">
                    <div className="health-bar-label">{v.vaccine}</div>
                    <div className="health-bar-track">
                      <div className="health-bar-fill" style={{ width: `${(v.count/max)*100}%`, background: CONDITION_COLORS[i % CONDITION_COLORS.length] }} />
                    </div>
                    <div className="health-bar-count">{v.count}</div>
                  </div>
                );
              })}
            </div>

            {/* Chronic conditions */}
            <div className="card">
              <div className="health-card-title">⚕️ Chronic Conditions</div>
              {summary.conditionBreakdown.length === 0 && <div className="empty-row">No condition data yet.</div>}
              {summary.conditionBreakdown.map((c, i) => {
                const max = summary.conditionBreakdown[0]?.count ?? 1;
                return (
                  <div key={c.condition} className="health-bar-row">
                    <div className="health-bar-label">{c.condition}</div>
                    <div className="health-bar-track">
                      <div className="health-bar-fill" style={{ width: `${(c.count/max)*100}%`, background: CONDITION_COLORS[i % CONDITION_COLORS.length] }} />
                    </div>
                    <div className="health-bar-count">{c.count}</div>
                  </div>
                );
              })}
            </div>

            {/* Due for next dose */}
            <div className="card" style={{ gridColumn: '1 / -1' }}>
              <div className="health-card-title">�� Due for Next Dose (Next 30 Days)</div>
              {summary.dueSoon.length === 0
                ? <div className="empty-row">No upcoming doses in the next 30 days.</div>
                : (
                  <table>
                    <thead><tr><th>Resident</th><th>Sitio</th><th>Vaccine</th><th>Dose</th><th>Due Date</th></tr></thead>
                    <tbody>
                      {summary.dueSoon.map(d => (
                        <tr key={d.id}>
                          <td style={{ fontWeight: 600 }}>{d.residentName}</td>
                          <td>{d.sitio}</td>
                          <td>{d.vaccineName}</td>
                          <td>{d.doseNumber}</td>
                          <td style={{ color: '#dc2626', fontWeight: 600 }}>{d.nextDoseDate?.slice(0,10)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
            </div>
          </div>
        </div>
      )}

      {/* ── HEALTH RECORDS ── */}
      {tab === 'records' && (
        <div className="health-section">
          <div className="toolbar">
            <input className="search-input" placeholder="Search resident…" value={resSearch} onChange={e => setResSearch(e.target.value)} style={{ width: 220 }} />
            <select value={resSitio} onChange={e => { setResSitio(e.target.value); }}>
              <option value="">All Sitios</option>
              {SITIOS.map(s => <option key={s}>{s}</option>)}
            </select>
            <select value={resCondition} onChange={e => setResCondition(e.target.value)}>
              <option value="">All Conditions</option>
              {CHRONIC_CONDITIONS.map(c => <option key={c}>{c}</option>)}
            </select>
            <button className="btn-primary" onClick={loadResidents}>🔍 Filter</button>
            <span style={{ fontSize: 12, color: '#64748b', alignSelf: 'center' }}>{filteredRes.length} residents</span>
          </div>
          <div className="card" style={{ padding: 0 }}>
            <div className="table-wrap" style={{ maxHeight: 560, overflowY: 'auto' }}>
              <table>
                <thead><tr>
                  <th>Name</th><th>Age</th><th>Sitio</th><th>Blood Type</th><th>PhilHealth No.</th>
                  <th>Conditions</th><th>Allergies</th><th>Status</th><th>Actions</th>
                </tr></thead>
                <tbody>
                  {filteredRes.map(r => (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 600 }}>{r.lastName}, {r.firstName}</td>
                      <td>{r.age}</td>
                      <td>{r.sitio}</td>
                      <td>{r.healthRecord?.bloodType || <span style={{ color: '#9ca3af' }}>—</span>}</td>
                      <td style={{ fontSize: 12 }}>{r.healthRecord?.philHealthNo || <span style={{ color: '#9ca3af' }}>—</span>}</td>
                      <td style={{ fontSize: 12 }}>
                        {r.healthRecord?.chronicConditions
                          ? r.healthRecord.chronicConditions.split(',').map(c => (
                              <span key={c} className="health-condition-tag">{c.trim()}</span>
                            ))
                          : <span style={{ color: '#9ca3af' }}>—</span>}
                      </td>
                      <td style={{ fontSize: 12 }}>{r.healthRecord?.allergies || <span style={{ color: '#9ca3af' }}>—</span>}</td>
                      <td>
                        {r.healthRecord
                          ? <span className="health-status-badge health-status-has">Has Record</span>
                          : <span className="health-status-badge health-status-none">No Record</span>}
                      </td>
                      <td>
                        <button className="btn-primary" style={{ padding: '3px 10px', fontSize: 12 }} onClick={() => openRecord(r)}>
                          {r.healthRecord ? '✏️ Edit' : '+ Add'}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredRes.length === 0 && <tr><td colSpan={9} className="empty-row">No residents found.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── VACCINATIONS ── */}
      {tab === 'vaccinations' && (
        <div className="health-section">
          <div className="toolbar">
            <input className="search-input" placeholder="Search resident or vaccine…" value={vaxSearch} onChange={e => setVaxSearch(e.target.value)} style={{ width: 220 }} />
            <select value={vaxVaccine} onChange={e => setVaxVaccine(e.target.value)}>
              <option value="">All Vaccines</option>
              {VACCINE_NAMES.map(v => <option key={v}>{v}</option>)}
            </select>
            <select value={vaxSitio} onChange={e => setVaxSitio(e.target.value)}>
              <option value="">All Sitios</option>
              {SITIOS.map(s => <option key={s}>{s}</option>)}
            </select>
            <button className="btn-secondary" onClick={loadVaccinations}>🔍 Filter</button>
            <button className="btn-primary" onClick={openVaxModal}>+ Record Vaccination</button>
            <button className="btn-secondary" onClick={printVaxReport}>🖨 Print</button>
            <span style={{ fontSize: 12, color: '#64748b', alignSelf: 'center' }}>{filteredVax.length} records</span>
          </div>
          <div className="card" style={{ padding: 0 }}>
            <div className="table-wrap" style={{ maxHeight: 560, overflowY: 'auto' }}>
              <table>
                <thead><tr>
                  <th>Resident</th><th>Sitio</th><th>Vaccine</th><th>Dose</th>
                  <th>Date Given</th><th>Administered By</th><th>Venue</th><th>Next Dose</th><th>Batch No.</th><th></th>
                </tr></thead>
                <tbody>
                  {filteredVax.map(v => (
                    <tr key={v.id}>
                      <td style={{ fontWeight: 600 }}>{v.resident ? `${v.resident.lastName}, ${v.resident.firstName}` : `ID:${v.residentId}`}</td>
                      <td>{v.resident?.sitio ?? ''}</td>
                      <td><span className="health-vax-tag">{v.vaccineName}</span></td>
                      <td>{v.doseNumber}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{v.dateGiven?.slice(0,10)}</td>
                      <td>{v.administeredBy}</td>
                      <td style={{ fontSize: 12 }}>{v.venue}</td>
                      <td style={{ whiteSpace: 'nowrap', color: v.nextDoseDate ? '#dc2626' : '#9ca3af', fontWeight: v.nextDoseDate ? 600 : 400 }}>
                        {v.nextDoseDate?.slice(0,10) ?? '—'}
                      </td>
                      <td style={{ fontSize: 11, color: '#9ca3af' }}>{v.batchNo || '—'}</td>
                      <td>
                        <button className="btn-danger" style={{ padding: '2px 8px', fontSize: 11 }} onClick={async () => { if (!confirm('Delete this vaccination record?')) return; await del(`/api/health/vaccinations/${v.id}`); loadVaccinations(); loadSummary(); }}>✕</button>
                      </td>
                    </tr>
                  ))}
                  {filteredVax.length === 0 && <tr><td colSpan={10} className="empty-row">No vaccination records found.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── HEALTH WORKERS ── */}
      {tab === 'workers' && (
        <div className="health-section">
          <div className="toolbar">
            <button className="btn-primary" onClick={openCreateWorker}>+ Add Health Worker</button>
            <span style={{ fontSize: 12, color: '#64748b', alignSelf: 'center' }}>{workers.length} workers</span>
          </div>
          <div className="health-workers-grid">
            {workers.map(w => (
              <div key={w.id} className={`health-worker-card ${!w.isActive ? 'worker-inactive' : ''}`}>
                <div className="worker-card-top">
                  <div className="worker-avatar">{w.name.charAt(0).toUpperCase()}</div>
                  <div className="worker-info">
                    <div className="worker-name">{w.name}</div>
                    <div className="worker-role-badge">{w.role}</div>
                  </div>
                  <span className={`badge ${w.isActive ? 'badge-active' : 'badge-inactive'}`}>{w.isActive ? 'Active' : 'Inactive'}</span>
                </div>
                <div className="worker-details">
                  <div className="worker-detail-row"><span>📍 Sitio</span><span>{w.sitio || '—'}</span></div>
                  <div className="worker-detail-row"><span>📞 Contact</span><span>{w.contactNumber || '—'}</span></div>
                  <div className="worker-detail-row"><span>🎓 Qualifications</span><span>{w.qualifications || '—'}</span></div>
                  {w.notes && <div className="worker-detail-row"><span>📝 Notes</span><span>{w.notes}</span></div>}
                </div>
                <div className="worker-actions">
                  <button className="btn-secondary" style={{ flex: 1, fontSize: 12 }} onClick={() => openEditWorker(w)}>✏️ Edit</button>
                  <button className="btn-danger" style={{ fontSize: 12 }} onClick={() => deleteWorker(w)}>Remove</button>
                </div>
              </div>
            ))}
            {workers.length === 0 && (
              <div className="empty-row" style={{ gridColumn: '1/-1', padding: 32, textAlign: 'center' }}>
                No health workers registered yet.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Health Record Modal ── */}
      {recordModal && editResident && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setRecordModal(false)}>
          <div className="modal modal-lg">
            <h2>🩺 Health Record — {editResident.firstName} {editResident.lastName}</h2>
            <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
              <span className="badge" style={{ background: '#e0f2fe', color: '#0369a1' }}>Age: {editResident.age}</span>
              <span className="badge" style={{ background: '#f3f4f6', color: '#374151' }}>{editResident.gender}</span>
              <span className="badge" style={{ background: '#f3f4f6', color: '#374151' }}>{editResident.sitio}</span>
              {editResident.isSenior && <span className="badge" style={{ background: '#fef3c7', color: '#92400e' }}>Senior</span>}
              {editResident.isPWD   && <span className="badge" style={{ background: '#ede9fe', color: '#5b21b6' }}>PWD</span>}
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label>Blood Type</label>
                <select value={rForm.bloodType ?? ''} onChange={e => setRForm(p => ({ ...p, bloodType: e.target.value }))}>
                  <option value="">Unknown</option>
                  {BLOOD_TYPES.map(b => <option key={b}>{b}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>PhilHealth No.</label>
                <input value={rForm.philHealthNo ?? ''} onChange={e => setRForm(p => ({ ...p, philHealthNo: e.target.value }))} placeholder="XX-XXXXXXXXX-X" />
              </div>
              <div className="form-group full">
                <label>Chronic Conditions <span style={{ fontSize: 11, color: '#6b7280' }}>(comma-separated)</span></label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                  {CHRONIC_CONDITIONS.map(c => {
                    const active = (rForm.chronicConditions ?? '').split(',').map(x => x.trim()).includes(c);
                    return (
                      <button key={c} type="button"
                        className={`health-condition-toggle ${active ? 'active' : ''}`}
                        onClick={() => {
                          const current = (rForm.chronicConditions ?? '').split(',').map(x => x.trim()).filter(Boolean);
                          const next = active ? current.filter(x => x !== c) : [...current, c];
                          setRForm(p => ({ ...p, chronicConditions: next.join(', ') }));
                        }}>{c}</button>
                    );
                  })}
                </div>
                <input value={rForm.chronicConditions ?? ''} onChange={e => setRForm(p => ({ ...p, chronicConditions: e.target.value }))} placeholder="Or type manually…" />
              </div>
              <div className="form-group full">
                <label>Allergies</label>
                <input value={rForm.allergies ?? ''} onChange={e => setRForm(p => ({ ...p, allergies: e.target.value }))} placeholder="e.g. Penicillin, Shellfish, Pollen…" />
              </div>
              <div className="form-group full">
                <label>Current Medications</label>
                <input value={rForm.medications ?? ''} onChange={e => setRForm(p => ({ ...p, medications: e.target.value }))} placeholder="e.g. Amlodipine 5mg, Metformin 500mg…" />
              </div>
              <div className="form-group full">
                <label>Notes</label>
                <textarea rows={2} value={rForm.notes ?? ''} onChange={e => setRForm(p => ({ ...p, notes: e.target.value }))} style={{ resize: 'vertical' }} placeholder="Additional health notes…" />
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setRecordModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={saveRecord}>💾 Save Health Record</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Vaccination Modal ── */}
      {vaxModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setVaxModal(false)}>
          <div className="modal modal-lg">
            <h2>💉 Record Vaccination</h2>
            <div className="form-grid">
              <div className="form-group full" style={{ position: 'relative' }}>
                <label>Resident <span style={{ color: '#dc2626' }}>*</span></label>
                <input
                  placeholder="Search resident name…"
                  value={vForm.residentName || resPickerSearch}
                  onChange={e => { setResPickerSearch(e.target.value); setVForm(p => ({ ...p, residentId: 0, residentName: '' })); }}
                />
                {!vForm.residentId && resPickerSearch && (
                  <div className="health-res-picker">
                    {pickerFiltered.map(r => (
                      <div key={r.id} className="health-res-picker-item" onClick={() => {
                        setVForm(p => ({ ...p, residentId: r.id, residentName: `${r.lastName}, ${r.firstName}` }));
                        setResPickerSearch('');
                      }}>
                        <span style={{ fontWeight: 600 }}>{r.lastName}, {r.firstName}</span>
                        <span style={{ color: '#6b7280', fontSize: 12 }}> · {r.sitio} · Age {r.age}</span>
                      </div>
                    ))}
                    {pickerFiltered.length === 0 && <div style={{ padding: '8px 12px', color: '#9ca3af', fontSize: 13 }}>No residents found.</div>}
                  </div>
                )}
                {vForm.residentId > 0 && (
                  <div style={{ marginTop: 4, fontSize: 12, color: '#059669' }}>✓ Selected: {vForm.residentName}</div>
                )}
              </div>
              <div className="form-group">
                <label>Vaccine <span style={{ color: '#dc2626' }}>*</span></label>
                <select value={vForm.vaccineName} onChange={e => setVForm(p => ({ ...p, vaccineName: e.target.value }))}>
                  <option value="">Select vaccine…</option>
                  {VACCINE_NAMES.map(v => <option key={v}>{v}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Dose Number</label>
                <select value={vForm.doseNumber} onChange={e => setVForm(p => ({ ...p, doseNumber: e.target.value }))}>
                  {DOSE_NUMBERS.map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Date Given</label>
                <input type="date" value={vForm.dateGiven} onChange={e => setVForm(p => ({ ...p, dateGiven: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Next Dose Date</label>
                <input type="date" value={vForm.nextDoseDate} onChange={e => setVForm(p => ({ ...p, nextDoseDate: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Administered By</label>
                <input value={vForm.administeredBy} onChange={e => setVForm(p => ({ ...p, administeredBy: e.target.value }))} placeholder="Health worker name" list="worker-names" />
                <datalist id="worker-names">
                  {workers.filter(w => w.isActive).map(w => <option key={w.id} value={w.name} />)}
                </datalist>
              </div>
              <div className="form-group">
                <label>Venue</label>
                <input value={vForm.venue} onChange={e => setVForm(p => ({ ...p, venue: e.target.value }))} placeholder="e.g. Barangay Health Center" />
              </div>
              <div className="form-group">
                <label>Batch No.</label>
                <input value={vForm.batchNo} onChange={e => setVForm(p => ({ ...p, batchNo: e.target.value }))} placeholder="Optional" />
              </div>
              <div className="form-group full">
                <label>Notes</label>
                <input value={vForm.notes} onChange={e => setVForm(p => ({ ...p, notes: e.target.value }))} placeholder="Optional notes…" />
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setVaxModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={saveVax}>💉 Save Record</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Worker Modal ── */}
      {workerModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setWorkerModal(false)}>
          <div className="modal">
            <h2>{editWorker ? 'Edit Health Worker' : 'Add Health Worker'}</h2>
            <div className="form-grid">
              <div className="form-group full">
                <label>Full Name</label>
                <input value={wForm.name} onChange={e => setWForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Maria Santos" />
              </div>
              <div className="form-group">
                <label>Role</label>
                <select value={wForm.role} onChange={e => setWForm(p => ({ ...p, role: e.target.value }))}>
                  {HEALTH_WORKER_ROLES.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Assigned Sitio</label>
                <select value={wForm.sitio} onChange={e => setWForm(p => ({ ...p, sitio: e.target.value }))}>
                  <option value="">All Sitios</option>
                  {SITIOS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Contact Number</label>
                <input value={wForm.contactNumber} onChange={e => setWForm(p => ({ ...p, contactNumber: e.target.value }))} placeholder="09XXXXXXXXX" />
              </div>
              <div className="form-group">
                <label>Status</label>
                <select value={wForm.isActive ? 'Active' : 'Inactive'} onChange={e => setWForm(p => ({ ...p, isActive: e.target.value === 'Active' }))}>
                  <option>Active</option><option>Inactive</option>
                </select>
              </div>
              <div className="form-group full">
                <label>Qualifications / Training</label>
                <input value={wForm.qualifications} onChange={e => setWForm(p => ({ ...p, qualifications: e.target.value }))} placeholder="e.g. BHW Training 2023, First Aid Certified" />
              </div>
              <div className="form-group full">
                <label>Notes</label>
                <textarea rows={2} value={wForm.notes} onChange={e => setWForm(p => ({ ...p, notes: e.target.value }))} style={{ resize: 'vertical' }} />
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setWorkerModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={saveWorker}>💾 Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
