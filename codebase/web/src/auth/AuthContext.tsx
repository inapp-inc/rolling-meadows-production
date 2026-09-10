import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api, TOKEN_KEY, type UserProfile } from '../api/client';
import {
  clearStoredMockUserId,
  getStoredMockUserId,
  mockUserToProfile,
  setStoredMockUserId,
} from '../mock/auth';
import { loadStore } from '../mock/store';

export const USE_MOCK_AUTH = import.meta.env.VITE_USE_MOCK_AUTH === 'true';

interface AuthContextValue {
  user: UserProfile | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<UserProfile>;
  loginWithRole: (userId: string) => UserProfile;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

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
    USE_MOCK_AUTH ? (getStoredMockUserId() ? 'mock-token' : null) : sessionStorage.getItem(TOKEN_KEY),
  );
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
        if (!cancelled) setUser(profile);
      })
      .catch(() => {
        sessionStorage.removeItem(TOKEN_KEY);
        if (!cancelled) {
          setToken(null);
          setUser(null);
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
    setToken(result.accessToken);
    setUser(result.user);
    return result.user;
  }, []);

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
    setToken(null);
    setUser(null);
  }, [token]);

  const value = useMemo(
    () => ({ user, token, loading, login, loginWithRole, logout }),
    [user, token, loading, login, loginWithRole, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
