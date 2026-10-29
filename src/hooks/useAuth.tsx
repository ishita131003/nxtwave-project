import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { dataSource } from '../api';
import type { CurrentSession, Session } from '../api/dataSource';

interface AuthValue {
  current: CurrentSession;
  session: Session | null;
  refresh: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<CurrentSession>(() => dataSource.getCurrentSession());
  const location = useLocation();
  const refresh = useCallback(() => setCurrent(dataSource.getCurrentSession()), []);

  // Re-check on store changes (incl. other tabs), on navigation, and every 30s for expiry.
  useEffect(() => dataSource.subscribe(refresh), [refresh]);
  useEffect(refresh, [location.pathname, refresh]);
  useEffect(() => {
    const id = window.setInterval(refresh, 30_000);
    return () => window.clearInterval(id);
  }, [refresh]);

  const logout = useCallback(async () => {
    if (current.status === 'active') await dataSource.logout(current.session);
    else dataSource.clearCurrentSession();
    refresh();
  }, [current, refresh]);

  const value = useMemo(
    () => ({ current, session: current.status === 'active' ? current.session : null, refresh, logout }),
    [current, refresh, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

/** For pages behind a guard: the session is guaranteed to exist. */
export function useSession(): Session {
  const { session } = useAuth();
  if (!session) throw new Error('useSession used outside a guarded route');
  return session;
}
