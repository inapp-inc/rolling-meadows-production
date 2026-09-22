import type { TenantBranding } from '../api/client';
import { withBasePath } from '../utils/basePath';
import { darkenColor, lightenColor, mixColors } from './colorUtils';
import { PRODUCT_NAME } from './productBranding';

const DEFAULT_PAGE_TITLE = `${PRODUCT_NAME}`;

export function resolveLogoUrl(logoUrl?: string | null): string | null {
  if (!logoUrl) return null;
  if (logoUrl.startsWith('http://') || logoUrl.startsWith('https://') || logoUrl.startsWith('data:') || logoUrl.startsWith('blob:')) {
    return logoUrl;
  }
  return withBasePath(logoUrl.startsWith('/') ? logoUrl : `/${logoUrl}`);
}

export function applyBranding(branding?: TenantBranding | null) {
  const root = document.documentElement;
  const primary = branding?.primaryColor ?? '#1a3560';
  const secondary = branding?.secondaryColor ?? '#0f2340';
  const accent = branding?.accentColor ?? '#43a047';

  root.style.setProperty('--color-primary', primary);
  root.style.setProperty('--color-primary-dark', secondary);
  root.style.setProperty('--color-primary-mid', mixColors(primary, secondary, 45));
  root.style.setProperty('--color-primary-light', lightenColor(primary, 88));

  root.style.setProperty('--color-brand-green', accent);
  root.style.setProperty('--color-brand-green-light', lightenColor(accent, 32));
  root.style.setProperty('--color-brand-green-dark', darkenColor(accent, 18));

  root.style.setProperty('--color-accent', accent);
  root.style.setProperty('--color-accent-light', lightenColor(accent, 90));

  const accentRgb = /^#?([0-9a-f]{6})$/i.exec(accent.trim());
  if (accentRgb) {
    const value = parseInt(accentRgb[1], 16);
    const r = (value >> 16) & 255;
    const g = (value >> 8) & 255;
    const b = value & 255;
    root.style.setProperty('--focus-ring', `0 0 0 3px rgba(${r}, ${g}, ${b}, 0.35)`);
  }

  const orgName = branding?.displayName?.trim();
  document.title = orgName ? `${orgName} — ${PRODUCT_NAME}` : DEFAULT_PAGE_TITLE;
}

export function clearBranding() {
  applyBranding(null);
  document.title = DEFAULT_PAGE_TITLE;
}
