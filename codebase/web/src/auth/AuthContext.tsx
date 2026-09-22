import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api, LEGACY_TOKEN_KEY, TOKEN_KEY, type UserProfile } from '../api/client';
import {
  clearStoredMockUserId,
  getStoredMockUserId,
  mockUserToProfile,
  setStoredMockUserId,
} from '../mock/auth';
import { loadStore } from '../mock/store';

export const USE_MOCK_AUTH = import.meta.env.VITE_USE_MOCK_AUTH === 'true';

const SESSION_POLICY_KEY = 'cms.sessionPolicy';

export interface SessionPolicy {
  absoluteTimeoutMinutes: number;
  idleTimeoutMinutes: number;
}

interface AuthContextValue {
  user: UserProfile | null;
  token: string | null;
  sessionPolicy: SessionPolicy | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<UserProfile>;
  loginWithRole: (userId: string) => UserProfile;
  refreshUser: () => Promise<UserProfile | null>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readStoredAccessToken(): string | null {
  const current = sessionStorage.getItem(TOKEN_KEY);
  if (current) return current;
  const legacy = sessionStorage.getItem(LEGACY_TOKEN_KEY);
  if (legacy) {
    sessionStorage.setItem(TOKEN_KEY, legacy);
    sessionStorage.removeItem(LEGACY_TOKEN_KEY);
    return legacy;
  }
  return null;
}

function resolveMockUser(userId: string): UserProfile | null {
  const store = loadStore();
  if (!store) return null;
  return mockUserToProfile(store, userId);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(() => {
    if (!USE_MOCK_AUTH) return null;
    const userId = getStoredMockUserId();
    return userId ? resolveMockUser(userId) : null;
  });
  const [token, setToken] = useState<string | null>(() =>
    USE_MOCK_AUTH ? (getStoredMockUserId() ? 'mock-token' : null) : readStoredAccessToken(),
  );
  const [sessionPolicy, setSessionPolicy] = useState<SessionPolicy | null>(() => {
    if (USE_MOCK_AUTH) return { absoluteTimeoutMinutes: 30, idleTimeoutMinutes: 15 };
    try {
      const raw = sessionStorage.getItem(SESSION_POLICY_KEY);
      return raw ? (JSON.parse(raw) as SessionPolicy) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(!USE_MOCK_AUTH && Boolean(token));

  useEffect(() => {
    if (USE_MOCK_AUTH) {
      setLoading(false);
      return;
    }
    if (!token) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    api
      .me(token)
      .then((profile) => {
        if (!cancelled) {
          setUser(profile);
          if (profile.sessionPolicy) {
            setSessionPolicy(profile.sessionPolicy);
            sessionStorage.setItem(SESSION_POLICY_KEY, JSON.stringify(profile.sessionPolicy));
          }
        }
      })
      .catch(() => {
        sessionStorage.removeItem(TOKEN_KEY);
        sessionStorage.removeItem(SESSION_POLICY_KEY);
        if (!cancelled) {
          setToken(null);
          setUser(null);
          setSessionPolicy(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const loginWithRole = useCallback((userId: string) => {
    const profile = resolveMockUser(userId);
    if (!profile) throw new Error('Unable to sign in with the selected role.');
    setStoredMockUserId(userId);
    setToken('mock-token');
    setUser(profile);
    return profile;
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await api.login(email, password);
    sessionStorage.setItem(TOKEN_KEY, result.accessToken);
    if (result.sessionPolicy) {
      sessionStorage.setItem(SESSION_POLICY_KEY, JSON.stringify(result.sessionPolicy));
      setSessionPolicy(result.sessionPolicy);
    }
    setToken(result.accessToken);
    setUser(result.user);
    return result.user;
  }, []);

  const refreshUser = useCallback(async () => {
    if (USE_MOCK_AUTH || !token) return null;
    const profile = await api.me(token);
    setUser(profile);
    return profile;
  }, [token]);

  const logout = useCallback(async () => {
    if (USE_MOCK_AUTH) {
      clearStoredMockUserId();
      setToken(null);
      setUser(null);
      return;
    }
    if (token) {
      try {
        await api.logout(token);
      } catch {
        /* discard token even if logout API fails */
      }
    }
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(SESSION_POLICY_KEY);
    setToken(null);
    setUser(null);
    setSessionPolicy(null);
  }, [token]);

  const value = useMemo(
    () => ({ user, token, sessionPolicy, loading, login, loginWithRole, refreshUser, logout }),
    [user, token, sessionPolicy, loading, login, loginWithRole, refreshUser, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
