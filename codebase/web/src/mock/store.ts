import type { MockStore } from './types';

const STORAGE_KEY = 'rm.mock.store';
const META_KEY = 'rm.mock.meta';
export const SEED_VERSION = 30;

export function loadStore(): MockStore | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as MockStore) : null;
  } catch {
    return null;
  }
}

export function saveStore(store: MockStore): void {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  sessionStorage.setItem(META_KEY, JSON.stringify({ seedVersion: SEED_VERSION, initialized: true }));
  window.dispatchEvent(new CustomEvent('rm:store-changed'));
}

export function isStoreValid(store: MockStore | null): boolean {
  if (!store) return false;
  return (
    store.users.length >= 4 &&
    store.clients.length >= 19 &&
    store.cases.length >= 13 &&
    store.assessments.length >= 10
  );
}

export function getSeedVersion(): number | null {
  try {
    const raw = sessionStorage.getItem(META_KEY);
    if (!raw) return null;
    const meta = JSON.parse(raw) as { seedVersion?: number };
    return meta.seedVersion ?? null;
  } catch {
    return null;
  }
}

export function clearStore(): void {
  sessionStorage.removeItem(STORAGE_KEY);
  sessionStorage.removeItem(META_KEY);
}
