import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth, can } from './auth';
import Dashboard from './pages/Dashboard';
import Residents from './pages/Residents';
import Officials from './pages/Officials';
import Documents from './pages/Documents';
import Blotter from './pages/Blotter';
import Queue from './pages/Queue';
import Payments from './pages/Payments';
import Admin from './pages/Admin';
import Login from './pages/Login';
import HouseholdMapping from './pages/HouseholdMapping';
import Emergency from './pages/Emergency';
import Events from './pages/Events';
import MapView from './pages/MapView';
import Analytics from './pages/Analytics';
import Budget from './pages/Budget';
import Health from './pages/Health';
import Livelihood from './pages/Livelihood';
import Tasks from './pages/Tasks';
import BHW from './pages/BHW';
import './App.css';

// permission required to see each nav item
const nav = [
  { to: '/',           label: 'Dashboard',  icon: '📊', perm: null },
  { to: '/residents',  label: 'Residents',  icon: '👥', perm: 'view_residents' },
  { to: '/officials',  label: 'Officials',  icon: '🏛',  perm: 'view_officials' },
  { to: '/documents',  label: 'Documents',  icon: '📄', perm: 'view_documents' },
  { to: '/queue',      label: 'Queue',      icon: '🎫', perm: 'view_queue' },
  { to: '/payments',   label: 'Payments',   icon: '💰', perm: 'view_payments' },
  { to: '/blotter',    label: 'Blotter',    icon: '📋', perm: 'view_blotter' },
  { to: '/households', label: 'Households', icon: '🏘️', perm: 'view_households' },
  { to: '/emergency',  label: 'Emergency',  icon: '🆘', perm: 'view_emergency' },
  { to: '/events',     label: 'Events',     icon: '📅', perm: 'view_events' },
  { to: '/map',        label: 'Map View',   icon: '📍', perm: 'view_map' },
  { to: '/analytics',  label: 'Analytics',  icon: '📈', perm: 'view_analytics' },
  { to: '/budget',     label: 'Budget',     icon: '🧮', perm: 'view_budget' },
  { to: '/health',     label: 'Health',     icon: '🏥', perm: 'view_health' },
  { to: '/livelihood', label: 'Livelihood', icon: '🧾', perm: 'view_livelihood' },
  { to: '/tasks',      label: 'Tasks',      icon: '📋', perm: 'view_tasks' },
  { to: '/bhw',        label: 'BHW',        icon: '🧑‍⚕️', perm: 'view_bhw' },
];

