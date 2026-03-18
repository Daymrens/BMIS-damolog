import { useEffect, useRef, useState } from 'react';
import type { MapSitioData } from '../types';
import './MapView.css';

const API = 'http://localhost:5000';

const SITIO_ZONES: Record<string, [number, number][]> = {
  'Proper': [
    [10.7720, 124.0040], [10.7740, 124.0055], [10.7745, 124.0075],
    [10.7730, 124.0090], [10.7710, 124.0080], [10.7705, 124.0058],
  ],
  'Kalubihan': [
    [10.7745, 124.0075], [10.7760, 124.0090], [10.7765, 124.0110],
    [10.7748, 124.0120], [10.7730, 124.0105], [10.7728, 124.0082],
  ],
  'Highlander': [
    [10.7680, 124.0020], [10.7700, 124.0038], [10.7705, 124.0058],
    [10.7685, 124.0065], [10.7668, 124.0050], [10.7665, 124.0028],
  ],
  'Colo': [
    [10.7660, 124.0060], [10.7678, 124.0075], [10.7675, 124.0098],
    [10.7655, 124.0105], [10.7638, 124.0090], [10.7640, 124.0065],
  ],
  'Kalusayan': [
    [10.7700, 124.0090], [10.7718, 124.0105], [10.7715, 124.0125],
    [10.7695, 124.0132], [10.7678, 124.0118], [10.7680, 124.0095],
  ],
  'Patag': [
    [10.7730, 124.0105], [10.7748, 124.0120], [10.7745, 124.0142],
    [10.7725, 124.0148], [10.7708, 124.0132], [10.7710, 124.0108],
  ],
  'Damolog Gamay': [
    [10.7755, 124.0045], [10.7775, 124.0060], [10.7778, 124.0082],
    [10.7760, 124.0092], [10.7742, 124.0078], [10.7740, 124.0055],
  ],
  'Lantawan': [
    [10.7775, 124.0082], [10.7795, 124.0095], [10.7792, 124.0118],
    [10.7772, 124.0125], [10.7755, 124.0110], [10.7758, 124.0088],
  ],
};

const MAP_CENTER: [number, number] = [10.7705, 124.0059];

type Layer = 'total' | 'voters' | 'seniors' | 'pWD' | 'fourPs' | 'minors' | 'vulnerable';

const LAYERS: { key: Layer; label: string; icon: string }[] = [
  { key: 'total',      label: 'All Residents', icon: '👥' },
  { key: 'voters',     label: 'Voters',        icon: '🗳️' },
  { key: 'seniors',    label: 'Seniors',       icon: '👴' },
  { key: 'pWD',        label: 'PWD',           icon: '♿' },
  { key: 'fourPs',     label: '4Ps',           icon: '🏠' },
  { key: 'minors',     label: 'Minors',        icon: '👶' },
  { key: 'vulnerable', label: 'Vulnerable',    icon: '🆘' },
];

function getColor(value: number, max: number): string {
  if (max === 0 || value === 0) return '#e2e8f0';
  const r = value / max;
  if (r > 0.8) return '#1e3a8a';
  if (r > 0.6) return '#1d4ed8';
  if (r > 0.4) return '#3b82f6';
  if (r > 0.2) return '#93c5fd';
  return '#dbeafe';
}

