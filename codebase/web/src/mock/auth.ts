import type { UserProfile } from '../api/client';
import { findUser } from './caseService';
import { landingPathForRole } from './seed';
import type { MockStore } from './types';

const MOCK_USER_KEY = 'rm.mock.userId';

const MOCK_EMAILS: Record<string, string> = {
  'usr-platform-admin': 'platform.admin@demo.example.com',
  'usr-tenant-admin': 'tenant.admin@demo.example.com',
  'usr-case-manager': 'case.manager@demo.example.com',
  'usr-supervisor': 'supervisor@demo.example.com',
  'usr-cross-program-liaison': 'liaison@demo.example.com',
  'usr-liaison': 'liaison@demo.example.com',
  'usr-auditor': 'auditor@demo.example.com',
};

export function mockUserToProfile(store: MockStore, userId: string): UserProfile | null {
  const user = findUser(store, userId);
  if (!user) return null;
  return {
    id: user.id,
    email: MOCK_EMAILS[userId] ?? `${user.role.replace(/_/g, '.')}@demo.example.com`,
    name: user.name,
    role: user.role,
    tenantId: user.role === 'platform_admin' ? null : 'tenant-demo',
    programId: user.programId,
    status: user.status,
    landingPath: landingPathForRole(user.role),
    tenant:
      user.role === 'platform_admin'
        ? null
        : {
            id: 'tenant-demo',
            legalName: 'Demo Human Services Agency',
            shortCode: 'DEMO',
            status: 'Active',
            displayName: 'Demo Human Services Agency',
            branding: {
              displayName: 'Demo Human Services Agency',
              primaryColor: '#1a5f4a',
              secondaryColor: '#0f2340',
              accentColor: '#43a047',
              footerText: '© Demo Human Services Agency',
              loginTagline: 'Human services case management for your agency workspace.',
              logoUrl: '/assets/logo.svg',
            },
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

