import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth, USE_MOCK_AUTH } from '../../auth/AuthContext';
import { AppLayout } from '../../components/AppLayout';
import { useI18n } from '../../i18n/I18nContext';
import { adminApi } from '../../api/adminApi';

export function AdminDashboardPage() {
  const { token, user } = useAuth();
  const { t } = useI18n();
  const [stats, setStats] = useState({ userCount: 0, openCaseCount: 0, recentAudit: [] as { action?: string; timestamp?: string }[] });

  const load = useCallback(async () => {
    if (USE_MOCK_AUTH) {
      setStats({ userCount: 6, openCaseCount: 12, recentAudit: [] });
      return;
    }
    if (!token) return;
    const data = await adminApi.dashboard(token);
    setStats(data);
  }, [token]);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  return (
    <AppLayout title={t('pages.admin.dashboard.title')} navId="admin-dashboard">
      <p className="lead">{t('pages.admin.dashboard.lead', { org: user?.tenant?.displayName ?? user?.tenant?.legalName ?? '—' })}</p>
      <div className="stat-grid">
        <div className="card stat-card">
          <h3>{t('pages.admin.dashboard.users')}</h3>
          <p className="stat-value">{stats.userCount}</p>
        </div>
        <div className="card stat-card">
          <h3>{t('pages.admin.dashboard.openCases')}</h3>
          <p className="stat-value">{stats.openCaseCount}</p>
        </div>
      </div>
      <section className="card">
        <h3>{t('pages.admin.dashboard.quickLinks')}</h3>
        <ul>
          <li><Link to="/admin/users">{t('nav.adminUsers')}</Link></li>
          <li><Link to="/admin/config">{t('nav.adminConfig')}</Link></li>
          <li><Link to="/admin/labels">{t('nav.adminLabels')}</Link></li>
          <li><Link to="/admin/audit">{t('nav.adminAudit')}</Link></li>
        </ul>
      </section>
    </AppLayout>
  );
}
