import { useEffect, useState, useMemo } from 'react';
import { get, post, put, del } from '../api';
import type { SkillTag, SkilledResident, LivelihoodProgram, LivelihoodSummary, ResidentSkill, Resident } from '../types';
import { SITIOS, SKILL_CATEGORIES, PROFICIENCY_LEVELS, PROGRAM_TYPES, PROGRAM_STATUSES } from '../types';
import { useAuth } from '../auth';
import './Livelihood.css';

type Tab = 'directory' | 'skills' | 'programs';
const COLOR_MAP: Record<string, { bg: string; color: string }> = {
  blue:   { bg: '#dbeafe', color: '#1e40af' },
  green:  { bg: '#dcfce7', color: '#166534' },
  amber:  { bg: '#fef3c7', color: '#92400e' },
  orange: { bg: '#ffedd5', color: '#9a3412' },
  yellow: { bg: '#fef9c3', color: '#854d0e' },
  pink:   { bg: '#fce7f3', color: '#9d174d' },
  purple: { bg: '#ede9fe', color: '#5b21b6' },
  teal:   { bg: '#ccfbf1', color: '#0f766e' },
  indigo: { bg: '#e0e7ff', color: '#3730a3' },
  gray:   { bg: '#f3f4f6', color: '#374151' },
};
function SkillBadge({ name, color, small }: { name: string; color: string; small?: boolean }) {
  const c = COLOR_MAP[color] ?? COLOR_MAP.gray;
  return <span className="lv-skill-badge" style={{ background: c.bg, color: c.color, fontSize: small ? '0.7rem' : '0.75rem' }}>{name}</span>;
}
function fmtDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
}

