import type { TenantBranding } from '../api/client';

type BrandingRecord = TenantBranding & {
  display_name?: string;
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  footer_text?: string;
  logo_url?: string;
  login_tagline?: string;
};

/** Normalize API branding payloads (camelCase or snake_case) for UI use. */
export function normalizeBranding(raw?: BrandingRecord | Record<string, string> | null): TenantBranding | null {
  if (!raw) return null;
  const record = raw as BrandingRecord;
  return {
    displayName: record.displayName ?? record.display_name,
    primaryColor: record.primaryColor ?? record.primary_color,
    secondaryColor: record.secondaryColor ?? record.secondary_color,
    accentColor: record.accentColor ?? record.accent_color,
    footerText: record.footerText ?? record.footer_text,
    logoUrl: record.logoUrl ?? record.logo_url,
    loginTagline: record.loginTagline ?? record.login_tagline,
  };
}
