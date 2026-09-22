import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth, USE_MOCK_AUTH } from '../../auth/AuthContext';
import { AppLayout } from '../../components/AppLayout';
import { Modal } from '../../components/Modal';
import { useToast } from '../../components/ToastContext';
import { useI18n } from '../../i18n/I18nContext';
import { adminApi, type AdminUser } from '../../api/adminApi';
import type { UserRole } from '../../api/client';

const TENANT_ASSIGNABLE_ROLES: UserRole[] = [
  'organization_admin',
  'supervisor',
  'case_manager',
  'cross_program_liaison',
  'auditor',
];

const ORG_ADMIN_ASSIGNABLE_ROLES: UserRole[] = [
  'supervisor',
  'case_manager',
  'cross_program_liaison',
  'auditor',
];

const PROTECTED_FROM_TENANT_ADMIN: UserRole[] = ['tenant_admin'];
const PROTECTED_FROM_ORG_ADMIN: UserRole[] = ['tenant_admin', 'organization_admin'];

function assignableRolesFor(creatorRole?: UserRole): UserRole[] {
  if (creatorRole === 'tenant_admin') return TENANT_ASSIGNABLE_ROLES;
  if (creatorRole === 'organization_admin') return ORG_ADMIN_ASSIGNABLE_ROLES;
  return [];
}

function canManageUser(actorRole?: UserRole, targetRole?: UserRole, targetId?: string, actorId?: string): boolean {
  if (targetId && actorId && targetId === actorId) return false;
  if (!actorRole || !targetRole) return false;
  if (actorRole === 'tenant_admin') return !PROTECTED_FROM_TENANT_ADMIN.includes(targetRole);
  if (actorRole === 'organization_admin') return !PROTECTED_FROM_ORG_ADMIN.includes(targetRole);
  return false;
}

export function AdminUsersPage() {
  const { token, user: currentUser } = useAuth();
  const { t } = useI18n();
  const { showToast } = useToast();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    email: '',
    name: '',
    role: 'case_manager' as UserRole,
    password: '',
  });

  const assignableRoles = useMemo(
    () => assignableRolesFor(currentUser?.role),
    [currentUser?.role],
  );

  const canCreateUsers = assignableRoles.length > 0;

  const load = useCallback(async () => {
    if (USE_MOCK_AUTH) {
      const tenantId = currentUser?.tenantId ?? 'tenant-demo';
      const mockUsers: AdminUser[] = [
        { id: 'usr-org-admin', email: 'org.admin@demo.example.com', name: 'Organization Administrator', role: 'organization_admin', status: 'Active', tenantId },
        { id: 'usr-case-manager', email: 'case.manager@demo.example.com', name: 'Case Manager', role: 'case_manager', status: 'Active', tenantId },
        { id: 'usr-supervisor', email: 'supervisor@demo.example.com', name: 'Supervisor', role: 'supervisor', status: 'Active', tenantId },
      ];
      const operational = new Set<UserRole>(['supervisor', 'case_manager', 'cross_program_liaison', 'auditor']);
      const scoped = mockUsers.filter((u) => u.tenantId === tenantId && operational.has(u.role as UserRole));
      setUsers(currentUser?.role === 'organization_admin' ? scoped : mockUsers.filter((u) => u.tenantId === tenantId && u.role !== 'platform_admin'));
      return;
    }
    if (!token || !currentUser?.tenantId) return;
    const data = await adminApi.listUsers(token);
    const items = data.items.filter(
      (u) => u.tenantId === currentUser.tenantId && u.role !== 'platform_admin',
    );
    setUsers(items);
  }, [token, currentUser?.tenantId, currentUser?.role]);

  useEffect(() => {
    load().catch((err) => showToast(err instanceof Error ? err.message : t('pages.admin.users.loadError'), 'error'));
  }, [load, showToast, t]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!token || USE_MOCK_AUTH) {
      showToast(t('pages.admin.users.mockCreate'), 'warning');
      return;
    }
    try {
      await adminApi.createUser(token, form);
      showToast(t('pages.admin.users.createSuccess'), 'success');
      setShowCreate(false);
      setForm({ email: '', name: '', role: 'case_manager', password: '' });
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('pages.admin.users.createError'), 'error');
    }
  }

  async function onDeactivate(userId: string) {
    if (!token || USE_MOCK_AUTH) return;
    if (!window.confirm(t('pages.admin.users.deactivateConfirm'))) return;
    try {
      await adminApi.updateUser(token, userId, { status: 'Inactive' });
      showToast(t('pages.admin.users.deactivateSuccess'), 'success');
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('pages.admin.users.deactivateError'), 'error');
    }
  }

  async function onDelete(userId: string) {
    if (!token || USE_MOCK_AUTH) return;
    if (!window.confirm(t('pages.admin.users.deleteConfirm'))) return;
    try {
      await adminApi.deleteUser(token, userId);
      showToast(t('pages.admin.users.deleteSuccess'), 'success');
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('pages.admin.users.deleteError'), 'error');
    }
  }

  const orgName =
    currentUser?.tenant?.branding?.displayName ??
    currentUser?.tenant?.displayName ??
    currentUser?.tenant?.legalName ??
    t('shell.organization');

  return (
    <AppLayout
      title={t('pages.admin.administration.title')}
      lead={t('pages.admin.users.leadOrg', { org: orgName })}
      navId="admin-users"
    >
      <div className="page-toolbar">
        {canCreateUsers ? (
          <button type="button" className="btn btn-primary" onClick={() => setShowCreate(true)}>
            {t('pages.admin.users.create')}
          </button>
        ) : null}
      </div>
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
          {users.map((u) => (
            <tr key={u.id}>
              <td>{u.name}</td>
              <td>{u.email}</td>
              <td>{t(`role.${u.role}`)}</td>
              <td>{u.status}</td>
              <td>
                {canManageUser(currentUser?.role, u.role as UserRole, u.id, currentUser?.id) ? (
                  <div className="table-actions">
                    {u.status === 'Active' ? (
                      <button type="button" className="btn btn-sm btn-ghost" onClick={() => onDeactivate(u.id)}>
                        {t('pages.admin.users.deactivate')}
                      </button>
                    ) : null}
                    <button type="button" className="btn btn-sm btn-danger" onClick={() => onDelete(u.id)}>
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
        <Modal open title={t('pages.admin.users.createTitle')} onClose={() => setShowCreate(false)}>
          <form onSubmit={onCreate}>
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
            <div className="form-group">
              <label>{t('pages.admin.users.role')}</label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}>
                {assignableRoles.map((role) => (
                  <option key={role} value={role}>
                    {t(`role.${role}`)}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setShowCreate(false)}>
                {t('common.cancel')}
              </button>
              <button type="submit" className="btn btn-primary">
                {t('pages.admin.users.createSubmit')}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
    </AppLayout>
  );
}