function printDirectory(residents: SkilledResident[], skillName: string, sitio: string) {
  const rows = residents.map(r =>
    `<tr><td>${r.lastName}, ${r.firstName} ${r.middleName ? r.middleName[0]+'.' : ''}</td><td>${r.sitio}</td><td>${r.contactNumber || '—'}</td><td>${r.occupation || '—'}</td><td>${r.skills.map(s => s.skillName + (s.proficiencyLevel ? ' ('+s.proficiencyLevel+')' : '')).join(', ')}</td><td>${r.skills.some(s => s.isAvailable) ? 'Yes' : 'No'}</td></tr>`
  ).join('');
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(`<html><head><title>Skills Directory</title><style>body{font-family:Arial,sans-serif;font-size:12px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:6px 8px;text-align:left}th{background:#f3f4f6}h2{margin-bottom:4px}p{margin:0 0 12px;color:#555}</style></head><body><h2>Barangay Damolog — Skills Directory</h2><p>${skillName ? 'Skill: '+skillName+' · ' : ''}${sitio ? 'Sitio: '+sitio+' · ' : ''}${residents.length} resident(s)</p><table><thead><tr><th>Name</th><th>Sitio</th><th>Contact</th><th>Occupation</th><th>Skills</th><th>Available</th></tr></thead><tbody>${rows}</tbody></table></body></html>`);
  w.document.close();
  w.print();
}
export default function Livelihood() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('directory');
  const [summary, setSummary] = useState<LivelihoodSummary | null>(null);
  const [residents, setResidents] = useState<SkilledResident[]>([]);
  const [allResidents, setAllResidents] = useState<Resident[]>([]);
  const [dirSkill, setDirSkill] = useState<number | ''>('');
  const [dirSitio, setDirSitio] = useState('');
  const [dirAvail, setDirAvail] = useState(false);
  const [dirSearch, setDirSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [tagModal, setTagModal] = useState(false);
  const [tagResident, setTagResident] = useState<SkilledResident | null>(null);
  const [resSearch, setResSearch] = useState('');
  const [editSkillEntry, setEditSkillEntry] = useState<ResidentSkill | null>(null);
  const [tagForm, setTagForm] = useState({ skillTagId: 0, proficiencyLevel: 'Intermediate', isAvailable: true, notes: '', taggedBy: user?.fullName ?? '' });
  const [skillTags, setSkillTags] = useState<SkillTag[]>([]);
  const [skillModal, setSkillModal] = useState(false);
  const [editSkill, setEditSkill] = useState<SkillTag | null>(null);
  const [skillCatFilter, setSkillCatFilter] = useState('');
  const emptySkill = { name: '', category: 'Trade', description: '', color: 'blue' };
  const [skillForm, setSkillForm] = useState<typeof emptySkill>(emptySkill);
  const [programs, setPrograms] = useState<LivelihoodProgram[]>([]);
  const [progModal, setProgModal] = useState(false);
  const [editProg, setEditProg] = useState<LivelihoodProgram | null>(null);
  const [progStatusFilter, setProgStatusFilter] = useState('');
  const emptyProg = { title: '', programType: 'Training', targetSkills: '', description: '', organizer: '', venue: '', startDate: '', endDate: '', slotCount: 0, status: 'Upcoming', notes: '', createdBy: user?.fullName ?? '' };
  const [progForm, setProgForm] = useState<typeof emptyProg>(emptyProg);

  const loadSummary   = () => get<LivelihoodSummary>('/api/livelihood/summary').then(setSummary).catch(() => {});
  const loadSkillTags = () => get<SkillTag[]>('/api/livelihood/skills').then(setSkillTags);
  const loadAllRes    = () => get<Resident[]>('/api/residents').then(setAllResidents);
  const loadPrograms  = (status?: string) => get<LivelihoodProgram[]>('/api/livelihood/programs' + (status ? '?status=' + status : '')).then(setPrograms);
  const loadResidents = (skillId?: number, sitio?: string, avail?: boolean, search?: string) => {
    const p = new URLSearchParams();
    if (skillId) p.set('skillId', String(skillId));
    if (sitio)   p.set('sitio', sitio);
    if (avail)   p.set('available', 'true');
    if (search)  p.set('search', search);
    get<SkilledResident[]>('/api/livelihood/residents?' + p).then(setResidents).catch(() => setResidents([]));
  };

  useEffect(() => { loadSummary(); loadSkillTags(); loadAllRes(); loadPrograms(); }, []);
  useEffect(() => { loadResidents(dirSkill || undefined, dirSitio || undefined, dirAvail || undefined, dirSearch || undefined); }, [dirSkill, dirSitio, dirAvail, dirSearch]);
  useEffect(() => { loadPrograms(progStatusFilter || undefined); }, [progStatusFilter]);

  const resSearchResults = useMemo(() => {
    if (!resSearch.trim()) return [];
    const q = resSearch.toLowerCase();
    return allResidents.filter(r => (r.firstName + ' ' + r.lastName).toLowerCase().includes(q)).slice(0, 8);
  }, [allResidents, resSearch]);

  const filteredSkillTags = useMemo(() =>
    skillCatFilter ? skillTags.filter(s => s.category === skillCatFilter) : skillTags,
    [skillTags, skillCatFilter]);

  const toggleExpand = (id: number) => setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const saveSkillTag = async () => {
    if (!skillForm.name.trim()) return alert('Skill name is required.');
    if (editSkill) await put('/api/livelihood/skills/' + editSkill.id, skillForm);
    else await post('/api/livelihood/skills', skillForm);
    setSkillModal(false); loadSkillTags(); loadSummary();
  };

  const saveTag = async () => {
    if (!tagResident || !tagForm.skillTagId) return alert('Select a skill.');
    if (editSkillEntry) await put('/api/livelihood/resident-skills/' + editSkillEntry.id, tagForm);
    else await post('/api/livelihood/residents/' + tagResident.id + '/skills', tagForm);
    setTagModal(false); setEditSkillEntry(null);
    loadResidents(dirSkill || undefined, dirSitio || undefined, dirAvail || undefined, dirSearch || undefined);
    loadSummary();
  };

  const removeTag = async (rsId: number) => {
    if (!confirm('Remove this skill?')) return;
    await del('/api/livelihood/resident-skills/' + rsId);
    loadResidents(dirSkill || undefined, dirSitio || undefined, dirAvail || undefined, dirSearch || undefined);
    loadSummary();
  };

  const saveProg = async () => {
    if (!progForm.title.trim()) return alert('Title is required.');
    if (editProg) await put('/api/livelihood/programs/' + editProg.id, progForm);
    else await post('/api/livelihood/programs', progForm);
    setProgModal(false); loadPrograms(progStatusFilter || undefined);
  };

  const PROG_COLORS: Record<string, { bg: string; color: string }> = {
    Upcoming:  { bg: '#dbeafe', color: '#1e40af' },
    Ongoing:   { bg: '#dcfce7', color: '#166534' },
    Completed: { bg: '#f3f4f6', color: '#374151' },
    Cancelled: { bg: '#fee2e2', color: '#991b1b' },
  };
  return (
    <div className="lv-page">
      <div className="lv-header-row">
        <div>
          <h1 className="lv-title">🧾 Livelihood & Skills Registry</h1>
          <p className="lv-subtitle">Barangay Damolog — Skills Directory, Job Referral & Programs</p>
        </div>
      </div>

      {summary && (
        <div className="lv-stats-bar">
          <div className="lv-stat-card lv-stat-blue"><div className="lv-stat-val">{summary.totalTagged}</div><div className="lv-stat-lbl">Skill Tags</div></div>
          <div className="lv-stat-card lv-stat-green"><div className="lv-stat-val">{summary.totalAvailable}</div><div className="lv-stat-lbl">Available for Referral</div></div>
          <div className="lv-stat-card"><div className="lv-stat-val">{summary.totalSkills}</div><div className="lv-stat-lbl">Skill Types</div></div>
          {summary.byCategory.map(c => (
            <div key={c.category} className="lv-stat-card"><div className="lv-stat-val">{c.count}</div><div className="lv-stat-lbl">{c.category}</div></div>
          ))}
        </div>
      )}

      <div className="lv-tabs">
        <button className={`lv-tab ${tab === 'directory' ? 'active' : ''}`} onClick={() => setTab('directory')}>👥 Skills Directory</button>
        <button className={`lv-tab ${tab === 'skills'    ? 'active' : ''}`} onClick={() => setTab('skills')}>🏷️ Manage Skills</button>
        <button className={`lv-tab ${tab === 'programs'  ? 'active' : ''}`} onClick={() => setTab('programs')}>📋 Programs</button>
      </div>

      {tab === 'directory' && (
        <div>
          {summary && summary.skills.filter(s => s.count > 0).length > 0 && (
            <div className="lv-skill-chips">
              <button className={`lv-chip ${dirSkill === '' ? 'active' : ''}`} onClick={() => setDirSkill('')}>All</button>
              {summary.skills.filter(s => s.count > 0).map(s => (
                <button key={s.id} className={`lv-chip ${dirSkill === s.id ? 'active' : ''}`} onClick={() => setDirSkill(dirSkill === s.id ? '' : s.id)}>
                  <SkillBadge name={s.name} color={s.color} small />
                  <span className="lv-chip-count">{s.count}</span>
                </button>
              ))}
            </div>
          )}
          <div className="lv-toolbar">
            <input className="lv-search" placeholder="Search resident name…" value={dirSearch} onChange={e => setDirSearch(e.target.value)} />
            <select className="lv-select" value={dirSitio} onChange={e => setDirSitio(e.target.value)}>
              <option value="">All Sitios</option>
              {SITIOS.map(s => <option key={s}>{s}</option>)}
            </select>
            <label className="lv-check-label"><input type="checkbox" checked={dirAvail} onChange={e => setDirAvail(e.target.checked)} /> Available only</label>
            <button className="btn-primary" onClick={() => { setTagResident(null); setResSearch(''); setEditSkillEntry(null); setTagForm({ skillTagId: 0, proficiencyLevel: 'Intermediate', isAvailable: true, notes: '', taggedBy: user?.fullName ?? '' }); setTagModal(true); }}>+ Tag Skill</button>
            <button className="btn-print" onClick={() => { const sn = skillTags.find(s => s.id === dirSkill)?.name ?? ''; printDirectory(residents, sn, dirSitio); }}>🖨️ Print</button>
            <span className="lv-count">{residents.length} resident{residents.length !== 1 ? 's' : ''}</span>
          </div>
          {residents.length === 0 && (
            <div className="lv-empty">{dirSkill || dirSitio || dirSearch ? 'No residents match the current filters.' : 'No skills tagged yet. Click "+ Tag Skill" to get started.'}</div>
          )}
          <div className="lv-resident-list">
            {residents.map(r => {
              const open = expanded.has(r.id);
              return (
                <div key={r.id} className="lv-resident-card">
                  <div className="lv-resident-header" onClick={() => toggleExpand(r.id)}>
                    <div className="lv-resident-avatar" style={{ background: r.gender === 'Female' ? 'linear-gradient(135deg,#ec4899,#be185d)' : 'linear-gradient(135deg,#1a56db,#0891b2)' }}>
                      {r.firstName.charAt(0)}{r.lastName.charAt(0)}
                    </div>
                    <div className="lv-resident-info">
                      <div className="lv-resident-name">{r.lastName}, {r.firstName} {r.middleName ? r.middleName[0]+'.' : ''}</div>
                      <div className="lv-resident-meta">
                        {r.age != null && <span>Age {r.age}</span>}
                        <span>{r.sitio}</span>
                        {r.contactNumber && <span>📞 {r.contactNumber}</span>}
                        {r.occupation && <span>💼 {r.occupation}</span>}
                      </div>
                      <div className="lv-skill-tags">{r.skills.map(s => <SkillBadge key={s.id} name={s.skillName} color={s.skillColor} small />)}</div>
                    </div>
                    <div className="lv-resident-right">
                      {r.skills.some(s => s.isAvailable) && <span className="lv-avail-dot" title="Available for referral">●</span>}
                      <button className="btn-sm" onClick={e => { e.stopPropagation(); setTagResident(r); setResSearch(r.lastName + ', ' + r.firstName); setEditSkillEntry(null); setTagForm({ skillTagId: 0, proficiencyLevel: 'Intermediate', isAvailable: true, notes: '', taggedBy: user?.fullName ?? '' }); setTagModal(true); }}>+ Skill</button>
                      <span className="lv-toggle">{open ? '▲' : '▼'}</span>
                    </div>
                  </div>
                  {open && (
                    <div className="lv-skill-detail">
                      {r.skills.length === 0 && <div className="lv-no-skills">No skills tagged.</div>}
                      {r.skills.map(s => {
                        const c = COLOR_MAP[s.skillColor] ?? COLOR_MAP.gray;
                        return (
                          <div key={s.id} className="lv-skill-row">
                            <span className="lv-skill-badge" style={{ background: c.bg, color: c.color }}>{s.skillName}</span>
                            <span className="lv-prof">{s.proficiencyLevel}</span>
                            <span className={`lv-avail-tag ${s.isAvailable ? 'yes' : 'no'}`}>{s.isAvailable ? '✓ Available' : '✗ Unavailable'}</span>
                            {s.notes && <span className="lv-skill-notes">{s.notes}</span>}
                            <div className="lv-skill-actions">
                              <button className="btn-sm" onClick={() => { setTagResident(r); setResSearch(r.lastName + ', ' + r.firstName); setEditSkillEntry(s); setTagForm({ skillTagId: s.skillTagId, proficiencyLevel: s.proficiencyLevel, isAvailable: s.isAvailable, notes: s.notes, taggedBy: s.taggedBy }); setTagModal(true); }}>✏️</button>
                              <button className="btn-sm btn-danger" onClick={() => removeTag(s.id)}>✕</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
      {tab === 'skills' && (
        <div>
          <div className="lv-toolbar">
            <div className="lv-pills">
              <button className={`pill ${skillCatFilter === '' ? 'active' : ''}`} onClick={() => setSkillCatFilter('')}>All</button>
              {SKILL_CATEGORIES.map(c => <button key={c} className={`pill ${skillCatFilter === c ? 'active' : ''}`} onClick={() => setSkillCatFilter(c)}>{c}</button>)}
            </div>
            <button className="btn-primary" style={{ marginLeft: 'auto' }} onClick={() => { setEditSkill(null); setSkillForm(emptySkill); setSkillModal(true); }}>+ Add Skill</button>
          </div>
          <div className="lv-skill-grid">
            {filteredSkillTags.map(s => {
              const c = COLOR_MAP[s.color] ?? COLOR_MAP.gray;
              return (
                <div key={s.id} className="lv-skill-card">
                  <div className="lv-skill-card-top">
                    <span className="lv-skill-badge" style={{ background: c.bg, color: c.color, fontSize: '0.85rem', padding: '4px 12px' }}>{s.name}</span>
                    <span className="lv-skill-cat">{s.category}</span>
                  </div>
                  {s.description && <div className="lv-skill-desc">{s.description}</div>}
                  <div className="lv-skill-card-footer">
                    <span className="lv-skill-count">👥 {s.residentCount} resident{s.residentCount !== 1 ? 's' : ''}</span>
                    <div className="lv-skill-card-actions">
                      <button className="btn-sm" onClick={() => { setEditSkill(s); setSkillForm({ name: s.name, category: s.category, description: s.description, color: s.color }); setSkillModal(true); }}>✏️</button>
                      <button className="btn-sm btn-danger" onClick={() => { if (confirm('Delete skill tag?')) { del('/api/livelihood/skills/' + s.id).then(() => { loadSkillTags(); loadSummary(); }); } }}>✕</button>
                    </div>
                  </div>
                </div>
              );
            })}
            {filteredSkillTags.length === 0 && <div className="lv-empty">No skill tags found.</div>}
          </div>
        </div>
      )}

      {tab === 'programs' && (
        <div>
          <div className="lv-toolbar">
            <div className="lv-pills">
              <button className={`pill ${progStatusFilter === '' ? 'active' : ''}`} onClick={() => setProgStatusFilter('')}>All</button>
              {PROGRAM_STATUSES.map(s => <button key={s} className={`pill ${progStatusFilter === s ? 'active' : ''}`} onClick={() => setProgStatusFilter(s)}>{s}</button>)}
            </div>
            <button className="btn-primary" style={{ marginLeft: 'auto' }} onClick={() => { setEditProg(null); setProgForm(emptyProg); setProgModal(true); }}>+ Add Program</button>
          </div>
          {programs.length === 0 && <div className="lv-empty">No programs found.</div>}
          <div className="lv-prog-list">
            {programs.map(p => {
              const pc = PROG_COLORS[p.status] ?? PROG_COLORS.Upcoming;
              return (
                <div key={p.id} className="lv-prog-card">
                  <div className="lv-prog-top">
                    <div>
                      <div className="lv-prog-title">{p.title}</div>
                      <div className="lv-prog-meta">
                        <span>{p.programType}</span>
                        {p.organizer && <span>· {p.organizer}</span>}
                        {p.venue && <span>📍 {p.venue}</span>}
                      </div>
                    </div>
                    <span className="lv-prog-status" style={{ background: pc.bg, color: pc.color }}>{p.status}</span>
                  </div>
                  {p.description && <div className="lv-prog-desc">{p.description}</div>}
                  <div className="lv-prog-details">
                    <span>📅 {fmtDate(p.startDate)}{p.endDate ? ' – ' + fmtDate(p.endDate) : ''}</span>
                    {p.slotCount > 0 && <span>🪑 {p.slotCount} slots</span>}
                    {p.targetSkills && <span>🏷️ {p.targetSkills}</span>}
                  </div>
                  <div className="lv-prog-actions">
                    <button className="btn-sm" onClick={() => { setEditProg(p); setProgForm({ title: p.title, programType: p.programType, targetSkills: p.targetSkills, description: p.description, organizer: p.organizer, venue: p.venue, startDate: p.startDate ? p.startDate.slice(0,10) : '', endDate: p.endDate ? p.endDate.slice(0,10) : '', slotCount: p.slotCount, status: p.status, notes: p.notes, createdBy: p.createdBy }); setProgModal(true); }}>✏️ Edit</button>
                    <button className="btn-sm btn-danger" onClick={() => { if (confirm('Delete program?')) del('/api/livelihood/programs/' + p.id).then(() => loadPrograms(progStatusFilter || undefined)); }}>Delete</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {tagModal && (
        <div className="lv-overlay" onClick={() => setTagModal(false)}>
          <div className="lv-modal" onClick={e => e.stopPropagation()}>
            <div className="lv-modal-header">
              <h2>{editSkillEntry ? '✏️ Edit Skill Entry' : '🏷️ Tag Skill to Resident'}</h2>
              <button className="lv-close" onClick={() => setTagModal(false)}>✕</button>
            </div>
            <div className="lv-modal-body">
              {!editSkillEntry && (
                <div className="lv-form-group">
                  <label>Resident</label>
                  <input placeholder="Search resident name…" value={resSearch} onChange={e => { setResSearch(e.target.value); setTagResident(null); }} />
                  {resSearchResults.length > 0 && !tagResident && (
                    <div className="lv-res-dropdown">
                      {resSearchResults.map(r => (
                        <div key={r.id} className="lv-res-item" onClick={() => {
                          const found = residents.find(x => x.id === r.id);
                          if (found) { setTagResident(found); } else {
                            setTagResident({ id: r.id, firstName: r.firstName, lastName: r.lastName, middleName: r.middleName, gender: r.gender, sitio: r.sitio, address: r.address, contactNumber: r.contactNumber, occupation: r.occupation, isSenior: r.isSenior, isPWD: r.isPWD, is4Ps: r.is4Ps, age: null, skills: [] });
                          }
                          setResSearch(r.lastName + ', ' + r.firstName);
                        }}>
                          {r.lastName}, {r.firstName} — {r.sitio}
                        </div>
                      ))}
                    </div>
                  )}
                  {tagResident && <div className="lv-selected-res">✓ {tagResident.lastName}, {tagResident.firstName} — {tagResident.sitio}</div>}
                </div>
              )}
              <div className="lv-form-grid">
                <div className="lv-form-group">
                  <label>Skill</label>
                  <select value={tagForm.skillTagId} onChange={e => setTagForm(f => ({ ...f, skillTagId: +e.target.value }))} disabled={!!editSkillEntry}>
                    <option value={0}>— Select Skill —</option>
                    {skillTags.map(s => <option key={s.id} value={s.id}>{s.name} ({s.category})</option>)}
                  </select>
                </div>
                <div className="lv-form-group">
                  <label>Proficiency</label>
                  <select value={tagForm.proficiencyLevel} onChange={e => setTagForm(f => ({ ...f, proficiencyLevel: e.target.value }))}>
                    {PROFICIENCY_LEVELS.map(l => <option key={l}>{l}</option>)}
                  </select>
                </div>
                <div className="lv-form-group">
                  <label>Tagged By</label>
                  <input value={tagForm.taggedBy} onChange={e => setTagForm(f => ({ ...f, taggedBy: e.target.value }))} />
                </div>
                <div className="lv-form-group lv-check-group">
                  <label><input type="checkbox" checked={tagForm.isAvailable} onChange={e => setTagForm(f => ({ ...f, isAvailable: e.target.checked }))} /> Available for job referral</label>
                </div>
                <div className="lv-form-group span2">
                  <label>Notes</label>
                  <textarea value={tagForm.notes} onChange={e => setTagForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="e.g. 5 years experience, has tools…" />
                </div>
              </div>
            </div>
            <div className="lv-modal-footer">
              <button className="btn-secondary" onClick={() => { setTagModal(false); setEditSkillEntry(null); }}>Cancel</button>
              <button className="btn-primary" onClick={saveTag}>💾 Save</button>
            </div>
          </div>
        </div>
      )}

      {skillModal && (
        <div className="lv-overlay" onClick={() => setSkillModal(false)}>
          <div className="lv-modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <div className="lv-modal-header">
              <h2>{editSkill ? '✏️ Edit Skill Tag' : '+ Add Skill Tag'}</h2>
              <button className="lv-close" onClick={() => setSkillModal(false)}>✕</button>
            </div>
            <div className="lv-modal-body">
              <div className="lv-form-grid">
                <div className="lv-form-group span2"><label>Skill Name<input value={skillForm.name} onChange={e => setSkillForm(f => ({ ...f, name: e.target.value }))} /></label></div>
                <div className="lv-form-group"><label>Category
                  <select value={skillForm.category} onChange={e => setSkillForm(f => ({ ...f, category: e.target.value }))}>
                    {SKILL_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </label></div>
                <div className="lv-form-group"><label>Badge Color
                  <select value={skillForm.color} onChange={e => setSkillForm(f => ({ ...f, color: e.target.value }))}>
                    {Object.keys(COLOR_MAP).map(c => <option key={c}>{c}</option>)}
                  </select>
                </label></div>
                <div className="lv-form-group span2"><label>Description<input value={skillForm.description} onChange={e => setSkillForm(f => ({ ...f, description: e.target.value }))} /></label></div>
              </div>
              <div style={{ marginTop: 8 }}>Preview: <SkillBadge name={skillForm.name || 'Skill Name'} color={skillForm.color} /></div>
            </div>
            <div className="lv-modal-footer">
              <button className="btn-secondary" onClick={() => setSkillModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={saveSkillTag}>💾 Save</button>
            </div>
          </div>
        </div>
      )}

      {progModal && (
        <div className="lv-overlay" onClick={() => setProgModal(false)}>
          <div className="lv-modal" onClick={e => e.stopPropagation()}>
            <div className="lv-modal-header">
              <h2>{editProg ? '✏️ Edit Program' : '+ Add Program'}</h2>
              <button className="lv-close" onClick={() => setProgModal(false)}>✕</button>
            </div>
            <div className="lv-modal-body">
              <div className="lv-form-grid">
                <div className="lv-form-group span2"><label>Title<input value={progForm.title} onChange={e => setProgForm(f => ({ ...f, title: e.target.value }))} /></label></div>
                <div className="lv-form-group"><label>Type
                  <select value={progForm.programType} onChange={e => setProgForm(f => ({ ...f, programType: e.target.value }))}>
                    {PROGRAM_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </label></div>
                <div className="lv-form-group"><label>Status
                  <select value={progForm.status} onChange={e => setProgForm(f => ({ ...f, status: e.target.value }))}>
                    {PROGRAM_STATUSES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </label></div>
                <div className="lv-form-group"><label>Organizer<input value={progForm.organizer} onChange={e => setProgForm(f => ({ ...f, organizer: e.target.value }))} /></label></div>
                <div className="lv-form-group"><label>Venue<input value={progForm.venue} onChange={e => setProgForm(f => ({ ...f, venue: e.target.value }))} /></label></div>
                <div className="lv-form-group"><label>Start Date<input type="date" value={progForm.startDate} onChange={e => setProgForm(f => ({ ...f, startDate: e.target.value }))} /></label></div>
                <div className="lv-form-group"><label>End Date<input type="date" value={progForm.endDate} onChange={e => setProgForm(f => ({ ...f, endDate: e.target.value }))} /></label></div>
                <div className="lv-form-group"><label>Slots<input type="number" min={0} value={progForm.slotCount} onChange={e => setProgForm(f => ({ ...f, slotCount: +e.target.value }))} /></label></div>
                <div className="lv-form-group"><label>Target Skills<input value={progForm.targetSkills} placeholder="e.g. Carpenter, Welder" onChange={e => setProgForm(f => ({ ...f, targetSkills: e.target.value }))} /></label></div>
                <div className="lv-form-group span2"><label>Description<textarea value={progForm.description} onChange={e => setProgForm(f => ({ ...f, description: e.target.value }))} rows={2} /></label></div>
                <div className="lv-form-group span2"><label>Notes<textarea value={progForm.notes} onChange={e => setProgForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></label></div>
              </div>
            </div>
            <div className="lv-modal-footer">
              <button className="btn-secondary" onClick={() => setProgModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={saveProg}>💾 Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}