// Compute sitio stats from raw residents array
function computeSitioData(residents: any[]): MapSitioData[] {
  const now = new Date();
  const seniorCutoff = new Date(now.getFullYear() - 60, now.getMonth(), now.getDate());
  const minorCutoff  = new Date(now.getFullYear() - 18, now.getMonth(), now.getDate());

  const map = new Map<string, MapSitioData>();

  for (const r of residents) {
    const sitio = r.sitio || 'Unassigned';
    if (!map.has(sitio)) {
      map.set(sitio, { sitio, total: 0, voters: 0, seniors: 0, pWD: 0, fourPs: 0, minors: 0, vulnerable: 0, households: 0 });
    }
    const s = map.get(sitio)!;
    const bd = new Date(r.birthDate);
    const isSenior = r.isSenior || bd <= seniorCutoff;
    const isMinor  = bd > minorCutoff;

    s.total++;
    if (r.isVoter)  s.voters++;
    if (isSenior)   s.seniors++;
    if (r.isPWD)    s.pWD++;
    if (r.is4Ps)    s.fourPs++;
    if (isMinor)    s.minors++;
    if (isSenior || r.isPWD || isMinor) s.vulnerable++;
    if (r.householdNo) {
      // count distinct households per sitio (approximate via Set later)
    }
  }

  // Count distinct households per sitio
  const hhMap = new Map<string, Set<string>>();
  for (const r of residents) {
    const sitio = r.sitio || 'Unassigned';
    if (r.householdNo) {
      if (!hhMap.has(sitio)) hhMap.set(sitio, new Set());
      hhMap.get(sitio)!.add(r.householdNo);
    }
  }
  for (const [sitio, hhs] of hhMap) {
    const s = map.get(sitio);
    if (s) s.households = hhs.size;
  }

  return Array.from(map.values()).sort((a, b) => a.sitio.localeCompare(b.sitio));
}

declare global { interface Window { L: any; } }

