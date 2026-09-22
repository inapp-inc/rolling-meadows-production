import type { TenantBranding } from './client';
import { apiRequest, downloadFile } from './http';

export interface TenantSummary {
  id: string;
  legalName: string;
  shortCode: string;
  status: string;
  timezone?: string;
  defaultLocale?: string;
  enabledLocales?: string[];
  branding?: TenantBranding;
  config?: Record<string, unknown>;
  userCount?: number;
  activeCaseCount?: number;
  provisionedAt?: string;
  activatedAt?: string;
  primaryOrgAdminEmail?: string | null;
}

export interface LocaleItem {
  code: string;
  name: string;
  rtl: boolean;
  active: boolean;
}

export interface TranslationEntry {
  key: string;
  namespace: string;
  values: Record<string, string>;
}

export interface ReadinessCheck {
  id: string;
  label: string;
  passed: boolean;
}

export const platformApi = {
  listTenants(token: string) {
    return apiRequest<{ items: TenantSummary[] }>('/platform/tenants', {}, token);
  },
  listTenantUsers(token: string, tenantId: string) {
    return apiRequest<{ items: import('./adminApi').AdminUser[] }>(
      `/platform/tenants/${encodeURIComponent(tenantId)}/users`,
      {},
      token,
    );
  },
  deleteTenantUser(token: string, tenantId: string, userId: string) {
    return apiRequest<void>(
      `/platform/tenants/${encodeURIComponent(tenantId)}/users/${encodeURIComponent(userId)}`,
      { method: 'DELETE' },
      token,
    );
  },
  deleteTenant(token: string, tenantId: string) {
    return apiRequest<void>(`/platform/tenants/${encodeURIComponent(tenantId)}`, { method: 'DELETE' }, token);
  },
  createTenantOrgAdmin(
    token: string,
    tenantId: string,
    body: {
      email: string;
      name: string;
      password: string;
      branding?: {
        displayName?: string;
        primaryColor?: string;
        secondaryColor?: string;
        accentColor?: string;
        footerText?: string;
        loginTagline?: string;
      };
    },
  ) {
    return apiRequest<import('./adminApi').AdminUser>(
      `/platform/tenants/${encodeURIComponent(tenantId)}/users`,
      { method: 'POST', body: JSON.stringify(body) },
      token,
    );
  },
  createTenant(
    token: string,
    body: {
      legalName: string;
      shortCode: string;
      timezone?: string;
      defaultLocale?: string;
      adminEmail: string;
      adminName: string;
      adminPassword: string;
      branding?: {
        displayName?: string;
        primaryColor?: string;
        secondaryColor?: string;
        accentColor?: string;
        footerText?: string;
        loginTagline?: string;
      };
      config?: {
        duplicateThreshold?: number;
        retentionYears?: number;
      };
    },
  ) {
    return apiRequest<TenantSummary>('/platform/tenants', { method: 'POST', body: JSON.stringify(body) }, token);
  },
  uploadTenantLogo(token: string, tenantId: string, file: File) {
    const form = new FormData();
    form.append('file', file);
    return apiRequest<{ logoUrl: string }>(
      `/platform/tenants/${encodeURIComponent(tenantId)}/logo`,
      { method: 'POST', body: form },
      token,
    );
  },
  getTenant(token: string, tenantId: string) {
    return apiRequest<TenantSummary>(`/platform/tenants/${tenantId}`, {}, token);
  },
  resetTenantOrgAdminPassword(
    token: string,
    tenantId: string,
    body: { newPassword: string; email?: string },
  ) {
    return apiRequest<{ email: string }>(
      `/platform/tenants/${encodeURIComponent(tenantId)}/organization-admin/password`,
      { method: 'POST', body: JSON.stringify(body) },
      token,
    );
  },
  updateTenant(
    token: string,
    tenantId: string,
    body: {
      legalName?: string;
      defaultLocale?: string;
      duplicateThreshold?: number;
      retentionYears?: number;
      branding?: {
        displayName?: string;
        primaryColor?: string;
        secondaryColor?: string;
        accentColor?: string;
        footerText?: string;
        loginTagline?: string;
      };
    },
  ) {
    return apiRequest<TenantSummary>(
      `/platform/tenants/${tenantId}`,
      { method: 'PATCH', body: JSON.stringify(body) },
      token,
    );
  },
  readiness(token: string, tenantId: string) {
    return apiRequest<{ ready: boolean; checks: ReadinessCheck[] }>(
      `/platform/tenants/${tenantId}/readiness`,
      {},
      token,
    );
  },
  activate(token: string, tenantId: string) {
    return apiRequest<TenantSummary>(`/platform/tenants/${tenantId}/activate`, { method: 'POST' }, token);
  },
  suspend(token: string, tenantId: string) {
    return apiRequest<TenantSummary>(`/platform/tenants/${tenantId}/suspend`, { method: 'POST' }, token);
  },
  getSettings(token: string) {
    return apiRequest<{
      defaultPasswordMinLength: number;
      defaultSessionTimeoutMinutes: number;
      maxFailedLogins: number;
    }>('/platform/settings', {}, token);
  },
  updateSettings(token: string, body: Record<string, number>) {
    return apiRequest('/platform/settings', { method: 'PATCH', body: JSON.stringify(body) }, token);
  },
  listLocales(token: string) {
    return apiRequest<{ items: LocaleItem[] }>('/platform/locales', {}, token);
  },
  createLocale(token: string, body: { code: string; name: string; rtl?: boolean }) {
    return apiRequest<LocaleItem>('/platform/locales', { method: 'POST', body: JSON.stringify(body) }, token);
  },
  updateLocale(
    token: string,
    code: string,
    body: { name?: string; rtl?: boolean; active?: boolean },
  ) {
    return apiRequest<LocaleItem>(`/platform/locales/${encodeURIComponent(code)}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }, token);
  },
  deleteLocale(token: string, code: string) {
    return apiRequest<void>(`/platform/locales/${encodeURIComponent(code)}`, { method: 'DELETE' }, token);
  },
  listTranslations(token: string, params?: { locale?: string; q?: string; limit?: number; offset?: number }) {
    const qs = new URLSearchParams();
    if (params?.locale) qs.set('locale', params.locale);
    if (params?.q) qs.set('q', params.q);
    if (params?.limit) qs.set('limit', String(params.limit));
    if (params?.offset) qs.set('offset', String(params.offset));
    const query = qs.toString();
    return apiRequest<{ items: TranslationEntry[]; total: number }>(
      `/platform/translations${query ? `?${query}` : ''}`,
      {},
      token,
    );
  },
  patchTranslation(token: string, body: { locale: string; key: string; value: string }) {
    return apiRequest('/platform/translations', { method: 'PATCH', body: JSON.stringify(body) }, token);
  },
  exportTranslations(token: string) {
    return downloadFile('/platform/translations/export', token, 'translations-export.xlsx');
  },
  importTranslations(token: string, file: File) {
    const form = new FormData();
    form.append('file', file);
    return apiRequest<{ imported: number }>(
      '/platform/translations/import',
      { method: 'POST', body: form },
      token,
    );
  },
  getTranslationBundle(locale: string) {
    return apiRequest<{ locale: string; entries: Record<string, string> }>(
      `/platform/translations/bundle/${locale}`,
      {},
    );
  },
};
