import { useEffect, useState, useMemo } from 'react';
import { get, post, put, del, patch } from '../api';
import type { TaskAssignment, TaskSummary } from '../types';
import { TASK_CATEGORIES, TASK_PRIORITIES, TASK_STATUSES, SITIOS } from '../types';
import { useAuth } from '../auth';
import './Tasks.css';

type Tab = 'board' | 'list' | 'mine';

const PRIORITY_COLORS: Record<string, { bg: string; color: string }> = {
  Low:    { bg: '#f3f4f6', color: '#6b7280' },
  Normal: { bg: '#dbeafe', color: '#1e40af' },
  High:   { bg: '#fef3c7', color: '#92400e' },
  Urgent: { bg: '#fee2e2', color: '#991b1b' },
};
const STATUS_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  'Pending':     { bg: '#f9fafb', color: '#374151', border: '#e5e7eb' },
  'In Progress': { bg: '#eff6ff', color: '#1e40af', border: '#bfdbfe' },
  'Done':        { bg: '#f0fdf4', color: '#166534', border: '#bbf7d0' },
  'Cancelled':   { bg: '#fef2f2', color: '#991b1b', border: '#fecaca' },
};

function fmtDate(d?: string) {
  if (!d) return '\u2014';
  return new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}
function fmtDateTime(d?: string) {
  if (!d) return '\u2014';
  return new Date(d).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function isOverdue(t: TaskAssignment) {
  return !!t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'Done' && t.status !== 'Cancelled';
}

const emptyForm = {
  title: '', description: '', category: 'General', priority: 'Normal',
  assignedTo: '', assignedBy: '', location: '', sitio: '', relatedTo: '',
  dueDate: '', notes: '',
};
export default function Tasks() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('board');
  const [tasks, setTasks] = useState<TaskAssignment[]>([]);
  const [summary, setSummary] = useState<TaskSummary | null>(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [editTask, setEditTask] = useState<TaskAssignment | null>(null);
  const [form, setForm] = useState<typeof emptyForm>({ ...emptyForm, assignedBy: user?.fullName ?? '' });
  const [completeModal, setCompleteModal] = useState(false);
  const [completeTask, setCompleteTask] = useState<TaskAssignment | null>(null);
  const [completeNotes, setCompleteNotes] = useState('');
  const [detailTask, setDetailTask] = useState<TaskAssignment | null>(null);

  const loadTasks   = () => get<TaskAssignment[]>('/api/tasks').then(setTasks).catch(() => setTasks([]));
  const loadSummary = () => get<TaskSummary>('/api/tasks/summary').then(setSummary).catch(() => {});

  useEffect(() => { loadTasks(); loadSummary(); }, []);

  const filtered = useMemo(() => {
    let t = tasks;
    if (filterStatus)   t = t.filter(x => x.status === filterStatus);
    if (filterPriority) t = t.filter(x => x.priority === filterPriority);
    if (filterCategory) t = t.filter(x => x.category === filterCategory);
    if (search.trim())  t = t.filter(x => (x.title + x.assignedTo + x.description + x.relatedTo).toLowerCase().includes(search.toLowerCase()));
    return t;
  }, [tasks, filterStatus, filterPriority, filterCategory, search]);

  const mine = useMemo(() =>
    tasks.filter(t => t.assignedTo === user?.fullName && t.status !== 'Done' && t.status !== 'Cancelled'),
    [tasks, user]);

  const openNew = () => {
    setEditTask(null);
    setForm({ ...emptyForm, assignedBy: user?.fullName ?? '' });
    setModal(true);
  };
  const openEdit = (t: TaskAssignment) => {
    setEditTask(t);
    setForm({
      title: t.title, description: t.description, category: t.category,
      priority: t.priority, assignedTo: t.assignedTo, assignedBy: t.assignedBy,
      location: t.location, sitio: t.sitio, relatedTo: t.relatedTo,
      dueDate: t.dueDate ? t.dueDate.slice(0, 10) : '', notes: t.notes,
    });
    setModal(true);
  };

  const saveTask = async () => {
    if (!form.title.trim()) return alert('Title is required.');
    if (!form.assignedTo.trim()) return alert('Assigned To is required.');
    const body = { ...form, dueDate: form.dueDate || null };
    if (editTask) await put('/api/tasks/' + editTask.id, body);
    else await post('/api/tasks', body);
    setModal(false);
    loadTasks(); loadSummary();
  };

  const changeStatus = async (t: TaskAssignment, status: string) => {
    if (status === 'Done') { setCompleteTask(t); setCompleteNotes(''); setCompleteModal(true); return; }
    await patch('/api/tasks/' + t.id + '/status', { status, completionNotes: '' });
    loadTasks(); loadSummary();
  };

  const confirmComplete = async () => {
    if (!completeTask) return;
    await patch('/api/tasks/' + completeTask.id + '/status', { status: 'Done', completionNotes: completeNotes });
    setCompleteModal(false);
    loadTasks(); loadSummary();
  };

  const deleteTask = async (id: number) => {
    if (!confirm('Delete this task?')) return;
    await del('/api/tasks/' + id);
    loadTasks(); loadSummary();
  };
  return (
    <div className="tk-page">
      <div className="tk-header-row">
        <div>
          <h1 className="tk-title">&#x1F4CB; Task Assignment</h1>
          <p className="tk-subtitle">Barangay Damolog &mdash; Assign, track and complete field tasks</p>
        </div>
        <button className="btn-primary" onClick={openNew}>+ New Task</button>
      </div>

      {summary && (
        <div className="tk-stats-bar">
          <div className="tk-stat tk-stat-gray"  onClick={() => setFilterStatus('')}><div className="tk-stat-val">{summary.total}</div><div className="tk-stat-lbl">Total</div></div>
          <div className="tk-stat tk-stat-amber" onClick={() => setFilterStatus('Pending')}><div className="tk-stat-val">{summary.pending}</div><div className="tk-stat-lbl">Pending</div></div>
          <div className="tk-stat tk-stat-blue"  onClick={() => setFilterStatus('In Progress')}><div className="tk-stat-val">{summary.inProgress}</div><div className="tk-stat-lbl">In Progress</div></div>
          <div className="tk-stat tk-stat-green" onClick={() => setFilterStatus('Done')}><div className="tk-stat-val">{summary.done}</div><div className="tk-stat-lbl">Done</div></div>
          {summary.overdue > 0 && <div className="tk-stat tk-stat-red"><div className="tk-stat-val">{summary.overdue}</div><div className="tk-stat-lbl">Overdue</div></div>}
        </div>
      )}

      <div className="tk-tabs">
        <button className={`tk-tab ${tab === 'board' ? 'active' : ''}`} onClick={() => setTab('board')}>&#x1F5C2;&#xFE0F; Board</button>
        <button className={`tk-tab ${tab === 'list'  ? 'active' : ''}`} onClick={() => setTab('list')}>&#x1F4C3; List</button>
        <button className={`tk-tab ${tab === 'mine'  ? 'active' : ''}`} onClick={() => setTab('mine')}>&#x1F464; My Tasks {mine.length > 0 && <span className="tk-badge">{mine.length}</span>}</button>
      </div>

      {tab !== 'mine' && (
        <div className="tk-toolbar">
          <input className="tk-search" placeholder="Search tasks..." value={search} onChange={e => setSearch(e.target.value)} />
          <select className="tk-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All Statuses</option>
            {TASK_STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
          <select className="tk-select" value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
            <option value="">All Priorities</option>
            {TASK_PRIORITIES.map(p => <option key={p}>{p}</option>)}
          </select>
          <select className="tk-select" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
            <option value="">All Categories</option>
            {TASK_CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
          <span className="tk-count">{filtered.length} task{filtered.length !== 1 ? 's' : ''}</span>
        </div>
      )}

      {tab === 'board' && (
        <div className="tk-board">
          {TASK_STATUSES.map(status => {
            const col = filtered.filter(t => t.status === status);
            const sc = STATUS_COLORS[status];
            return (
              <div key={status} className="tk-col" style={{ borderTopColor: sc.border }}>
                <div className="tk-col-header" style={{ background: sc.bg, color: sc.color }}>
                  <span>{status}</span>
                  <span className="tk-col-count">{col.length}</span>
                </div>
                <div className="tk-col-body">
                  {col.length === 0 && <div className="tk-col-empty">No tasks</div>}
                  {col.map(t => <TaskCard key={t.id} task={t} onEdit={openEdit} onStatus={changeStatus} onDelete={deleteTask} onDetail={setDetailTask} />)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'list' && (
        <div className="tk-list">
          {filtered.length === 0 && <div className="tk-empty">No tasks found.</div>}
          {filtered.map(t => (
            <div key={t.id} className={`tk-list-row ${isOverdue(t) ? 'overdue' : ''}`}>
              <div className="tk-list-left">
                <span className="tk-priority-dot" style={{ background: PRIORITY_COLORS[t.priority]?.color ?? '#6b7280' }} title={t.priority} />
                <div>
                  <div className="tk-list-title" onClick={() => setDetailTask(t)}>{t.title}</div>
                  <div className="tk-list-meta">
                    <span>{t.category}</span>
                    {t.sitio && <span>&#x1F4CD; {t.sitio}</span>}
                    {t.relatedTo && <span>&#x1F517; {t.relatedTo}</span>}
                    <span>&#x1F464; {t.assignedTo}</span>
                    {t.dueDate && <span className={isOverdue(t) ? 'tk-overdue-lbl' : ''}>&#x1F4C5; {fmtDate(t.dueDate)}</span>}
                  </div>
                </div>
              </div>
              <div className="tk-list-right">
                <span className="tk-status-pill" style={{ background: STATUS_COLORS[t.status]?.bg, color: STATUS_COLORS[t.status]?.color }}>{t.status}</span>
                <TaskActions task={t} onEdit={openEdit} onStatus={changeStatus} onDelete={deleteTask} />
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'mine' && (
        <div>
          {mine.length === 0 && <div className="tk-empty">No active tasks assigned to you.</div>}
          <div className="tk-mine-grid">
            {mine.map(t => <TaskCard key={t.id} task={t} onEdit={openEdit} onStatus={changeStatus} onDelete={deleteTask} onDetail={setDetailTask} />)}
          </div>
        </div>
      )}
      {detailTask && (
        <div className="tk-overlay" onClick={() => setDetailTask(null)}>
          <div className="tk-modal tk-detail-modal" onClick={e => e.stopPropagation()}>
            <div className="tk-modal-header">
              <h2>&#x1F4CB; Task Detail</h2>
              <button className="tk-close" onClick={() => setDetailTask(null)}>&#x2715;</button>
            </div>
            <div className="tk-modal-body">
              <div className="tk-detail-title">{detailTask.title}</div>
              <div className="tk-detail-badges">
                <span className="tk-priority-badge" style={{ background: PRIORITY_COLORS[detailTask.priority]?.bg, color: PRIORITY_COLORS[detailTask.priority]?.color }}>{detailTask.priority}</span>
                <span className="tk-status-pill" style={{ background: STATUS_COLORS[detailTask.status]?.bg, color: STATUS_COLORS[detailTask.status]?.color }}>{detailTask.status}</span>
                <span className="tk-cat-badge">{detailTask.category}</span>
              </div>
              {detailTask.description && <p className="tk-detail-desc">{detailTask.description}</p>}
              <div className="tk-detail-grid">
                <div><span className="tk-dl">Assigned To</span><span className="tk-dd">{detailTask.assignedTo}</span></div>
                <div><span className="tk-dl">Assigned By</span><span className="tk-dd">{detailTask.assignedBy}</span></div>
                {detailTask.sitio && <div><span className="tk-dl">Sitio</span><span className="tk-dd">{detailTask.sitio}</span></div>}
                {detailTask.location && <div><span className="tk-dl">Location</span><span className="tk-dd">{detailTask.location}</span></div>}
                {detailTask.relatedTo && <div><span className="tk-dl">Related To</span><span className="tk-dd">{detailTask.relatedTo}</span></div>}
                {detailTask.dueDate && <div><span className="tk-dl">Due Date</span><span className={`tk-dd ${isOverdue(detailTask) ? 'tk-overdue-lbl' : ''}`}>{fmtDate(detailTask.dueDate)}</span></div>}
                <div><span className="tk-dl">Created</span><span className="tk-dd">{fmtDateTime(detailTask.createdAt)}</span></div>
                {detailTask.startedAt && <div><span className="tk-dl">Started</span><span className="tk-dd">{fmtDateTime(detailTask.startedAt)}</span></div>}
                {detailTask.completedAt && <div><span className="tk-dl">Completed</span><span className="tk-dd">{fmtDateTime(detailTask.completedAt)}</span></div>}
              </div>
              {detailTask.notes && <div className="tk-detail-notes"><span className="tk-dl">Notes</span><p>{detailTask.notes}</p></div>}
              {detailTask.completionNotes && <div className="tk-detail-notes tk-completion-notes"><span className="tk-dl">Completion Notes</span><p>{detailTask.completionNotes}</p></div>}
            </div>
            <div className="tk-modal-footer">
              <button className="btn-secondary" onClick={() => setDetailTask(null)}>Close</button>
              <button className="btn-primary" onClick={() => { setDetailTask(null); openEdit(detailTask); }}>&#x270F;&#xFE0F; Edit</button>
            </div>
          </div>
        </div>
      )}

      {modal && (
        <div className="tk-overlay" onClick={() => setModal(false)}>
          <div className="tk-modal" onClick={e => e.stopPropagation()}>
            <div className="tk-modal-header">
              <h2>{editTask ? '&#x270F;&#xFE0F; Edit Task' : '+ New Task'}</h2>
              <button className="tk-close" onClick={() => setModal(false)}>&#x2715;</button>
            </div>
            <div className="tk-modal-body">
              <div className="tk-form-grid">
                <div className="tk-fg span2"><label>Title<input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Inspect drainage at Sitio Proper" /></label></div>
                <div className="tk-fg"><label>Category
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                    {TASK_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </label></div>
                <div className="tk-fg"><label>Priority
                  <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                    {TASK_PRIORITIES.map(p => <option key={p}>{p}</option>)}
                  </select>
                </label></div>
                <div className="tk-fg"><label>Assigned To<input value={form.assignedTo} onChange={e => setForm(f => ({ ...f, assignedTo: e.target.value }))} placeholder="Staff name" /></label></div>
                <div className="tk-fg"><label>Assigned By<input value={form.assignedBy} onChange={e => setForm(f => ({ ...f, assignedBy: e.target.value }))} /></label></div>
                <div className="tk-fg"><label>Sitio
                  <select value={form.sitio} onChange={e => setForm(f => ({ ...f, sitio: e.target.value }))}>
                    <option value="">None</option>
                    {SITIOS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </label></div>
                <div className="tk-fg"><label>Due Date<input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} /></label></div>
                <div className="tk-fg span2"><label>Location<input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Specific address or landmark" /></label></div>
                <div className="tk-fg span2"><label>Related To<input value={form.relatedTo} onChange={e => setForm(f => ({ ...f, relatedTo: e.target.value }))} placeholder="e.g. Blotter #2024-001" /></label></div>
                <div className="tk-fg span2"><label>Description<textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} placeholder="Detailed instructions for the assignee..." /></label></div>
                <div className="tk-fg span2"><label>Notes<textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></label></div>
              </div>
            </div>
            <div className="tk-modal-footer">
              <button className="btn-secondary" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={saveTask}>&#x1F4BE; Save Task</button>
            </div>
          </div>
        </div>
      )}

      {completeModal && completeTask && (
        <div className="tk-overlay" onClick={() => setCompleteModal(false)}>
          <div className="tk-modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <div className="tk-modal-header">
              <h2>&#x2705; Mark as Done</h2>
              <button className="tk-close" onClick={() => setCompleteModal(false)}>&#x2715;</button>
            </div>
            <div className="tk-modal-body">
              <p style={{ margin: '0 0 12px', color: '#374151' }}>Task: <strong>{completeTask.title}</strong></p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151' }}>Completion Notes (optional)</span>
                <textarea value={completeNotes} onChange={e => setCompleteNotes(e.target.value)} rows={3} placeholder="What was done, findings, follow-up needed..." style={{ border: '1px solid #d1d5db', borderRadius: 6, padding: '8px 10px', fontSize: '0.875rem', fontFamily: 'inherit', outline: 'none' }} />
              </div>
            </div>
            <div className="tk-modal-footer">
              <button className="btn-secondary" onClick={() => setCompleteModal(false)}>Cancel</button>
              <button className="btn-primary" style={{ background: '#16a34a' }} onClick={confirmComplete}>&#x2705; Confirm Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
function TaskCard({ task: t, onEdit, onStatus, onDelete, onDetail }: {
  task: TaskAssignment;
  onEdit: (t: TaskAssignment) => void;
  onStatus: (t: TaskAssignment, s: string) => void;
  onDelete: (id: number) => void;
  onDetail: (t: TaskAssignment) => void;
}) {
  const pc = PRIORITY_COLORS[t.priority] ?? PRIORITY_COLORS.Normal;
  const overdue = isOverdue(t);
  return (
    <div className={`tk-card ${overdue ? 'tk-card-overdue' : ''}`}>
      <div className="tk-card-top">
        <span className="tk-priority-badge" style={{ background: pc.bg, color: pc.color }}>{t.priority}</span>
        <span className="tk-cat-badge">{t.category}</span>
      </div>
      <div className="tk-card-title" onClick={() => onDetail(t)}>{t.title}</div>
      {t.description && <div className="tk-card-desc">{t.description.slice(0, 80)}{t.description.length > 80 ? '...' : ''}</div>}
      <div className="tk-card-meta">
        <span>&#x1F464; {t.assignedTo}</span>
        {t.sitio && <span>&#x1F4CD; {t.sitio}</span>}
        {t.relatedTo && <span title={t.relatedTo}>&#x1F517; {t.relatedTo.slice(0, 24)}{t.relatedTo.length > 24 ? '...' : ''}</span>}
        {t.dueDate && <span className={overdue ? 'tk-overdue-lbl' : ''}>&#x1F4C5; {fmtDate(t.dueDate)}</span>}
      </div>
      <div className="tk-card-actions">
        <TaskActions task={t} onEdit={onEdit} onStatus={onStatus} onDelete={onDelete} />
      </div>
    </div>
  );
}

function TaskActions({ task: t, onEdit, onStatus, onDelete }: {
  task: TaskAssignment;
  onEdit: (t: TaskAssignment) => void;
  onStatus: (t: TaskAssignment, s: string) => void;
  onDelete: (id: number) => void;
}) {
  return (
    <div className="tk-actions">
      {t.status === 'Pending' && <button className="btn-sm btn-blue" onClick={() => onStatus(t, 'In Progress')}>&#x25B6; Start</button>}
      {t.status === 'In Progress' && <button className="btn-sm btn-green" onClick={() => onStatus(t, 'Done')}>&#x2713; Done</button>}
      {(t.status === 'Pending' || t.status === 'In Progress') && <button className="btn-sm" onClick={() => onStatus(t, 'Cancelled')}>&#x2715; Cancel</button>}
      {t.status === 'Done' && <button className="btn-sm" onClick={() => onStatus(t, 'In Progress')}>&#x21A9; Reopen</button>}
      <button className="btn-sm" onClick={() => onEdit(t)}>&#x270F;&#xFE0F;</button>
      <button className="btn-sm btn-danger" onClick={() => onDelete(t.id)}>&#x1F5D1;</button>
    </div>
  );
}