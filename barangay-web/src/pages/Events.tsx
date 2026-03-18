import { useEffect, useState, useMemo, useCallback } from 'react';
import { get, post, put, del, patch } from '../api';
import type { BarangayEvent, Blotter } from '../types';
import { EVENT_TYPES, EVENT_STATUSES } from '../types';
import { useAuth } from '../auth';
import './Events.css';
type View = 'calendar' | 'list';

const MONTH_NAMES = ['January','February','March','April','May','June',
  'July','August','September','October','November','December'];
const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const TYPE_COLORS: Record<string, string> = {
  'Meeting':            'ev-blue',
  'Hearing':            'ev-red',
  'Appointment':        'ev-purple',
  'Community Activity': 'ev-green',
  'Other':              'ev-gray',
};

function fmtTime(dt: string) {
  return new Date(dt).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });
}
function fmtDate(dt: string) {
  return new Date(dt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}
function fmtDateTime(dt: string) {
  return new Date(dt).toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function toLocalInput(dt: string) {
  if (!dt) return '';
  const d = new Date(dt);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ── Print schedule ────────────────────────────────────────────────────────────
function printSchedule(events: BarangayEvent[], label: string) {
  const rows = events.map(e => `
    <tr>
      <td>${fmtDateTime(e.startTime)}</td>
      <td>${fmtTime(e.endTime)}</td>
      <td><strong>${e.title}</strong></td>
      <td>${e.eventType}</td>
      <td>${e.location}</td>
      <td>${e.organizer}</td>
      <td>${e.status}</td>
    </tr>`).join('');
  const w = window.open('', '_blank')!;
  w.document.write(`<!DOCTYPE html><html><head><title>Event Schedule</title>
  <style>
    body{font-family:Arial,sans-serif;font-size:11px;margin:20px}
    h2,h3{text-align:center;margin:4px 0}
    table{width:100%;border-collapse:collapse;margin-top:14px}
    th,td{border:1px solid #ccc;padding:5px 8px;text-align:left}
    th{background:#f0f0f0;font-weight:600}
    @media print{body{margin:10mm}}
  </style></head><body>
  <h2>Event & Appointment Schedule</h2>
  <h3>Barangay Damolog, Municipality of Sogod, Cebu</h3>
  <p style="text-align:center;color:#555">${label} &nbsp;|&nbsp; ${events.length} event(s) &nbsp;|&nbsp; Printed: ${new Date().toLocaleDateString('en-PH',{year:'numeric',month:'long',day:'numeric'})}</p>
  <table><thead><tr><th>Date &amp; Start</th><th>End</th><th>Title</th><th>Type</th><th>Location</th><th>Organizer</th><th>Status</th></tr></thead>
  <tbody>${rows}</tbody></table></body></html>`);
  w.document.close(); w.print();
}

// ── Event Form Modal ──────────────────────────────────────────────────────────
interface EventFormProps {
  initial: Partial<BarangayEvent>;
  blotters: Blotter[];
  onSave: (data: Partial<BarangayEvent>) => void;
  onClose: () => void;
  conflicts: BarangayEvent[];
  onCheckConflicts: (start: string, end: string, location: string, excludeId?: number) => void;
}

function EventForm({ initial, blotters, onSave, onClose, conflicts, onCheckConflicts }: EventFormProps) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    title: initial.title ?? '',
    eventType: initial.eventType ?? 'Meeting',
    location: initial.location ?? '',
    startTime: toLocalInput(initial.startTime ?? ''),
    endTime: toLocalInput(initial.endTime ?? ''),
    organizer: initial.organizer ?? user?.fullName ?? '',
    description: initial.description ?? '',
    status: initial.status ?? 'Scheduled',
    blotterId: initial.blotterId ?? undefined as number | undefined,
    blotterCaseNumber: initial.blotterCaseNumber ?? '',
    participants: initial.participants ?? '',
    createdBy: initial.createdBy ?? user?.fullName ?? '',
  });

  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  const checkConflicts = () => {
    if (form.startTime && form.endTime && form.location)
      onCheckConflicts(form.startTime, form.endTime, form.location, initial.id);
  };

  return (
    <div className="ev-overlay" onClick={onClose}>
      <div className="ev-modal" onClick={e => e.stopPropagation()}>
        <div className="ev-modal-header">
          <h2>{initial.id ? 'Edit Event' : 'New Event / Appointment'}</h2>
          <button className="ev-close" onClick={onClose}>✕</button>
        </div>
        <div className="ev-modal-body">
          {conflicts.length > 0 && (
            <div className="ev-conflict-box">
              ⚠️ Conflict detected at this location &amp; time:
              {conflicts.map(c => (
                <div key={c.id} className="ev-conflict-item">
                  <strong>{c.title}</strong> — {fmtDateTime(c.startTime)} to {fmtTime(c.endTime)}
                </div>
              ))}
            </div>
          )}
          <div className="ev-form-grid">
            <label className="span2">Title *
              <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Barangay Assembly Meeting" />
            </label>
            <label>Type
              <select value={form.eventType} onChange={e => set('eventType', e.target.value)}>
                {EVENT_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </label>
            <label>Status
              <select value={form.status} onChange={e => set('status', e.target.value)}>
                {EVENT_STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </label>
            <label>Start Date &amp; Time *
              <input type="datetime-local" value={form.startTime}
                onChange={e => { set('startTime', e.target.value); }}
                onBlur={checkConflicts} />
            </label>
            <label>End Date &amp; Time *
              <input type="datetime-local" value={form.endTime}
                onChange={e => { set('endTime', e.target.value); }}
                onBlur={checkConflicts} />
            </label>
            <label className="span2">Location
              <input value={form.location} onChange={e => set('location', e.target.value)}
                onBlur={checkConflicts} placeholder="e.g. Barangay Hall" />
            </label>
            <label>Organizer
              <input value={form.organizer} onChange={e => set('organizer', e.target.value)} />
            </label>
            <label>Link to Blotter Case (optional)
              <select value={form.blotterId ?? ''} onChange={e => {
                const id = e.target.value ? +e.target.value : undefined;
                const b = blotters.find(b => b.id === id);
                set('blotterId', id);
                set('blotterCaseNumber', b?.caseNumber ?? '');
              }}>
                <option value="">— None —</option>
                {blotters.map(b => <option key={b.id} value={b.id}>{b.caseNumber} — {b.complainant} vs {b.respondent}</option>)}
              </select>
            </label>
            <label className="span2">Participants
              <input value={form.participants} onChange={e => set('participants', e.target.value)} placeholder="Names or groups, comma-separated" />
            </label>
            <label className="span2">Description / Notes
              <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3} />
            </label>
          </div>
        </div>
        <div className="ev-modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={() => {
            if (!form.title || !form.startTime || !form.endTime) return alert('Title, start and end time are required.');
            if (new Date(form.endTime) <= new Date(form.startTime)) return alert('End time must be after start time.');
            onSave({ ...form, startTime: new Date(form.startTime).toISOString(), endTime: new Date(form.endTime).toISOString() });
          }}>Save Event</button>
        </div>
      </div>
    </div>
  );
}

