import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { USE_MOCK_AUTH } from '../../auth/AuthContext';
import { applyBranding } from '../../branding/applyBranding';
import { PRODUCT_BRANDING } from '../../branding/productBranding';
import { AppLayout } from '../../components/AppLayout';
import { Modal } from '../../components/Modal';
import { TenantLogo } from '../../components/TenantLogo';
import { useToast } from '../../components/ToastContext';
import { useI18n } from '../../i18n/I18nContext';
import { platformApi, type TenantSummary, type ReadinessCheck } from '../../api/platformApi';

const DEFAULT_BRANDING = {
  displayName: '',
  primaryColor: '#1a3560',
  secondaryColor: '#0f2340',
  accentColor: '#43a047',
  footerText: '',
  loginTagline: '',
};

const DEFAULT_SETTINGS = {
  defaultLocale: 'en',
  duplicateThreshold: 25,
  retentionYears: 7,
};

/** Demo tenant seeded in API — not deletable */
const PROTECTED_TENANT_ID = 'tenant-demo';

function emptyCreateForm() {
  return {
    legalName: '',
    shortCode: '',
    adminEmail: '',
    adminName: '',
    adminPassword: '',
    ...DEFAULT_SETTINGS,
    ...DEFAULT_BRANDING,
  };
}

