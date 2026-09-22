import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth, USE_MOCK_AUTH } from '../../auth/AuthContext';
import { AppLayout } from '../../components/AppLayout';
import { Modal } from '../../components/Modal';
import { TenantLogo } from '../../components/TenantLogo';
import { useToast } from '../../components/ToastContext';
import { useI18n } from '../../i18n/I18nContext';
import { platformApi, type TenantSummary } from '../../api/platformApi';
import type { AdminUser } from '../../api/adminApi';

const DEFAULT_BRANDING = {
  displayName: '',
  primaryColor: '#1a3560',
  secondaryColor: '#0f2340',
  accentColor: '#43a047',
  footerText: '',
  loginTagline: '',
};

export function PlatformUsersPage() {
  const { token } = useAuth();
  const { t } = useI18n();
  const { showToast } = useToast();
  const [tenants, setTenants] = useState<TenantSummary[]>([]);
  const [tenantId, setTenantId] = useState('');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    ...DEFAULT_BRANDING,
  });

  const loadTenants = useCallback(async () => {
    if (USE_MOCK_AUTH || !token) {
      setTenants([
        {
          id: 'tenant-demo',
          legalName: 'Demo Human Services Agency',
          shortCode: 'DEMO',
          status: 'Active',
          branding: {
            displayName: 'Demo Human Services Agency',
            primaryColor: '#1a5f4a',
            secondaryColor: '#0f2340',
            accentColor: '#43a047',
          },
        },
      ]);
      setTenantId('tenant-demo');
      setLoading(false);
      return;
    }
    const data = await platformApi.listTenants(token);
    setTenants(data.items);
    setTenantId((current) => current || data.items[0]?.id || '');
    setLoading(false);
  }, [token]);

  const selectedTenant = useMemo(() => tenants.find((item) => item.id === tenantId), [tenants, tenantId]);

  const syncBrandingFromTenant = useCallback((tenant: TenantSummary | undefined) => {
    if (!tenant) return;
    const b = tenant.branding;
    setForm((prev) => ({
      ...prev,
      displayName: b?.displayName ?? tenant.legalName,
      primaryColor: b?.primaryColor ?? DEFAULT_BRANDING.primaryColor,
      secondaryColor: b?.secondaryColor ?? DEFAULT_BRANDING.secondaryColor,
      accentColor: b?.accentColor ?? DEFAULT_BRANDING.accentColor,
      footerText: b?.footerText ?? '',
      loginTagline: b?.loginTagline ?? '',
    }));
  }, []);

  const loadUsers = useCallback(async () => {
    if (!tenantId) {
      setUsers([]);
      return;
    }
    if (USE_MOCK_AUTH) {
      setUsers([
        {
          id: 'usr-org-admin',
          email: 'org.admin@demo.example.com',
          name: 'Organization Administrator',
          role: 'organization_admin',
          status: 'Active',
          tenantId,
        },
      ]);
      return;
    }
    if (!token) return;
    const data = await platformApi.listTenantUsers(token, tenantId);
    setUsers(data.items);
  }, [token, tenantId]);

  useEffect(() => {
    loadTenants().catch((err) => showToast(err instanceof Error ? err.message : t('pages.platform.users.loadError'), 'error'));
  }, [loadTenants, showToast, t]);

  useEffect(() => {
    loadUsers().catch((err) => showToast(err instanceof Error ? err.message : t('pages.platform.users.loadError'), 'error'));
  }, [loadUsers, showToast, t]);

  useEffect(() => {
    if (!showCreate) {
      syncBrandingFromTenant(selectedTenant);
    }
  }, [selectedTenant, showCreate, syncBrandingFromTenant]);

  useEffect(() => {
    if (!logoFile) {
      setLogoPreview(null);
      return;
    }
    const url = URL.createObjectURL(logoFile);
    setLogoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [logoFile]);

  async function onDeleteUser(userId: string) {
    if (!token || USE_MOCK_AUTH || !tenantId) return;
    if (!window.confirm(t('pages.platform.users.deleteConfirm'))) return;
    try {
      await platformApi.deleteTenantUser(token, tenantId, userId);
      showToast(t('pages.platform.users.deleteSuccess'), 'success');
      loadUsers();
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('pages.platform.users.deleteError'), 'error');
    }
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!token || !tenantId || USE_MOCK_AUTH) {
      showToast(t('pages.platform.users.mockCreate'), 'warning');
      return;
    }
    try {
      if (logoFile) {
        await platformApi.uploadTenantLogo(token, tenantId, logoFile);
      }
      await platformApi.createTenantOrgAdmin(token, tenantId, {
        email: form.email,
        name: form.name,
        password: form.password,
        branding: {
          displayName: form.displayName || selectedTenant?.legalName,
          primaryColor: form.primaryColor,
          secondaryColor: form.secondaryColor,
          accentColor: form.accentColor,
          footerText: form.footerText,
          loginTagline: form.loginTagline,
        },
      });
      showToast(t('pages.platform.users.createSuccess'), 'success');
      setShowCreate(false);
      setLogoFile(null);
      setForm({
        name: '',
        email: '',
        password: '',
        ...DEFAULT_BRANDING,
      });
      await loadTenants();
      loadUsers();
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('pages.platform.users.createError'), 'error');
    }
  }

  function openCreate() {
    syncBrandingFromTenant(selectedTenant);
    setShowCreate(true);
  }

  const previewBranding = {
    displayName: form.displayName,
    primaryColor: form.primaryColor,
    secondaryColor: form.secondaryColor,
    accentColor: form.accentColor,
    logoUrl: logoPreview ?? selectedTenant?.branding?.logoUrl,
  };

  return (
    <AppLayout
      title={t('pages.platform.users.title')}
      lead={t('pages.platform.users.leadOrgAdmin')}
      navId="platform-users"
    >
      <div className="page-toolbar">
        <div className="form-group" style={{ marginBottom: 0, minWidth: '14rem' }}>
          <label htmlFor="platform-user-tenant">{t('pages.platform.users.tenant')}</label>
          <select
            id="platform-user-tenant"
            value={tenantId}
            onChange={(e) => setTenantId(e.target.value)}
            disabled={loading || tenants.length === 0}
          >
            {tenants.map((tenant) => (
              <option key={tenant.id} value={tenant.id}>
                {tenant.legalName} ({tenant.shortCode})
              </option>
            ))}
          </select>
        </div>
        <button type="button" className="btn btn-primary" disabled={!tenantId} onClick={openCreate}>
          {t('pages.platform.users.create')}
        </button>
      </div>

      {selectedTenant ? (
        <p className="muted">{t('pages.platform.users.lead', { org: selectedTenant.legalName })}</p>
      ) : null}

      <table className="data-table">
        <thead>
          <tr>
            <th>{t('pages.admin.users.colName')}</th>
            <th>{t('pages.admin.users.colEmail')}</th>
            <th>{t('pages.admin.users.colRole')}</th>
            <th>{t('pages.admin.users.colStatus')}</th>
            <th>{t('pages.admin.users.colActions')}</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td>{user.name}</td>
              <td>{user.email}</td>
              <td>{t('role.organization_admin')}</td>
              <td>{user.status}</td>
              <td>
                {!USE_MOCK_AUTH ? (
                  <div className="table-actions">
                    <button type="button" className="btn btn-sm btn-danger" onClick={() => onDeleteUser(user.id)}>
                      {t('pages.admin.users.delete')}
                    </button>
                  </div>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {showCreate ? (
        <Modal open title={t('pages.platform.users.createTitle')} wide onClose={() => setShowCreate(false)}>
          <form onSubmit={onCreate}>
            <div className="form-group">
              <label>{t('pages.platform.users.tenant')}</label>
              <input value={selectedTenant?.legalName ?? ''} readOnly disabled />
            </div>
            <div className="form-group">
              <label>{t('pages.admin.users.role')}</label>
              <input value={t('role.organization_admin')} readOnly disabled />
            </div>
            <div className="form-group">
              <label>{t('pages.admin.users.name')}</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="form-group">
              <label>{t('pages.admin.users.email')}</label>
              <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="form-group">
              <label>{t('pages.admin.users.password')}</label>
              <input
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>

            <h3 className="form-section-title">{t('pages.platform.tenants.sectionBranding')}</h3>
            <div className="branding-preview-row">
              <TenantLogo
                branding={previewBranding}
                alt={form.displayName || selectedTenant?.legalName || t('shell.organization')}
                className="branding-preview-logo"
                fallbackClassName="branding-preview-logo-fallback"
              />
              <div className="tenant-color-swatches" aria-hidden="true">
                <span style={{ background: form.primaryColor }} />
                <span style={{ background: form.secondaryColor }} />
                <span style={{ background: form.accentColor }} />
              </div>
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

            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>
                {t('common.cancel')}
              </button>
              <button type="submit" className="btn btn-primary">
                {t('pages.platform.users.createSubmit')}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
    </AppLayout>
  );
}
