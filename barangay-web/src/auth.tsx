import { createContext, useContext, useState, type ReactNode } from 'react';

export interface AuthUser {
  id: number;
  username: string;
  fullName: string;
  role: string;
  lastLogin?: string;
}

// ── Permission definitions ────────────────────────────────────────────────────
// Each key is a capability; value is the set of roles that have it.
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  // Residents
  view_residents:   ['Admin', 'Secretary', 'Treasurer', 'Staff'],
  edit_residents:   ['Admin', 'Secretary', 'Staff'],
  delete_residents: ['Admin', 'Secretary'],

  // Documents
  view_documents:   ['Admin', 'Secretary', 'Treasurer', 'Staff'],
  issue_documents:  ['Admin', 'Secretary', 'Staff'],
  delete_documents: ['Admin', 'Secretary'],

  // Queue
  view_queue:       ['Admin', 'Secretary', 'Staff'],
  manage_queue:     ['Admin', 'Secretary', 'Staff'],

  // Payments
  view_payments:    ['Admin', 'Treasurer'],
  collect_payments: ['Admin', 'Treasurer'],
  void_payments:    ['Admin', 'Treasurer'],

  // Blotter
  view_blotter:     ['Admin', 'Secretary'],
  edit_blotter:     ['Admin', 'Secretary'],
  delete_blotter:   ['Admin'],

  // Officials
  view_officials:   ['Admin', 'Secretary', 'Treasurer', 'Staff'],
  edit_officials:   ['Admin', 'Secretary'],

  // Households
  view_households:  ['Admin', 'Secretary', 'Treasurer', 'Staff'],

  // Emergency
  view_emergency:   ['Admin', 'Secretary', 'Staff'],
  edit_emergency:   ['Admin', 'Secretary', 'Staff'],

  // Events
  view_events:      ['Admin', 'Secretary', 'Staff'],
  edit_events:      ['Admin', 'Secretary'],
  delete_events:    ['Admin'],

  // Admin panel
  view_admin:       ['Admin'],
  manage_users:     ['Admin'],

  // Map
  view_map:         ['Admin', 'Secretary', 'Treasurer', 'Staff'],

  // Analytics
  view_analytics:   ['Admin', 'Secretary', 'Treasurer'],

  // Budget
  view_budget:      ['Admin', 'Treasurer'],
  edit_budget:      ['Admin', 'Treasurer'],

  // Health
  view_health:      ['Admin', 'Secretary', 'Staff'],
  edit_health:      ['Admin', 'Secretary', 'Staff'],

  // Livelihood
  view_livelihood:  ['Admin', 'Secretary', 'Staff'],
  edit_livelihood:  ['Admin', 'Secretary', 'Staff'],

  // Tasks
  view_tasks:       ['Admin', 'Secretary', 'Treasurer', 'Staff'],
  manage_tasks:     ['Admin', 'Secretary', 'Staff'],

  // BHW
  view_bhw:         ['Admin', 'Secretary', 'Staff'],
  edit_bhw:         ['Admin', 'Secretary', 'Staff'],
};

export function can(role: string, permission: string): boolean {
  return (ROLE_PERMISSIONS[permission] ?? []).includes(role);
}

interface AuthCtx {
  user: AuthUser | null;
  login: (u: AuthUser) => void;
  logout: () => void;
  can: (permission: string) => boolean;
}

const Ctx = createContext<AuthCtx>({
  user: null,
  login: () => {},
  logout: () => {},
  can: () => false,
});

const KEY = 'brgy_user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try { return JSON.parse(localStorage.getItem(KEY) ?? 'null'); } catch { return null; }
  });

  const login  = (u: AuthUser) => { setUser(u); localStorage.setItem(KEY, JSON.stringify(u)); };
  const logout = () => { setUser(null); localStorage.removeItem(KEY); };
  const canDo  = (permission: string) => can(user?.role ?? '', permission);

  return <Ctx.Provider value={{ user, login, logout, can: canDo }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