export default function MapView() {
  const mapRef      = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const polygonsRef = useRef<any[]>([]);
  const dataRef     = useRef<MapSitioData[]>([]);
  const layerRef    = useRef<Layer>('total');

  const [data, setData]               = useState<MapSitioData[]>([]);
  const [selected, setSelected]       = useState<MapSitioData | null>(null);
  const [activeLayer, setActiveLayer] = useState<Layer>('total');
  const [loading, setLoading]         = useState(true);
  const [mapReady, setMapReady]       = useState(false);

  // Keep refs in sync so drawPolygons closure always has latest values
  dataRef.current  = data;
  layerRef.current = activeLayer;

  // Fetch residents and compute stats
  useEffect(() => {
    fetch(`${API}/api/residents`)
      .then(r => r.json())
      .then((json: any) => {
        const residents = Array.isArray(json) ? json : (json.items ?? json.data ?? []);
        setData(computeSitioData(residents));
      })
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, []);

  // Load Leaflet then init map
  useEffect(() => {
    function initMap() {
      if (!mapRef.current || mapInstance.current) return;
      const L = window.L;
      const map = L.map(mapRef.current, { zoomControl: true, scrollWheelZoom: true });
      mapInstance.current = map;
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 18,
      }).addTo(map);
      map.setView(MAP_CENTER, 16);
      setMapReady(true);
    }

    if (window.L) { initMap(); return; }

    if (!document.querySelector('link[href*="leaflet"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
    if (!document.querySelector('script[src*="leaflet"]')) {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = initMap;
      document.head.appendChild(script);
    }
  }, []);

  // Redraw whenever map is ready, data changes, or layer changes
  useEffect(() => {
    if (!mapReady || !mapInstance.current || !window.L || data.length === 0) return;
    drawPolygons(data, activeLayer);
  }, [mapReady, data, activeLayer]);

  function drawPolygons(sitioData: MapSitioData[], layer: Layer) {
    const L   = window.L;
    const map = mapInstance.current;
    if (!L || !map) return;

    polygonsRef.current.forEach(p => { try { map.removeLayer(p); } catch {} });
    polygonsRef.current = [];

    const values = sitioData.map(d => (d[layer] as number) ?? 0);
    const max    = Math.max(...values, 1);

    sitioData.forEach(sitio => {
      const coords = SITIO_ZONES[sitio.sitio];
      if (!coords) return;

      const value = (sitio[layer] as number) ?? 0;
      const color = getColor(value, max);

      const poly = L.polygon(coords, {
        color: '#1e40af', weight: 2,
        fillColor: color, fillOpacity: 0.72,
      }).addTo(map);

      const lat = coords.reduce((s, c) => s + c[0], 0) / coords.length;
      const lng = coords.reduce((s, c) => s + c[1], 0) / coords.length;

      const icon = L.divIcon({
        className: '',
        html: `<div class="map-label"><div class="map-label-name">${sitio.sitio}</div><div class="map-label-count">${value}</div></div>`,
        iconAnchor: [40, 20], iconSize: [80, 40],
      });
      const marker = L.marker([lat, lng], { icon }).addTo(map);

      poly.on('click',     () => setSelected({ ...sitio }));
      marker.on('click',   () => setSelected({ ...sitio }));
      poly.on('mouseover', () => poly.setStyle({ fillOpacity: 0.92, weight: 3 }));
      poly.on('mouseout',  () => poly.setStyle({ fillOpacity: 0.72, weight: 2 }));

      polygonsRef.current.push(poly, marker);
    });
  }

  const totalResidents = data.reduce((s, d) => s + d.total, 0);

  return (
    <div className="map-page">
      <aside className="map-sidebar">
        <div className="map-sidebar-header">
          <h2>📍 GIS Map View</h2>
          <p>Barangay Damolog, Sogod, Cebu</p>
        </div>

        <div className="map-layers">
          <div className="map-section-label">Display Layer</div>
          {LAYERS.map(l => (
            <button
              key={l.key}
              className={`map-layer-btn ${activeLayer === l.key ? 'active' : ''}`}
              onClick={() => setActiveLayer(l.key)}
            >
              <span>{l.icon}</span> {l.label}
            </button>
          ))}
        </div>

        <div className="map-sitio-list">
          <div className="map-section-label">Sitio Summary</div>
          {loading ? (
            <div className="map-loading">Loading data…</div>
          ) : data.length === 0 ? (
            <div className="map-loading">No resident data found.</div>
          ) : (
            data.map(s => (
              <div
                key={s.sitio}
                className={`map-sitio-item ${selected?.sitio === s.sitio ? 'active' : ''}`}
                onClick={() => setSelected(s)}
              >
                <div className="map-sitio-name">{s.sitio}</div>
                <div className="map-sitio-count">{s[activeLayer]} {activeLayer === 'total' ? 'residents' : activeLayer}</div>
              </div>
            ))
          )}
          <div className="map-total-row">
            <span>Total Population</span>
            <strong>{totalResidents}</strong>
          </div>
        </div>
      </aside>

      <div className="map-main">
        <div ref={mapRef} className="map-canvas" />

        <div className="map-legend">
          <div className="map-legend-title">Population Density</div>
          {['Very High', 'High', 'Medium', 'Low', 'Very Low', 'None'].map((label, i) => {
            const colors = ['#1e3a8a', '#1d4ed8', '#3b82f6', '#93c5fd', '#dbeafe', '#e2e8f0'];
            return (
              <div key={label} className="map-legend-row">
                <span className="map-legend-swatch" style={{ background: colors[i] }} />
                <span>{label}</span>
              </div>
            );
          })}
        </div>

        {selected && (
          <div className="map-detail-panel">
            <div className="map-detail-header">
              <strong>{selected.sitio}</strong>
              <button className="map-detail-close" onClick={() => setSelected(null)}>✕</button>
            </div>
            <div className="map-detail-grid">
              <div className="map-detail-stat"><span>👥 Total</span><strong>{selected.total}</strong></div>
              <div className="map-detail-stat"><span>🏠 Households</span><strong>{selected.households}</strong></div>
              <div className="map-detail-stat"><span>🗳️ Voters</span><strong>{selected.voters}</strong></div>
              <div className="map-detail-stat"><span>👴 Seniors</span><strong>{selected.seniors}</strong></div>
              <div className="map-detail-stat"><span>♿ PWD</span><strong>{selected.pWD}</strong></div>
              <div className="map-detail-stat"><span>🏠 4Ps</span><strong>{selected.fourPs}</strong></div>
              <div className="map-detail-stat"><span>👶 Minors</span><strong>{selected.minors}</strong></div>
              <div className="map-detail-stat"><span>🆘 Vulnerable</span><strong>{selected.vulnerable}</strong></div>
            </div>
            <div className="map-detail-bar">
              <div className="map-detail-bar-label">Voter Coverage</div>
              <div className="map-detail-bar-track">
                <div
                  className="map-detail-bar-fill"
                  style={{ width: selected.total > 0 ? `${Math.round((selected.voters / selected.total) * 100)}%` : '0%' }}
                />
              </div>
              <span>{selected.total > 0 ? Math.round((selected.voters / selected.total) * 100) : 0}%</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
