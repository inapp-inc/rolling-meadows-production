import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth, USE_MOCK_AUTH } from '../../auth/AuthContext';
import { AppLayout } from '../../components/AppLayout';
import { TenantLogo } from '../../components/TenantLogo';
import { useToast } from '../../components/ToastContext';
import { useI18n } from '../../i18n/I18nContext';
import { platformApi, type TenantSummary } from '../../api/platformApi';

const DEFAULT_BRANDING = {
  primaryColor: '#1a3560',
  secondaryColor: '#0f2340',
  accentColor: '#43a047',
};

export function PlatformTenantConfigurePage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const { token } = useAuth();
  const { t } = useI18n();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [tenant, setTenant] = useState<TenantSummary | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [orgAdminEmail, setOrgAdminEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);
  const [form, setForm] = useState({
    legalName: '',
    shortCode: '',
    displayName: '',
    primaryColor: DEFAULT_BRANDING.primaryColor,
    secondaryColor: DEFAULT_BRANDING.secondaryColor,
    accentColor: DEFAULT_BRANDING.accentColor,
    footerText: '',
    loginTagline: '',
    logoUrl: '',
    defaultLocale: 'en',
    duplicateThreshold: 25,
    retentionYears: 7,
  });

  const load = useCallback(async () => {
    if (!tenantId) return;
    if (USE_MOCK_AUTH) {
      setTenant({
        id: tenantId,
        legalName: 'Demo Human Services Agency',
        shortCode: 'DEMO',
        status: 'Active',
        branding: {
          displayName: 'Demo Human Services Agency',
          primaryColor: '#1a5f4a',
          secondaryColor: '#0f2340',
          accentColor: '#43a047',
          logoUrl: '/assets/logo.svg',
        },
        config: { duplicate_threshold: 25, retention_years: 7 },
      });
      return;
    }
    if (!token) return;
    const data = await platformApi.getTenant(token, tenantId);
    setTenant(data);
    setOrgAdminEmail(data.primaryOrgAdminEmail ?? '');
    const cfg = data.config as { duplicate_threshold?: number; retention_years?: number } | undefined;
    setForm({
      legalName: data.legalName,
      shortCode: data.shortCode,
      displayName: data.branding?.displayName ?? data.legalName,
      primaryColor: data.branding?.primaryColor ?? DEFAULT_BRANDING.primaryColor,
      secondaryColor: data.branding?.secondaryColor ?? DEFAULT_BRANDING.secondaryColor,
      accentColor: data.branding?.accentColor ?? DEFAULT_BRANDING.accentColor,
      footerText: data.branding?.footerText ?? '',
      loginTagline: data.branding?.loginTagline ?? '',
      logoUrl: data.branding?.logoUrl ?? '',
      defaultLocale: data.defaultLocale ?? 'en',
      duplicateThreshold: cfg?.duplicate_threshold ?? 25,
      retentionYears: cfg?.retention_years ?? 7,
    });
  }, [tenantId, token]);

  useEffect(() => {
    load().catch((err) => showToast(err instanceof Error ? err.message : t('pages.platform.tenants.loadError'), 'error'));
  }, [load, showToast, t]);

  useEffect(() => {
    if (!logoFile) {
      setLogoPreview(null);
      return;
    }
    const url = URL.createObjectURL(logoFile);
    setLogoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [logoFile]);

  async function onResetPassword(e: FormEvent) {
    e.preventDefault();
    if (!token || !tenantId || !newPassword.trim()) return;
    setResettingPassword(true);
    try {
      const result = await platformApi.resetTenantOrgAdminPassword(token, tenantId, {
        newPassword: newPassword.trim(),
        email: orgAdminEmail || undefined,
      });
      setOrgAdminEmail(result.email);
      setNewPassword('');
      showToast(t('pages.platform.tenants.resetPasswordSuccess'), 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('pages.platform.tenants.resetPasswordError'), 'error');
    } finally {
      setResettingPassword(false);
    }
  }

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!token || !tenantId) return;
    try {
      if (logoFile) {
        const uploaded = await platformApi.uploadTenantLogo(token, tenantId, logoFile);
        setForm((prev) => ({ ...prev, logoUrl: uploaded.logoUrl }));
        setLogoFile(null);
      }
      await platformApi.updateTenant(token, tenantId, {
        legalName: form.legalName,
        defaultLocale: form.defaultLocale,
        duplicateThreshold: form.duplicateThreshold,
        retentionYears: form.retentionYears,
        branding: {
          displayName: form.displayName || form.legalName,
          primaryColor: form.primaryColor,
          secondaryColor: form.secondaryColor,
          accentColor: form.accentColor,
          footerText: form.footerText || `© ${form.displayName || form.legalName}`,
          loginTagline: form.loginTagline,
        },
      });
      showToast(t('pages.platform.tenants.updateSuccess'), 'success');
      navigate('/platform/tenants');
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('pages.platform.tenants.updateError'), 'error');
    }
  }

  const previewBranding = {
    displayName: form.displayName,
    primaryColor: form.primaryColor,
    secondaryColor: form.secondaryColor,
    accentColor: form.accentColor,
    logoUrl: logoPreview ?? form.logoUrl,
  };

  return (
    <AppLayout
      title={form.legalName || t('pages.platform.tenants.configurePageTitle')}
      lead={t('pages.platform.tenants.configureLead')}
      navId="platform-tenants"
    >
      <p className="page-toolbar">
        <Link to="/platform/tenants" className="btn btn-secondary btn-sm">
          {t('pages.platform.tenants.backToList')}
        </Link>
        {tenant ? (
          <span className={`status-badge status-${tenant.status.toLowerCase()}`} style={{ marginLeft: '0.75rem' }}>
            {tenant.status}
          </span>
        ) : null}
      </p>

      <form className="card form-card" onSubmit={onSave}>
        <h3 className="form-section-title">{t('pages.platform.tenants.sectionBranding')}</h3>
        <div className="branding-preview-row">
          <TenantLogo
            branding={previewBranding}
            alt={form.displayName || form.legalName}
            className="branding-preview-logo"
            fallbackClassName="branding-preview-logo-fallback"
          />
        </div>
        <div className="form-group">
          <label>{t('pages.admin.config.displayName')}</label>
          <input value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>{t('pages.admin.config.primaryColor')}</label>
            <input type="color" value={form.primaryColor} onChange={(e) => setForm({ ...form, primaryColor: e.target.value })} />
          </div>
          <div className="form-group">
            <label>{t('pages.admin.config.secondaryColor')}</label>
            <input type="color" value={form.secondaryColor} onChange={(e) => setForm({ ...form, secondaryColor: e.target.value })} />
          </div>
          <div className="form-group">
            <label>{t('pages.admin.config.accentColor')}</label>
            <input type="color" value={form.accentColor} onChange={(e) => setForm({ ...form, accentColor: e.target.value })} />
          </div>
        </div>
        <div className="form-group">
          <label>{t('pages.admin.config.footerText')}</label>
          <input value={form.footerText} onChange={(e) => setForm({ ...form, footerText: e.target.value })} />
        </div>
        <div className="form-group">
          <label>{t('pages.admin.config.loginTagline')}</label>
          <input value={form.loginTagline} onChange={(e) => setForm({ ...form, loginTagline: e.target.value })} />
        </div>
        <div className="form-group">
          <label>{t('pages.admin.config.logo')}</label>
          <input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)} />
        </div>

        <h3 className="form-section-title">{t('pages.platform.tenants.sectionSettings')}</h3>
        <div className="form-group">
          <label>{t('pages.platform.tenants.shortCode')}</label>
          <input value={form.shortCode} readOnly disabled />
        </div>
        <div className="form-group">
          <label>{t('pages.admin.config.defaultLocale')}</label>
          <select value={form.defaultLocale} onChange={(e) => setForm({ ...form, defaultLocale: e.target.value })}>
            <option value="en">English</option>
            <option value="es">Español</option>
          </select>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>{t('pages.admin.config.duplicateThreshold')}</label>
            <input
              type="number"
              min={0}
              max={100}
              value={form.duplicateThreshold}
              onChange={(e) => setForm({ ...form, duplicateThreshold: Number(e.target.value) })}
            />
          </div>
          <div className="form-group">
            <label>{t('pages.admin.config.retentionYears')}</label>
            <input
              type="number"
              min={1}
              max={30}
              value={form.retentionYears}
              onChange={(e) => setForm({ ...form, retentionYears: Number(e.target.value) })}
            />
          </div>
        </div>

        <p className="form-hint">{t('pages.platform.tenants.configureHint')}</p>

        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/platform/tenants')}>
            {t('common.cancel')}
          </button>
          <button type="submit" className="btn btn-primary">
            {t('common.save')}
          </button>
        </div>
      </form>

      <form className="card form-card" onSubmit={onResetPassword}>
        <h3 className="form-section-title">{t('pages.platform.tenants.sectionOrgAdmin')}</h3>
        <div className="form-group">
          <label>{t('pages.platform.tenants.adminEmail')}</label>
          <input value={orgAdminEmail} readOnly disabled />
        </div>
        {!USE_MOCK_AUTH && orgAdminEmail ? (
          <>
            <div className="form-group">
              <label>{t('pages.platform.tenants.newPassword')}</label>
              <input
                type="password"
                minLength={8}
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-secondary" disabled={resettingPassword || newPassword.length < 8}>
                {t('pages.platform.tenants.resetPassword')}
              </button>
            </div>
          </>
        ) : null}
      </form>
    </AppLayout>
  );
}
