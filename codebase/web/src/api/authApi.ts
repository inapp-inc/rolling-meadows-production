import { apiRequest } from './http';

export interface AuthLocaleItem {
  code: string;
  name: string;
  rtl: boolean;
}

export interface AuthLocalesResponse {
  defaultLocale: string;
  items: AuthLocaleItem[];
}

export const authApi = {
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
