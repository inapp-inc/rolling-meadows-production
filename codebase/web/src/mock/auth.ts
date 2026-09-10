import type { UserProfile } from '../api/client';
import { findUser } from './caseService';
import { landingPathForRole } from './seed';
import type { MockStore } from './types';

const MOCK_USER_KEY = 'rm.mock.userId';

const MOCK_EMAILS: Record<string, string> = {
  'usr-platform-admin': 'platform.admin@demo.rmhs.app',
  'usr-tenant-admin': 'tenant.admin@demo.rmhs.app',
  'usr-case-manager': 'case.manager@demo.rmhs.app',
  'usr-supervisor': 'supervisor@demo.rmhs.app',
  'usr-cross-program-liaison': 'liaison@demo.rmhs.app',
  'usr-liaison': 'liaison@demo.rmhs.app',
  'usr-auditor': 'auditor@demo.rmhs.app',
};

export function mockUserToProfile(store: MockStore, userId: string): UserProfile | null {
  const user = findUser(store, userId);
  if (!user) return null;
  return {
    id: user.id,
    email: MOCK_EMAILS[userId] ?? `${user.role.replace(/_/g, '.')}@demo.rmhs.app`,
    name: user.name,
    role: user.role,
    tenantId: user.role === 'platform_admin' ? null : 'tenant-rolling-meadows',
    programId: user.programId,
    status: user.status,
    landingPath: landingPathForRole(user.role),
    tenant:
      user.role === 'platform_admin'
        ? null
        : {
            id: 'tenant-rolling-meadows',
            legalName: 'Rolling Meadows Human Services',
            shortCode: 'RMHS',
            status: 'Active',
            displayName: 'Rolling Meadows Human Services',
          },
  };
}

export function getStoredMockUserId(): string | null {
  return sessionStorage.getItem(MOCK_USER_KEY);
}

export function setStoredMockUserId(userId: string): void {
  sessionStorage.setItem(MOCK_USER_KEY, userId);
}

export function clearStoredMockUserId(): void {
  sessionStorage.removeItem(MOCK_USER_KEY);
}