// ── Calendar Grid ─────────────────────────────────────────────────────────────
function CalendarGrid({ year, month, events, onDayClick, onEventClick }: {
  year: number; month: number;
  events: BarangayEvent[];
  onDayClick: (date: Date) => void;
  onEventClick: (ev: BarangayEvent) => void;
}) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null);

  const eventsOnDay = (day: number) =>
    events.filter(e => {
      const d = new Date(e.startTime);
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
    });

  const isToday = (day: number) =>
    today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;

  return (
    <div className="ev-cal">
      <div className="ev-cal-head">
        {DAY_NAMES.map(d => <div key={d} className="ev-cal-dayname">{d}</div>)}
      </div>
      <div className="ev-cal-body">
        {cells.map((day, i) => (
          <div key={i} className={`ev-cal-cell ${day ? 'ev-cal-active' : 'ev-cal-empty'} ${day && isToday(day) ? 'ev-cal-today' : ''}`}
            onClick={() => day && onDayClick(new Date(year, month, day))}>
            {day && (
              <>
                <div className="ev-cal-num">{day}</div>
                <div className="ev-cal-events">
                  {eventsOnDay(day).slice(0, 3).map(e => (
                    <div key={e.id} className={`ev-dot ${TYPE_COLORS[e.eventType] ?? 'ev-gray'} ${e.status === 'Cancelled' ? 'ev-cancelled' : ''}`}
                      onClick={ev => { ev.stopPropagation(); onEventClick(e); }}
                      title={`${fmtTime(e.startTime)} ${e.title}`}>
                      {fmtTime(e.startTime)} {e.title}
                    </div>
                  ))}
                  {eventsOnDay(day).length > 3 && (
                    <div className="ev-dot-more">+{eventsOnDay(day).length - 3} more</div>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function Events() {
  const { user, can } = useAuth();
  const now = new Date();
  const [view, setView]       = useState<View>('calendar');
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());
  const [events, setEvents]   = useState<BarangayEvent[]>([]);
  const [blotters, setBlotters] = useState<Blotter[]>([]);
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch]   = useState('');
  const [modal, setModal]     = useState(false);
  const [editing, setEditing] = useState<BarangayEvent | null>(null);
  const [viewing, setViewing] = useState<BarangayEvent | null>(null);
  const [conflicts, setConflicts] = useState<BarangayEvent[]>([]);
  const [prefillDate, setPrefillDate] = useState<Date | null>(null);

  const load = useCallback(() => {
    const p = new URLSearchParams();
    p.set('year', String(calYear));
    p.set('month', String(calMonth + 1));
    if (typeFilter)   p.set('type', typeFilter);
    if (statusFilter) p.set('status', statusFilter);
    get<BarangayEvent[]>(`/api/events?${p}`).then(setEvents).catch(console.error);
  }, [calYear, calMonth, typeFilter, statusFilter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    get<Blotter[]>('/api/blotters').then(setBlotters).catch(console.error);
  }, []);

  const checkConflicts = async (start: string, end: string, location: string, excludeId?: number) => {
    if (!start || !end || !location) { setConflicts([]); return; }
    const p = new URLSearchParams({ start, end, location });
    if (excludeId) p.set('excludeId', String(excludeId));
    const result = await get<BarangayEvent[]>(`/api/events/conflicts?${p}`).catch(() => []);
    setConflicts(result);
  };

  const openNew = (date?: Date) => {
    setEditing(null); setConflicts([]);
    setPrefillDate(date ?? null);
    setModal(true);
  };
  const openEdit = (ev: BarangayEvent) => {
    setEditing(ev); setConflicts([]); setViewing(null); setModal(true);
  };

  const saveEvent = async (data: Partial<BarangayEvent>) => {
    if (editing) await put(`/api/events/${editing.id}`, { ...data, id: editing.id, createdAt: editing.createdAt, createdBy: editing.createdBy });
    else await post('/api/events', { ...data, createdBy: user?.fullName ?? '' });
    setModal(false); load();
  };

  const deleteEvent = async (id: number) => {
    if (!confirm('Delete this event?')) return;
    await del(`/api/events/${id}`);
    setViewing(null); load();
  };

  const markStatus = async (id: number, status: string) => {
    await patch(`/api/events/${id}/status`, status);
    setViewing(null); load();
  };

  // List view filtered
  const listEvents = useMemo(() => {
    let list = events;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(e => e.title.toLowerCase().includes(q) || e.location.toLowerCase().includes(q) || e.organizer.toLowerCase().includes(q));
    }
    return list;
  }, [events, search]);

  // Prefill start/end for calendar day click
  const prefillStart = prefillDate
    ? (() => { const d = new Date(prefillDate); d.setHours(8,0,0,0); return d.toISOString(); })()
    : undefined;
  const prefillEnd = prefillDate
    ? (() => { const d = new Date(prefillDate); d.setHours(9,0,0,0); return d.toISOString(); })()
    : undefined;

  const prevMonth = () => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y-1); } else setCalMonth(m => m-1); };
  const nextMonth = () => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y+1); } else setCalMonth(m => m+1); };

  return (
    <div className="ev-page">
      {/* Header */}
      <div className="ev-header-row">
        <div>
          <h1 className="ev-title">📅 Events & Appointments</h1>
          <p className="ev-subtitle">Barangay Damolog — Schedule, Hearings & Meetings</p>
        </div>
        <div className="ev-header-actions">
          <button className="btn-print" onClick={() => printSchedule(listEvents, `${MONTH_NAMES[calMonth]} ${calYear}`)}>🖨️ Print Schedule</button>
          {can('edit_events') && <button className="btn-primary" onClick={() => openNew()}>+ New Event</button>}
        </div>
      </div>

      {/* View toggle + nav */}
      <div className="ev-toolbar">
        <div className="ev-view-toggle">
          <button className={view === 'calendar' ? 'active' : ''} onClick={() => setView('calendar')}>📆 Calendar</button>
          <button className={view === 'list'     ? 'active' : ''} onClick={() => setView('list')}>📋 List</button>
        </div>
        <div className="ev-nav">
          <button className="ev-nav-btn" onClick={prevMonth}>‹</button>
          <span className="ev-nav-label">{MONTH_NAMES[calMonth]} {calYear}</span>
          <button className="ev-nav-btn" onClick={nextMonth}>›</button>
          <button className="ev-nav-today" onClick={() => { setCalYear(now.getFullYear()); setCalMonth(now.getMonth()); }}>Today</button>
        </div>
        <div className="ev-filters">
          <select className="ev-select" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="">All Types</option>
            {EVENT_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
          <select className="ev-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            {EVENT_STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
          {view === 'list' && (
            <input className="ev-search" placeholder="Search title, location…" value={search} onChange={e => setSearch(e.target.value)} />
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="ev-legend">
        {EVENT_TYPES.map(t => (
          <span key={t} className="ev-legend-item">
            <span className={`ev-legend-dot ${TYPE_COLORS[t]}`} />{t}
          </span>
        ))}
      </div>

      {/* Calendar View */}
      {view === 'calendar' && (
        <CalendarGrid
          year={calYear} month={calMonth} events={events}
          onDayClick={date => openNew(date)}
          onEventClick={ev => setViewing(ev)}
        />
      )}

      {/* List View */}
      {view === 'list' && (
        <div className="ev-table-wrap">
          <table className="ev-table">
            <thead>
              <tr><th>Date &amp; Time</th><th>Title</th><th>Type</th><th>Location</th><th>Organizer</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {listEvents.length === 0 && <tr><td colSpan={7} className="ev-empty">No events found.</td></tr>}
              {listEvents.map(e => (
                <tr key={e.id} className={e.status === 'Cancelled' ? 'ev-row-cancelled' : ''}>
                  <td>
                    <div>{fmtDate(e.startTime)}</div>
                    <div className="ev-time-range">{fmtTime(e.startTime)} – {fmtTime(e.endTime)}</div>
                  </td>
                  <td>
                    <div className="ev-title-cell">{e.title}</div>
                    {e.blotterCaseNumber && <div className="ev-case-ref">📋 {e.blotterCaseNumber}</div>}
                  </td>
                  <td><span className={`ev-type-badge ${TYPE_COLORS[e.eventType] ?? 'ev-gray'}`}>{e.eventType}</span></td>
                  <td>{e.location || '—'}</td>
                  <td>{e.organizer || '—'}</td>
                  <td><StatusBadge status={e.status} /></td>
                  <td>
                    <button className="btn-sm" onClick={() => setViewing(e)}>View</button>
                    {can('edit_events')   && <button className="btn-sm" onClick={() => openEdit(e)}>Edit</button>}
                    {can('delete_events') && <button className="btn-sm btn-danger" onClick={() => deleteEvent(e.id)}>✕</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Event Detail Modal */}
      {viewing && (
        <div className="ev-overlay" onClick={() => setViewing(null)}>
          <div className="ev-modal ev-detail-modal" onClick={e => e.stopPropagation()}>
            <div className="ev-modal-header">
              <div>
                <span className={`ev-type-badge ${TYPE_COLORS[viewing.eventType] ?? 'ev-gray'}`}>{viewing.eventType}</span>
                <h2 style={{marginTop:6}}>{viewing.title}</h2>
              </div>
              <button className="ev-close" onClick={() => setViewing(null)}>✕</button>
            </div>
            <div className="ev-modal-body">
              <div className="ev-detail-grid">
                <div className="ev-detail-row"><span>📅 Date</span><span>{fmtDate(viewing.startTime)}</span></div>
                <div className="ev-detail-row"><span>🕐 Time</span><span>{fmtTime(viewing.startTime)} – {fmtTime(viewing.endTime)}</span></div>
                <div className="ev-detail-row"><span>📍 Location</span><span>{viewing.location || '—'}</span></div>
                <div className="ev-detail-row"><span>👤 Organizer</span><span>{viewing.organizer || '—'}</span></div>
                <div className="ev-detail-row"><span>📊 Status</span><span><StatusBadge status={viewing.status} /></span></div>
                {viewing.blotterCaseNumber && <div className="ev-detail-row"><span>📋 Case</span><span>{viewing.blotterCaseNumber}</span></div>}
                {viewing.participants && <div className="ev-detail-row span2"><span>👥 Participants</span><span>{viewing.participants}</span></div>}
                {viewing.description && <div className="ev-detail-row span2"><span>📝 Notes</span><span>{viewing.description}</span></div>}
              </div>
            </div>
            <div className="ev-modal-footer">
              {viewing.status === 'Scheduled' && can('edit_events') && <>
                <button className="btn-sm" onClick={() => markStatus(viewing.id, 'Done')}>✅ Mark Done</button>
                <button className="btn-sm btn-danger" onClick={() => markStatus(viewing.id, 'Cancelled')}>🚫 Cancel</button>
              </>}
              <button className="btn-secondary" onClick={() => setViewing(null)}>Close</button>
              {can('edit_events') && <button className="btn-primary" onClick={() => openEdit(viewing)}>Edit</button>}
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {modal && (
        <EventForm
          initial={editing ?? { startTime: prefillStart, endTime: prefillEnd }}
          blotters={blotters}
          onSave={saveEvent}
          onClose={() => { setModal(false); setConflicts([]); }}
          conflicts={conflicts}
          onCheckConflicts={checkConflicts}
        />
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = { Scheduled: 'ev-badge-blue', Done: 'ev-badge-green', Cancelled: 'ev-badge-gray' };
  return <span className={`ev-status-badge ${map[status] ?? 'ev-badge-gray'}`}>{status}</span>;
}