function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // close mobile drawer on route change
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  // collapse sidebar on small screens by default
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const handler = (e: MediaQueryListEvent) => { if (e.matches) setCollapsed(false); };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  if (!user) return <Navigate to="/login" replace />;

  const handleLogout = () => { logout(); navigate('/login'); };
  const visibleNav = nav.filter(n => !n.perm || can(user.role, n.perm));

  const sidebarContent = (
    <>
      <div className="sidebar-brand">
        <div className="brand-seal">
          <img src="/logo.png" alt="Barangay Damolog Seal" className="brand-logo" />
        </div>
        {!collapsed && (
          <div className="brand-text">
            <div className="brand-name">Barangay Damolog</div>
            <div className="brand-loc">Municipality of Sogod</div>
            <div className="brand-loc">Cebu</div>
          </div>
        )}
      </div>
      <div className="sidebar-divider" />
      <nav className="sidebar-nav">
        {visibleNav.map(n => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.to === '/'}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''} ${collapsed ? 'nav-item-collapsed' : ''}`}
            title={collapsed ? n.label : undefined}
          >
            <span className="nav-icon">{n.icon}</span>
            {!collapsed && <span>{n.label}</span>}
          </NavLink>
        ))}
        {can(user.role, 'view_admin') && (
          <NavLink
            to="/admin"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''} ${collapsed ? 'nav-item-collapsed' : ''}`}
            title={collapsed ? 'Admin' : undefined}
          >
            <span className="nav-icon">⚙️</span>
            {!collapsed && <span>Admin</span>}
          </NavLink>
        )}
      </nav>
      <div className="sidebar-footer">
        {!collapsed && (
          <div className="sidebar-user">
            <div className="sidebar-user-name">{user.fullName}</div>
            <div className="sidebar-user-role">
              <span className={`role-pill role-${user.role.toLowerCase()}`}>{user.role}</span>
            </div>
          </div>
        )}
        <button className="logout-btn" onClick={handleLogout} title="Sign out">⏻</button>
      </div>
    </>
  );

  return (
    <div className={`app-layout ${collapsed ? 'sidebar-collapsed' : ''}`}>
      {/* Mobile overlay */}
      {mobileOpen && <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />}

      {/* Desktop sidebar */}
      <aside className="sidebar sidebar-desktop">
        <button className="sidebar-toggle" onClick={() => setCollapsed(c => !c)} title={collapsed ? 'Expand' : 'Collapse'}>
          {collapsed ? '▶' : '◀'}
        </button>
        {sidebarContent}
      </aside>

      {/* Mobile drawer */}
      <aside className={`sidebar sidebar-mobile ${mobileOpen ? 'open' : ''}`}>
        {sidebarContent}
      </aside>

      <div className="app-body">
        <header className="topbar">
          <div className="topbar-left">
            {/* Mobile hamburger */}
            <button className="hamburger" onClick={() => setMobileOpen(o => !o)} title="Menu">☰</button>
            <img src="/logo.png" alt="seal" className="topbar-logo" />
            <span className="topbar-brgy">Barangay Damolog</span>
            <span className="topbar-sep">·</span>
            <span className="topbar-mun">Municipality of Sogod, Cebu</span>
          </div>
          <div className="topbar-right">
            <span className="topbar-date">
              {new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>
        </header>
        <main className="main-content">
          <Routes>
            <Route path="/"          element={<Dashboard />} />
            <Route path="/residents" element={can(user.role,'view_residents')  ? <Residents />     : <Denied />} />
            <Route path="/officials" element={can(user.role,'view_officials')  ? <Officials />     : <Denied />} />
            <Route path="/documents" element={can(user.role,'view_documents')  ? <Documents />     : <Denied />} />
            <Route path="/queue"     element={can(user.role,'view_queue')      ? <Queue />         : <Denied />} />
            <Route path="/payments"  element={can(user.role,'view_payments')   ? <Payments />      : <Denied />} />
            <Route path="/blotter"   element={can(user.role,'view_blotter')    ? <Blotter />       : <Denied />} />
            <Route path="/households" element={can(user.role,'view_households')? <HouseholdMapping/>: <Denied />} />
            <Route path="/emergency" element={can(user.role,'view_emergency')  ? <Emergency />     : <Denied />} />
            <Route path="/events"    element={can(user.role,'view_events')     ? <Events />        : <Denied />} />
            <Route path="/map"       element={can(user.role,'view_map')         ? <MapView />       : <Denied />} />
            <Route path="/analytics" element={can(user.role,'view_analytics')   ? <Analytics />     : <Denied />} />
            <Route path="/budget"    element={can(user.role,'view_budget')      ? <Budget />        : <Denied />} />
            <Route path="/health"      element={can(user.role,'view_health')       ? <Health />        : <Denied />} />
            <Route path="/livelihood"  element={can(user.role,'view_livelihood')   ? <Livelihood />    : <Denied />} />
            <Route path="/tasks"       element={can(user.role,'view_tasks')        ? <Tasks />         : <Denied />} />
            <Route path="/bhw"         element={can(user.role,'view_bhw')          ? <BHW />           : <Denied />} />
            <Route path="/admin"       element={can(user.role,'view_admin')        ? <Admin />         : <Denied />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function Denied() {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'60vh', gap:12, color:'#6b7280' }}>
      <div style={{ fontSize:'3rem' }}>🔒</div>
      <div style={{ fontSize:'1.2rem', fontWeight:700, color:'#111827' }}>Access Denied</div>
      <div style={{ fontSize:'0.9rem' }}>You don't have permission to view this page.</div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginGuard />} />
          <Route path="/*"     element={<Layout />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

function LoginGuard() {
  const { user } = useAuth();
  return user ? <Navigate to="/" replace /> : <Login />;
}
