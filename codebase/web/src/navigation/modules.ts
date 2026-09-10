import type { UserRole } from '../api/client';

export type NavItem = {
  id: string;
  /** Dotted i18n key, resolved with `t()` at render time. */
  labelKey: string;
  path: string;
  roles: UserRole[];
  children?: NavItem[];
};

export type ModuleDef = {
  id: string;
  labelKey: string;
  roles: UserRole[];
  items: NavItem[];
};

export type GlobalNavItem = {
  id: string;
  labelKey: string;
  path: string;
  roles: UserRole[];
};

export const GLOBAL_NAV: GlobalNavItem[] = [
  { id: 'dashboard', labelKey: 'nav.dashboard', path: '/dashboard', roles: ['case_manager', 'supervisor', 'organization_admin'] },
];

const MODULES: ModuleDef[] = [
  {
    id: 'platform',
    labelKey: 'module.platform',
    roles: ['platform_admin'],
    items: [
      { id: 'platform-tenants', labelKey: 'nav.platformTenants', path: '/platform/tenants', roles: ['platform_admin'] },
      { id: 'platform-translations', labelKey: 'nav.platformTranslations', path: '/platform/translations', roles: ['platform_admin'] },
      { id: 'platform-settings', labelKey: 'nav.platformSettings', path: '/platform/settings', roles: ['platform_admin'] },
    ],
  },
  {
    id: 'administration',
    labelKey: 'module.administration',
    roles: ['tenant_admin', 'organization_admin'],
    items: [
      { id: 'admin-dashboard', labelKey: 'nav.adminDashboard', path: '/admin', roles: ['tenant_admin', 'organization_admin'] },
      { id: 'admin-users', labelKey: 'nav.adminUsers', path: '/admin/users', roles: ['tenant_admin', 'organization_admin'] },
      { id: 'admin-config', labelKey: 'nav.adminConfig', path: '/admin/config', roles: ['tenant_admin', 'organization_admin'] },
      { id: 'admin-labels', labelKey: 'nav.adminLabels', path: '/admin/labels', roles: ['tenant_admin', 'organization_admin'] },
      { id: 'admin-audit', labelKey: 'nav.adminAudit', path: '/admin/audit', roles: ['tenant_admin', 'organization_admin'] },
    ],
  },
  {
    id: 'analytics',
    labelKey: 'module.analytics',
    roles: ['case_manager', 'supervisor', 'auditor', 'organization_admin'],
    items: [
      {
        id: 'standard-reports',
        labelKey: 'nav.standardReports',
        path: '/reports',
        roles: ['case_manager', 'supervisor', 'auditor', 'organization_admin'],
        children: [
          { id: 'reports-caseload', labelKey: 'nav.reportsCaseload', path: '/reports?tier=caseload', roles: ['case_manager', 'supervisor', 'organization_admin'] },
          { id: 'reports-executive', labelKey: 'nav.reportsExecutive', path: '/reports?tier=executive', roles: ['case_manager', 'supervisor', 'organization_admin'] },
          { id: 'reports-integrity', labelKey: 'nav.reportsIntegrity', path: '/reports?tier=integrity', roles: ['case_manager', 'supervisor', 'auditor', 'organization_admin'] },
          { id: 'reports-operational', labelKey: 'nav.reportsOperational', path: '/reports?tier=operational', roles: ['case_manager', 'supervisor', 'organization_admin'] },
        ],
      },
      { id: 'custom-reports', labelKey: 'nav.customReports', path: '/reports/custom', roles: ['case_manager', 'supervisor', 'organization_admin'] },
    ],
  },
  {
    id: 'cases',
    labelKey: 'module.cases',
    roles: ['case_manager', 'supervisor', 'organization_admin'],
    items: [
      { id: 'case-search', labelKey: 'nav.caseSearch', path: '/cases/search', roles: ['case_manager', 'supervisor', 'organization_admin'] },
      { id: 'case-creation', labelKey: 'nav.caseCreation', path: '/cases/new', roles: ['case_manager', 'supervisor', 'organization_admin'] },
    ],
  },
  {
    id: 'clients',
    labelKey: 'module.clients',
    roles: ['case_manager', 'supervisor', 'cross_program_liaison', 'organization_admin'],
    items: [
      { id: 'client-registration', labelKey: 'nav.clientRegistration', path: '/clients/register', roles: ['case_manager', 'supervisor', 'organization_admin'] },
      { id: 'client-search', labelKey: 'nav.clientSearch', path: '/clients/search', roles: ['case_manager', 'supervisor', 'organization_admin'] },
      { id: 'admin-duplicates', labelKey: 'nav.adminDuplicates', path: '/clients/duplicates', roles: ['supervisor', 'organization_admin'] },
      { id: 'liaison-lookup', labelKey: 'nav.liaisonLookup', path: '/liaison', roles: ['cross_program_liaison'] },
    ],
  },
  {
    id: 'documents',
    labelKey: 'module.documents',
    roles: ['case_manager', 'supervisor', 'organization_admin'],
    items: [{ id: 'documents-hub', labelKey: 'nav.documentsHub', path: '/documents', roles: ['case_manager', 'supervisor', 'organization_admin'] }],
  },
  {
    id: 'services',
    labelKey: 'module.services',
    roles: ['case_manager', 'supervisor', 'organization_admin'],
    items: [
      { id: 'services-hub', labelKey: 'nav.servicesHub', path: '/services', roles: ['case_manager', 'supervisor', 'organization_admin'] },
      { id: 'bulk-enroll', labelKey: 'nav.bulkEnroll', path: '/services/bulk-enroll', roles: ['case_manager', 'supervisor', 'organization_admin'] },
    ],
  },
  {
    id: 'workflow',
    labelKey: 'module.workflow',
    roles: ['case_manager', 'supervisor', 'organization_admin'],
    items: [{ id: 'workflow-hub', labelKey: 'nav.workflowHub', path: '/workflow', roles: ['case_manager', 'supervisor', 'organization_admin'] }],
  },
];

