import { useEffect, useState } from 'react';
import { get, post, put, del } from '../api';
import { useAuth, ROLE_PERMISSIONS } from '../auth';
import { SITIOS } from '../types';
import type { Official, Resident } from '../types';
import './Admin.css';

interface User { id: number; username: string; fullName: string; role: string; isActive: boolean; createdAt: string; lastLogin?: string; }
interface AuditEntry { id: number; username: string; action: string; details: string; timestamp: string; }
interface SysInfo { totalResidents: number; totalOfficials: number; totalDocuments: number; totalBlotters: number; totalUsers: number; totalAuditLogs: number; dbSizeKb: number; serverTime: string; dotNetVersion: string; }

type Tab = 'overview' | 'users' | 'officials' | 'residents' | 'sitios' | 'permissions' | 'audit' | 'password';

const ROLES = ['Admin', 'Secretary', 'Treasurer', 'Staff'] as const;
const ROLE_COLORS: Record<string, string> = {
  Admin: '#1a56db', Secretary: '#059669', Treasurer: '#d97706', Staff: '#6b7280',
};
const POSITIONS = [
  'Punong Barangay', 'Barangay Kagawad', 'Barangay Secretary',
  'Barangay Treasurer', 'SK Chairperson', 'SK Kagawad',
];

export default function Admin() {
  const { user: me } = useAuth();
  const [tab, setTab] = useState<Tab>('overview');
  const [users, setUsers] = useState<User[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [sysInfo, setSysInfo] = useState<SysInfo | null>(null);

  // ── Users ──
  const [userModal, setUserModal] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [uForm, setUForm] = useState({ username: '', password: '', fullName: '', role: 'Staff', isActive: true, newPassword: '' });

  // ── Officials ──
  const [officials, setOfficials] = useState<Official[]>([]);
  const [offModal, setOffModal] = useState(false);
  const [editOff, setEditOff] = useState<Official | null>(null);
  const [oForm, setOForm] = useState({ name: '', position: 'Barangay Kagawad', contactNumber: '', termStart: '', termEnd: '', isActive: true });

  // ── Residents quick-edit ──
  const [residents, setResidents] = useState<Resident[]>([]);
  const [resSearch, setResSearch] = useState('');
  const [resSitio, setResSitio] = useState('');
  const [resModal, setResModal] = useState(false);
  const [editRes, setEditRes] = useState<Resident | null>(null);
  const [rForm, setRForm] = useState<Partial<Resident>>({});

  // ── Sitios ──
  const [sitioList, setSitioList] = useState<string[]>([...SITIOS]);
  const [newSitio, setNewSitio] = useState('');
  const [sitioMsg, setSitioMsg] = useState('');

  // ── Password ──
  const [pwForm, setPwForm] = useState({ oldPassword: '', newPassword: '', confirm: '' });
  const [pwMsg, setPwMsg] = useState('');

  const loadUsers    = () => get<User[]>('/api/admin/users').then(setUsers).catch(console.error);
  const loadAudit    = () => get<AuditEntry[]>('/api/admin/audit?limit=200').then(setAudit).catch(console.error);
  const loadSysInfo  = () => get<SysInfo>('/api/admin/system-info').then(setSysInfo).catch(console.error);
  const loadOfficials = () => get<Official[]>('/api/officials').then(setOfficials).catch(console.error);
  const loadResidents = () => get<Resident[]>('/api/residents').then(setResidents).catch(console.error);

  useEffect(() => { loadUsers(); loadSysInfo(); }, []);
  useEffect(() => {
    if (tab === 'audit') loadAudit();
    if (tab === 'officials') loadOfficials();
    if (tab === 'residents') loadResidents();
  }, [tab]);

  // ── User handlers ──
  const openCreateUser = () => {
    setEditUser(null);
    setUForm({ username: '', password: '', fullName: '', role: 'Staff', isActive: true, newPassword: '' });
    setUserModal(true);
  };
  const openEditUser = (u: User) => {
    setEditUser(u);
    setUForm({ username: u.username, password: '', fullName: u.fullName, role: u.role, isActive: u.isActive, newPassword: '' });
    setUserModal(true);
  };
  const saveUser = async () => {
    try {
      if (editUser) {
        await put(`/api/admin/users/${editUser.id}`, {
          fullName: uForm.fullName, role: uForm.role, isActive: uForm.isActive,
          newPassword: uForm.newPassword || null, updatedBy: me?.username ?? 'admin',
        });
      } else {
        if (!uForm.password) { alert('Password is required.'); return; }
        await post('/api/admin/users', {
          username: uForm.username, password: uForm.password,
          fullName: uForm.fullName, role: uForm.role, createdBy: me?.username ?? 'admin',
        });
      }
      setUserModal(false); loadUsers();
    } catch (e: any) { alert(e?.message ?? 'Failed to save user.'); }
  };
  const deleteUser = async (u: User) => {
    if (!confirm(`Delete user "${u.username}"?`)) return;
    await del(`/api/admin/users/${u.id}?by=${me?.username}`);
    loadUsers();
  };

  // ── Official handlers ──
  const openCreateOff = () => {
    setEditOff(null);
    setOForm({ name: '', position: 'Barangay Kagawad', contactNumber: '', termStart: '2023-01-01', termEnd: '2025-12-31', isActive: true });
    setOffModal(true);
  };
  const openEditOff = (o: Official) => {
    setEditOff(o);
    setOForm({ name: o.name, position: o.position, contactNumber: o.contactNumber, termStart: o.termStart?.slice(0,10) ?? '', termEnd: o.termEnd?.slice(0,10) ?? '', isActive: o.isActive });
    setOffModal(true);
  };
  const saveOff = async () => {
    try {
      if (editOff) {
        await put(`/api/officials/${editOff.id}`, oForm);
      } else {
        await post('/api/officials', oForm);
      }
      setOffModal(false); loadOfficials();
    } catch (e: any) { alert(e?.message ?? 'Failed to save official.'); }
  };
  const deleteOff = async (o: Official) => {
    if (!confirm(`Remove "${o.name}" from officials?`)) return;
    await del(`/api/officials/${o.id}`);
    loadOfficials();
  };

  // ── Resident handlers ──
  const filteredRes = residents.filter(r => {
    const q = resSearch.toLowerCase();
    const matchQ = !q || `${r.firstName} ${r.lastName}`.toLowerCase().includes(q) || r.address.toLowerCase().includes(q);
    const matchS = !resSitio || r.sitio === resSitio;
    return matchQ && matchS;
  });
  const openEditRes = (r: Resident) => {
    setEditRes(r);
    setRForm({ ...r });
    setResModal(true);
  };
  const saveRes = async () => {
    if (!editRes) return;
    try {
      await put(`/api/residents/${editRes.id}`, rForm);
      setResModal(false); loadResidents();
    } catch (e: any) { alert(e?.message ?? 'Failed to save resident.'); }
  };
  const deleteRes = async (r: Resident) => {
    if (!confirm(`Delete resident "${r.firstName} ${r.lastName}"? This cannot be undone.`)) return;
    await del(`/api/residents/${r.id}`);
    loadResidents();
  };

  // ── Sitio handlers ──
  const addSitio = () => {
    const s = newSitio.trim();
    if (!s) return;
    if (sitioList.map(x => x.toLowerCase()).includes(s.toLowerCase())) {
      setSitioMsg('Sitio already exists.'); return;
    }
    setSitioList(p => [...p, s]);
    setNewSitio('');
    setSitioMsg(`"${s}" added to the list. Note: to persist across sessions, add it to types.ts SITIOS array.`);
  };

  // ── Password ──
  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault(); setPwMsg('');
    if (pwForm.newPassword !== pwForm.confirm) { setPwMsg('Passwords do not match.'); return; }
    try {
      await post('/api/auth/change-password', { username: me?.username, oldPassword: pwForm.oldPassword, newPassword: pwForm.newPassword });
      setPwMsg('✅ Password changed successfully.');
      setPwForm({ oldPassword: '', newPassword: '', confirm: '' });
    } catch { setPwMsg('❌ Current password is incorrect.'); }
  };

  const downloadBackup = () => window.open('http://localhost:5000/api/admin/backup', '_blank');
  const uf = (k: keyof typeof uForm, v: string | boolean) => setUForm(p => ({ ...p, [k]: v }));
  const of_ = (k: keyof typeof oForm, v: string | boolean) => setOForm(p => ({ ...p, [k]: v }));

  const ACTION_COLOR: Record<string, string> = {
    LOGIN: '#dbeafe', CREATE_USER: '#d1fae5', DELETE_USER: '#fee2e2',
    UPDATE_USER: '#fef3c7', CHANGE_PASSWORD: '#ede9fe',
  };

  const TABS: { key: Tab; label: string }[] = [
    { key: 'overview',    label: '📊 Overview' },
    { key: 'users',       label: '👤 Users' },
    { key: 'officials',   label: '🏛 Officials' },
    { key: 'residents',   label: '👥 Residents' },
    { key: 'sitios',      label: '📍 Sitios' },
    { key: 'permissions', label: '🔐 Permissions' },
    { key: 'audit',       label: '📋 Audit Log' },
    { key: 'password',    label: '🔑 Password' },
  ];

  return (
    <div className="admin-page">
      <div className="page-header">
        <div>
          <div className="page-title">⚙️ Admin Panel</div>
          <div className="page-sub">System administration · {me?.fullName} ({me?.role})</div>
        </div>
      </div>

      <div className="admin-tabs">
        {TABS.map(t => (
          <button key={t.key} className={`admin-tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {tab === 'overview' && sysInfo && (
        <div className="admin-section">
          <div className="admin-stat-grid">
            {[
              { label: 'Residents',  val: sysInfo.totalResidents,  color: '#1a4f8a' },
              { label: 'Officials',  val: sysInfo.totalOfficials,  color: '#059669' },
              { label: 'Documents',  val: sysInfo.totalDocuments,  color: '#d97706' },
              { label: 'Blotters',   val: sysInfo.totalBlotters,   color: '#dc2626' },
              { label: 'Users',      val: sysInfo.totalUsers,      color: '#7c3aed' },
              { label: 'Audit Logs', val: sysInfo.totalAuditLogs,  color: '#0891b2' },
            ].map(s => (
              <div key={s.label} className="admin-stat-card" style={{ borderTop: `4px solid ${s.color}` }}>
                <div className="admin-stat-val" style={{ color: s.color }}>{s.val}</div>
                <div className="admin-stat-lbl">{s.label}</div>
              </div>
            ))}
          </div>
          <div className="admin-info-grid">
            <div className="card">
              <div className="admin-info-title">🗄️ Database</div>
              <div className="admin-info-row"><span>Size</span><span>{sysInfo.dbSizeKb} KB</span></div>
              <div className="admin-info-row"><span>Server Time</span><span>{sysInfo.serverTime}</span></div>
              <div className="admin-info-row"><span>Runtime</span><span>{sysInfo.dotNetVersion}</span></div>
              <button className="btn-secondary" style={{ marginTop: 14, width: '100%' }} onClick={downloadBackup}>
                ⬇️ Download DB Backup
              </button>
            </div>
            <div className="card">
              <div className="admin-info-title">🔐 Session</div>
              <div className="admin-info-row"><span>Username</span><span>{me?.username}</span></div>
              <div className="admin-info-row"><span>Full Name</span><span>{me?.fullName}</span></div>
              <div className="admin-info-row"><span>Role</span><span>{me?.role}</span></div>
              <div className="admin-info-row"><span>Last Login</span><span>{me?.lastLogin ? new Date(me.lastLogin).toLocaleString() : '—'}</span></div>
            </div>
          </div>
        </div>
      )}

      {/* ── Users ── */}
      {tab === 'users' && (
        <div className="admin-section">
          <div className="toolbar">
            <button className="btn-primary" onClick={openCreateUser}>+ Add User</button>
          </div>
          <div className="card" style={{ padding: 0 }}>
            <table>
              <thead><tr>
                <th>Username</th><th>Full Name</th><th>Role</th><th>Status</th><th>Last Login</th><th>Actions</th>
              </tr></thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td><code>{u.username}</code></td>
                    <td>{u.fullName}</td>
                    <td><span className={`role-badge role-${u.role.toLowerCase()}`}>{u.role}</span></td>
                    <td><span className={`badge ${u.isActive ? 'badge-active' : 'badge-inactive'}`}>{u.isActive ? 'Active' : 'Inactive'}</span></td>
                    <td>{u.lastLogin ? new Date(u.lastLogin).toLocaleString() : '—'}</td>
                    <td>
                      <button className="btn-secondary btn-sm" onClick={() => openEditUser(u)}>Edit</button>
                      {u.username !== 'admin' && <button className="btn-danger btn-sm" onClick={() => deleteUser(u)}>Delete</button>}
                    </td>
                  </tr>
                ))}
                {users.length === 0 && <tr><td colSpan={6} className="empty-row">No users found.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Officials ── */}
      {tab === 'officials' && (
        <div className="admin-section">
          <div className="toolbar">
            <button className="btn-primary" onClick={openCreateOff}>+ Add Official</button>
            <span className="toolbar-count">{officials.length} officials</span>
          </div>
          <div className="card" style={{ padding: 0 }}>
            <table>
              <thead><tr>
                <th>Name</th><th>Position</th><th>Contact</th><th>Term</th><th>Status</th><th>Actions</th>
              </tr></thead>
              <tbody>
                {officials.map(o => (
                  <tr key={o.id}>
                    <td style={{ fontWeight: 600 }}>{o.name}</td>
                    <td>
                      <span className={`off-badge ${o.position === 'Punong Barangay' ? 'off-captain' : 'off-kagawad'}`}>
                        {o.position}
                      </span>
                    </td>
                    <td>{o.contactNumber || '—'}</td>
                    <td style={{ fontSize: 12 }}>{o.termStart?.slice(0,10)} – {o.termEnd?.slice(0,10)}</td>
                    <td><span className={`badge ${o.isActive ? 'badge-active' : 'badge-inactive'}`}>{o.isActive ? 'Active' : 'Inactive'}</span></td>
                    <td>
                      <button className="btn-secondary btn-sm" onClick={() => openEditOff(o)}>Edit</button>
                      <button className="btn-danger btn-sm" onClick={() => deleteOff(o)}>Remove</button>
                    </td>
                  </tr>
                ))}
                {officials.length === 0 && <tr><td colSpan={6} className="empty-row">No officials found.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Residents ── */}
      {tab === 'residents' && (
        <div className="admin-section">
          <div className="toolbar">
            <input className="search-input" placeholder="Search name or address…" value={resSearch} onChange={e => setResSearch(e.target.value)} style={{ width: 240 }} />
            <select value={resSitio} onChange={e => setResSitio(e.target.value)}>
              <option value="">All Sitios</option>
              {SITIOS.map(s => <option key={s}>{s}</option>)}
            </select>
            <span className="toolbar-count">{filteredRes.length} of {residents.length}</span>
          </div>
          <div className="card" style={{ padding: 0 }}>
            <div className="table-wrap" style={{ maxHeight: 520, overflowY: 'auto' }}>
              <table>
                <thead><tr>
                  <th>Name</th><th>Sitio</th><th>Address</th><th>Gender</th><th>Voter</th><th>Tags</th><th>Actions</th>
                </tr></thead>
                <tbody>
                  {filteredRes.map(r => (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 600 }}>{r.lastName}, {r.firstName}</td>
                      <td>{r.sitio}</td>
                      <td style={{ fontSize: 12 }}>{r.address}</td>
                      <td>{r.gender}</td>
                      <td>{r.isVoter ? '✓' : '—'}</td>
                      <td>
                        {r.isSenior && <span className="res-tag tag-senior">Senior</span>}
                        {r.isPWD && <span className="res-tag tag-pwd">PWD</span>}
                        {r.is4Ps && <span className="res-tag tag-4ps">4Ps</span>}
                      </td>
                      <td>
                        <button className="btn-secondary btn-sm" onClick={() => openEditRes(r)}>Edit</button>
                        <button className="btn-danger btn-sm" onClick={() => deleteRes(r)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                  {filteredRes.length === 0 && <tr><td colSpan={7} className="empty-row">No residents found.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Sitios ── */}
      {tab === 'sitios' && (
        <div className="admin-section">
          <div className="card" style={{ maxWidth: 560 }}>
            <div className="admin-info-title">📍 Sitio Management</div>
            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
              These are the recognized sitios of Barangay Damolog. The list below reflects the current configuration in <code>types.ts</code>.
              Adding a sitio here updates the UI dropdowns for this session. To make it permanent, it is already saved in <code>types.ts</code>.
            </p>
            <div className="sitio-list">
              {sitioList.map((s, i) => (
                <div key={s} className="sitio-item">
                  <span className="sitio-num">{i + 1}</span>
                  <span className="sitio-name">{s}</span>
                  {![...SITIOS].includes(s as any) && (
                    <span className="sitio-new-badge">new</span>
                  )}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <input
                className="search-input"
                placeholder="New sitio name…"
                value={newSitio}
                onChange={e => setNewSitio(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addSitio()}
                style={{ flex: 1 }}
              />
              <button className="btn-primary" onClick={addSitio}>+ Add</button>
            </div>
            {sitioMsg && <div className="sitio-msg">{sitioMsg}</div>}
          </div>

          <div className="card" style={{ maxWidth: 560 }}>
            <div className="admin-info-title">ℹ️ Current Sitios in types.ts</div>
            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>
              The following sitios are permanently defined in the codebase and used across all modules (Residents, Map, Households, etc.):
            </p>
            <div className="sitio-list">
              {[...SITIOS].map((s, i) => (
                <div key={s} className="sitio-item">
                  <span className="sitio-num">{i + 1}</span>
                  <span className="sitio-name">{s}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Permissions ── */}
      {tab === 'permissions' && (
        <div className="admin-section">
          <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: 16 }}>
            Permissions are role-based and enforced across the entire system. Each role has a fixed set of capabilities.
          </p>
          <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
            <table className="perm-table">
              <thead>
                <tr>
                  <th>Permission</th>
                  {ROLES.map(r => (
                    <th key={r}>
                      <span className="role-badge" style={{ background: ROLE_COLORS[r]+'22', color: ROLE_COLORS[r], border: `1px solid ${ROLE_COLORS[r]}44` }}>{r}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(ROLE_PERMISSIONS).map(([perm, roles]) => (
                  <tr key={perm}>
                    <td className="perm-name">{perm.replace(/_/g, ' ')}</td>
                    {ROLES.map(r => (
                      <td key={r} style={{ textAlign: 'center' }}>
                        {roles.includes(r) ? <span className="perm-yes">✓</span> : <span className="perm-no">—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Audit Log ── */}
      {tab === 'audit' && (
        <div className="admin-section">
          <div className="toolbar">
            <button className="btn-secondary" onClick={loadAudit}>⟳ Refresh</button>
            <span className="toolbar-count">{audit.length} entries</span>
          </div>
          <div className="card" style={{ padding: 0 }}>
            <div className="table-wrap" style={{ maxHeight: 520, overflowY: 'auto' }}>
              <table>
                <thead><tr><th>Time</th><th>User</th><th>Action</th><th>Details</th></tr></thead>
                <tbody>
                  {audit.map(a => (
                    <tr key={a.id}>
                      <td style={{ whiteSpace: 'nowrap', fontSize: 12 }}>{new Date(a.timestamp).toLocaleString()}</td>
                      <td><code style={{ fontSize: 12 }}>{a.username}</code></td>
                      <td><span className="audit-action" style={{ background: ACTION_COLOR[a.action] ?? '#f1f5f9' }}>{a.action}</span></td>
                      <td style={{ fontSize: 12 }}>{a.details}</td>
                    </tr>
                  ))}
                  {audit.length === 0 && <tr><td colSpan={4} className="empty-row">No audit entries.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Change Password ── */}
      {tab === 'password' && (
        <div className="admin-section">
          <div className="card" style={{ maxWidth: 420 }}>
            <div className="admin-info-title">🔑 Change Your Password</div>
            <form onSubmit={changePassword} style={{ marginTop: 16 }}>
              {pwMsg && (
                <div style={{ background: pwMsg.startsWith('✅') ? '#d1fae5' : '#fee2e2', color: pwMsg.startsWith('✅') ? '#065f46' : '#991b1b', padding: '10px 14px', borderRadius: 8, marginBottom: 14, fontSize: 13 }}>
                  {pwMsg}
                </div>
              )}
              <div className="form-group" style={{ marginBottom: 12 }}>
                <label>Current Password</label>
                <input type="password" value={pwForm.oldPassword} onChange={e => setPwForm(p => ({ ...p, oldPassword: e.target.value }))} required />
              </div>
              <div className="form-group" style={{ marginBottom: 12 }}>
                <label>New Password</label>
                <input type="password" value={pwForm.newPassword} onChange={e => setPwForm(p => ({ ...p, newPassword: e.target.value }))} required />
              </div>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label>Confirm New Password</label>
                <input type="password" value={pwForm.confirm} onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))} required />
              </div>
              <button className="btn-primary" type="submit" style={{ width: '100%' }}>Update Password</button>
            </form>
          </div>
        </div>
      )}

      {/* ── User Modal ── */}
      {userModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setUserModal(false)}>
          <div className="modal">
            <h2>{editUser ? 'Edit User' : 'Add User'}</h2>
            <div className="form-grid">
              {!editUser && (
                <div className="form-group full">
                  <label>Username</label>
                  <input value={uForm.username} onChange={e => uf('username', e.target.value)} placeholder="e.g. jdoe" />
                </div>
              )}
              <div className="form-group full">
                <label>Full Name</label>
                <input value={uForm.fullName} onChange={e => uf('fullName', e.target.value)} placeholder="e.g. Juan Dela Cruz" />
              </div>
              <div className="form-group">
                <label>Role</label>
                <select value={uForm.role} onChange={e => uf('role', e.target.value)}>
                  {ROLES.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Status</label>
                <select value={uForm.isActive ? 'Active' : 'Inactive'} onChange={e => uf('isActive', e.target.value === 'Active')}>
                  <option>Active</option><option>Inactive</option>
                </select>
              </div>
              <div className="form-group full">
                <label>{editUser ? 'New Password (leave blank to keep)' : 'Password'}</label>
                <input type="password" value={editUser ? uForm.newPassword : uForm.password}
                  onChange={e => uf(editUser ? 'newPassword' : 'password', e.target.value)}
                  placeholder={editUser ? 'Leave blank to keep current' : 'Set password'} />
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setUserModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={saveUser}>💾 Save</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Official Modal ── */}
      {offModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setOffModal(false)}>
          <div className="modal">
            <h2>{editOff ? 'Edit Official' : 'Add Official'}</h2>
            <div className="form-grid">
              <div className="form-group full">
                <label>Full Name</label>
                <input value={oForm.name} onChange={e => of_('name', e.target.value)} placeholder="e.g. Madera, Vivian M." />
              </div>
              <div className="form-group full">
                <label>Position</label>
                <select value={oForm.position} onChange={e => of_('position', e.target.value)}>
                  {POSITIONS.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div className="form-group full">
                <label>Contact Number</label>
                <input value={oForm.contactNumber} onChange={e => of_('contactNumber', e.target.value)} placeholder="09XXXXXXXXX" />
              </div>
              <div className="form-group">
                <label>Term Start</label>
                <input type="date" value={oForm.termStart} onChange={e => of_('termStart', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Term End</label>
                <input type="date" value={oForm.termEnd} onChange={e => of_('termEnd', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Status</label>
                <select value={oForm.isActive ? 'Active' : 'Inactive'} onChange={e => of_('isActive', e.target.value === 'Active')}>
                  <option>Active</option><option>Inactive</option>
                </select>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setOffModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={saveOff}>💾 Save</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Resident Edit Modal ── */}
      {resModal && editRes && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setResModal(false)}>
          <div className="modal modal-lg">
            <h2>Edit Resident — {editRes.firstName} {editRes.lastName}</h2>
            <div className="form-grid">
              <div className="form-group"><label>First Name</label><input value={rForm.firstName ?? ''} onChange={e => setRForm(p => ({ ...p, firstName: e.target.value }))} /></div>
              <div className="form-group"><label>Middle Name</label><input value={rForm.middleName ?? ''} onChange={e => setRForm(p => ({ ...p, middleName: e.target.value }))} /></div>
              <div className="form-group"><label>Last Name</label><input value={rForm.lastName ?? ''} onChange={e => setRForm(p => ({ ...p, lastName: e.target.value }))} /></div>
              <div className="form-group"><label>Birth Date</label><input type="date" value={rForm.birthDate?.slice(0,10) ?? ''} onChange={e => setRForm(p => ({ ...p, birthDate: e.target.value }))} /></div>
              <div className="form-group">
                <label>Gender</label>
                <select value={rForm.gender ?? ''} onChange={e => setRForm(p => ({ ...p, gender: e.target.value }))}>
                  <option>Male</option><option>Female</option>
                </select>
              </div>
              <div className="form-group">
                <label>Civil Status</label>
                <select value={rForm.civilStatus ?? ''} onChange={e => setRForm(p => ({ ...p, civilStatus: e.target.value }))}>
                  {['Single','Married','Widowed','Separated','Annulled'].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Sitio</label>
                <select value={rForm.sitio ?? ''} onChange={e => setRForm(p => ({ ...p, sitio: e.target.value }))}>
                  {SITIOS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group"><label>Household No.</label><input value={rForm.householdNo ?? ''} onChange={e => setRForm(p => ({ ...p, householdNo: e.target.value }))} /></div>
              <div className="form-group full"><label>Address</label><input value={rForm.address ?? ''} onChange={e => setRForm(p => ({ ...p, address: e.target.value }))} /></div>
              <div className="form-group"><label>Occupation</label><input value={rForm.occupation ?? ''} onChange={e => setRForm(p => ({ ...p, occupation: e.target.value }))} /></div>
              <div className="form-group"><label>Contact Number</label><input value={rForm.contactNumber ?? ''} onChange={e => setRForm(p => ({ ...p, contactNumber: e.target.value }))} /></div>
              <div className="form-group full"><label>Email</label><input value={rForm.email ?? ''} onChange={e => setRForm(p => ({ ...p, email: e.target.value }))} /></div>
              <div className="form-group full">
                <label style={{ marginBottom: 8, display: 'block' }}>Tags</label>
                <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                  {([['isVoter','Registered Voter'],['isSenior','Senior Citizen'],['isPWD','PWD'],['is4Ps','4Ps Beneficiary']] as [keyof Resident, string][]).map(([k, lbl]) => (
                    <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                      <input type="checkbox" checked={!!rForm[k]} onChange={e => setRForm(p => ({ ...p, [k]: e.target.checked }))} />
                      {lbl}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setResModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={saveRes}>💾 Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
