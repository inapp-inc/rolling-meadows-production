import type { UserRole } from '../api/client';

/** Capability flags per role, mirroring the prototype's `RM.Permissions`. */
const PERMISSIONS: Record<string, Record<string, boolean>> = {
  platform_admin: {
    managePlatform: true,
    manageTenants: true,
    manageTranslations: true,
    resetDemo: false,
  },
  tenant_admin: {
    manageTenant: true,
    manageUsers: true,
    manageTenantConfig: true,
    manageLocalLabels: true,
    resetDemo: false,
  },
  organization_admin: {
    manageTenant: true,
    manageUsers: true,
    manageTenantConfig: true,
    manageLocalLabels: true,
    viewCaseDetail: true,
    voidOwn: true,
    voidAny: true,
    bulkEnroll: true,
    resetDemo: true,
    mergeDuplicates: true,
    viewCrossProgramFlag: true,
    viewAggregateReports: true,
  },
  case_manager: {
    viewCaseDetail: true,
    voidOwn: true,
    bulkEnroll: true,
    resetDemo: false,
    viewCrossProgramFlag: true,
  },
  supervisor: {
    viewCaseDetail: true,
    voidOwn: true,
    voidAny: true,
    bulkEnroll: true,
    resetDemo: true,
    mergeDuplicates: true,
    viewCrossProgramFlag: true,
  },
  cross_program_liaison: {
    viewCaseDetail: false,
    viewCrossProgramFlag: true,
    resetDemo: false,
  },
  auditor: {
    viewCaseDetail: false,
    viewAggregateReports: true,
    readOnly: true,
    viewCrossProgramFlag: false,
    resetDemo: false,
  },
};

export type Capability =
  | 'viewCaseDetail'
  | 'voidOwn'
  | 'voidAny'
  | 'bulkEnroll'
  | 'resetDemo'
  | 'mergeDuplicates'
  | 'viewCrossProgramFlag'
  | 'viewAggregateReports'
  | 'readOnly'
  | 'managePlatform'
  | 'manageTenants'
  | 'manageTranslations'
  | 'manageTenant'
  | 'manageUsers'
  | 'manageTenantConfig'
  | 'manageLocalLabels';

export function can(role: UserRole | undefined, action: Capability): boolean {
  if (!role) return false;
  return Boolean(PERMISSIONS[role]?.[action]);
}

export function isAdminRole(role?: UserRole): boolean {
  return role === 'platform_admin' || role === 'tenant_admin' || role === 'organization_admin';
}

export function canViewCaseDetail(role?: UserRole): boolean {
  return can(role, 'viewCaseDetail');
}

export function isAuditor(role?: UserRole): boolean {
  return role === 'auditor';
}

export function isLiaison(role?: UserRole): boolean {
  return role === 'cross_program_liaison';
}

export function isReadOnly(role?: UserRole): boolean {
  return role === 'auditor';
}
