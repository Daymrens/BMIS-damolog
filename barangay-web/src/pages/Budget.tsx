import { useEffect, useState } from 'react';
import { useAuth } from '../auth';
import type { BudgetProject, ProjectExpense, BudgetSummary } from '../types';
import { PROJECT_CATEGORIES, PROJECT_STATUSES, FUND_SOURCES, EXPENSE_CATEGORIES } from '../types';
import './Budget.css';

const API = 'http://localhost:5000';

const STATUS_COLOR: Record<string, string> = {
  'Planned':   '#64748b',
  'Ongoing':   '#2563eb',
  'Completed': '#16a34a',
  'On Hold':   '#d97706',
  'Cancelled': '#dc2626',
};

const CAT_COLOR: Record<string, string> = {
  'Infrastructure':  '#3b82f6',
  'Social Services': '#10b981',
  'Health':          '#ef4444',
  'Education':       '#8b5cf6',
  'Environment':     '#22c55e',
  'Livelihood':      '#f59e0b',
  'Other':           '#94a3b8',
};

type Tab = 'overview' | 'projects' | 'detail';

const EMPTY_PROJECT: Partial<BudgetProject> = {
  title: '', category: 'Infrastructure', description: '', fundSource: 'Barangay Fund',
  allocatedBudget: 0, status: 'Planned', startDate: new Date().toISOString().slice(0, 10),
  implementor: '', beneficiaries: '', beneficiaryCount: 0, location: '', notes: '', createdBy: '',
};

