import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { db } from '../db/database';
import { seedDatabase } from '../db/seed';
import type { SessionUser } from '../db/types';
import { hashPassword } from '../lib/crypto';

const SESSION_KEY = 'nozraashi_session';

interface AuthContextValue {
  user: SessionUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readSession(): SessionUser | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as SessionUser) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(() => readSession());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    seedDatabase().finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const normalized = username.trim().toLowerCase();
    const found = await db.users.where('username').equals(normalized).first();

    if (!found || !found.active) {
      return { ok: false, error: 'اسم المستخدم أو كلمة المرور غير صحيحة' };
    }

    const passwordHash = await hashPassword(password);
    if (found.passwordHash !== passwordHash) {
      return { ok: false, error: 'اسم المستخدم أو كلمة المرور غير صحيحة' };
    }

    const session: SessionUser = {
      id: found.id,
      username: found.username,
      name: found.name,
      role: found.role,
    };

    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    setUser(session);
    return { ok: true };
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, logout }),
    [user, loading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function useRequireRole(...roles: SessionUser['role'][]) {
  const { user } = useAuth();
  return user ? roles.includes(user.role) : false;
}
