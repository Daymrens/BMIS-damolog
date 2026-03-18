import { useEffect, useRef, useState } from 'react';
import { get } from '../api';
import type { Stats, Reports } from '../types';
import './Dashboard.css';

const SITIO_COLORS = ['#1a4f8a','#059669','#d97706','#dc2626','#8b5cf6','#14b8a6','#ec4899','#f59e0b'];
const STATUS_BADGE: Record<string, string> = {
  Pending: 'badge-pending', Settled: 'badge-settled', Escalated: 'badge-escalated',
};

export default function Dashboard() {
  const [tab, setTab]       = useState<'dashboard' | 'reports'>('dashboard');
  const [stats, setStats]   = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');

  const load = () => {
    setLoading(true);
    get<Stats>('/api/stats')
      .then(s => { setStats(s); setError(''); })
      .catch(() => setError('Cannot connect to API. Make sure BarangayAPI is running on port 5000.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="dash">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            {tab === 'dashboard' ? 'Dashboard' : 'Reports'}
          </h1>
          <p className="page-sub">Barangay Damolog · Municipality of Sogod · Cebu</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div className="dash-tabs">
            <button className={`dash-tab ${tab === 'dashboard' ? 'active' : ''}`} onClick={() => setTab('dashboard')}>📊 Dashboard</button>
            <button className={`dash-tab ${tab === 'reports'   ? 'active' : ''}`} onClick={() => setTab('reports')}>📈 Reports</button>
          </div>
          {tab === 'dashboard' && (
            <button className="btn-primary" onClick={load} disabled={loading}>⟳ Refresh</button>
          )}
        </div>
      </div>

      {error && <div className="dash-error">{error}</div>}

      {tab === 'dashboard'
        ? <DashboardView stats={stats} loading={loading} />
        : <ReportsView />
      }
    </div>
  );
}

// ── Dashboard tab ─────────────────────────────────────────────────────────────
function DashboardView({ stats, loading }: { stats: Stats | null; loading: boolean }) {
  const docsRef    = useRef<HTMLCanvasElement>(null);
  const blotterRef = useRef<HTMLCanvasElement>(null);
  const v = (k: keyof Stats): string | number => {
    if (loading) return '…';
    const val = stats?.[k];
    if (val === undefined || val === null) return '—';
    if (typeof val === 'number' || typeof val === 'string' || typeof val === 'boolean') return val as string | number;
    return '—';
  };
  const peso = (n: number) => `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

  useEffect(() => {
    if (!stats) return;
    drawBars(docsRef.current,
      stats.docsByType.map(d => ({ label: d.type.replace('Certificate of ','Cert. of ').replace('Barangay ','Bgy. '), value: d.count })),
      ['#1a4f8a','#d97706','#059669','#dc2626','#8b5cf6']);
    drawBars(blotterRef.current,
      stats.blottersByStatus.map(b => ({ label: b.status, value: b.count })),
      stats.blottersByStatus.map(b => b.status === 'Pending' ? '#f59e0b' : b.status === 'Settled' ? '#10b981' : '#ef4444'));
  }, [stats]);

  return (
    <>
      {/* TODAY live strip */}
      <div className="today-strip">
        <div className="today-label">TODAY</div>
        <div className="today-items">
          <div className="today-item">
            <span className="today-val">{loading ? '…' : (stats?.todayQueueTotal ?? 0)}</span>
            <span className="today-lbl">🎫 Requests</span>
          </div>
          <div className="today-sep" />
          <div className="today-item">
            <span className="today-val" style={{ color: '#f59e0b' }}>{loading ? '…' : (stats?.todayQueuePending ?? 0)}</span>
            <span className="today-lbl">⏳ Pending Queue</span>
          </div>
          <div className="today-sep" />
          <div className="today-item">
            <span className="today-val" style={{ color: '#059669' }}>{loading ? '…' : peso(stats?.todayCollections ?? 0)}</span>
            <span className="today-lbl">💰 Collections</span>
          </div>
          <div className="today-sep" />
          <div className="today-item">
            <span className="today-val" style={{ color: '#1a4f8a' }}>{loading ? '…' : (stats?.todayNewResidents ?? 0)}</span>
            <span className="today-lbl">👤 New Residents</span>
          </div>
          <div className="today-sep" />
          <div className="today-item">
            <span className="today-val" style={{ color: '#dc2626' }}>{v('pendingBlotters')}</span>
            <span className="today-lbl">⚠️ Pending Cases</span>
          </div>
        </div>
      </div>

      {/* Primary cards */}
      <div className="dash-grid-4" style={{ marginTop: 14 }}>
        {([
          { label: 'Total Residents',  icon: '👥', color: '#1a4f8a', val: v('totalResidents')  },
          { label: 'Active Officials', icon: '🏛', color: '#059669', val: v('totalOfficials')  },
          { label: 'Docs Issued',      icon: '📄', color: '#d97706', val: v('totalDocuments')  },
          { label: 'Pending Blotters', icon: '⚠️', color: '#dc2626', val: v('pendingBlotters') },
        ] as const).map(c => (
          <div key={c.label} className="stat-primary" style={{ background: c.color }}>
            <div className="sp-icon">{c.icon}</div>
            <div className="sp-val">{c.val}</div>
            <div className="sp-lbl">{c.label}</div>
          </div>
        ))}
      </div>

      {/* Secondary cards */}
      <div className="dash-grid-4" style={{ marginTop: 14 }}>
        {([
          { label: 'Male',            icon: '♂',  color: '#3b82f6', val: v('maleResidents')    },
          { label: 'Female',          icon: '♀',  color: '#ec4899', val: v('femaleResidents')  },
          { label: 'Voters',          icon: '🗳', color: '#8b5cf6', val: v('registeredVoters') },
          { label: 'Docs This Month', icon: '📋', color: '#14b8a6', val: v('docsThisMonth')    },
        ] as const).map(c => (
          <div key={c.label} className="stat-secondary">
            <div className="ss-bar" style={{ background: c.color }} />
            <div className="ss-body">
              <div className="ss-lbl">{c.icon} {c.label}</div>
              <div className="ss-val" style={{ color: c.color }}>{c.val}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Population tags row */}
      <div className="dash-grid-4" style={{ marginTop: 14 }}>
        {([
          { label: 'Seniors',  icon: '👴', color: '#059669', val: v('seniorResidents') },
          { label: 'Minors',   icon: '🧒', color: '#f59e0b', val: v('minorResidents')  },
          { label: 'PWD',      icon: '♿', color: '#14b8a6', val: v('pwdResidents')    },
          { label: '4Ps',      icon: '💰', color: '#d97706', val: v('fourPsResidents') },
        ] as const).map(c => (
          <div key={c.label} className="stat-secondary">
            <div className="ss-bar" style={{ background: c.color }} />
            <div className="ss-body">
              <div className="ss-lbl">{c.icon} {c.label}</div>
              <div className="ss-val" style={{ color: c.color }}>{c.val}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Revenue strip */}
      <div className="rev-strip" style={{ marginTop: 14 }}>
        <div className="rev-item">
          <span className="rev-lbl">📆 Monthly Revenue</span>
          <span className="rev-val">{loading ? '…' : peso(stats?.monthlyRevenue ?? 0)}</span>
        </div>
        <div className="rev-sep" />
        <div className="rev-item">
          <span className="rev-lbl">📊 Yearly Revenue</span>
          <span className="rev-val">{loading ? '…' : peso(stats?.yearlyRevenue ?? 0)}</span>
        </div>
      </div>

      {/* Charts + Sitio */}
      <div className="dash-grid-3" style={{ marginTop: 14 }}>
        <div className="card dash-chart-card">
          <div className="dash-card-title">Documents by Type</div>
          <canvas ref={docsRef} className="dash-canvas" />
        </div>
        <div className="card dash-chart-card">
          <div className="dash-card-title">Blotter by Status</div>
          <canvas ref={blotterRef} className="dash-canvas" />
        </div>
        <div className="card">
          <div className="dash-card-title">👥 Residents by Sitio</div>
          <div className="sitio-list">
            {(stats?.sitioBreakdown ?? []).map((s, i) => {
              const pct = Math.round((s.count / (stats?.totalResidents || 1)) * 100);
              return (
                <div key={s.sitio} className="sitio-row">
                  <div className="sitio-info">
                    <span className="sitio-name">{s.sitio}</span>
                    <span className="sitio-count">{s.count}</span>
                  </div>
                  <div className="sitio-bar-bg">
                    <div className="sitio-bar-fill" style={{ width: `${pct}%`, background: SITIO_COLORS[i % SITIO_COLORS.length] }} />
                  </div>
                </div>
              );
            })}
            {!stats && <div className="empty-row">Loading…</div>}
          </div>
        </div>
      </div>

      {/* Recent tables */}
      <div className="dash-grid-2" style={{ marginTop: 14 }}>
        <div className="card">
          <div className="dash-card-title">🕐 Recently Added Residents</div>
          <table style={{ marginTop: 10 }}>
            <thead><tr><th>Name</th><th>Sitio</th><th>Added</th></tr></thead>
            <tbody>
              {stats?.recentResidents.map((r, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 500 }}>{r.lastName}, {r.firstName}</td>
                  <td><span className="sitio-pill">{r.sitio || '—'}</span></td>
                  <td style={{ color: '#9ca3af', whiteSpace: 'nowrap', fontSize: 12 }}>{r.createdAt?.slice(0,10)}</td>
                </tr>
              ))}
              {!stats?.recentResidents?.length && <tr><td colSpan={3} className="empty-row">No data</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="card">
          <div className="dash-card-title">📋 Recent Blotter Cases</div>
          <table style={{ marginTop: 10 }}>
            <thead><tr><th>Case No.</th><th>Complainant</th><th>Incident</th><th>Status</th></tr></thead>
            <tbody>
              {stats?.recentBlotters.map((b, i) => (
                <tr key={i}>
                  <td><code style={{ fontSize: 11 }}>{b.caseNumber}</code></td>
                  <td>{b.complainant}</td>
                  <td>{b.incident}</td>
                  <td><span className={`badge ${STATUS_BADGE[b.status] ?? ''}`}>{b.status}</span></td>
                </tr>
              ))}
              {!stats?.recentBlotters?.length && <tr><td colSpan={4} className="empty-row">No data</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

// ── Reports tab ───────────────────────────────────────────────────────────────
function ReportsView() {
  const [year, setYear]       = useState(new Date().getFullYear());
  const [data, setData]       = useState<Reports | null>(null);
  const [loading, setLoading] = useState(true);
  const lineRef  = useRef<HTMLCanvasElement>(null);
  const revRef   = useRef<HTMLCanvasElement>(null);

  const load = (y: number) => {
    setLoading(true);
    get<Reports>(`/api/reports?year=${y}`)
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(year); }, [year]);

  useEffect(() => {
    if (!data) return;
    drawLine(lineRef.current, data.monthly.map(m => m.docs),     data.monthly.map(m => m.month), '#1a4f8a', 'Docs Issued');
    drawLine(revRef.current,  data.monthly.map(m => m.revenue),  data.monthly.map(m => m.month), '#059669', 'Revenue (₱)');
  }, [data]);

  const peso = (n: number) => `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  return (
    <>
      {/* Year picker + print */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16 }}>
        <select value={year} onChange={e => setYear(Number(e.target.value))} style={{ width: 120 }}>
          {years.map(y => <option key={y}>{y}</option>)}
        </select>
        <button className="btn-secondary" onClick={() => load(year)}>⟳ Refresh</button>
        <button className="btn-secondary" onClick={() => printAnnualReport(data, year)}>🖨 Print Annual Report</button>
      </div>

      {/* Annual summary cards */}
      <div className="dash-grid-4">
        {([
          { label: 'Docs Issued',    icon: '📄', color: '#1a4f8a', val: loading ? '…' : (data?.totalDocs ?? 0)         },
          { label: 'Total Revenue',  icon: '💰', color: '#059669', val: loading ? '…' : peso(data?.totalRevenue ?? 0)  },
          { label: 'New Residents',  icon: '👤', color: '#d97706', val: loading ? '…' : (data?.totalNewResidents ?? 0) },
          { label: 'Blotter Cases',  icon: '📋', color: '#dc2626', val: loading ? '…' : (data?.totalBlotters ?? 0)     },
        ] as const).map(c => (
          <div key={c.label} className="stat-primary" style={{ background: c.color }}>
            <div className="sp-icon">{c.icon}</div>
            <div className="sp-val">{c.val}</div>
            <div className="sp-lbl">{c.label} in {year}</div>
          </div>
        ))}
      </div>

      {/* Line charts */}
      <div className="dash-grid-2" style={{ marginTop: 14 }}>
        <div className="card dash-chart-card" style={{ height: 200 }}>
          <div className="dash-card-title">📄 Monthly Documents Issued</div>
          <canvas ref={lineRef} className="dash-canvas" style={{ height: 155 }} />
        </div>
        <div className="card dash-chart-card" style={{ height: 200 }}>
          <div className="dash-card-title">💰 Monthly Revenue</div>
          <canvas ref={revRef} className="dash-canvas" style={{ height: 155 }} />
        </div>
      </div>

      {/* Monthly table */}
      <div className="card" style={{ marginTop: 14, padding: 0 }}>
        <div className="dash-card-title" style={{ padding: '14px 20px 0' }}>📅 Monthly Breakdown — {year}</div>
        <div className="table-wrap">
          <table>
            <thead><tr>
              <th>Month</th><th>Docs Issued</th><th>Revenue</th><th>New Residents</th><th>Blotter Cases</th>
            </tr></thead>
            <tbody>
              {(data?.monthly ?? []).map((m, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{m.month}</td>
                  <td>{m.docs}</td>
                  <td style={{ color: '#059669', fontWeight: 600 }}>{peso(m.revenue)}</td>
                  <td>{m.newResidents}</td>
                  <td>{m.blotters}</td>
                </tr>
              ))}
              {!data && <tr><td colSpan={5} className="empty-row">Loading…</td></tr>}
            </tbody>
            {data && (
              <tfoot>
                <tr style={{ background: '#f8fafc', fontWeight: 700 }}>
                  <td>TOTAL</td>
                  <td>{data.totalDocs}</td>
                  <td style={{ color: '#059669' }}>{peso(data.totalRevenue)}</td>
                  <td>{data.totalNewResidents}</td>
                  <td>{data.totalBlotters}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Breakdown cards */}
      <div className="dash-grid-2" style={{ marginTop: 14 }}>
        <div className="card">
          <div className="dash-card-title">📄 Certificates by Type</div>
          <div className="sitio-list" style={{ marginTop: 10 }}>
            {(data?.docsByType ?? []).map((d, i) => {
              const max = Math.max(...(data?.docsByType ?? []).map(x => x.count), 1);
              return (
                <div key={i} className="sitio-row">
                  <div className="sitio-info">
                    <span className="sitio-name" style={{ fontSize: 12 }}>{d.type}</span>
                    <span className="sitio-count">{d.count}</span>
                  </div>
                  <div className="sitio-bar-bg">
                    <div className="sitio-bar-fill" style={{ width: `${Math.round((d.count / max) * 100)}%`, background: SITIO_COLORS[i % SITIO_COLORS.length] }} />
                  </div>
                </div>
              );
            })}
            {!data?.docsByType?.length && <div className="empty-row">No data</div>}
          </div>
        </div>
        <div className="card">
          <div className="dash-card-title">💰 Revenue by Category</div>
          <div className="sitio-list" style={{ marginTop: 10 }}>
            {(data?.revenueByCategory ?? []).map((r, i) => {
              const max = Math.max(...(data?.revenueByCategory ?? []).map(x => x.total), 1);
              return (
                <div key={i} className="sitio-row">
                  <div className="sitio-info">
                    <span className="sitio-name" style={{ fontSize: 12 }}>{r.category}</span>
                    <span className="sitio-count" style={{ color: '#059669' }}>₱{r.total.toLocaleString('en-PH')}</span>
                  </div>
                  <div className="sitio-bar-bg">
                    <div className="sitio-bar-fill" style={{ width: `${Math.round((r.total / max) * 100)}%`, background: '#059669' }} />
                  </div>
                </div>
              );
            })}
            {!data?.revenueByCategory?.length && <div className="empty-row">No data</div>}
          </div>
        </div>
      </div>
    </>
  );
}

// ── Canvas helpers ────────────────────────────────────────────────────────────
function drawBars(canvas: HTMLCanvasElement | null, data: { label: string; value: number }[], colors: string | string[]) {
  if (!canvas || !data.length) return;
  const ctx = canvas.getContext('2d'); if (!ctx) return;
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.offsetWidth, H = canvas.offsetHeight;
  canvas.width = W * dpr; canvas.height = H * dpr;
  ctx.scale(dpr, dpr); ctx.clearRect(0, 0, W, H);
  const max = Math.max(...data.map(d => d.value), 1);
  const pad = 12, labelH = 36, valH = 18;
  const chartH = H - labelH - valH - pad;
  const barW = Math.min(55, (W - pad * 2) / data.length - 14);
  data.forEach((d, i) => {
    const color = Array.isArray(colors) ? colors[i % colors.length] : colors;
    const barH = (d.value / max) * chartH;
    const x = pad + i * ((W - pad * 2) / data.length) + ((W - pad * 2) / data.length - barW) / 2;
    const y = valH + chartH - barH;
    ctx.fillStyle = color + '22'; ctx.fillRect(x, valH, barW, chartH);
    ctx.fillStyle = color; ctx.beginPath();
    (ctx as any).roundRect?.(x, y, barW, barH, 4) ?? ctx.rect(x, y, barW, barH);
    ctx.fill();
    ctx.fillStyle = '#374151'; ctx.font = 'bold 11px Segoe UI, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(String(d.value), x + barW / 2, y - 4);
    ctx.fillStyle = '#9ca3af'; ctx.font = '10px Segoe UI, sans-serif';
    const words = d.label.split(' '); const ly = valH + chartH + 14;
    if (words.length > 2) { ctx.fillText(words.slice(0,2).join(' '), x + barW/2, ly); ctx.fillText(words.slice(2).join(' '), x + barW/2, ly+12); }
    else ctx.fillText(d.label, x + barW / 2, ly);
  });
}

function drawLine(canvas: HTMLCanvasElement | null, values: number[], labels: string[], color: string, _title: string) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d'); if (!ctx) return;
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.offsetWidth, H = canvas.offsetHeight;
  canvas.width = W * dpr; canvas.height = H * dpr;
  ctx.scale(dpr, dpr); ctx.clearRect(0, 0, W, H);
  const pad = { t: 16, r: 12, b: 28, l: 12 };
  const cW = W - pad.l - pad.r, cH = H - pad.t - pad.b;
  const max = Math.max(...values, 1);
  const pts = values.map((v, i) => ({
    x: pad.l + (i / (values.length - 1)) * cW,
    y: pad.t + cH - (v / max) * cH,
  }));

  // Fill area
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pad.t + cH);
  pts.forEach(p => ctx.lineTo(p.x, p.y));
  ctx.lineTo(pts[pts.length - 1].x, pad.t + cH);
  ctx.closePath();
  ctx.fillStyle = color + '18'; ctx.fill();

  // Line
  ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = 2;
  pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
  ctx.stroke();

  // Dots + values
  pts.forEach((p, i) => {
    ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = color; ctx.fill();
    if (values[i] > 0) {
      ctx.fillStyle = '#374151'; ctx.font = 'bold 9px Segoe UI, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(String(values[i]), p.x, p.y - 6);
    }
    ctx.fillStyle = '#9ca3af'; ctx.font = '9px Segoe UI, sans-serif';
    ctx.fillText(labels[i], p.x, pad.t + cH + 14);
  });
}