const NAV_TO_MODULE: Record<string, string | null> = {
  dashboard: null,
  'platform-tenants': 'platform',
  'platform-translations': 'platform',
  'platform-settings': 'platform',
  'admin-dashboard': 'administration',
  'admin-users': 'administration',
  'admin-config': 'administration',
  'admin-labels': 'administration',
  'admin-audit': 'administration',
  'case-search': 'cases',
  'case-creation': 'cases',
  'case-workspace': 'cases',
  'client-registration': 'clients',
  'client-search': 'clients',
  'client-profile': 'clients',
  'admin-duplicates': 'clients',
  'liaison-lookup': 'clients',
  'documents-hub': 'documents',
  'workflow-hub': 'workflow',
  'services-hub': 'services',
  'bulk-enroll': 'services',
  'standard-reports': 'analytics',
  'reports-caseload': 'analytics',
  'reports-executive': 'analytics',
  'reports-operational': 'analytics',
  'reports-integrity': 'analytics',
  'custom-reports': 'analytics',
};

const NAV_LABEL_KEYS: Record<string, string> = {
  // Pages that are reachable but not themselves sidebar entries.
  'case-workspace': 'htmlTitle.case-workspace',
  'client-profile': 'htmlTitle.client-profile',
  'referral-intake': 'nav.referralIntake',
  'report-builder': 'nav.reportBuilder',
};

function registerNavLabels(items: NavItem[]) {
  for (const item of items) {
    NAV_LABEL_KEYS[item.id] = item.labelKey;
    if (item.children) registerNavLabels(item.children);
  }
}

GLOBAL_NAV.forEach((item) => {
  NAV_LABEL_KEYS[item.id] = item.labelKey;
});
for (const mod of MODULES) {
  registerNavLabels(mod.items);
}

export function globalNavForRole(role: UserRole): GlobalNavItem[] {
  return GLOBAL_NAV.filter((item) => item.roles.includes(role));
}

export function modulesForRole(role: UserRole): ModuleDef[] {
  if (role === 'platform_admin') return MODULES.filter((m) => m.id === 'platform');
  if (role === 'tenant_admin') return MODULES.filter((m) => m.id === 'administration');
  if (role === 'organization_admin') {
    const operational = MODULES.filter(
      (m) => m.roles.includes('organization_admin') && m.id !== 'administration',
    );
    const admin = MODULES.filter((m) => m.id === 'administration');
    return [...operational, ...admin];
  }
  if (role === 'cross_program_liaison') return MODULES.filter((m) => m.id === 'clients');
  if (role === 'auditor') return MODULES.filter((m) => m.id === 'analytics');
  return MODULES.filter((m) => m.roles.includes(role) && !['platform', 'administration'].includes(m.id));
}

