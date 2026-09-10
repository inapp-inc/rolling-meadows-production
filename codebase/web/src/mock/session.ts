/**
 * Session-scoped selections that survive navigation between case creation and
 * referral intake, mirroring the prototype's `RM.Session` pending-case helpers.
 */

const PENDING_CASE_KEY = 'rm.pendingCase';
const PENDING_CLIENT_KEY = 'rm.pendingClientId';

export type PendingCase = {
  categoryId: string;
  subcategoryId: string;
};

function read<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* sessionStorage unavailable */
  }
}

function clear(key: string): void {
  try {
    sessionStorage.removeItem(key);
  } catch {
    /* sessionStorage unavailable */
  }
}

export function getPendingCase(): PendingCase | null {
  return read<PendingCase>(PENDING_CASE_KEY);
}

export function setPendingCase(pending: PendingCase): void {
  write(PENDING_CASE_KEY, pending);
}

export function clearPendingCase(): void {
  clear(PENDING_CASE_KEY);
}

export function getPendingClientId(): string | null {
  return read<string>(PENDING_CLIENT_KEY);
}

export function setPendingClientId(clientId: string): void {
  write(PENDING_CLIENT_KEY, clientId);
}

export function clearPendingClientId(): void {
  clear(PENDING_CLIENT_KEY);
}
