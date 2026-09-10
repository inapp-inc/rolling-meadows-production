import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { MockStore } from './types';
import { clearStore, getSeedVersion, isStoreValid, loadStore, saveStore, SEED_VERSION } from './store';
import { createSeedStore } from './seed';

type MockDataContextValue = {
  store: MockStore;
  version: number;
  resetDemo: () => void;
  refresh: () => void;
};

const MockDataContext = createContext<MockDataContextValue | undefined>(undefined);

function ensureStore(): MockStore {
  const existing = loadStore();
  if (existing && isStoreValid(existing) && getSeedVersion() === SEED_VERSION) {
    return existing;
  }
  const seeded = createSeedStore();
  saveStore(seeded);
  return seeded;
}

export function MockDataProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<MockStore>(() => ensureStore());
  const [version, setVersion] = useState(0);

  const refresh = useCallback(() => {
    const next = loadStore();
    if (next) {
      setStore(next);
      setVersion((v) => v + 1);
    }
  }, []);

  useEffect(() => {
    const onChange = () => refresh();
    window.addEventListener('rm:store-changed', onChange);
    return () => window.removeEventListener('rm:store-changed', onChange);
  }, [refresh]);

  const resetDemo = useCallback(() => {
    if (!window.confirm('Reset all demo data to seed state?')) return;
    clearStore();
    const seeded = createSeedStore();
    saveStore(seeded);
    setStore(seeded);
    setVersion((v) => v + 1);
  }, []);

  const value = useMemo(() => ({ store, version, resetDemo, refresh }), [store, version, resetDemo, refresh]);

  return <MockDataContext.Provider value={value}>{children}</MockDataContext.Provider>;
}

export function useMockData() {
  const ctx = useContext(MockDataContext);
  if (!ctx) throw new Error('useMockData must be used within MockDataProvider');
  return ctx;
}
