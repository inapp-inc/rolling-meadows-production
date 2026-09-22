import type { TenantBranding } from './client';
import { apiRequest } from './http';

export interface PublicBrandingResponse {
  organizationCode: string;
  legalName: string;
  status: string;
  branding: TenantBranding;
}

export interface AuthLocaleItem {
  code: string;
  name: string;
  rtl: boolean;
}

export interface AuthLocalesResponse {
  defaultLocale: string;
  items: AuthLocaleItem[];
}

export type BrandingByEmailResponse = {
  legalName: string;
  shortCode: string;
  status: string;
  branding: TenantBranding;
};

export type LoginPreviewResponse =
  | { scope: 'product' | 'platform'; productName: string }
  | ({ scope: 'tenant' } & BrandingByEmailResponse);

export const authApi = {
  getBranding(organizationCode: string) {
    const qs = `?organizationCode=${encodeURIComponent(organizationCode)}`;
    return apiRequest<PublicBrandingResponse>(`/auth/branding${qs}`, {});
  },
  getBrandingByEmail(email: string) {
    const qs = `?email=${encodeURIComponent(email)}`;
    return apiRequest<BrandingByEmailResponse>(`/auth/branding/by-email${qs}`, {});
  },
  getLoginPreview(email: string) {
    const qs = `?email=${encodeURIComponent(email)}`;
    return apiRequest<LoginPreviewResponse>(`/auth/login-preview${qs}`, {});
  },
  listLocales(organizationCode?: string) {
    const qs = organizationCode ? `?organizationCode=${encodeURIComponent(organizationCode)}` : '';
    return apiRequest<AuthLocalesResponse>(`/auth/locales${qs}`, {});
  },
  getTranslationBundle(locale: string) {
    return apiRequest<{ locale: string; entries: Record<string, string> }>(
      `/auth/translations/bundle/${encodeURIComponent(locale)}`,
      {},
    );
  },
};
