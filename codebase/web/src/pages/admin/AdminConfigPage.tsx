import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useAuth, USE_MOCK_AUTH } from '../../auth/AuthContext';
import { AppLayout } from '../../components/AppLayout';
import { TenantLogo } from '../../components/TenantLogo';
import { useToast } from '../../components/ToastContext';
import { useI18n } from '../../i18n/I18nContext';
import { adminApi } from '../../api/adminApi';
import { applyBranding } from '../../branding/applyBranding';

export function AdminConfigPage() {
  const { token, user, refreshUser } = useAuth();
  const { t } = useI18n();
  const { showToast } = useToast();
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [config, setConfig] = useState({
    displayName: '',
    primaryColor: '#1a3560',
    secondaryColor: '#0f2340',
    accentColor: '#43a047',
    footerText: '',
    loginTagline: '',
    logoUrl: '',
    defaultLocale: 'en',
    duplicateThreshold: 25,
    retentionYears: 7,
  });

  const load = useCallback(async () => {
    if (USE_MOCK_AUTH) {
      const branding = user?.tenant?.branding;
      setConfig({
        displayName: branding?.displayName ?? user?.tenant?.displayName ?? 'Organization',
        primaryColor: branding?.primaryColor ?? '#1a3560',
        secondaryColor: branding?.secondaryColor ?? '#0f2340',
        accentColor: branding?.accentColor ?? '#43a047',
        footerText: branding?.footerText ?? '',
        loginTagline: branding?.loginTagline ?? '',
        logoUrl: branding?.logoUrl ?? '',
        defaultLocale: 'en',
        duplicateThreshold: 25,
        retentionYears: 7,
      });
      return;
    }
    if (!token) return;
    const data = await adminApi.getConfig(token);
    setConfig({
      displayName: data.branding?.display_name ?? data.legalName,
      primaryColor: data.branding?.primary_color ?? '#1a3560',
      secondaryColor: data.branding?.secondary_color ?? '#0f2340',
      accentColor: data.branding?.accent_color ?? '#43a047',
      footerText: data.branding?.footer_text ?? '',
      loginTagline: data.branding?.login_tagline ?? '',
      logoUrl: data.branding?.logo_url ?? '',
      defaultLocale: data.defaultLocale,
      duplicateThreshold: (data.config?.duplicate_threshold as number) ?? 25,
      retentionYears: (data.config?.retention_years as number) ?? 7,
    });
  }, [token, user]);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  useEffect(() => {
    if (!logoFile) {
      setLogoPreview(null);
      return;
    }
    const url = URL.createObjectURL(logoFile);
    setLogoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [logoFile]);

  const previewBranding = {
    displayName: config.displayName,
    primaryColor: config.primaryColor,
    secondaryColor: config.secondaryColor,
    accentColor: config.accentColor,
    footerText: config.footerText,
    logoUrl: logoPreview ?? config.logoUrl,
  };

  useEffect(() => {
    applyBranding(previewBranding);
  }, [
    config.displayName,
    config.primaryColor,
    config.secondaryColor,
    config.accentColor,
    config.footerText,
    config.logoUrl,
    logoPreview,
  ]);

  useEffect(() => {
    return () => {
      applyBranding(user?.tenant?.branding ?? null);
    };
  }, [user?.tenant?.branding]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token || USE_MOCK_AUTH) {
      showToast(t('pages.admin.config.mockSaved'), 'warning');
      return;
    }
    try {
      let savedLogoUrl = config.logoUrl;
      if (logoFile) {
        const uploaded = await adminApi.uploadBrandingLogo(token, logoFile);
        savedLogoUrl = uploaded.logoUrl;
        setConfig((prev) => ({ ...prev, logoUrl: uploaded.logoUrl }));
        setLogoFile(null);
      }
      await adminApi.updateConfig(token, {
        branding: {
          display_name: config.displayName,
          primary_color: config.primaryColor,
          secondary_color: config.secondaryColor,
          accent_color: config.accentColor,
          footer_text: config.footerText || `© ${config.displayName}`,
          login_tagline: config.loginTagline,
        },
        defaultLocale: config.defaultLocale,
        duplicateThreshold: config.duplicateThreshold,
        retentionYears: config.retentionYears,
      });
      await refreshUser();
      applyBranding({
        displayName: config.displayName,
        primaryColor: config.primaryColor,
        secondaryColor: config.secondaryColor,
        accentColor: config.accentColor,
        footerText: config.footerText,
        logoUrl: savedLogoUrl,
      });
      showToast(t('pages.admin.config.saved'), 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('pages.admin.config.saveError'), 'error');
    }
  }

  return (
    <AppLayout title={t('pages.admin.config.title')} navId="admin-config">
      <form className="card form-card" onSubmit={onSubmit}>
        <h3 className="form-section-title">{t('pages.admin.config.brandingSection')}</h3>
        <div className="branding-preview-row">
          <TenantLogo branding={previewBranding} alt={config.displayName} className="branding-preview-logo" fallbackClassName="branding-preview-logo-fallback" />
        </div>
        <div className="form-group">
          <label>{t('pages.admin.config.displayName')}</label>
          <input value={config.displayName} onChange={(e) => setConfig({ ...config, displayName: e.target.value })} />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>{t('pages.admin.config.primaryColor')}</label>
            <input type="color" value={config.primaryColor} onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })} />
          </div>
          <div className="form-group">
            <label>{t('pages.admin.config.secondaryColor')}</label>
            <input type="color" value={config.secondaryColor} onChange={(e) => setConfig({ ...config, secondaryColor: e.target.value })} />
          </div>
          <div className="form-group">
            <label>{t('pages.admin.config.accentColor')}</label>
            <input type="color" value={config.accentColor} onChange={(e) => setConfig({ ...config, accentColor: e.target.value })} />
          </div>
        </div>
        <div className="form-group">
          <label>{t('pages.admin.config.footerText')}</label>
          <input value={config.footerText} onChange={(e) => setConfig({ ...config, footerText: e.target.value })} />
        </div>
        <div className="form-group">
          <label>{t('pages.admin.config.loginTagline')}</label>
          <input value={config.loginTagline} onChange={(e) => setConfig({ ...config, loginTagline: e.target.value })} />
        </div>
        <div className="form-group">
          <label>{t('pages.admin.config.logo')}</label>
          <input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)} />
        </div>

        <h3 className="form-section-title">{t('pages.admin.config.settingsSection')}</h3>
        <div className="form-group">
          <label>{t('pages.admin.config.defaultLocale')}</label>
          <select value={config.defaultLocale} onChange={(e) => setConfig({ ...config, defaultLocale: e.target.value })}>
            <option value="en">English</option>
            <option value="es">Español</option>
          </select>
        </div>
        <div className="form-group">
          <label>{t('pages.admin.config.duplicateThreshold')}</label>
          <input type="number" min={0} max={100} value={config.duplicateThreshold} onChange={(e) => setConfig({ ...config, duplicateThreshold: Number(e.target.value) })} />
        </div>
        <div className="form-group">
          <label>{t('pages.admin.config.retentionYears')}</label>
          <input type="number" min={1} max={30} value={config.retentionYears} onChange={(e) => setConfig({ ...config, retentionYears: Number(e.target.value) })} />
        </div>
        <div className="form-actions">
          <button type="submit" className="btn btn-primary">{t('common.save')}</button>
        </div>
      </form>
    </AppLayout>
  );
}
