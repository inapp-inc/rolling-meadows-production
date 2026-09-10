import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { USE_MOCK_AUTH } from '../../auth/AuthContext';
import { AppLayout } from '../../components/AppLayout';
import { Modal } from '../../components/Modal';
import { useToast } from '../../components/ToastContext';
import { useI18n } from '../../i18n/I18nContext';
import { platformApi, type TenantSummary, type ReadinessCheck } from '../../api/platformApi';

export function PlatformTenantsPage() {
  const { token } = useAuth();
  const { t } = useI18n();
  const { showToast } = useToast();
  const [tenants, setTenants] = useState<TenantSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [readiness, setReadiness] = useState<{ tenantId: string; checks: ReadinessCheck[] } | null>(null);
  const [form, setForm] = useState({
    legalName: '',
    shortCode: '',
    adminEmail: '',
    adminName: '',
    defaultLocale: 'en',
  });

  const load = useCallback(async () => {
    if (USE_MOCK_AUTH || !token) {
      setTenants([
        {
          id: 'tenant-rolling-meadows',
          legalName: 'Rolling Meadows Human Services',
          shortCode: 'RMHS',
          status: 'Active',
          userCount: 6,
          activeCaseCount: 12,
        },
      ]);
      setLoading(false);
      return;
    }
    try {
      const data = await platformApi.listTenants(token);
      setTenants(data.items);
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('pages.platform.tenants.loadError'), 'error');
    } finally {
      setLoading(false);
    }
  }, [token, showToast, t]);

  useEffect(() => {
    load();
  }, [load]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    try {
      await platformApi.createTenant(token, form);
      showToast(t('pages.platform.tenants.createSuccess'), 'success');
      setShowCreate(false);
      setForm({ legalName: '', shortCode: '', adminEmail: '', adminName: '', defaultLocale: 'en' });
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('pages.platform.tenants.createError'), 'error');
    }
  }

  async function onActivate(tenantId: string) {
    if (!token || USE_MOCK_AUTH) return;
    try {
      const r = await platformApi.readiness(token, tenantId);
      setReadiness({ tenantId, checks: r.checks });
      if (!r.ready) {
        showToast(t('pages.platform.tenants.notReady'), 'warning');
        return;
      }
      await platformApi.activate(token, tenantId);
      showToast(t('pages.platform.tenants.activateSuccess'), 'success');
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('pages.platform.tenants.activateError'), 'error');
    }
  }

  async function onSuspend(tenantId: string) {
    if (!token || USE_MOCK_AUTH) return;
    if (!window.confirm(t('pages.platform.tenants.suspendConfirm'))) return;
    try {
      await platformApi.suspend(token, tenantId);
      showToast(t('pages.platform.tenants.suspendSuccess'), 'success');
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('pages.platform.tenants.suspendError'), 'error');
    }
  }

  return (
    <AppLayout title={t('pages.platform.tenants.title')} navId="platform-tenants">
      <div className="page-toolbar">
        <button type="button" className="btn btn-primary" onClick={() => setShowCreate(true)}>
          {t('pages.platform.tenants.create')}
        </button>
      </div>

      {loading ? (
        <p className="muted">{t('common.loading')}</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>{t('pages.platform.tenants.colName')}</th>
              <th>{t('pages.platform.tenants.colCode')}</th>
              <th>{t('pages.platform.tenants.colStatus')}</th>
              <th>{t('pages.platform.tenants.colUsers')}</th>
              <th>{t('pages.platform.tenants.colCases')}</th>
              <th>{t('pages.platform.tenants.colActions')}</th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((tenant) => (
              <tr key={tenant.id}>
                <td>{tenant.legalName}</td>
                <td>{tenant.shortCode}</td>
                <td>
                  <span className={`status-badge status-${tenant.status.toLowerCase()}`}>{tenant.status}</span>
                </td>
                <td>{tenant.userCount ?? '—'}</td>
                <td>{tenant.activeCaseCount ?? '—'}</td>
                <td>
                  {tenant.status === 'Draft' ? (
                    <button type="button" className="btn btn-sm btn-secondary" onClick={() => onActivate(tenant.id)}>
                      {t('pages.platform.tenants.activate')}
                    </button>
                  ) : null}
                  {tenant.status === 'Active' ? (
                    <button type="button" className="btn btn-sm btn-ghost" onClick={() => onSuspend(tenant.id)}>
                      {t('pages.platform.tenants.suspend')}
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showCreate ? (
        <Modal open title={t('pages.platform.tenants.createTitle')} onClose={() => setShowCreate(false)}>
          <form onSubmit={onCreate}>
            <div className="form-group">
              <label>{t('pages.platform.tenants.legalName')}</label>
              <input required value={form.legalName} onChange={(e) => setForm({ ...form, legalName: e.target.value })} />
            </div>
            <div className="form-group">
              <label>{t('pages.platform.tenants.shortCode')}</label>
              <input required value={form.shortCode} onChange={(e) => setForm({ ...form, shortCode: e.target.value.toUpperCase() })} />
            </div>
            <div className="form-group">
              <label>{t('pages.platform.tenants.adminName')}</label>
              <input required value={form.adminName} onChange={(e) => setForm({ ...form, adminName: e.target.value })} />
            </div>
            <div className="form-group">
              <label>{t('pages.platform.tenants.adminEmail')}</label>
              <input type="email" required value={form.adminEmail} onChange={(e) => setForm({ ...form, adminEmail: e.target.value })} />
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setShowCreate(false)}>
                {t('common.cancel')}
              </button>
              <button type="submit" className="btn btn-primary">
                {t('pages.platform.tenants.createSubmit')}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {readiness ? (
        <Modal open title={t('pages.platform.tenants.readinessTitle')} onClose={() => setReadiness(null)}>
          <ul>
            {readiness.checks.map((c) => (
              <li key={c.id}>
                {c.passed ? '✓' : '✗'} {c.label}
              </li>
            ))}
          </ul>
        </Modal>
      ) : null}
    </AppLayout>
  );
}