export function navItemsForRole(module: ModuleDef, role: UserRole): NavItem[] {
  return module.items
    .filter((item) => item.roles.includes(role))
    .map((item) => {
      if (!item.children) return item;
      const children = item.children.filter((child) => child.roles.includes(role));
      return children.length ? { ...item, children } : { ...item, children: undefined };
    })
    .filter((item) => !item.children || item.children.length > 0);
}

export function resolveActiveNav(pathname: string, search = ''): string {
  const tier = new URLSearchParams(search).get('tier');
  if (pathname.startsWith('/dashboard')) return 'dashboard';
  if (pathname.startsWith('/platform/tenants')) return 'platform-tenants';
  if (pathname.startsWith('/platform/translations')) return 'platform-translations';
  if (pathname.startsWith('/platform/settings')) return 'platform-settings';
  if (pathname === '/admin') return 'admin-dashboard';
  if (pathname.startsWith('/admin/users')) return 'admin-users';
  if (pathname.startsWith('/admin/config')) return 'admin-config';
  if (pathname.startsWith('/admin/labels')) return 'admin-labels';
  if (pathname.startsWith('/admin/audit')) return 'admin-audit';
  if (pathname.startsWith('/reports/custom')) return 'custom-reports';
  if (pathname.startsWith('/reports')) {
    if (tier === 'executive') return 'reports-executive';
    if (tier === 'operational') return 'reports-operational';
    if (tier === 'integrity') return 'reports-integrity';
    return 'reports-caseload';
  }
  if (pathname.startsWith('/cases/new')) return 'case-creation';
  // Referral intake is step 2 of case creation, so it keeps that nav highlighted.
  if (pathname.startsWith('/cases/intake')) return 'case-creation';
  if (pathname.startsWith('/cases/search')) return 'case-search';
  if (pathname.match(/^\/cases\/[^/]+/)) return 'case-workspace';
  if (pathname.startsWith('/clients/register')) return 'client-registration';
  if (pathname.startsWith('/clients/search')) return 'client-search';
  if (pathname.startsWith('/clients/duplicates')) return 'admin-duplicates';
  if (pathname.startsWith('/clients/')) return 'client-profile';
  if (pathname.startsWith('/liaison')) return 'liaison-lookup';
  if (pathname.startsWith('/documents')) return 'documents-hub';
  if (pathname.startsWith('/workflow')) return 'workflow-hub';
  if (pathname.startsWith('/services/bulk-enroll')) return 'bulk-enroll';
  if (pathname.startsWith('/services')) return 'services-hub';
  return 'dashboard';
}

export function moduleForNav(navId: string): string | undefined {
  const mod = NAV_TO_MODULE[navId];
  return mod ?? undefined;
}

export function resolveActiveModule(activeNav: string, modules: ModuleDef[]): string {
  if (activeNav === 'dashboard') return modules[0]?.id ?? 'cases';
  for (const mod of modules) {
    for (const item of mod.items) {
      if (item.id === activeNav) return mod.id;
      if (item.children?.some((child) => child.id === activeNav)) return mod.id;
    }
  }
  const mapped = moduleForNav(activeNav);
  if (mapped) return mapped;
  return modules[0]?.id ?? 'cases';
}

/** i18n key for a nav id's page title; falls back to a humanised id. */
export function pageTitleKeyForNav(navId: string): string {
  return NAV_LABEL_KEYS[navId] ?? navId.replace(/-/g, ' ');
}

export function moduleLabelKey(moduleId: string): string {
  return MODULES.find((m) => m.id === moduleId)?.labelKey ?? moduleId;
}

export function roleLabelKey(role: string): string {
  return `role.${role}`;
}

export const ROLE_INITIALS: Record<string, string> = {
  platform_admin: 'PA',
  tenant_admin: 'TA',
  organization_admin: 'OA',
  case_manager: 'CM',
  supervisor: 'SD',
  cross_program_liaison: 'CL',
  auditor: 'AU',
};
