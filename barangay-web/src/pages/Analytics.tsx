import { useEffect, useState } from 'react';
import './Analytics.css';

const API = 'http://localhost:5000';

interface MonthPoint { month: string; count: number; }
interface DocStat    { type: string; count: number; pct: number; }
interface HourStat   { hour: number; label: string; docs: number; queue: number; payments: number; total: number; }
interface YearStat   { year: number; residents: number; docs: number; revenue: number; blotters: number; }
interface GenderStat { male: number; female: number; }
interface AgeStat    { label: string; count: number; }
interface SitioStat  { sitio: string; count: number; }

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#84cc16'];

export default function Analytics() {
  const [tab, setTab]                   = useState<'population'|'documents'|'service'|'overview'>('overview');
  const [yearRange, setYearRange]       = useState(new Date().getFullYear());
  const [loading, setLoading]           = useState(true);

  // Data states
  const [yearStats, setYearStats]       = useState<YearStat[]>([]);
  const [monthlyRes, setMonthlyRes]     = useState<MonthPoint[]>([]);
  const [genderStat, setGenderStat]     = useState<GenderStat>({ male: 0, female: 0 });
  const [ageStats, setAgeStats]         = useState<AgeStat[]>([]);
  const [sitioStats, setSitioStats]     = useState<SitioStat[]>([]);
  const [docStats, setDocStats]         = useState<DocStat[]>([]);
  const [monthlyDocs, setMonthlyDocs]   = useState<MonthPoint[]>([]);
  const [hourStats, setHourStats]       = useState<HourStat[]>([]);
  const [peakHour, setPeakHour]         = useState<HourStat | null>(null);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalDocs, setTotalDocs]       = useState(0);

  useEffect(() => { loadAll(); }, [yearRange]);

  async function loadAll() {
    setLoading(true);
    try {
      const [resData, docsData, paymentsData, queueData] = await Promise.all([
        fetch(`${API}/api/residents`).then(r => r.json()),
        fetch(`${API}/api/documents`).then(r => r.json()),
        fetch(`${API}/api/payments`).then(r => r.json()),
        fetch(`${API}/api/queue`).then(r => r.json()),
        fetch(`${API}/api/reports?year=${yearRange}`).then(r => r.json()),
      ]);

      const residents: any[] = Array.isArray(resData) ? resData : (resData.items ?? []);
      const documents: any[] = Array.isArray(docsData) ? docsData : (docsData.items ?? []);
      const payments:  any[] = Array.isArray(paymentsData) ? paymentsData : (paymentsData.items ?? []);
      const queues:    any[] = Array.isArray(queueData) ? queueData : (queueData.items ?? []);

      // ── Population growth (monthly registrations for selected year) ──
      const resByMonth = Array(12).fill(0);
      residents.forEach(r => {
        const d = new Date(r.createdAt ?? r.birthDate);
        if (d.getFullYear() === yearRange) resByMonth[d.getMonth()]++;
      });
      setMonthlyRes(MONTH_NAMES.map((m, i) => ({ month: m, count: resByMonth[i] })));

      // ── Gender breakdown ──
      const male   = residents.filter(r => r.gender === 'Male').length;
      const female = residents.filter(r => r.gender === 'Female').length;
      setGenderStat({ male, female });

      // ── Age distribution ──
      const now = new Date();
      const ageBuckets: Record<string, number> = {
        '0–17': 0, '18–29': 0, '30–44': 0, '45–59': 0, '60+': 0,
      };
      residents.forEach(r => {
        const age = Math.floor((now.getTime() - new Date(r.birthDate).getTime()) / (365.25 * 86400000));
        if (age < 18)      ageBuckets['0–17']++;
        else if (age < 30) ageBuckets['18–29']++;
        else if (age < 45) ageBuckets['30–44']++;
        else if (age < 60) ageBuckets['45–59']++;
        else               ageBuckets['60+']++;
      });
      setAgeStats(Object.entries(ageBuckets).map(([label, count]) => ({ label, count })));

      // ── Sitio breakdown ──
      const sitioMap: Record<string, number> = {};
      residents.forEach(r => {
        const s = r.sitio || 'Unassigned';
        sitioMap[s] = (sitioMap[s] ?? 0) + 1;
      });
      setSitioStats(Object.entries(sitioMap).map(([sitio, count]) => ({ sitio, count })).sort((a, b) => b.count - a.count));

      // ── Multi-year trend (last 5 years) ──
      const curYear = new Date().getFullYear();
      const years: YearStat[] = [];
      for (let y = curYear - 4; y <= curYear; y++) {
        years.push({
          year: y,
          residents: residents.filter(r => new Date(r.createdAt ?? '').getFullYear() === y).length,
          docs:      documents.filter(d => new Date(d.issuedAt ?? '').getFullYear() === y).length,
          revenue:   payments.filter(p => new Date(p.paidAt ?? '').getFullYear() === y && p.status === 'Paid').reduce((s: number, p: any) => s + (p.amount ?? 0), 0),
          blotters:  0,
        });
      }
      setYearStats(years);

      // ── Document stats ──
      const docMap: Record<string, number> = {};
      documents.forEach((d: any) => {
        const t = d.documentType || 'Other';
        docMap[t] = (docMap[t] ?? 0) + 1;
      });
      const total = Object.values(docMap).reduce((s, v) => s + v, 0);
      setTotalDocs(total);
      setDocStats(
        Object.entries(docMap)
          .map(([type, count]) => ({ type, count, pct: total > 0 ? Math.round((count / total) * 100) : 0 }))
          .sort((a, b) => b.count - a.count)
      );

      // ── Monthly docs for selected year ──
      const docsByMonth = Array(12).fill(0);
      documents.forEach((d: any) => {
        const dt = new Date(d.issuedAt ?? '');
        if (dt.getFullYear() === yearRange) docsByMonth[dt.getMonth()]++;
      });
      setMonthlyDocs(MONTH_NAMES.map((m, i) => ({ month: m, count: docsByMonth[i] })));

      // ── Revenue total ──
      setTotalRevenue(payments.filter((p: any) => p.status === 'Paid').reduce((s: number, p: any) => s + (p.amount ?? 0), 0));

      // ── Peak service hours (0–23) ──
      const hourMap: Record<number, { docs: number; queue: number; payments: number }> = {};
      for (let h = 7; h <= 17; h++) hourMap[h] = { docs: 0, queue: 0, payments: 0 };

      documents.forEach((d: any) => {
        const h = new Date(d.issuedAt ?? '').getHours();
        if (hourMap[h]) hourMap[h].docs++;
      });
      queues.forEach((q: any) => {
        const h = new Date(q.requestedAt ?? '').getHours();
        if (hourMap[h]) hourMap[h].queue++;
      });
      payments.forEach((p: any) => {
        if (p.status !== 'Paid') return;
        const h = new Date(p.paidAt ?? '').getHours();
        if (hourMap[h]) hourMap[h].payments++;
      });

      const hours: HourStat[] = Object.entries(hourMap).map(([h, v]) => {
        const hr = parseInt(h);
        const ampm = hr < 12 ? 'AM' : 'PM';
        const disp = hr === 0 ? 12 : hr > 12 ? hr - 12 : hr;
        return { hour: hr, label: `${disp}:00 ${ampm}`, ...v, total: v.docs + v.queue + v.payments };
      });
      setHourStats(hours);
      setPeakHour(hours.reduce((a, b) => b.total > a.total ? b : a, hours[0]));

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  // ── Bar chart helper ──────────────────────────────────────────────────────
  function BarChart({ data, valueKey, color, height = 120 }: {
    data: any[]; valueKey: string; color?: string; height?: number;
  }) {
    const max = Math.max(...data.map(d => d[valueKey] ?? 0), 1);
    return (
      <div className="bar-chart" style={{ height }}>
        {data.map((d, i) => (
          <div key={i} className="bar-col">
            <div className="bar-value">{d[valueKey] > 0 ? d[valueKey] : ''}</div>
            <div
              className="bar-fill"
              style={{
                height: `${Math.max((d[valueKey] / max) * 100, d[valueKey] > 0 ? 4 : 0)}%`,
                background: color ?? COLORS[i % COLORS.length],
              }}
              title={`${d.month ?? d.label ?? d.year ?? d.hour}: ${d[valueKey]}`}
            />
            <div className="bar-label">{d.month ?? d.label ?? d.year ?? d.label}</div>
          </div>
        ))}
      </div>
    );
  }

  // ── Horizontal bar ────────────────────────────────────────────────────────
  function HBar({ label, value, max, color, suffix = '' }: {
    label: string; value: number; max: number; color: string; suffix?: string;
  }) {
    const pct = max > 0 ? (value / max) * 100 : 0;
    return (
      <div className="hbar-row">
        <div className="hbar-label">{label}</div>
        <div className="hbar-track">
          <div className="hbar-fill" style={{ width: `${pct}%`, background: color }} />
        </div>
        <div className="hbar-val">{value}{suffix}</div>
      </div>
    );
  }

  const tabs = [
    { key: 'overview',    label: '📊 Overview' },
    { key: 'population',  label: '👥 Population' },
    { key: 'documents',   label: '📄 Documents' },
    { key: 'service',     label: '⏰ Service Hours' },
  ] as const;

  if (loading) return <div className="analytics-loading">Loading analytics…</div>;

  return (
    <div className="analytics-page">
      {/* Header */}
      <div className="analytics-header">
        <div>
          <h1 className="analytics-title">📈 Analytics & Insights</h1>
          <p className="analytics-sub">Barangay Damolog — data-driven overview</p>
        </div>
        <div className="analytics-controls">
          <label>Year</label>
          <select value={yearRange} onChange={e => setYearRange(+e.target.value)} className="analytics-select">
            {[2022,2023,2024,2025,2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button className="analytics-print-btn" onClick={() => window.print()}>🖨 Print</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="analytics-tabs">
        {tabs.map(t => (
          <button
            key={t.key}
            className={`analytics-tab ${tab === t.key ? 'active' : ''}`}
            onClick={() => setTab(t.key)}
          >{t.label}</button>
        ))}
      </div>

      {/* ── OVERVIEW ─────────────────────────────────────────────────────── */}
      {tab === 'overview' && (
        <div className="analytics-content">
          {/* KPI cards */}
          <div className="kpi-grid">
            {[
              { label: 'Total Residents',  value: sitioStats.reduce((s,x)=>s+x.count,0), icon: '👥', color: '#3b82f6' },
              { label: 'Total Documents',  value: totalDocs,   icon: '📄', color: '#10b981' },
              { label: 'Total Revenue',    value: `₱${totalRevenue.toLocaleString('en-PH', {minimumFractionDigits:2})}`, icon: '💰', color: '#f59e0b' },
              { label: 'Peak Hour',        value: peakHour?.label ?? '—', icon: '⏰', color: '#8b5cf6' },
            ].map(k => (
              <div key={k.label} className="kpi-card" style={{ borderTopColor: k.color }}>
                <div className="kpi-icon">{k.icon}</div>
                <div className="kpi-value" style={{ color: k.color }}>{k.value}</div>
                <div className="kpi-label">{k.label}</div>
              </div>
            ))}
          </div>

          {/* 5-year trend */}
          <div className="analytics-card full-width">
            <div className="card-title">5-Year Trend</div>
            <div className="trend-table-wrap">
              <table className="trend-table">
                <thead>
                  <tr>
                    <th>Year</th>
                    <th>New Residents</th>
                    <th>Documents Issued</th>
                    <th>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {yearStats.map(y => (
                    <tr key={y.year} className={y.year === yearRange ? 'highlight-row' : ''}>
                      <td><strong>{y.year}</strong></td>
                      <td>{y.residents}</td>
                      <td>{y.docs}</td>
                      <td>₱{y.revenue.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Gender + Age side by side */}
          <div className="analytics-row">
            <div className="analytics-card">
              <div className="card-title">Gender Distribution</div>
              <div className="donut-wrap">
                <div className="donut-chart">
                  <svg viewBox="0 0 36 36" className="donut-svg">
                    {(() => {
                      const total = genderStat.male + genderStat.female || 1;
                      const malePct = (genderStat.male / total) * 100;
                      const r = 15.9155;
                      const circ = 2 * Math.PI * r;
                      const maleDash = (malePct / 100) * circ;
                      return <>
                        <circle cx="18" cy="18" r={r} fill="none" stroke="#e2e8f0" strokeWidth="3.5" />
                        <circle cx="18" cy="18" r={r} fill="none" stroke="#3b82f6" strokeWidth="3.5"
                          strokeDasharray={`${maleDash} ${circ - maleDash}`}
                          strokeDashoffset={circ * 0.25} strokeLinecap="round" />
                        <circle cx="18" cy="18" r={r} fill="none" stroke="#ec4899" strokeWidth="3.5"
                          strokeDasharray={`${circ - maleDash} ${maleDash}`}
                          strokeDashoffset={circ * 0.25 - maleDash} strokeLinecap="round" />
                      </>;
                    })()}
                    <text x="18" y="20" textAnchor="middle" fontSize="5" fontWeight="bold" fill="#1e293b">
                      {genderStat.male + genderStat.female}
                    </text>
                  </svg>
                </div>
                <div className="donut-legend">
                  <div className="donut-item"><span className="dot" style={{background:'#3b82f6'}}/>Male <strong>{genderStat.male}</strong></div>
                  <div className="donut-item"><span className="dot" style={{background:'#ec4899'}}/>Female <strong>{genderStat.female}</strong></div>
                </div>
              </div>
            </div>

            <div className="analytics-card">
              <div className="card-title">Age Distribution</div>
              <BarChart data={ageStats} valueKey="count" height={130} />
            </div>
          </div>

          {/* Sitio breakdown */}
          <div className="analytics-card full-width">
            <div className="card-title">Population by Sitio</div>
            <div className="sitio-bars">
              {sitioStats.map((s, i) => (
                <HBar key={s.sitio} label={s.sitio} value={s.count}
                  max={sitioStats[0]?.count ?? 1} color={COLORS[i % COLORS.length]} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── POPULATION ───────────────────────────────────────────────────── */}
      {tab === 'population' && (
        <div className="analytics-content">
          <div className="analytics-card full-width">
            <div className="card-title">Monthly Resident Registrations — {yearRange}</div>
            <BarChart data={monthlyRes} valueKey="count" color="#3b82f6" height={160} />
            <div className="chart-note">Number of new residents registered per month</div>
          </div>

          <div className="analytics-row">
            <div className="analytics-card">
              <div className="card-title">Gender Breakdown</div>
              <div className="stat-list">
                <HBar label="Male"   value={genderStat.male}   max={genderStat.male + genderStat.female} color="#3b82f6" />
                <HBar label="Female" value={genderStat.female} max={genderStat.male + genderStat.female} color="#ec4899" />
              </div>
            </div>
            <div className="analytics-card">
              <div className="card-title">Age Groups</div>
              {ageStats.map((a, i) => (
                <HBar key={a.label} label={a.label} value={a.count}
                  max={Math.max(...ageStats.map(x => x.count), 1)} color={COLORS[i]} />
              ))}
            </div>
          </div>

          <div className="analytics-card full-width">
            <div className="card-title">Population by Sitio</div>
            <BarChart data={sitioStats.map(s => ({ ...s, month: s.sitio }))} valueKey="count" height={150} />
          </div>

          <div className="analytics-card full-width">
            <div className="card-title">5-Year Registration Trend</div>
            <BarChart data={yearStats.map(y => ({ ...y, month: String(y.year) }))} valueKey="residents" color="#10b981" height={150} />
          </div>
        </div>
      )}

      {/* ── DOCUMENTS ────────────────────────────────────────────────────── */}
      {tab === 'documents' && (
        <div className="analytics-content">
          <div className="analytics-card full-width">
            <div className="card-title">Monthly Documents Issued — {yearRange}</div>
            <BarChart data={monthlyDocs} valueKey="count" color="#10b981" height={160} />
          </div>

          <div className="analytics-row">
            <div className="analytics-card">
              <div className="card-title">Most Requested Documents</div>
              <div className="doc-rank-list">
                {docStats.map((d, i) => (
                  <div key={d.type} className="doc-rank-row">
                    <div className="doc-rank-num" style={{ background: COLORS[i % COLORS.length] }}>{i + 1}</div>
                    <div className="doc-rank-info">
                      <div className="doc-rank-name">{d.type}</div>
                      <div className="doc-rank-bar-wrap">
                        <div className="doc-rank-bar" style={{ width: `${d.pct}%`, background: COLORS[i % COLORS.length] }} />
                      </div>
                    </div>
                    <div className="doc-rank-count">
                      <strong>{d.count}</strong>
                      <span>{d.pct}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="analytics-card">
              <div className="card-title">5-Year Document Trend</div>
              <BarChart data={yearStats.map(y => ({ ...y, month: String(y.year) }))} valueKey="docs" color="#f59e0b" height={150} />
              <div className="card-title" style={{ marginTop: 16 }}>Revenue Trend</div>
              <BarChart data={yearStats.map(y => ({ ...y, month: String(y.year), rev: Math.round(y.revenue) }))} valueKey="rev" color="#8b5cf6" height={120} />
            </div>
          </div>
        </div>
      )}

      {/* ── SERVICE HOURS ────────────────────────────────────────────────── */}
      {tab === 'service' && (
        <div className="analytics-content">
          {peakHour && (
            <div className="peak-banner">
              <span className="peak-icon">⏰</span>
              <div>
                <div className="peak-title">Peak Service Hour: <strong>{peakHour.label}</strong></div>
                <div className="peak-sub">{peakHour.total} total transactions — {peakHour.docs} docs · {peakHour.queue} queue · {peakHour.payments} payments</div>
              </div>
            </div>
          )}

          <div className="analytics-card full-width">
            <div className="card-title">Transactions by Hour of Day</div>
            <div className="hour-chart-wrap">
              {hourStats.map(h => {
                const max = Math.max(...hourStats.map(x => x.total), 1);
                const pct = (h.total / max) * 100;
                const isPeak = h.hour === peakHour?.hour;
                return (
                  <div key={h.hour} className={`hour-col ${isPeak ? 'peak' : ''}`}>
                    <div className="hour-total">{h.total > 0 ? h.total : ''}</div>
                    <div className="hour-stack" style={{ height: 160 }}>
                      <div className="hour-bar-wrap" style={{ height: `${Math.max(pct, h.total > 0 ? 4 : 0)}%` }}>
                        <div className="hour-seg" style={{ height: `${h.total > 0 ? (h.docs/h.total)*100 : 0}%`, background: '#10b981' }} title={`Docs: ${h.docs}`} />
                        <div className="hour-seg" style={{ height: `${h.total > 0 ? (h.queue/h.total)*100 : 0}%`, background: '#3b82f6' }} title={`Queue: ${h.queue}`} />
                        <div className="hour-seg" style={{ height: `${h.total > 0 ? (h.payments/h.total)*100 : 0}%`, background: '#f59e0b' }} title={`Payments: ${h.payments}`} />
                      </div>
                    </div>
                    <div className="hour-label">{h.label}</div>
                  </div>
                );
              })}
            </div>
            <div className="hour-legend">
              <span><span className="dot" style={{background:'#10b981'}}/>Documents</span>
              <span><span className="dot" style={{background:'#3b82f6'}}/>Queue</span>
              <span><span className="dot" style={{background:'#f59e0b'}}/>Payments</span>
            </div>
          </div>

          <div className="analytics-card full-width">
            <div className="card-title">Hourly Breakdown Table</div>
            <table className="hour-table">
              <thead>
                <tr><th>Hour</th><th>Documents</th><th>Queue</th><th>Payments</th><th>Total</th></tr>
              </thead>
              <tbody>
                {hourStats.map(h => (
                  <tr key={h.hour} className={h.hour === peakHour?.hour ? 'highlight-row' : ''}>
                    <td>{h.label}</td>
                    <td>{h.docs}</td>
                    <td>{h.queue}</td>
                    <td>{h.payments}</td>
                    <td><strong>{h.total}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
