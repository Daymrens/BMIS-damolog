import { useEffect, useState } from 'react';
import { get, post, put, del } from '../api';
import type { Official } from '../types';
import './Officials.css';

const empty: Omit<Official, 'id'> = {
  name: '', position: '', contactNumber: '',
  termStart: '', termEnd: '', isActive: true,
};

// Hierarchy order for tree layout
const HIERARCHY = [
  'Punong Barangay',
  'Barangay Kagawad',
  'Barangay Secretary',
  'Barangay Treasurer',
];

function groupOfficials(officials: Official[]) {
  const map: Record<string, Official[]> = {};
  for (const o of officials) {
    const key = HIERARCHY.includes(o.position) ? o.position : 'Others';
    if (!map[key]) map[key] = [];
    map[key].push(o);
  }
  return map;
}

function OfficialCard({ o, onEdit, onDelete }: { o: Official; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className={`official-card ${!o.isActive ? 'inactive' : ''}`}>
      <div className="official-avatar">
        {o.name.split(',')[0]?.trim().charAt(0).toUpperCase() ?? '?'}
      </div>
      <div className="official-info">
        <div className="official-name">{o.name}</div>
        <div className="official-pos">{o.position}</div>
        {o.contactNumber && <div className="official-contact">📞 {o.contactNumber}</div>}
        <div className="official-term">
          {o.termStart?.slice(0, 4)} – {o.termEnd?.slice(0, 4)}
          {' '}<span className={`badge ${o.isActive ? 'badge-active' : 'badge-inactive'}`} style={{ fontSize: 10 }}>
            {o.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>
      <div className="official-actions">
        <button className="btn-secondary" style={{ padding: '3px 10px', fontSize: 12 }} onClick={onEdit}>Edit</button>
        <button className="btn-danger"    style={{ padding: '3px 10px', fontSize: 12 }} onClick={onDelete}>Delete</button>
      </div>
    </div>
  );
}

export default function Officials() {
  const [officials, setOfficials] = useState<Official[]>([]);
  const [modal, setModal]   = useState(false);
  const [form, setForm]     = useState<Omit<Official, 'id'>>(empty);
  const [editing, setEditing] = useState<Official | null>(null);
  const [view, setView]     = useState<'tree' | 'table'>('tree');

  const load = () => get<Official[]>('/api/officials').then(setOfficials).catch(console.error);
  useEffect(() => { load(); }, []);

  const openAdd  = () => { setEditing(null); setForm(empty); setModal(true); };
  const openEdit = (o: Official) => { setEditing(o); setForm({ ...o }); setModal(true); };
  const save = async () => {
    if (editing) await put(`/api/officials/${editing.id}`, { ...form, id: editing.id });
    else await post('/api/officials', form);
    setModal(false); load();
  };
  const remove = async (o: Official) => {
    if (!confirm(`Delete ${o.name}?`)) return;
    await del(`/api/officials/${o.id}`); load();
  };
  const f = (k: keyof typeof form, v: string | boolean) => setForm(p => ({ ...p, [k]: v }));

  const grouped = groupOfficials(officials);
  const punong  = grouped['Punong Barangay']?.[0];
  const kagawad = grouped['Barangay Kagawad'] ?? [];
  const secretary = grouped['Barangay Secretary']?.[0];
  const treasurer = grouped['Barangay Treasurer']?.[0];
  const others  = grouped['Others'] ?? [];

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">🏛 Barangay Officials</div>
          <div className="page-sub">{officials.filter(o => o.isActive).length} active officials</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className={view === 'tree'  ? 'btn-primary' : 'btn-secondary'} onClick={() => setView('tree')}>🌳 Tree</button>
          <button className={view === 'table' ? 'btn-primary' : 'btn-secondary'} onClick={() => setView('table')}>📋 Table</button>
          <button className="btn-primary" onClick={openAdd}>+ Add</button>
        </div>
      </div>

      {/* ── Tree View ── */}
      {view === 'tree' && (
        <div className="org-chart">

          {/* Punong Barangay — root */}
          <div className="org-level">
            <div className="org-level-label">Punong Barangay</div>
            <div className="org-row">
              {punong
                ? <OfficialCard o={punong} onEdit={() => openEdit(punong)} onDelete={() => remove(punong)} />
                : <div className="official-card empty">No Punong Barangay</div>
              }
            </div>
          </div>

          {/* Connector */}
          <div className="org-connector"><div className="org-line-v" /></div>

          {/* Kagawad row */}
          <div className="org-level">
            <div className="org-level-label">Barangay Kagawad</div>
            <div className="org-row org-row-wrap">
              {kagawad.length > 0
                ? kagawad.map(o => <OfficialCard key={o.id} o={o} onEdit={() => openEdit(o)} onDelete={() => remove(o)} />)
                : <div className="official-card empty">No Kagawad</div>
              }
            </div>
          </div>

          {/* Connector */}
          <div className="org-connector"><div className="org-line-v" /></div>

          {/* Secretary + Treasurer side by side */}
          <div className="org-level">
            <div className="org-row">
              <div className="org-branch">
                <div className="org-level-label">Barangay Secretary</div>
                {secretary
                  ? <OfficialCard o={secretary} onEdit={() => openEdit(secretary)} onDelete={() => remove(secretary)} />
                  : <div className="official-card empty">No Secretary</div>
                }
              </div>
              <div className="org-branch-gap" />
              <div className="org-branch">
                <div className="org-level-label">Barangay Treasurer</div>
                {treasurer
                  ? <OfficialCard o={treasurer} onEdit={() => openEdit(treasurer)} onDelete={() => remove(treasurer)} />
                  : <div className="official-card empty">No Treasurer</div>
                }
              </div>
            </div>
          </div>

          {/* Others if any */}
          {others.length > 0 && (
            <>
              <div className="org-connector"><div className="org-line-v" /></div>
              <div className="org-level">
                <div className="org-level-label">Others</div>
                <div className="org-row org-row-wrap">
                  {others.map(o => <OfficialCard key={o.id} o={o} onEdit={() => openEdit(o)} onDelete={() => remove(o)} />)}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Table View ── */}
      {view === 'table' && (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Name</th><th>Position</th><th>Contact</th><th>Term</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {officials.map(o => (
                  <tr key={o.id}>
                    <td>{o.name}</td>
                    <td>{o.position}</td>
                    <td>{o.contactNumber || '—'}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{o.termStart?.slice(0,10)} → {o.termEnd?.slice(0,10)}</td>
                    <td><span className={`badge ${o.isActive ? 'badge-active' : 'badge-inactive'}`}>{o.isActive ? 'Active' : 'Inactive'}</span></td>
                    <td style={{ display: 'flex', gap: 6 }}>
                      <button className="btn-secondary" style={{ padding: '4px 10px' }} onClick={() => openEdit(o)}>Edit</button>
                      <button className="btn-danger"    style={{ padding: '4px 10px' }} onClick={() => remove(o)}>Delete</button>
                    </td>
                  </tr>
                ))}
                {officials.length === 0 && <tr><td colSpan={6} className="empty-row">No officials found.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal">
            <h2>{editing ? 'Edit Official' : 'Add Official'}</h2>
            <div className="form-grid">
              <div className="form-group full"><label>Name</label><input value={form.name} onChange={e => f('name', e.target.value)} /></div>
              <div className="form-group full">
                <label>Position</label>
                <select value={form.position} onChange={e => f('position', e.target.value)}>
                  <option value="">— Select —</option>
                  {HIERARCHY.map(p => <option key={p}>{p}</option>)}
                  <option>SK Chairperson</option>
                  <option>Others</option>
                </select>
              </div>
              <div className="form-group full"><label>Contact No.</label><input value={form.contactNumber} onChange={e => f('contactNumber', e.target.value)} /></div>
              <div className="form-group"><label>Term Start</label><input type="date" value={form.termStart?.slice(0,10)} onChange={e => f('termStart', e.target.value)} /></div>
              <div className="form-group"><label>Term End</label><input type="date" value={form.termEnd?.slice(0,10)} onChange={e => f('termEnd', e.target.value)} /></div>
              <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" id="active" checked={form.isActive} onChange={e => f('isActive', e.target.checked)} style={{ width: 'auto' }} />
                <label htmlFor="active">Currently Active</label>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={save}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
