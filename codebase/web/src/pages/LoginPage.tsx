import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/authApi';
import type { TenantBranding } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { applyBranding, clearBranding } from '../branding/applyBranding';
import { PRODUCT_BRANDING, PRODUCT_NAME, productLogoUrl } from '../branding/productBranding';
import { TenantLogo } from '../components/TenantLogo';
import { useI18n } from '../i18n/I18nContext';
import { LocaleSwitcher } from '../i18n/LocaleSwitcher';

export function LoginPage() {
  const { login } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginScope, setLoginScope] = useState<'product' | 'platform' | 'tenant'>('product');
  const [tenantBranding, setTenantBranding] = useState<TenantBranding | null>(null);
  const [orgName, setOrgName] = useState<string | null>(null);

  useEffect(() => {
    if (loginScope === 'tenant' && tenantBranding) {
      applyBranding(tenantBranding);
    } else {
      applyBranding(PRODUCT_BRANDING);
    }
    return () => clearBranding();
  }, [loginScope, tenantBranding]);

  useEffect(() => {
    const trimmed = email.trim();
    if (!trimmed.includes('@')) {
      setLoginScope('product');
      setTenantBranding(null);
      setOrgName(null);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      authApi
        .getLoginPreview(trimmed)
        .then((response) => {
          if (cancelled) return;
          if (response.scope === 'tenant') {
            setLoginScope('tenant');
            setTenantBranding(response.branding);
            setOrgName(response.branding.displayName ?? response.legalName);
            return;
          }
          setLoginScope(response.scope === 'platform' ? 'platform' : 'product');
          setTenantBranding(null);
          setOrgName(null);
        })
        .catch(() => {
          if (cancelled) return;
          setLoginScope('product');
          setTenantBranding(null);
          setOrgName(null);
        });
    }, 400);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [email]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email.trim(), password);
      navigate(user.landingPath, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('signIn.loginFailed'));
    } finally {
      setLoading(false);
    }
  }

  const showCommunityOne = loginScope !== 'tenant';
  const heroTitle = showCommunityOne
    ? t('signIn.heroTitleProduct', { product: PRODUCT_NAME })
    : t('signIn.heroTitleForOrg', { org: orgName ?? t('signIn.defaultOrgName') });
  const heroTagline = showCommunityOne
    ? loginScope === 'platform'
      ? t('signIn.heroTaglinePlatform')
      : t('signIn.heroTaglineProduct')
    : tenantBranding?.loginTagline || t('signIn.heroTaglineOrg');

  return (
    <div className="sign-in-page">
      <section className="sign-in-hero" aria-label={t('signIn.welcomeAria')}>
        <div className="sign-in-hero-content">
          {showCommunityOne ? (
            <img src={productLogoUrl()} alt={PRODUCT_NAME} className="hero-logo hero-logo-product" />
          ) : (
            <TenantLogo
              branding={tenantBranding}
              alt={orgName ?? t('shell.organization')}
              className="hero-logo hero-logo-org"
              fallbackClassName="hero-logo-fallback"
            />
          )}
          <h1>{heroTitle}</h1>
          <p className="hero-tagline">{heroTagline}</p>
          {showCommunityOne ? (
            <ul className="sign-in-features">
              <li>{t('signIn.feature1')}</li>
              <li>{t('signIn.feature2')}</li>
              <li>{t('signIn.feature3')}</li>
            </ul>
          ) : null}
          {showCommunityOne ? (
            <p className="hero-powered-by">{t('signIn.poweredBy', { product: PRODUCT_NAME })}</p>
          ) : (
            <p className="hero-powered-by">{t('signIn.poweredBy', { product: PRODUCT_NAME })}</p>
          )}
        </div>
      </section>

      <section className="sign-in-panel">
        <div className="sign-in-card">
          <div className="sign-in-card-top">
            <div>
              {showCommunityOne ? (
                <>
                  <h2 id="sign-in-title">{t('signIn.title')}</h2>
                  <p className="subtitle">
                    {loginScope === 'platform' ? t('signIn.subtitlePlatformAdmin') : t('signIn.subtitleCredentials')}
                  </p>
                </>
              ) : (
                <div className="sign-in-org-badge">
                  <TenantLogo
                    branding={tenantBranding}
                    alt={orgName ?? t('shell.organization')}
                    className="sign-in-org-logo"
                    fallbackClassName="sign-in-org-logo-fallback"
                  />
                  <div>
                    <h2 id="sign-in-title">{t('signIn.title')}</h2>
                    <p className="subtitle">{orgName ?? t('signIn.defaultOrgName')}</p>
                  </div>
                </div>
              )}
            </div>
            <LocaleSwitcher compact />
          </div>

          <form id="sign-in-form" onSubmit={onSubmit}>
            <div className="form-group">
              <label htmlFor="email-input">{t('signIn.emailLabel')}</label>
              <input
                id="email-input"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="password-input">{t('signIn.passwordLabel')}</label>
              <input
                id="password-input"
                type="password"
                autoComplete="current-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error ? (
              <div className="alert alert-danger" role="alert">
                {error}
              </div>
            ) : null}
            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? t('signIn.signingIn') : t('signIn.signInButton')}
              </button>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}
