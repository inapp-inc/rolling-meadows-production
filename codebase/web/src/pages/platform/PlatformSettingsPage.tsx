import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useAuth, USE_MOCK_AUTH } from '../../auth/AuthContext';
import { AppLayout } from '../../components/AppLayout';
import { useToast } from '../../components/ToastContext';
import { useI18n } from '../../i18n/I18nContext';
import { platformApi } from '../../api/platformApi';

export function PlatformSettingsPage() {
  const { token } = useAuth();
  const { t } = useI18n();
  const { showToast } = useToast();
  const [settings, setSettings] = useState({
    defaultPasswordMinLength: 8,
    defaultSessionTimeoutMinutes: 480,
    maxFailedLogins: 5,
  });

  const load = useCallback(async () => {
    if (USE_MOCK_AUTH || !token) return;
    try {
      const data = await platformApi.getSettings(token);
      setSettings(data);
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('pages.platform.settings.loadError'), 'error');
    }
  }, [token, showToast, t]);

  useEffect(() => {
    load();
  }, [load]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token || USE_MOCK_AUTH) {
      showToast(t('pages.platform.settings.mockSaved'), 'warning');
      return;
    }
    try {
      await platformApi.updateSettings(token, settings);
      showToast(t('pages.platform.settings.saved'), 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('pages.platform.settings.saveError'), 'error');
    }
  }

  return (
    <AppLayout title={t('pages.platform.settings.title')} navId="platform-settings">
      <form className="card form-card" onSubmit={onSubmit}>
        <div className="form-group">
          <label>{t('pages.platform.settings.passwordMinLength')}</label>
          <input
            type="number"
            min={8}
            value={settings.defaultPasswordMinLength}
            onChange={(e) => setSettings({ ...settings, defaultPasswordMinLength: Number(e.target.value) })}
          />
        </div>
        <div className="form-group">
          <label>{t('pages.platform.settings.sessionTimeout')}</label>
          <input
            type="number"
            min={15}
            value={settings.defaultSessionTimeoutMinutes}
            onChange={(e) => setSettings({ ...settings, defaultSessionTimeoutMinutes: Number(e.target.value) })}
          />
        </div>
        <div className="form-group">
          <label>{t('pages.platform.settings.maxFailedLogins')}</label>
          <input
            type="number"
            min={3}
            value={settings.maxFailedLogins}
            onChange={(e) => setSettings({ ...settings, maxFailedLogins: Number(e.target.value) })}
          />
        </div>
        <div className="form-actions">
          <button type="submit" className="btn btn-primary">
            {t('common.save')}
          </button>
        </div>
      </form>
    </AppLayout>
  );
}
