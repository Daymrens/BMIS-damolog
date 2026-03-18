import { useEffect, useState, useMemo } from 'react';
import { get, post, put, del } from '../api';
import type { Household, HouseholdData, HouseholdMember, HouseholdTreeData, FamilyTree } from '../types';
import { SITIOS, FAMILY_ROLES } from '../types';
import './HouseholdMapping.css';

function TagBadge({ label, color }: { label: string; color: string }) {
  return <span className={`hh-badge hh-badge-${color}`}>{label}</span>;
}

function MemberRow({ m }: { m: HouseholdMember }) {
  return (
    <tr>
      <td>{m.lastName}, {m.firstName} {m.middleName ? m.middleName[0] + '.' : ''}</td>
      <td>{m.age ?? '—'}</td>
      <td>{m.gender}</td>
      <td>{m.civilStatus}</td>
      <td>{m.occupation || '—'}</td>
      <td>
        {m.isVoter  && <TagBadge label="Voter"  color="blue"   />}
        {m.isSenior && <TagBadge label="Senior" color="orange" />}
        {m.isPWD    && <TagBadge label="PWD"    color="purple" />}
        {m.is4Ps    && <TagBadge label="4Ps"    color="green"  />}
      </td>
    </tr>
  );
}

function printMasterlist(households: Household[], sitioLabel: string) {
  const rows = households.map(hh => `
    <div class="print-hh">
      <div class="print-hh-header">
        <strong>HH# ${hh.householdNo}</strong>
        <span>${hh.sitio}</span>
        <span>${hh.address}</span>
        <span>${hh.totalMembers} member(s) &nbsp;|&nbsp; ${hh.voters} voter(s)</span>
      </div>
      <table>
        <thead><tr><th>Name</th><th>Age</th><th>Sex</th><th>Civil Status</th><th>Occupation</th><th>Tags</th></tr></thead>
        <tbody>
          ${hh.members.map(m => `
            <tr>
              <td>${m.lastName}, ${m.firstName} ${m.middleName ? m.middleName[0] + '.' : ''}</td>
              <td>${m.age ?? '—'}</td>
              <td>${m.gender}</td>
              <td>${m.civilStatus}</td>
              <td>${m.occupation || '—'}</td>
              <td>${[m.isVoter?'Voter':'', m.isSenior?'Senior':'', m.isPWD?'PWD':'', m.is4Ps?'4Ps':''].filter(Boolean).join(', ') || '—'}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`).join('');

  const w = window.open('', '_blank')!;
  w.document.write(`<!DOCTYPE html><html><head><title>Household Masterlist</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 11px; margin: 20px; }
    h2 { text-align: center; margin-bottom: 4px; }
    .sub { text-align: center; color: #555; margin-bottom: 16px; }
    .print-hh { margin-bottom: 18px; page-break-inside: avoid; border: 1px solid #ccc; padding: 8px; border-radius: 4px; }
    .print-hh-header { display: flex; gap: 16px; margin-bottom: 6px; font-size: 11px; flex-wrap: wrap; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #ccc; padding: 3px 6px; text-align: left; }
    th { background: #f0f0f0; }
    @media print { body { margin: 10mm; } }
  </style></head><body>
  <h2>Household Masterlist — ${sitioLabel}</h2>
  <p class="sub">Barangay Damolog, Municipality of Sogod, Cebu &nbsp;|&nbsp; Printed: ${new Date().toLocaleDateString('en-PH', { year:'numeric', month:'long', day:'numeric' })}</p>
  ${rows}
  </body></html>`);
  w.document.close();
  w.print();
}

type PageTab = 'households' | 'family';

export default function HouseholdMapping() {
  const [pageTab, setPageTab]   = useState<PageTab>('households');
  const [data, setData]         = useState<HouseholdData | null>(null);
  const [sitioFilter, setSitio] = useState('');
  const [search, setSearch]     = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Family tree state
  const [treeHH, setTreeHH]           = useState<Household | null>(null);
  const [treeData, setTreeData]       = useState<HouseholdTreeData | null>(null);
  const [treeLoading, setTreeLoading] = useState(false);
  const [linkModal, setLinkModal]     = useState(false);
  const [linkForm, setLinkForm]       = useState({ residentId: 0, relatedResidentId: 0, role: 'Child', notes: '' });
  const [editLink, setEditLink]       = useState<{ id: number; role: string; notes: string } | null>(null);
  const [residentTree, setResidentTree] = useState<FamilyTree | null>(null);
  const [_residentTreeLoading, setResidentTreeLoading] = useState(false);

  const load = (sitio?: string) => {
    const q = sitio ? `?sitio=${encodeURIComponent(sitio)}` : '';
    get<HouseholdData>(`/api/households${q}`).then(setData).catch(console.error);
  };

  useEffect(() => { load(sitioFilter || undefined); }, [sitioFilter]);

  const loadHouseholdTree = (hh: Household) => {
    setTreeHH(hh);
    setTreeLoading(true);
    setTreeData(null);
    setResidentTree(null);
    const p = new URLSearchParams({ sitio: hh.sitio });
    if (hh.rawHouseholdNo) {
      p.set('householdNo', hh.rawHouseholdNo);
    } else {
      p.set('address', hh.address);
    }
    get<HouseholdTreeData>(`/api/family/household?${p}`)
      .then(setTreeData).catch(console.error)
      .finally(() => setTreeLoading(false));
  };

  const loadResidentTree = (id: number) => {
    setResidentTreeLoading(true);
    get<FamilyTree>(`/api/family/${id}/tree`)
      .then(setResidentTree).catch(console.error)
      .finally(() => setResidentTreeLoading(false));
  };

  const saveLink = async () => {
    if (!linkForm.residentId || !linkForm.relatedResidentId) { alert('Select both residents.'); return; }
    if (editLink) {
      await put(`/api/family/${editLink.id}`, { role: linkForm.role, notes: linkForm.notes });
    } else {
      await post('/api/family', linkForm);
    }
    setLinkModal(false);
    setEditLink(null);
    if (treeHH) loadHouseholdTree(treeHH);
    if (residentTree) loadResidentTree(residentTree.resident.id);
  };

  const removeLink = async (id: number) => {
    if (!confirm('Remove this relationship?')) return;
    await del(`/api/family/${id}`);
    if (treeHH) loadHouseholdTree(treeHH);
    if (residentTree) loadResidentTree(residentTree.resident.id);
  };

  const openAddLink = (residentId?: number) => {
    setEditLink(null);
    setLinkForm({ residentId: residentId ?? 0, relatedResidentId: 0, role: 'Child', notes: '' });
    setLinkModal(true);
  };

  const openEditLink = (link: { id: number; residentId: number; relatedResidentId: number; role: string; notes: string }) => {
    setEditLink({ id: link.id, role: link.role, notes: link.notes });
    setLinkForm({ residentId: link.residentId, relatedResidentId: link.relatedResidentId, role: link.role, notes: link.notes });
    setLinkModal(true);
  };

  const filtered = useMemo(() => {
    if (!data) return [];
    if (!search.trim()) return data.households;
    const q = search.toLowerCase();
    return data.households.filter(hh =>
      hh.householdNo.toLowerCase().includes(q) ||
      hh.address.toLowerCase().includes(q) ||
      hh.members.some(m =>
        `${m.firstName} ${m.lastName}`.toLowerCase().includes(q) ||
        m.lastName.toLowerCase().includes(q)
      )
    );
  }, [data, search]);

  const toggleExpand = (key: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const expandAll  = () => setExpanded(new Set(filtered.map(h => `${h.sitio}-${h.householdNo}`)));
  const collapseAll = () => setExpanded(new Set());

  const sitioLabel = sitioFilter || 'All Sitios';

  const ROLE_COLORS: Record<string, { bg: string; color: string }> = {
    Head:      { bg: '#dbeafe', color: '#1e40af' },
    Spouse:    { bg: '#fce7f3', color: '#9d174d' },
    Child:     { bg: '#d1fae5', color: '#065f46' },
    Parent:    { bg: '#fef3c7', color: '#92400e' },
    Sibling:   { bg: '#ede9fe', color: '#5b21b6' },
    Dependent: { bg: '#ffedd5', color: '#9a3412' },
    Guardian:  { bg: '#e0f2fe', color: '#0369a1' },
    Other:     { bg: '#f3f4f6', color: '#374151' },
  };

  return (
    <div className="hh-page">
      <div className="hh-header-row">
        <div>
          <h1 className="hh-title">🏘️ Household & Family Management</h1>
          <p className="hh-subtitle">Barangay Damolog — {sitioLabel}</p>
        </div>
        <div className="hh-header-actions">
          <button className="btn-print" onClick={() => printMasterlist(filtered, sitioLabel)}>
            🖨️ Print Masterlist
          </button>
        </div>
      </div>

      {/* Page tabs */}
      <div className="hh-page-tabs">
        <button className={`hh-page-tab ${pageTab === 'households' ? 'active' : ''}`} onClick={() => setPageTab('households')}>
          🏠 Household Mapping
        </button>
        <button className={`hh-page-tab ${pageTab === 'family' ? 'active' : ''}`} onClick={() => setPageTab('family')}>
          🧬 Family Tree
        </button>
      </div>

      {/* ── HOUSEHOLD MAPPING TAB ── */}
      {pageTab === 'households' && (<>
      {/* Sitio Summary Cards */}
      {data && (
        <div className="hh-sitio-cards">
          <div
            className={`hh-sitio-card ${sitioFilter === '' ? 'active' : ''}`}
            onClick={() => setSitio('')}
          >
            <div className="hh-sitio-name">All Sitios</div>
            <div className="hh-sitio-stats">
              <span>🏠 {data.sitioSummary.reduce((a, s) => a + s.households, 0)} HH</span>
              <span>👥 {data.sitioSummary.reduce((a, s) => a + s.population, 0)}</span>
              <span>🗳️ {data.sitioSummary.reduce((a, s) => a + s.voters, 0)}</span>
            </div>
          </div>
          {data.sitioSummary.map(s => (
            <div
              key={s.sitio}
              className={`hh-sitio-card ${sitioFilter === s.sitio ? 'active' : ''}`}
              onClick={() => setSitio(s.sitio === sitioFilter ? '' : s.sitio)}
            >
              <div className="hh-sitio-name">{s.sitio}</div>
              <div className="hh-sitio-stats">
                <span>🏠 {s.households}</span>
                <span>👥 {s.population}</span>
                <span>🗳️ {s.voters}</span>
              </div>
              <div className="hh-sitio-tags">
                <span>👴 {s.seniors}</span>
                <span>👶 {s.minors}</span>
                <span>♿ {s.pWD}</span>
                <span>💚 {s.fourPs}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sitio filter pills (for quick nav) */}
      <div className="hh-filter-row">
        <input
          className="hh-search"
          placeholder="Search by name, household #, or address…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className="hh-filter-pills">
          <button className={`pill ${sitioFilter === '' ? 'active' : ''}`} onClick={() => setSitio('')}>All</button>
          {SITIOS.map(s => (
            <button key={s} className={`pill ${sitioFilter === s ? 'active' : ''}`} onClick={() => setSitio(s)}>{s}</button>
          ))}
        </div>
        <div className="hh-expand-btns">
          <button className="btn-sm" onClick={expandAll}>Expand All</button>
          <button className="btn-sm" onClick={collapseAll}>Collapse All</button>
        </div>
      </div>

      <div className="hh-count-bar">
        Showing {filtered.length} household{filtered.length !== 1 ? 's' : ''}
        {search && ` matching "${search}"`}
        &nbsp;·&nbsp; {filtered.reduce((a, h) => a + h.totalMembers, 0)} residents
        &nbsp;·&nbsp; {filtered.reduce((a, h) => a + h.voters, 0)} voters
      </div>

      {/* Household Cards */}
      <div className="hh-list">
        {filtered.length === 0 && (
          <div className="hh-empty">No households found.</div>
        )}
        {filtered.map(hh => {
          const key = `${hh.sitio}-${hh.householdNo}`;
          const open = expanded.has(key);
          return (
            <div key={key} className="hh-card">
              <div className="hh-card-header" onClick={() => toggleExpand(key)}>
                <div className="hh-card-left">
                  <span className="hh-card-num">HH# {hh.householdNo}</span>
                  <span className="hh-card-sitio">{hh.sitio}</span>
                  <span className="hh-card-addr">{hh.address}</span>
                </div>
                <div className="hh-card-right">
                  <span className="hh-stat">👥 {hh.totalMembers}</span>
                  <span className="hh-stat hh-voter">🗳️ {hh.voters} voter{hh.voters !== 1 ? 's' : ''}</span>
                  {hh.seniors > 0 && <span className="hh-stat">👴 {hh.seniors}</span>}
                  {hh.minors  > 0 && <span className="hh-stat">👶 {hh.minors}</span>}
                  {hh.pWD     > 0 && <span className="hh-stat">♿ {hh.pWD}</span>}
                  {hh.fourPs  > 0 && <span className="hh-stat">💚 {hh.fourPs}</span>}
                  <span className="hh-toggle">{open ? '▲' : '▼'}</span>
                </div>
              </div>
              {open && (
                <div className="hh-card-body">
                  <table className="hh-member-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Age</th>
                        <th>Sex</th>
                        <th>Civil Status</th>
                        <th>Occupation</th>
                        <th>Tags</th>
                      </tr>
                    </thead>
                    <tbody>
                      {hh.members.map(m => <MemberRow key={m.id} m={m} />)}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
      </>)}

      {/* ── FAMILY TREE TAB ── */}
      {pageTab === 'family' && (
        <div className="ft-page">
          <div className="ft-intro">
            <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>🧬 Family Tree & Household Relationships</div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
              Select a household to view and manage family relationships. Link parents, children, spouses, and dependents.
            </div>
          </div>

          <div className="ft-layout">
            {/* Left: household picker */}
            <div className="ft-sidebar">
              <div className="ft-sidebar-title">Select Household</div>
              <input className="ft-search" placeholder="Search household or name…"
                value={search} onChange={e => setSearch(e.target.value)} />
              <div className="ft-hh-list">
                {filtered.map(hh => (
                  <div key={`${hh.sitio}-${hh.householdNo}`}
                    className={`ft-hh-item ${treeHH?.householdNo === hh.householdNo && treeHH?.sitio === hh.sitio ? 'active' : ''}`}
                    onClick={() => loadHouseholdTree(hh)}>
                    <div className="ft-hh-item-num">HH# {hh.householdNo}</div>
                    <div className="ft-hh-item-sitio">{hh.sitio}</div>
                    <div className="ft-hh-item-addr">{hh.address}</div>
                    <div className="ft-hh-item-count">{hh.totalMembers} member{hh.totalMembers !== 1 ? 's' : ''}</div>
                  </div>
                ))}
                {filtered.length === 0 && <div style={{ padding: 16, color: '#9ca3af', fontSize: 13 }}>No households found.</div>}
              </div>
            </div>

            {/* Right: tree view */}
            <div className="ft-main">
              {!treeHH && (
                <div className="ft-empty-state">
                  <div style={{ fontSize: 48 }}>🏠</div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#374151' }}>Select a household</div>
                  <div style={{ fontSize: 13, color: '#9ca3af' }}>Choose a household from the left to view its family tree.</div>
                </div>
              )}

              {treeHH && treeLoading && (
                <div className="ft-empty-state"><div style={{ color: '#6b7280' }}>Loading tree…</div></div>
              )}

              {treeHH && !treeLoading && treeData && (
                <>
                  <div className="ft-tree-header">
                    <div>
                      <div className="ft-tree-title">HH# {treeHH.householdNo} — {treeHH.sitio}</div>
                      <div className="ft-tree-sub">{treeHH.address} · {treeData.members.length} members · {treeData.links.length} relationship{treeData.links.length !== 1 ? 's' : ''} linked</div>
                    </div>
                    <button className="btn-primary" style={{ fontSize: 12 }} onClick={() => openAddLink()}>
                      + Link Relationship
                    </button>
                  </div>

                  {/* Member cards with their relationships */}
                  <div className="ft-members-grid">
                    {treeData.members.map(m => {
                      // Find all links involving this member
                      const myLinks = treeData.links.filter(l =>
                        l.residentId === m.id || l.relatedResidentId === m.id
                      );
                      return (
                        <div key={m.id} className="ft-member-card">
                          <div className="ft-member-top">
                            <div className="ft-member-avatar"
                              style={{ background: m.gender === 'Female' ? 'linear-gradient(135deg,#ec4899,#be185d)' : 'linear-gradient(135deg,#1a56db,#0891b2)' }}>
                              {m.firstName.charAt(0)}{m.lastName.charAt(0)}
                            </div>
                            <div className="ft-member-info">
                              <div className="ft-member-name">{m.lastName}, {m.firstName} {m.middleName}</div>
                              <div className="ft-member-meta">
                                {m.age != null && <span>Age {m.age}</span>}
                                <span>{m.gender}</span>
                                {m.contactNumber && <span>📞 {m.contactNumber}</span>}
                              </div>
                              <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                                {m.isSenior && <span className="ft-tag ft-tag-amber">Senior</span>}
                                {m.isPWD    && <span className="ft-tag ft-tag-purple">PWD</span>}
                                {m.is4Ps    && <span className="ft-tag ft-tag-orange">4Ps</span>}
                                {m.isVoter  && <span className="ft-tag ft-tag-green">Voter</span>}
                              </div>
                            </div>
                            <button className="ft-add-link-btn" title="Add relationship from this member"
                              onClick={() => openAddLink(m.id)}>+</button>
                          </div>

                          {/* Relationships */}
                          {myLinks.length > 0 && (
                            <div className="ft-rel-list">
                              {myLinks.map(link => {
                                const otherId = link.residentId === m.id ? link.relatedResidentId : link.residentId;
                                const other = treeData.members.find(x => x.id === otherId);
                                // Role from m's perspective
                                const role = link.residentId === m.id ? link.role : invertRoleClient(link.role);
                                const rc = ROLE_COLORS[role] ?? ROLE_COLORS.Other;
                                return (
                                  <div key={link.id} className="ft-rel-row">
                                    <span className="ft-rel-role" style={{ background: rc.bg, color: rc.color }}>{role}</span>
                                    <span className="ft-rel-name">{other ? `${other.lastName}, ${other.firstName}` : `ID:${otherId}`}</span>
                                    {link.notes && <span className="ft-rel-notes">{link.notes}</span>}
                                    <div className="ft-rel-actions">
                                      <button className="ft-rel-btn" onClick={() => openEditLink(link)}>✏️</button>
                                      <button className="ft-rel-btn ft-rel-btn-del" onClick={() => removeLink(link.id)}>✕</button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          {myLinks.length === 0 && (
                            <div className="ft-no-links">No relationships linked yet</div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Relationship summary table */}
                  {treeData.links.length > 0 && (
                    <div className="card" style={{ marginTop: 16, padding: 0 }}>
                      <div style={{ padding: '10px 16px', fontWeight: 700, fontSize: 13, borderBottom: '1px solid var(--border)' }}>
                        🔗 All Relationships in this Household
                      </div>
                      <div className="table-wrap">
                        <table>
                          <thead><tr><th>Person A</th><th>Relationship</th><th>Person B</th><th>Notes</th><th></th></tr></thead>
                          <tbody>
                            {treeData.links.map(link => {
                              const a = treeData.members.find(m => m.id === link.residentId);
                              const b = treeData.members.find(m => m.id === link.relatedResidentId);
                              const rc = ROLE_COLORS[link.role] ?? ROLE_COLORS.Other;
                              return (
                                <tr key={link.id}>
                                  <td style={{ fontWeight: 600 }}>{a ? `${a.lastName}, ${a.firstName}` : `ID:${link.residentId}`}</td>
                                  <td><span className="ft-rel-role" style={{ background: rc.bg, color: rc.color }}>{link.role}</span></td>
                                  <td style={{ fontWeight: 600 }}>{b ? `${b.lastName}, ${b.firstName}` : `ID:${link.relatedResidentId}`}</td>
                                  <td style={{ fontSize: 12, color: '#6b7280' }}>{link.notes || '—'}</td>
                                  <td>
                                    <div style={{ display: 'flex', gap: 4 }}>
                                      <button className="btn-secondary" style={{ fontSize: 11, padding: '2px 8px' }} onClick={() => openEditLink(link)}>Edit</button>
                                      <button className="btn-danger" style={{ fontSize: 11, padding: '2px 8px' }} onClick={() => removeLink(link.id)}>Remove</button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Link / Edit Relationship Modal ── */}
      {linkModal && treeData && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setLinkModal(false)}>
          <div className="modal" style={{ maxWidth: 480 }}>
            <h2>{editLink ? '✏️ Edit Relationship' : '🔗 Link Relationship'}</h2>
            <div className="form-grid">
              <div className="form-group">
                <label>Person A</label>
                <select value={linkForm.residentId} onChange={e => setLinkForm(p => ({ ...p, residentId: Number(e.target.value) }))}
                  disabled={!!editLink}>
                  <option value={0}>— Select —</option>
                  {treeData.members.map(m => (
                    <option key={m.id} value={m.id}>{m.lastName}, {m.firstName}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Relationship Role</label>
                <select value={linkForm.role} onChange={e => setLinkForm(p => ({ ...p, role: e.target.value }))}>
                  {FAMILY_ROLES.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Person B (is the {linkForm.role} of Person A)</label>
                <select value={linkForm.relatedResidentId} onChange={e => setLinkForm(p => ({ ...p, relatedResidentId: Number(e.target.value) }))}
                  disabled={!!editLink}>
                  <option value={0}>— Select —</option>
                  {treeData.members.filter(m => m.id !== linkForm.residentId).map(m => (
                    <option key={m.id} value={m.id}>{m.lastName}, {m.firstName}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Notes (optional)</label>
                <input value={linkForm.notes} onChange={e => setLinkForm(p => ({ ...p, notes: e.target.value }))}
                  placeholder="e.g. Adopted, Step-child…" />
              </div>
            </div>
            <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#0369a1', marginTop: 4 }}>
              {linkForm.residentId && linkForm.relatedResidentId && linkForm.role
                ? `${treeData.members.find(m => m.id === linkForm.residentId)?.firstName ?? '?'} is the ${linkForm.role} of ${treeData.members.find(m => m.id === linkForm.relatedResidentId)?.firstName ?? '?'}`
                : 'Select both persons and a role to preview the relationship.'}
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => { setLinkModal(false); setEditLink(null); }}>Cancel</button>
              <button className="btn-primary" onClick={saveLink}>💾 Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function invertRoleClient(role: string): string {
  const map: Record<string, string> = {
    Parent: 'Child', Child: 'Parent', Guardian: 'Dependent', Dependent: 'Guardian',
  };
  return map[role] ?? role;
}
