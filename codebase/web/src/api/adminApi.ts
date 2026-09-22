import { apiRequest, downloadFile } from './http';
import type { UserRole } from './client';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  tenantId?: string | null;
  programId?: string | null;
  status: string;
  lastLoginAt?: string;
  createdAt?: string;
}

export interface TenantConfig {
  legalName: string;
  shortCode: string;
  status: string;
  timezone?: string;
  defaultLocale: string;
  enabledLocales: string[];
  branding: Record<string, string>;
  config: Record<string, unknown>;
}

export interface AuditEntry {
  action: string;
  actorId?: string;
  timestamp?: string;
  resourceType?: string;
  resourceId?: string;
  detail?: Record<string, unknown>;
}

export const adminApi = {
  dashboard(token: string) {
    return apiRequest<{ userCount: number; openCaseCount: number; recentAudit: AuditEntry[] }>(
      '/admin/dashboard',
      {},
      token,
    );
  },
  listUsers(token: string) {
    return apiRequest<{ items: AdminUser[] }>('/admin/users', {}, token);
  },
  createUser(
    token: string,
    body: { email: string; name: string; role: string; password: string; programId?: string | null },
  ) {
    return apiRequest<AdminUser>('/admin/users', { method: 'POST', body: JSON.stringify(body) }, token);
  },
  updateUser(token: string, userId: string, body: Partial<AdminUser>) {
    return apiRequest<AdminUser>(
      `/admin/users/${userId}`,
      { method: 'PATCH', body: JSON.stringify(body) },
      token,
    );
  },
  deleteUser(token: string, userId: string) {
    return apiRequest<void>(`/admin/users/${userId}`, { method: 'DELETE' }, token);
  },
  getConfig(token: string) {
    return apiRequest<TenantConfig>('/admin/config', {}, token);
  },
  updateConfig(token: string, body: Record<string, unknown>) {
    return apiRequest<TenantConfig>('/admin/config', { method: 'PATCH', body: JSON.stringify(body) }, token);
  },
  uploadBrandingLogo(token: string, file: File) {
    const form = new FormData();
    form.append('file', file);
    return apiRequest<{ logoUrl: string }>('/admin/branding/logo', { method: 'POST', body: form }, token);
  },
  listTranslations(token: string, params?: { locale?: string; q?: string; limit?: number; offset?: number }) {
    const qs = new URLSearchParams();
    if (params?.locale) qs.set('locale', params.locale);
    if (params?.q) qs.set('q', params.q);
    if (params?.limit) qs.set('limit', String(params.limit));
    if (params?.offset) qs.set('offset', String(params.offset));
    const query = qs.toString();
    return apiRequest<{ items: { key: string; namespace: string; values: Record<string, string> }[]; total: number }>(
      `/admin/translations${query ? `?${query}` : ''}`,
      {},
      token,
    );
  },
  listLocales(token: string) {
    return apiRequest<{ items: { code: string; name: string; rtl: boolean; active: boolean }[] }>(
      '/admin/locales',
      {},
      token,
    );
  },
  createLocale(token: string, body: { code: string; name: string; rtl?: boolean }) {
    return apiRequest('/admin/locales', { method: 'POST', body: JSON.stringify(body) }, token);
  },
  updateLocale(
    token: string,
    code: string,
    body: { name?: string; rtl?: boolean; active?: boolean },
  ) {
    return apiRequest(`/admin/locales/${encodeURIComponent(code)}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }, token);
  },
  deleteLocale(token: string, code: string) {
    return apiRequest<void>(`/admin/locales/${encodeURIComponent(code)}`, { method: 'DELETE' }, token);
  },
  patchTranslation(token: string, body: { locale: string; key: string; value: string }) {
    return apiRequest('/admin/translations', { method: 'PATCH', body: JSON.stringify(body) }, token);
  },
  exportTranslations(token: string) {
    return downloadFile('/admin/translations/export', token, 'labels-export.xlsx');
  },
  importTranslations(token: string, file: File) {
    const form = new FormData();
    form.append('file', file);
    return apiRequest<{ imported: number }>('/admin/translations/import', { method: 'POST', body: form }, token);
  },
  listOverrides(token: string, locale?: string) {
    const qs = locale ? `?locale=${encodeURIComponent(locale)}` : '';
    return apiRequest<{ items: { key: string; locale: string; value: string }[] }>(
      `/admin/translations/overrides${qs}`,
      {},
      token,
    );
  },
  patchOverride(token: string, body: { locale: string; key: string; value: string }) {
    return apiRequest('/admin/translations/overrides', { method: 'PATCH', body: JSON.stringify(body) }, token);
  },
  exportOverrides(token: string) {
    return downloadFile('/admin/translations/overrides/export', token, 'tenant-labels-export.xlsx');
  },
  importOverrides(token: string, file: File) {
    const form = new FormData();
    form.append('file', file);
    return apiRequest<{ imported: number }>(
      '/admin/translations/overrides/import',
      { method: 'POST', body: form },
      token,
    );
  },
  auditLog(token: string, limit = 50) {
    return apiRequest<{ items: AuditEntry[] }>(`/admin/audit-log?limit=${limit}`, {}, token);
  },
  getTenantTranslationBundle(token: string, locale: string) {
    return apiRequest<{ locale: string; entries: Record<string, string> }>(
      `/admin/translations/bundle/${locale}`,
      {},
      token,
    );
  },
};
