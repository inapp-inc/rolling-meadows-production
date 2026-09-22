import type { TenantBranding } from '../api/client';
import { resolveLogoUrl } from '../branding/applyBranding';
import { withBasePath } from '../utils/basePath';

type TenantLogoProps = {
  branding?: TenantBranding | null;
  alt: string;
  className?: string;
  fallbackClassName?: string;
};

export function TenantLogo({ branding, alt, className, fallbackClassName }: TenantLogoProps) {
  const logoSrc = resolveLogoUrl(branding?.logoUrl);
  if (logoSrc) {
    return <img src={logoSrc} alt={alt} className={className} loading="lazy" decoding="async" />;
  }
  return (
    <span className={fallbackClassName ?? className} aria-hidden="true">
      {branding?.displayName?.charAt(0) ?? alt.charAt(0)}
    </span>
  );
}

export function defaultFallbackLogo(className?: string) {
  return <img src={withBasePath('/assets/logo.svg')} alt="" className={className} />;
}
