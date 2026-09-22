import type { TenantBranding } from '../api/client';
import { withBasePath } from '../utils/basePath';

/** Platform product identity (not tenant-specific). */
export const PRODUCT_NAME = 'Case Management Platform';

export const PRODUCT_BRANDING: TenantBranding = {
  displayName: PRODUCT_NAME,
  primaryColor: '#2563eb',
  secondaryColor: '#1e40af',
  accentColor: '#059669',
  footerText: `© ${PRODUCT_NAME}`,
  logoUrl: '/assets/platform-logo.svg',
};

export function productLogoUrl(): string {
  return withBasePath(PRODUCT_BRANDING.logoUrl ?? '/assets/platform-logo.svg');
}