export default function Budget() {
  const { user } = useAuth();
  const canEdit = user?.role === 'Admin' || user?.role === 'Treasurer';

  const [tab, setTab]               = useState<Tab>('overview');
  const [year, setYear]             = useState(new Date().getFullYear());
  const [projects, setProjects]     = useState<BudgetProject[]>([]);
  const [summary, setSummary]       = useState<BudgetSummary | null>(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCat, setFilterCat]   = useState('');
  const [search, setSearch]         = useState('');
  const [selected, setSelected]     = useState<BudgetProject | null>(null);
  const [expenses, setExpenses]     = useState<ProjectExpense[]>([]);
  const [showModal, setShowModal]   = useState(false);
  const [showExpModal, setShowExpModal] = useState(false);
  const [editing, setEditing]       = useState<Partial<BudgetProject>>(EMPTY_PROJECT);
  const [editingExp, setEditingExp] = useState<Partial<ProjectExpense>>({});
  const [saving, setSaving]         = useState(false);

  useEffect(() => { loadAll(); }, [year]);

  async function loadAll() {
    const [proj, sum] = await Promise.all([
      fetch(`${API}/api/budget/projects?year=${year}`).then(r => r.json()).catch(() => []),
      fetch(`${API}/api/budget/summary?year=${year}`).then(r => r.json()).catch(() => null),
    ]);
    setProjects(Array.isArray(proj) ? proj : []);
    setSummary(sum);
  }

  async function loadExpenses(projectId: number) {
    const data = await fetch(`${API}/api/budget/projects/${projectId}/expenses`).then(r => r.json()).catch(() => []);
    setExpenses(Array.isArray(data) ? data : []);
  }

  async function saveProject() {
    if (!editing.title?.trim()) return;
    setSaving(true);
    try {
      const method = editing.id ? 'PUT' : 'POST';
      const url    = editing.id ? `${API}/api/budget/projects/${editing.id}` : `${API}/api/budget/projects`;
      await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...editing, createdBy: user?.fullName ?? '' }) });
      setShowModal(false);
      await loadAll();
      if (selected?.id === editing.id) {
        const updated = await fetch(`${API}/api/budget/projects/${editing.id}`).then(r => r.json());
        setSelected(updated.project ?? updated);
      }
    } finally { setSaving(false); }
  }

  async function deleteProject(id: number) {
    if (!confirm('Delete this project and all its expenses?')) return;
    await fetch(`${API}/api/budget/projects/${id}`, { method: 'DELETE' });
    if (selected?.id === id) { setSelected(null); setTab('projects'); }
    await loadAll();
  }

  async function saveExpense() {
    if (!selected || !editingExp.description?.trim() || !editingExp.amount) return;
    setSaving(true);
    try {
      await fetch(`${API}/api/budget/projects/${selected.id}/expenses`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...editingExp, recordedBy: user?.fullName ?? '' }),
      });
      setShowExpModal(false);
      await loadExpenses(selected.id);
      await loadAll();
      // Refresh selected project's actual expense
      const updated = await fetch(`${API}/api/budget/projects/${selected.id}`).then(r => r.json());
      setSelected(updated.project ?? updated);
    } finally { setSaving(false); }
  }

  async function deleteExpense(id: number) {
    if (!selected) return;
    await fetch(`${API}/api/budget/expenses/${id}`, { method: 'DELETE' });
    await loadExpenses(selected.id);
    await loadAll();
    const updated = await fetch(`${API}/api/budget/projects/${selected.id}`).then(r => r.json());
    setSelected(updated.project ?? updated);
  }

  function openDetail(p: BudgetProject) {
    setSelected(p);
    loadExpenses(p.id);
    setTab('detail');
  }

  const filtered = projects.filter(p => {
    if (filterStatus && p.status !== filterStatus) return false;
    if (filterCat && p.category !== filterCat) return false;
    if (search && !`${p.title} ${p.projectCode} ${p.location}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const utilPct = (alloc: number, spent: number) => alloc > 0 ? Math.min(Math.round((spent / alloc) * 100), 100) : 0;

  function printProject() {
    if (!selected) return;
    const rows = expenses.map(e =>
      `<tr><td>${new Date(e.expenseDate).toLocaleDateString('en-PH')}</td><td>${e.description}</td><td>${e.category}</td><td>${e.receiptNo}</td><td style="text-align:right">₱${e.amount.toLocaleString('en-PH',{minimumFractionDigits:2})}</td><td>${e.recordedBy}</td></tr>`
    ).join('');
    const balance = selected.allocatedBudget - selected.actualExpense;
    const html = `<html><head><style>
body{font-family:Arial,sans-serif;font-size:11px;margin:24px}
h2,h3{text-align:center;margin:4px 0}
.info{display:grid;grid-template-columns:1fr 1fr;gap:4px 20px;margin:12px 0;font-size:11px}
.info span{color:#555}
table{width:100%;border-collapse:collapse;margin-top:12px}
th,td{border:1px solid #ccc;padding:5px 8px}
th{background:#f1f5f9;font-weight:bold}
.summary{margin-top:12px;text-align:right;font-size:12px}
.balance{color:${balance < 0 ? '#dc2626' : '#16a34a'};font-weight:bold}
</style></head><body>
<h2>Barangay Damolog — Project Report</h2>
<h3>${selected.title} (${selected.projectCode})</h3>
<div class="info">
  <div><span>Category:</span> ${selected.category}</div>
  <div><span>Status:</span> ${selected.status}</div>
  <div><span>Fund Source:</span> ${selected.fundSource}</div>
  <div><span>Location:</span> ${selected.location}</div>
  <div><span>Start Date:</span> ${new Date(selected.startDate).toLocaleDateString('en-PH')}</div>
  <div><span>Target End:</span> ${selected.endDate ? new Date(selected.endDate).toLocaleDateString('en-PH') : '—'}</div>
  <div><span>Implementor:</span> ${selected.implementor}</div>
  <div><span>Beneficiaries:</span> ${selected.beneficiaries} (${selected.beneficiaryCount} persons)</div>
</div>
<p>${selected.description}</p>
<table><thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Receipt #</th><th>Amount</th><th>Recorded By</th></tr></thead>
<tbody>${rows}</tbody></table>
<div class="summary">
  Allocated: ₱${selected.allocatedBudget.toLocaleString('en-PH',{minimumFractionDigits:2})}<br>
  Total Spent: ₱${selected.actualExpense.toLocaleString('en-PH',{minimumFractionDigits:2})}<br>
  <span class="balance">Balance: ₱${balance.toLocaleString('en-PH',{minimumFractionDigits:2})}</span>
</div>
</body></html>`;
    const w = window.open('', '_blank')!;
    w.document.write(html);
    w.document.close();
    w.print();
  }

  return (
    <div className="budget-page">
      {/* Header */}
      <div className="budget-header">
        <div>
          <h1 className="budget-title">🧮 Budget & Project Tracking</h1>
          <p className="budget-sub">Barangay Damolog — transparency in governance</p>
        </div>
        <div className="budget-header-actions">
          <select value={year} onChange={e => setYear(+e.target.value)} className="budget-select">
            {[2022,2023,2024,2025,2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          {canEdit && (
            <button className="btn-primary" onClick={() => { setEditing({ ...EMPTY_PROJECT, createdBy: user?.fullName ?? '' }); setShowModal(true); }}>
              + New Project
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="budget-tabs">
        {(['overview','projects'] as const).map(t => (
          <button key={t} className={`budget-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t === 'overview' ? '📊 Overview' : '📋 Projects'}
          </button>
        ))}
        {selected && (
          <button className={`budget-tab ${tab === 'detail' ? 'active' : ''}`} onClick={() => setTab('detail')}>
            📁 {selected.title.length > 24 ? selected.title.slice(0, 24) + '…' : selected.title}
          </button>
        )}
      </div>

      {/* ── OVERVIEW ─────────────────────────────────────────────────────── */}
      {tab === 'overview' && summary && (
        <div className="budget-content">
          {/* KPI strip */}
          <div className="budget-kpi-row">
            {[
              { label: 'Total Projects',  value: summary.totalProjects,  icon: '📋', color: '#3b82f6' },
              { label: 'Total Allocated', value: `₱${summary.totalAllocated.toLocaleString('en-PH',{minimumFractionDigits:2})}`, icon: '💰', color: '#10b981' },
              { label: 'Total Spent',     value: `₱${summary.totalSpent.toLocaleString('en-PH',{minimumFractionDigits:2})}`,     icon: '💸', color: '#f59e0b' },
              { label: 'Balance',         value: `₱${(summary.totalAllocated - summary.totalSpent).toLocaleString('en-PH',{minimumFractionDigits:2})}`, icon: '🏦', color: summary.totalAllocated >= summary.totalSpent ? '#16a34a' : '#dc2626' },
              { label: 'Ongoing',         value: summary.ongoingCount,   icon: '⚙️', color: '#2563eb' },
              { label: 'Completed',       value: summary.completedCount, icon: '✅', color: '#16a34a' },
            ].map(k => (
              <div key={k.label} className="budget-kpi" style={{ borderTopColor: k.color }}>
                <div className="kpi-icon">{k.icon}</div>
                <div className="kpi-val" style={{ color: k.color }}>{k.value}</div>
                <div className="kpi-lbl">{k.label}</div>
              </div>
            ))}
          </div>

          {/* Overall utilization bar */}
          <div className="budget-card">
            <div className="card-label">Overall Budget Utilization — {year}</div>
            <div className="util-bar-wrap">
              <div className="util-bar-track">
                <div className="util-bar-fill" style={{
                  width: `${utilPct(summary.totalAllocated, summary.totalSpent)}%`,
                  background: utilPct(summary.totalAllocated, summary.totalSpent) > 90 ? '#ef4444' : '#3b82f6',
                }} />
              </div>
              <span className="util-pct">{utilPct(summary.totalAllocated, summary.totalSpent)}%</span>
            </div>
            <div className="util-labels">
              <span>₱{summary.totalSpent.toLocaleString('en-PH',{minimumFractionDigits:2})} spent</span>
              <span>₱{summary.totalAllocated.toLocaleString('en-PH',{minimumFractionDigits:2})} allocated</span>
            </div>
          </div>

          {/* By category */}
          <div className="budget-card">
            <div className="card-label">Budget by Category</div>
            <div className="cat-list">
              {(summary.byCategory ?? []).map(c => (
                <div key={c.category} className="cat-row">
                  <div className="cat-dot" style={{ background: CAT_COLOR[c.category] ?? '#94a3b8' }} />
                  <div className="cat-name">{c.category}</div>
                  <div className="cat-bar-wrap">
                    <div className="cat-bar-alloc" style={{ width: `${summary.totalAllocated > 0 ? (c.allocated / summary.totalAllocated) * 100 : 0}%`, background: CAT_COLOR[c.category] ?? '#94a3b8' }} />
                    <div className="cat-bar-spent" style={{ width: `${c.allocated > 0 ? (c.spent / c.allocated) * 100 : 0}%`, background: '#fbbf24' }} />
                  </div>
                  <div className="cat-amounts">
                    <span>₱{c.allocated.toLocaleString('en-PH',{minimumFractionDigits:2})}</span>
                    <span className="cat-spent">₱{c.spent.toLocaleString('en-PH',{minimumFractionDigits:2})} spent</span>
                  </div>
                  <div className="cat-count">{c.count} proj</div>
                </div>
              ))}
            </div>
          </div>

          {/* Status breakdown */}
          <div className="budget-card">
            <div className="card-label">Projects by Status</div>
            <div className="status-pills">
              {(summary.byStatus ?? []).map(s => (
                <div key={s.status} className="status-pill" style={{ borderColor: STATUS_COLOR[s.status] ?? '#94a3b8', color: STATUS_COLOR[s.status] ?? '#94a3b8' }}>
                  <strong>{s.count}</strong> {s.status}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── PROJECTS LIST ─────────────────────────────────────────────────── */}
      {tab === 'projects' && (
        <div className="budget-content">
          {/* Filters */}
          <div className="budget-filters">
            <input className="budget-search" placeholder="🔍 Search projects…" value={search} onChange={e => setSearch(e.target.value)} />
            <select className="budget-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">All Statuses</option>
              {PROJECT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select className="budget-select" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
              <option value="">All Categories</option>
              {PROJECT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <span className="filter-count">{filtered.length} project{filtered.length !== 1 ? 's' : ''}</span>
          </div>

          {/* Project cards */}
          {filtered.length === 0 ? (
            <div className="budget-empty">No projects found. {canEdit && <button className="link-btn" onClick={() => { setEditing({ ...EMPTY_PROJECT }); setShowModal(true); }}>Add one?</button>}</div>
          ) : (
            <div className="project-grid">
              {filtered.map(p => {
                const pct = utilPct(p.allocatedBudget, p.actualExpense);
                const over = p.actualExpense > p.allocatedBudget;
                const daysLeft = p.endDate ? Math.ceil((new Date(p.endDate).getTime() - Date.now()) / 86400000) : null;
                return (
                  <div key={p.id} className="project-card" onClick={() => openDetail(p)}>
                    <div className="project-card-top">
                      <div className="project-code">{p.projectCode}</div>
                      <span className="project-status-badge" style={{ background: STATUS_COLOR[p.status] + '22', color: STATUS_COLOR[p.status] }}>{p.status}</span>
                    </div>
                    <div className="project-title">{p.title}</div>
                    <div className="project-meta">
                      <span className="project-cat-tag" style={{ background: CAT_COLOR[p.category] + '22', color: CAT_COLOR[p.category] }}>{p.category}</span>
                      <span className="project-loc">📍 {p.location || '—'}</span>
                    </div>
                    <div className="project-budget-row">
                      <div>
                        <div className="project-budget-label">Allocated</div>
                        <div className="project-budget-val">₱{p.allocatedBudget.toLocaleString('en-PH',{minimumFractionDigits:2})}</div>
                      </div>
                      <div>
                        <div className="project-budget-label">Spent</div>
                        <div className="project-budget-val" style={{ color: over ? '#dc2626' : '#16a34a' }}>₱{p.actualExpense.toLocaleString('en-PH',{minimumFractionDigits:2})}</div>
                      </div>
                    </div>
                    <div className="project-util-bar">
                      <div className="project-util-fill" style={{ width: `${pct}%`, background: over ? '#ef4444' : pct > 80 ? '#f59e0b' : '#3b82f6' }} />
                    </div>
                    <div className="project-util-row">
                      <span>{pct}% utilized</span>
                      {daysLeft !== null && <span style={{ color: daysLeft < 0 ? '#dc2626' : daysLeft < 14 ? '#d97706' : '#64748b' }}>
                        {daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d left`}
                      </span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── PROJECT DETAIL ────────────────────────────────────────────────── */}
      {tab === 'detail' && selected && (
        <div className="budget-content">
          <div className="detail-header">
            <div>
              <div className="detail-code">{selected.projectCode}</div>
              <h2 className="detail-title">{selected.title}</h2>
              <div className="detail-meta">
                <span className="project-cat-tag" style={{ background: CAT_COLOR[selected.category] + '22', color: CAT_COLOR[selected.category] }}>{selected.category}</span>
                <span className="project-status-badge" style={{ background: STATUS_COLOR[selected.status] + '22', color: STATUS_COLOR[selected.status] }}>{selected.status}</span>
                <span>📍 {selected.location || '—'}</span>
                <span>💰 {selected.fundSource}</span>
              </div>
            </div>
            <div className="detail-actions">
              {canEdit && <>
                <button className="btn-secondary" onClick={() => { setEditing({ ...selected }); setShowModal(true); }}>✏️ Edit</button>
                <button className="btn-danger" onClick={() => deleteProject(selected.id)}>🗑 Delete</button>
              </>}
              <button className="btn-secondary" onClick={printProject}>🖨 Print</button>
            </div>
          </div>

          <div className="detail-grid">
            {/* Budget card */}
            <div className="budget-card">
              <div className="card-label">Budget Overview</div>
              <div className="budget-numbers">
                <div className="budget-num-row"><span>Allocated</span><strong>₱{selected.allocatedBudget.toLocaleString('en-PH',{minimumFractionDigits:2})}</strong></div>
                <div className="budget-num-row"><span>Spent</span><strong style={{ color: selected.actualExpense > selected.allocatedBudget ? '#dc2626' : '#16a34a' }}>₱{selected.actualExpense.toLocaleString('en-PH',{minimumFractionDigits:2})}</strong></div>
                <div className="budget-num-row balance-row">
                  <span>Balance</span>
                  <strong style={{ color: selected.allocatedBudget >= selected.actualExpense ? '#16a34a' : '#dc2626' }}>
                    ₱{(selected.allocatedBudget - selected.actualExpense).toLocaleString('en-PH',{minimumFractionDigits:2})}
                  </strong>
                </div>
              </div>
              <div className="util-bar-wrap" style={{ marginTop: 10 }}>
                <div className="util-bar-track">
                  <div className="util-bar-fill" style={{
                    width: `${utilPct(selected.allocatedBudget, selected.actualExpense)}%`,
                    background: selected.actualExpense > selected.allocatedBudget ? '#ef4444' : '#3b82f6',
                  }} />
                </div>
                <span className="util-pct">{utilPct(selected.allocatedBudget, selected.actualExpense)}%</span>
              </div>
            </div>

            {/* Timeline card */}
            <div className="budget-card">
              <div className="card-label">Timeline</div>
              <div className="timeline-rows">
                <div className="tl-row"><span>Start Date</span><strong>{new Date(selected.startDate).toLocaleDateString('en-PH',{year:'numeric',month:'long',day:'numeric'})}</strong></div>
                <div className="tl-row"><span>Target End</span><strong>{selected.endDate ? new Date(selected.endDate).toLocaleDateString('en-PH',{year:'numeric',month:'long',day:'numeric'}) : '—'}</strong></div>
                <div className="tl-row"><span>Actual End</span><strong>{selected.actualEndDate ? new Date(selected.actualEndDate).toLocaleDateString('en-PH',{year:'numeric',month:'long',day:'numeric'}) : '—'}</strong></div>
                <div className="tl-row"><span>Implementor</span><strong>{selected.implementor || '—'}</strong></div>
                <div className="tl-row"><span>Beneficiaries</span><strong>{selected.beneficiaries || '—'} ({selected.beneficiaryCount} persons)</strong></div>
              </div>
            </div>
          </div>

          {selected.description && (
            <div className="budget-card">
              <div className="card-label">Description</div>
              <p className="detail-desc">{selected.description}</p>
            </div>
          )}

          {/* Expenses */}
          <div className="budget-card">
            <div className="expense-header">
              <div className="card-label" style={{ margin: 0 }}>Expense Ledger</div>
              {canEdit && (
                <button className="btn-primary btn-sm" onClick={() => { setEditingExp({ category: 'Materials', expenseDate: new Date().toISOString().slice(0,10) }); setShowExpModal(true); }}>
                  + Add Expense
                </button>
              )}
            </div>
            {expenses.length === 0 ? (
              <div className="budget-empty">No expenses recorded yet.</div>
            ) : (
              <table className="expense-table">
                <thead>
                  <tr><th>Date</th><th>Description</th><th>Category</th><th>Receipt #</th><th>Amount</th><th>By</th>{canEdit && <th></th>}</tr>
                </thead>
                <tbody>
                  {expenses.map(e => (
                    <tr key={e.id}>
                      <td>{new Date(e.expenseDate).toLocaleDateString('en-PH')}</td>
                      <td>{e.description}</td>
                      <td><span className="exp-cat-tag">{e.category}</span></td>
                      <td>{e.receiptNo || '—'}</td>
                      <td className="amount-cell">₱{e.amount.toLocaleString('en-PH',{minimumFractionDigits:2})}</td>
                      <td>{e.recordedBy}</td>
                      {canEdit && <td><button className="icon-btn danger" onClick={() => deleteExpense(e.id)}>🗑</button></td>}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={canEdit ? 4 : 4} className="total-label">Total</td>
                    <td className="amount-cell total-val">₱{expenses.reduce((s,e)=>s+e.amount,0).toLocaleString('en-PH',{minimumFractionDigits:2})}</td>
                    <td colSpan={canEdit ? 2 : 1} />
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── PROJECT MODAL ─────────────────────────────────────────────────── */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editing.id ? 'Edit Project' : 'New Project'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <label>Title *</label>
                <input value={editing.title ?? ''} onChange={e => setEditing(x => ({ ...x, title: e.target.value }))} placeholder="Project title" />
              </div>
              <div className="form-row-2">
                <div className="form-row">
                  <label>Category</label>
                  <select value={editing.category ?? 'Infrastructure'} onChange={e => setEditing(x => ({ ...x, category: e.target.value }))}>
                    {PROJECT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-row">
                  <label>Status</label>
                  <select value={editing.status ?? 'Planned'} onChange={e => setEditing(x => ({ ...x, status: e.target.value }))}>
                    {PROJECT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row-2">
                <div className="form-row">
                  <label>Fund Source</label>
                  <select value={editing.fundSource ?? 'Barangay Fund'} onChange={e => setEditing(x => ({ ...x, fundSource: e.target.value }))}>
                    {FUND_SOURCES.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div className="form-row">
                  <label>Allocated Budget (₱)</label>
                  <input type="number" min="0" value={editing.allocatedBudget ?? 0} onChange={e => setEditing(x => ({ ...x, allocatedBudget: +e.target.value }))} />
                </div>
              </div>
              <div className="form-row-2">
                <div className="form-row">
                  <label>Start Date</label>
                  <input type="date" value={editing.startDate?.slice(0,10) ?? ''} onChange={e => setEditing(x => ({ ...x, startDate: e.target.value }))} />
                </div>
                <div className="form-row">
                  <label>Target End Date</label>
                  <input type="date" value={editing.endDate?.slice(0,10) ?? ''} onChange={e => setEditing(x => ({ ...x, endDate: e.target.value }))} />
                </div>
              </div>
              <div className="form-row">
                <label>Location</label>
                <input value={editing.location ?? ''} onChange={e => setEditing(x => ({ ...x, location: e.target.value }))} placeholder="Project site / area" />
              </div>
              <div className="form-row">
                <label>Implementor</label>
                <input value={editing.implementor ?? ''} onChange={e => setEditing(x => ({ ...x, implementor: e.target.value }))} placeholder="Person / office responsible" />
              </div>
              <div className="form-row-2">
                <div className="form-row">
                  <label>Beneficiaries</label>
                  <input value={editing.beneficiaries ?? ''} onChange={e => setEditing(x => ({ ...x, beneficiaries: e.target.value }))} placeholder="e.g. Senior Citizens" />
                </div>
                <div className="form-row">
                  <label>Beneficiary Count</label>
                  <input type="number" min="0" value={editing.beneficiaryCount ?? 0} onChange={e => setEditing(x => ({ ...x, beneficiaryCount: +e.target.value }))} />
                </div>
              </div>
              <div className="form-row">
                <label>Description</label>
                <textarea rows={3} value={editing.description ?? ''} onChange={e => setEditing(x => ({ ...x, description: e.target.value }))} placeholder="Project details…" />
              </div>
              <div className="form-row">
                <label>Notes</label>
                <textarea rows={2} value={editing.notes ?? ''} onChange={e => setEditing(x => ({ ...x, notes: e.target.value }))} placeholder="Additional notes…" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={saveProject} disabled={saving}>{saving ? 'Saving…' : 'Save Project'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── EXPENSE MODAL ─────────────────────────────────────────────────── */}
      {showExpModal && (
        <div className="modal-overlay" onClick={() => setShowExpModal(false)}>
          <div className="modal-box modal-sm" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add Expense</h3>
              <button className="modal-close" onClick={() => setShowExpModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <label>Description *</label>
                <input value={editingExp.description ?? ''} onChange={e => setEditingExp(x => ({ ...x, description: e.target.value }))} placeholder="What was purchased / paid" />
              </div>
              <div className="form-row-2">
                <div className="form-row">
                  <label>Category</label>
                  <select value={editingExp.category ?? 'Materials'} onChange={e => setEditingExp(x => ({ ...x, category: e.target.value }))}>
                    {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-row">
                  <label>Amount (₱) *</label>
                  <input type="number" min="0" value={editingExp.amount ?? ''} onChange={e => setEditingExp(x => ({ ...x, amount: +e.target.value }))} />
                </div>
              </div>
              <div className="form-row-2">
                <div className="form-row">
                  <label>Date</label>
                  <input type="date" value={editingExp.expenseDate?.slice(0,10) ?? ''} onChange={e => setEditingExp(x => ({ ...x, expenseDate: e.target.value }))} />
                </div>
                <div className="form-row">
                  <label>Receipt #</label>
                  <input value={editingExp.receiptNo ?? ''} onChange={e => setEditingExp(x => ({ ...x, receiptNo: e.target.value }))} placeholder="OR / receipt number" />
                </div>
              </div>
              <div className="form-row">
                <label>Notes</label>
                <input value={editingExp.notes ?? ''} onChange={e => setEditingExp(x => ({ ...x, notes: e.target.value }))} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowExpModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={saveExpense} disabled={saving}>{saving ? 'Saving…' : 'Add Expense'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