export function PlatformTenantsPage() {
  const { token } = useAuth();
  const { t } = useI18n();
  const { showToast } = useToast();
  const [tenants, setTenants] = useState<TenantSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [readiness, setReadiness] = useState<{ tenantId: string; checks: ReadinessCheck[] } | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [form, setForm] = useState(emptyCreateForm);

  const load = useCallback(async () => {
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
            logoUrl: '/assets/logo.svg',
          },
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

  useEffect(() => {
    if (!logoFile) {
      setLogoPreview(null);
      return;
    }
    const url = URL.createObjectURL(logoFile);
    setLogoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [logoFile]);

  const createPreviewBranding = {
    displayName: form.displayName || form.legalName,
    primaryColor: form.primaryColor,
    secondaryColor: form.secondaryColor,
    accentColor: form.accentColor,
    footerText: form.footerText,
    loginTagline: form.loginTagline,
    logoUrl: logoPreview ?? '',
  };

  useEffect(() => {
    if (!showCreate) return;
    applyBranding(createPreviewBranding);
    return () => {
      applyBranding(PRODUCT_BRANDING);
    };
  }, [showCreate, form.displayName, form.legalName, form.primaryColor, form.secondaryColor, form.accentColor, logoPreview]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    try {
      const created = await platformApi.createTenant(token, {
        legalName: form.legalName,
        shortCode: form.shortCode,
        defaultLocale: form.defaultLocale,
        adminEmail: form.adminEmail,
        adminName: form.adminName,
        adminPassword: form.adminPassword,
        branding: {
          displayName: form.displayName || form.legalName,
          primaryColor: form.primaryColor,
          secondaryColor: form.secondaryColor,
          accentColor: form.accentColor,
          footerText: form.footerText || `© ${form.displayName || form.legalName}`,
          loginTagline: form.loginTagline,
        },
        config: {
          duplicateThreshold: form.duplicateThreshold,
          retentionYears: form.retentionYears,
        },
      });
      if (logoFile) {
        await platformApi.uploadTenantLogo(token, created.id, logoFile);
      }
      showToast(t('pages.platform.tenants.createSuccess'), 'success');
      setShowCreate(false);
      setLogoFile(null);
      setLogoPreview(null);
      setForm(emptyCreateForm());
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

  async function onDeleteTenant(id: string, legalName: string) {
    if (!token || USE_MOCK_AUTH) return;
    if (id === PROTECTED_TENANT_ID) {
      showToast(t('pages.platform.tenants.deleteProtected'), 'warning');
      return;
    }
    if (!window.confirm(t('pages.platform.tenants.deleteConfirm', { org: legalName }))) return;
    try {
      await platformApi.deleteTenant(token, id);
      showToast(t('pages.platform.tenants.deleteSuccess'), 'success');
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('pages.platform.tenants.deleteError'), 'error');
    }
  }

  return (
    <AppLayout
      title={t('pages.platform.administration.title')}
      lead={t('pages.platform.administration.lead', { product: t('shell.platformBrand') })}
      navId="platform-tenants"
    >
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
              <th>{t('pages.platform.tenants.colOrgAdminEmail')}</th>
              <th>{t('pages.platform.tenants.colBranding')}</th>
              <th>{t('pages.platform.tenants.colStatus')}</th>
              <th>{t('pages.platform.tenants.colActions')}</th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((tenant) => (
              <tr key={tenant.id}>
                <td>
                  <Link to={`/platform/tenants/${tenant.id}`}>{tenant.legalName}</Link>
                </td>
                <td>{tenant.shortCode}</td>
                <td>{tenant.primaryOrgAdminEmail ?? '—'}</td>
                <td>
                  <div className="tenant-brand-cell">
                    <TenantLogo
                      branding={tenant.branding}
                      alt={tenant.branding?.displayName ?? tenant.legalName}
                      className="tenant-brand-logo"
                      fallbackClassName="tenant-brand-logo-fallback"
                    />
                    <div className="tenant-color-swatches" aria-hidden="true">
                      <span style={{ background: tenant.branding?.primaryColor ?? '#1a3560' }} title="Primary" />
                      <span style={{ background: tenant.branding?.secondaryColor ?? '#0f2340' }} title="Secondary" />
                      <span style={{ background: tenant.branding?.accentColor ?? '#43a047' }} title="Accent" />
                    </div>
                  </div>
                </td>
                <td>
                  <span className={`status-badge status-${tenant.status.toLowerCase()}`}>{tenant.status}</span>
                </td>
                <td className="tenant-list-actions-cell">
                  <div className="tenant-table-actions">
                    <div className="tenant-table-actions-primary">
                      <Link to={`/platform/tenants/${tenant.id}`} className="btn btn-sm btn-secondary">
                        {t('pages.platform.tenants.configure')}
                      </Link>
                      {tenant.status === 'Draft' ? (
                        <button type="button" className="btn btn-sm btn-secondary" onClick={() => onActivate(tenant.id)}>
                          {t('pages.platform.tenants.activate')}
                        </button>
                      ) : null}
                      {tenant.status === 'Active' ? (
                        <button type="button" className="btn btn-sm btn-secondary tenant-action-suspend" onClick={() => onSuspend(tenant.id)}>
                          {t('pages.platform.tenants.suspend')}
                        </button>
                      ) : null}
                    </div>
                    {tenant.id !== PROTECTED_TENANT_ID ? (
                      <button
                        type="button"
                        className="btn btn-sm tenant-action-delete"
                        title={t('pages.platform.tenants.delete')}
                        onClick={() => onDeleteTenant(tenant.id, tenant.legalName)}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                          <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m1 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z" />
                          <path d="M10 11v6M14 11v6" />
                        </svg>
                        <span>{t('pages.platform.tenants.delete')}</span>
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showCreate ? (
        <Modal open title={t('pages.platform.tenants.createTitle')} wide onClose={() => setShowCreate(false)}>
          <form onSubmit={onCreate}>
            <h3 className="form-section-title">{t('pages.platform.tenants.sectionOrganization')}</h3>
            <div className="form-group">
              <label>{t('pages.platform.tenants.legalName')}</label>
              <input
                required
                value={form.legalName}
                onChange={(e) => setForm({ ...form, legalName: e.target.value, displayName: form.displayName || e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>{t('pages.platform.tenants.shortCode')}</label>
              <input
                required
                value={form.shortCode}
                onChange={(e) => setForm({ ...form, shortCode: e.target.value.toUpperCase() })}
              />
            </div>

            <h3 className="form-section-title">{t('pages.platform.tenants.sectionBranding')}</h3>
            <div className="branding-preview-row">
              <TenantLogo
                branding={createPreviewBranding}
                alt={form.displayName || form.legalName || t('shell.organization')}
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
              <input
                value={form.footerText}
                placeholder={`© ${form.displayName || form.legalName || t('pages.admin.config.displayName')}`}
                onChange={(e) => setForm({ ...form, footerText: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>{t('pages.admin.config.loginTagline')}</label>
              <input
                value={form.loginTagline}
                placeholder={t('signIn.heroTaglineOrg')}
                onChange={(e) => setForm({ ...form, loginTagline: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>{t('pages.admin.config.logo')}</label>
              <input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)} />
            </div>

            <h3 className="form-section-title">{t('pages.platform.tenants.sectionSettings')}</h3>
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

            <h3 className="form-section-title">{t('pages.platform.tenants.sectionTenantAdmin')}</h3>
            <div className="form-group">
              <label>{t('pages.platform.tenants.adminName')}</label>
              <input required value={form.adminName} onChange={(e) => setForm({ ...form, adminName: e.target.value })} />
            </div>
            <div className="form-group">
              <label>{t('pages.platform.tenants.adminEmail')}</label>
              <input type="email" required value={form.adminEmail} onChange={(e) => setForm({ ...form, adminEmail: e.target.value })} />
            </div>
            <div className="form-group">
              <label>{t('pages.platform.tenants.adminPassword')}</label>
              <input
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={form.adminPassword}
                onChange={(e) => setForm({ ...form, adminPassword: e.target.value })}
              />
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>
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
