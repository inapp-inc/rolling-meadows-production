import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useAuth, USE_MOCK_AUTH } from '../../auth/AuthContext';
import { AppLayout } from '../../components/AppLayout';
import { useToast } from '../../components/ToastContext';
import { useI18n } from '../../i18n/I18nContext';
import { adminApi } from '../../api/adminApi';

export function AdminConfigPage() {
  const { token, user } = useAuth();
  const { t } = useI18n();
  const { showToast } = useToast();
  const [config, setConfig] = useState({
    displayName: '',
    primaryColor: '#1a5f4a',
    defaultLocale: 'en',
    duplicateThreshold: 25,
    retentionYears: 7,
  });

  const load = useCallback(async () => {
    if (USE_MOCK_AUTH) {
      setConfig({
        displayName: user?.tenant?.displayName ?? 'Rolling Meadows Human Services',
        primaryColor: '#1a5f4a',
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
      primaryColor: data.branding?.primary_color ?? '#1a5f4a',
      defaultLocale: data.defaultLocale,
      duplicateThreshold: (data.config?.duplicate_threshold as number) ?? 25,
      retentionYears: (data.config?.retention_years as number) ?? 7,
    });
  }, [token, user]);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token || USE_MOCK_AUTH) {
      showToast(t('pages.admin.config.mockSaved'), 'warning');
      return;
    }
    try {
      await adminApi.updateConfig(token, {
        branding: { display_name: config.displayName, primary_color: config.primaryColor },
        defaultLocale: config.defaultLocale,
        duplicateThreshold: config.duplicateThreshold,
        retentionYears: config.retentionYears,
      });
      showToast(t('pages.admin.config.saved'), 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('pages.admin.config.saveError'), 'error');
    }
  }

  return (
    <AppLayout title={t('pages.admin.config.title')} navId="admin-config">
      <form className="card form-card" onSubmit={onSubmit}>
        <div className="form-group">
          <label>{t('pages.admin.config.displayName')}</label>
          <input value={config.displayName} onChange={(e) => setConfig({ ...config, displayName: e.target.value })} />
        </div>
        <div className="form-group">
          <label>{t('pages.admin.config.primaryColor')}</label>
          <input type="color" value={config.primaryColor} onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })} />
        </div>
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
