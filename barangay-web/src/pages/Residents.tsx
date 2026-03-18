import { useEffect, useRef, useState } from 'react';
import { get, post, put, del } from '../api';
import type { Resident, DuplicateGroup } from '../types';
import { SITIOS } from '../types';
import { useAuth } from '../auth';

interface ResidentStats {
  total: number; seniors: number; minors: number; voters: number;
  pWD: number; fourPs: number; male: number; female: number;
}

const empty: Omit<Resident, 'id' | 'createdAt'> = {
  firstName: '', lastName: '', middleName: '',
  birthDate: '', gender: 'Male', civilStatus: 'Single',
  sitio: 'Proper', address: '', householdNo: '', occupation: '',
  contactNumber: '', email: '',
  isVoter: false, isSenior: false, isPWD: false, is4Ps: false,
};

function calcAge(birthDate: string): number | null {
  if (!birthDate) return null;
  return Math.floor((Date.now() - new Date(birthDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25));
}

type PageTab = 'list' | 'duplicates';

export default function Residents() {
  const { can } = useAuth();
  const [pageTab, setPageTab] = useState<PageTab>('list');
  const [residents, setResidents] = useState<Resident[]>([]);
  const [stats, setStats]         = useState<ResidentStats | null>(null);
  const [search, setSearch]       = useState('');
  const [sitioFilter, setSitio]   = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [modal, setModal]         = useState(false);
  const [form, setForm]           = useState<Omit<Resident,'id'|'createdAt'>>(empty);
  const [editing, setEditing]     = useState<Resident | null>(null);

  // Duplicate detection
  const [dupWarnings, setDupWarnings]   = useState<Resident[]>([]);
  const [dupGroups, setDupGroups]       = useState<DuplicateGroup[]>([]);
  const [dupLoading, setDupLoading]     = useState(false);
  const [dismissedGroups, setDismissed] = useState<Set<string>>(new Set());
  const dupCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const buildQuery = () => {
    const p = new URLSearchParams();
    if (search)      p.set('search', search);
    if (sitioFilter) p.set('sitio', sitioFilter);
    if (tagFilter === 'voter')  p.set('isVoter', 'true');
    if (tagFilter === 'senior') p.set('isSenior', 'true');
    if (tagFilter === 'pwd')    p.set('isPWD', 'true');
    if (tagFilter === '4ps')    p.set('is4Ps', 'true');
    if (tagFilter === 'minor')  p.set('isMinor', 'true');
    return p.toString();
  };

  const load = () => {
    get<Resident[]>(`/api/residents?${buildQuery()}`).then(setResidents).catch(console.error);
    get<ResidentStats>('/api/residents/stats').then(setStats).catch(console.error);
  };

  const loadDuplicates = () => {
    setDupLoading(true);
    get<DuplicateGroup[]>('/api/residents/duplicates')
      .then(setDupGroups).catch(console.error)
      .finally(() => setDupLoading(false));
  };

  useEffect(() => { load(); }, [search, sitioFilter, tagFilter]);
  useEffect(() => { if (pageTab === 'duplicates') loadDuplicates(); }, [pageTab]);

  // Live duplicate check — debounced 500ms
  useEffect(() => {
    if (!modal) { setDupWarnings([]); return; }
    if (!form.firstName.trim() || !form.lastName.trim()) { setDupWarnings([]); return; }
    if (dupCheckTimer.current) clearTimeout(dupCheckTimer.current);
    dupCheckTimer.current = setTimeout(async () => {
      try {
        const p = new URLSearchParams({
          firstName:  form.firstName,
          lastName:   form.lastName,
          middleName: form.middleName ?? '',
          ...(form.birthDate ? { birthDate: form.birthDate } : {}),
          ...(editing ? { excludeId: String(editing.id) } : {}),
        });
        const matches = await get<Resident[]>(`/api/residents/check-duplicate?${p}`);
        setDupWarnings(matches);
      } catch { setDupWarnings([]); }
    }, 500);
    return () => { if (dupCheckTimer.current) clearTimeout(dupCheckTimer.current); };
  }, [form.firstName, form.lastName, form.middleName, form.birthDate, modal]);

  const openAdd  = () => { setEditing(null); setForm(empty); setDupWarnings([]); setModal(true); };
  const openEdit = (r: Resident) => { setEditing(r); setForm({ ...r }); setDupWarnings([]); setModal(true); };

  const save = async () => {
    if (editing) await put(`/api/residents/${editing.id}`, { ...form, id: editing.id });
    else await post('/api/residents', form);
    setModal(false); load();
  };

  const remove = async (r: Resident) => {
    if (!confirm(`Delete ${r.firstName} ${r.lastName}?`)) return;
    await del(`/api/residents/${r.id}`); load();
  };

  const f = (k: keyof typeof form, v: string | boolean) => setForm(p => ({ ...p, [k]: v }));

  const groupKey = (g: DuplicateGroup) => g.members.map(m => m.id).sort().join('-');
  const visibleGroups = dupGroups.filter(g => !dismissedGroups.has(groupKey(g)));

  const sitioCounts = SITIOS.map(s => ({
    name: s, count: residents.filter(r => r.sitio === s).length,
  }));

  const TAG_FILTERS = [
    { key: 'voter',  label: '🗳 Voters' },
    { key: 'senior', label: '👴 Seniors' },
    { key: 'minor',  label: '🧒 Minors' },
    { key: 'pwd',    label: '♿ PWD' },
    { key: '4ps',    label: '💰 4Ps' },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Residents</h1>
          <p className="page-sub">Barangay Damolog · {residents.length} shown</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {dupGroups.length > 0 && pageTab === 'list' && (
            <button className="dup-alert-pill" onClick={() => setPageTab('duplicates')}>
              ⚠️ {dupGroups.length} duplicate group{dupGroups.length > 1 ? 's' : ''} detected
            </button>
          )}
          {can('edit_residents') && <button className="btn-primary" onClick={openAdd}>+ Add Resident</button>}
        </div>
      </div>

      {/* Page tabs */}
      <div className="dup-page-tabs">
        <button className={`dup-page-tab ${pageTab === 'list' ? 'active' : ''}`} onClick={() => setPageTab('list')}>
          👥 Resident List
        </button>
        <button className={`dup-page-tab ${pageTab === 'duplicates' ? 'active' : ''}`} onClick={() => setPageTab('duplicates')}>
          🔍 Duplicate Detection
          {visibleGroups.length > 0 && <span className="dup-tab-badge">{visibleGroups.length}</span>}
        </button>
      </div>

      {/* ── RESIDENT LIST ── */}
      {pageTab === 'list' && (
        <>
          {stats && (
            <div className="res-stats-bar">
              {[
                { val: stats.total,   lbl: '👥 Total',   color: '#1a4f8a' },
                { val: stats.male,    lbl: '♂ Male',     color: '#3b82f6' },
                { val: stats.female,  lbl: '♀ Female',   color: '#ec4899' },
                { val: stats.voters,  lbl: '🗳 Voters',  color: '#8b5cf6' },
                { val: stats.seniors, lbl: '👴 Seniors', color: '#059669' },
                { val: stats.minors,  lbl: '🧒 Minors',  color: '#f59e0b' },
                { val: stats.pWD,     lbl: '♿ PWD',     color: '#14b8a6' },
                { val: stats.fourPs,  lbl: '💰 4Ps',     color: '#d97706' },
              ].map(s => (
                <div key={s.lbl} className="res-stat-card" style={{ borderColor: s.color }}>
                  <span className="res-stat-val" style={{ color: s.color }}>{s.val}</span>
                  <span className="res-stat-lbl">{s.lbl}</span>
                </div>
              ))}
            </div>
          )}

          <div className="sitio-filter-row" style={{ marginTop: 14 }}>
            <button className={`sitio-filter-btn ${sitioFilter === '' ? 'active' : ''}`} onClick={() => setSitio('')}>All Sitios</button>
            {SITIOS.map(s => (
              <button key={s} className={`sitio-filter-btn ${sitioFilter === s ? 'active' : ''}`}
                onClick={() => setSitio(sitioFilter === s ? '' : s)}>
                {s}<span className="sitio-filter-count">{sitioCounts.find(x => x.name === s)?.count ?? 0}</span>
              </button>
            ))}
          </div>

          <div className="sitio-filter-row" style={{ marginTop: 8 }}>
            <button className={`sitio-filter-btn ${tagFilter === '' ? 'active' : ''}`} onClick={() => setTagFilter('')}>All Tags</button>
            {TAG_FILTERS.map(t => (
              <button key={t.key} className={`sitio-filter-btn ${tagFilter === t.key ? 'active' : ''}`}
                onClick={() => setTagFilter(tagFilter === t.key ? '' : t.key)}>{t.label}</button>
            ))}
          </div>

          <div className="card" style={{ marginTop: 14 }}>
            <div className="toolbar">
              <input placeholder="Search by name, address, household, occupation..."
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="table-wrap">
              <table>
                <thead><tr>
                  <th>Name</th><th>Age</th><th>Sitio</th><th>Household</th>
                  <th>Occupation</th><th>Contact</th><th>Tags</th><th>Actions</th>
                </tr></thead>
                <tbody>
                  {residents.map(r => {
                    const age = calcAge(r.birthDate);
                    return (
                      <tr key={r.id}>
                        <td style={{ fontWeight: 600 }}>
                          {r.lastName}, {r.firstName} {r.middleName}
                          <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 400 }}>{r.address}</div>
                        </td>
                        <td style={{ textAlign: 'center' }}>{age ?? '—'}</td>
                        <td><span className="sitio-pill">{r.sitio || '—'}</span></td>
                        <td style={{ fontSize: 12, color: '#64748b' }}>{r.householdNo || '—'}</td>
                        <td style={{ fontSize: 12 }}>{r.occupation || '—'}</td>
                        <td style={{ fontSize: 12 }}>{r.contactNumber || '—'}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {r.isVoter  && <span className="badge badge-active">Voter</span>}
                            {r.isSenior && <span className="badge" style={{ background: '#d1fae5', color: '#065f46' }}>Senior</span>}
                            {r.isPWD    && <span className="badge" style={{ background: '#e0e7ff', color: '#3730a3' }}>PWD</span>}
                            {r.is4Ps    && <span className="badge" style={{ background: '#fef3c7', color: '#92400e' }}>4Ps</span>}
                            {age !== null && age < 18 && <span className="badge" style={{ background: '#fce7f3', color: '#9d174d' }}>Minor</span>}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            {can('edit_residents')   && <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => openEdit(r)}>Edit</button>}
                            {can('delete_residents') && <button className="btn-danger"    style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => remove(r)}>Delete</button>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {residents.length === 0 && <tr><td colSpan={8} className="empty-row">No residents found.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── DUPLICATE DETECTION ── */}
      {pageTab === 'duplicates' && (
        <div style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>🔍 Duplicate Resident Detection</div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                Flagged by: exact full name · same last name + birth date · same first &amp; last name in same sitio
              </div>
            </div>
            <button className="btn-secondary" onClick={loadDuplicates}>⟳ Re-scan</button>
          </div>

          {dupLoading && <div className="empty-row" style={{ padding: 32, textAlign: 'center' }}>Scanning…</div>}

          {!dupLoading && visibleGroups.length === 0 && (
            <div className="dup-clean-banner">
              <div style={{ fontSize: 32 }}>✅</div>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#065f46' }}>No duplicates detected</div>
              <div style={{ fontSize: 13, color: '#6b7280' }}>All resident records appear to be unique.</div>
            </div>
          )}

          {!dupLoading && visibleGroups.map(group => {
            const key = groupKey(group);
            return (
              <div key={key} className="dup-group-card">
                <div className="dup-group-header">
                  <div className="dup-group-reason">
                    <span className="dup-reason-icon">⚠️</span>
                    <span>{group.reason}</span>
                    <span className="dup-count-badge">{group.count} records</span>
                  </div>
                  <button className="btn-secondary" style={{ fontSize: 12, padding: '3px 10px' }}
                    onClick={() => setDismissed(prev => new Set([...prev, key]))}>
                    Dismiss
                  </button>
                </div>
                <div className="dup-members-grid">
                  {group.members.map((r, i) => {
                    const age = calcAge(r.birthDate);
                    return (
                      <div key={r.id} className={`dup-member-card ${i === 0 ? 'dup-member-primary' : ''}`}>
                        <div className="dup-member-label">{i === 0 ? 'Older Record' : 'Possible Duplicate'}</div>
                        <div className="dup-member-name">{r.lastName}, {r.firstName} {r.middleName}</div>
                        <div className="dup-member-detail">
                          <span>📅 {r.birthDate?.slice(0,10) || '—'}</span>
                          {age != null && <span>Age {age}</span>}
                          <span>{r.gender}</span>
                        </div>
                        <div className="dup-member-detail">
                          <span>📍 {r.sitio || '—'}</span>
                          <span>{r.address || '—'}</span>
                        </div>
                        {r.contactNumber && <div className="dup-member-detail"><span>📞 {r.contactNumber}</span></div>}
                        <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
                          {r.isVoter  && <span className="badge badge-active" style={{ fontSize: 10 }}>Voter</span>}
                          {r.isSenior && <span className="badge" style={{ background: '#d1fae5', color: '#065f46', fontSize: 10 }}>Senior</span>}
                          {r.isPWD    && <span className="badge" style={{ background: '#e0e7ff', color: '#3730a3', fontSize: 10 }}>PWD</span>}
                          {r.is4Ps    && <span className="badge" style={{ background: '#fef3c7', color: '#92400e', fontSize: 10 }}>4Ps</span>}
                        </div>
                        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                          {can('edit_residents') && (
                            <button className="btn-secondary" style={{ fontSize: 11, padding: '3px 10px', flex: 1 }}
                              onClick={() => { setPageTab('list'); openEdit(r); }}>
                              ✏️ Edit
                            </button>
                          )}
                          {can('delete_residents') && (
                            <button className="btn-danger" style={{ fontSize: 11, padding: '3px 10px' }}
                              onClick={() => remove(r)}>
                              🗑 Delete
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Add / Edit Modal ── */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal" style={{ maxWidth: 640 }}>
            <h2>{editing ? 'Edit Resident' : 'Add Resident'}</h2>

            {dupWarnings.length > 0 && (
              <div className="dup-live-warning">
                <div className="dup-live-warning-title">⚠️ Possible duplicate{dupWarnings.length > 1 ? 's' : ''} detected</div>
                <div className="dup-live-warning-sub">Similar resident{dupWarnings.length > 1 ? 's' : ''} already exist:</div>
                {dupWarnings.map(r => {
                  const age = calcAge(r.birthDate);
                  return (
                    <div key={r.id} className="dup-live-match">
                      <span className="dup-live-match-name">{r.lastName}, {r.firstName} {r.middleName}</span>
                      <span className="dup-live-match-meta">
                        {r.sitio} · {r.birthDate?.slice(0,10) || '—'}{age != null ? ` · Age ${age}` : ''}
                      </span>
                      <button className="btn-secondary" style={{ fontSize: 11, padding: '2px 8px', marginLeft: 'auto' }}
                        onClick={() => { setModal(false); openEdit(r); }}>
                        View
                      </button>
                    </div>
                  );
                })}
                <div style={{ fontSize: 11, color: '#92400e', marginTop: 6 }}>
                  You can still save if this is a different person.
                </div>
              </div>
            )}

            <div className="form-grid">
              <div className="form-group"><label>First Name *</label><input value={form.firstName} onChange={e => f('firstName', e.target.value)} /></div>
              <div className="form-group"><label>Last Name *</label><input value={form.lastName} onChange={e => f('lastName', e.target.value)} /></div>
              <div className="form-group"><label>Middle Name</label><input value={form.middleName} onChange={e => f('middleName', e.target.value)} /></div>
              <div className="form-group"><label>Birth Date</label><input type="date" value={form.birthDate?.slice(0,10)} onChange={e => f('birthDate', e.target.value)} /></div>
              <div className="form-group"><label>Gender</label>
                <select value={form.gender} onChange={e => f('gender', e.target.value)}>
                  {['Male','Female','Other'].map(g => <option key={g}>{g}</option>)}
                </select>
              </div>
              <div className="form-group"><label>Civil Status</label>
                <select value={form.civilStatus} onChange={e => f('civilStatus', e.target.value)}>
                  {['Single','Married','Widowed','Separated'].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group"><label>Sitio / Purok</label>
                <select value={form.sitio} onChange={e => f('sitio', e.target.value)}>
                  {SITIOS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group"><label>Household No.</label><input placeholder="e.g. HH-001" value={form.householdNo} onChange={e => f('householdNo', e.target.value)} /></div>
              <div className="form-group full"><label>Address / House No. &amp; Street</label><input value={form.address} onChange={e => f('address', e.target.value)} /></div>
              <div className="form-group"><label>Occupation</label><input placeholder="e.g. Farmer, Student" value={form.occupation} onChange={e => f('occupation', e.target.value)} /></div>
              <div className="form-group"><label>Contact No.</label><input value={form.contactNumber} onChange={e => f('contactNumber', e.target.value)} /></div>
              <div className="form-group"><label>Email</label><input type="email" value={form.email} onChange={e => f('email', e.target.value)} /></div>
            </div>

            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tags / Classification</div>
              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                {([
                  { key: 'isVoter',  label: '🗳 Registered Voter' },
                  { key: 'isSenior', label: '👴 Senior Citizen (60+)' },
                  { key: 'isPWD',    label: '♿ Person with Disability' },
                  { key: 'is4Ps',    label: '💰 4Ps Beneficiary' },
                ] as const).map(t => (
                  <label key={t.key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                    <input type="checkbox" checked={form[t.key] as boolean}
                      onChange={e => f(t.key, e.target.checked)} style={{ width: 'auto' }} />
                    {t.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setModal(false)}>Cancel</button>
              <button className={`btn-primary ${dupWarnings.length > 0 ? 'btn-warn' : ''}`} onClick={save}>
                {dupWarnings.length > 0 ? '⚠️ Save Anyway' : 'Save Resident'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