// ── Print annual report ───────────────────────────────────────────────────────
function printAnnualReport(data: Reports | null, year: number) {
  if (!data) return;
  const peso = (n: number) => `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
  const rows = data.monthly.map(m => `
    <tr>
      <td>${m.month}</td><td>${m.docs}</td>
      <td style="color:#059669;font-weight:600">${peso(m.revenue)}</td>
      <td>${m.newResidents}</td><td>${m.blotters}</td>
    </tr>`).join('');

  const docTypeRows = data.docsByType.map(d =>
    `<tr><td>${d.type}</td><td style="text-align:center">${d.count}</td></tr>`).join('');

  const revCatRows = data.revenueByCategory.map(r =>
    `<tr><td>${r.category}</td><td style="text-align:right;color:#059669;font-weight:600">${peso(r.total)}</td></tr>`).join('');

  const html = `<!DOCTYPE html><html><head><title>Annual Report ${year}</title>
  <style>
    @page { size: A4; margin: 20mm; }
    body { font-family: Arial, sans-serif; font-size: 10pt; color: #111; }
    h1 { font-size: 15pt; margin-bottom: 2px; }
    h2 { font-size: 11pt; margin: 16px 0 6px; color: #1a4f8a; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
    .sub { font-size: 9pt; color: #666; margin-bottom: 14px; }
    .summary { display: flex; gap: 16px; margin-bottom: 16px; }
    .s-box { border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px 16px; text-align: center; flex: 1; }
    .s-val { font-size: 16pt; font-weight: bold; color: #1a4f8a; }
    .s-lbl { font-size: 8pt; color: #666; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
    th { background: #1a4f8a; color: #fff; padding: 6px 8px; font-size: 9pt; text-align: left; }
    td { padding: 5px 8px; border-bottom: 1px solid #e5e7eb; font-size: 9pt; }
    tfoot td { background: #f8fafc; font-weight: bold; }
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .footer { margin-top: 20px; font-size: 8pt; color: #999; border-top: 1px solid #e5e7eb; padding-top: 8px; display: flex; justify-content: space-between; }
  </style></head><body>
  <h1>Annual Report — ${year}</h1>
  <div class="sub">Barangay Damolog, Municipality of Sogod, Cebu</div>
  <div class="summary">
    <div class="s-box"><div class="s-val">${data.totalDocs}</div><div class="s-lbl">Docs Issued</div></div>
    <div class="s-box"><div class="s-val" style="color:#059669">${peso(data.totalRevenue)}</div><div class="s-lbl">Total Revenue</div></div>
    <div class="s-box"><div class="s-val" style="color:#d97706">${data.totalNewResidents}</div><div class="s-lbl">New Residents</div></div>
    <div class="s-box"><div class="s-val" style="color:#dc2626">${data.totalBlotters}</div><div class="s-lbl">Blotter Cases</div></div>
  </div>
  <h2>Monthly Breakdown</h2>
  <table>
    <thead><tr><th>Month</th><th>Docs Issued</th><th>Revenue</th><th>New Residents</th><th>Blotter Cases</th></tr></thead>
    <tbody>${rows}</tbody>
    <tfoot><tr><td>TOTAL</td><td>${data.totalDocs}</td><td style="color:#059669">${peso(data.totalRevenue)}</td><td>${data.totalNewResidents}</td><td>${data.totalBlotters}</td></tr></tfoot>
  </table>
  <div class="two-col">
    <div>
      <h2>Certificates by Type</h2>
      <table><thead><tr><th>Document Type</th><th>Count</th></tr></thead><tbody>${docTypeRows || '<tr><td colspan="2" style="text-align:center;color:#999">No data</td></tr>'}</tbody></table>
    </div>
    <div>
      <h2>Revenue by Category</h2>
      <table><thead><tr><th>Category</th><th>Total</th></tr></thead><tbody>${revCatRows || '<tr><td colspan="2" style="text-align:center;color:#999">No data</td></tr>'}</tbody></table>
    </div>
  </div>
  <div class="footer">
    <span>Prepared by: _____________________________ &nbsp;&nbsp; Approved by: _____________________________</span>
    <span>Printed: ${new Date().toLocaleString('en-PH')}</span>
  </div>
  <script>window.onload = () => window.print();<\/script>
  </body></html>`;

  const win = window.open('', '_blank');
  if (win) { win.document.write(html); win.document.close(); }
}
