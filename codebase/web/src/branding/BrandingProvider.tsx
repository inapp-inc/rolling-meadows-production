import { useEffect, type ReactNode } from 'react';
import { useAuth } from '../auth/AuthContext';
import { applyBranding } from './applyBranding';
import { PRODUCT_BRANDING } from './productBranding';

export function BrandingProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  useEffect(() => {
    if (user?.role === 'platform_admin') {
      applyBranding(PRODUCT_BRANDING);
      return;
    }
    applyBranding(user?.tenant?.branding ?? PRODUCT_BRANDING);
  }, [user]);

  return children;
}
