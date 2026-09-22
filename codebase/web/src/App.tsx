import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute, PublicOnlyRoute } from './auth/ProtectedRoute';
import { RequireRole } from './auth/RequireRole';
import { AppShell } from './components/AppShell';
import { LoginPage } from './pages/LoginPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { AdminAuditPage } from './pages/admin/AdminAuditPage';
import { RestrictPlatformAdminScope } from './auth/RestrictPlatformAdminScope';
import { PlatformTenantsPage } from './pages/platform/PlatformTenantsPage';
import { PlatformTenantConfigurePage } from './pages/platform/PlatformTenantConfigurePage';
import { PlatformTranslationsPage } from './pages/platform/PlatformTranslationsPage';
import { PlatformUsersPage } from './pages/platform/PlatformUsersPage';
import { AdminDuplicatesPage } from './pages/clients/AdminDuplicatesPage';
import { ClientProfilePage } from './pages/clients/ClientProfilePage';
import { ClientRegistrationPage } from './pages/clients/ClientRegistrationPage';
import { ClientSearchPage } from './pages/clients/ClientSearchPage';
import { CaseCreationPage } from './pages/cases/CaseCreationPage';
import { CaseSearchPage } from './pages/cases/CaseSearchPage';
import { CaseWorkspacePage } from './pages/cases/CaseWorkspacePage';
import { ReferralIntakePage } from './pages/cases/ReferralIntakePage';
import { DocumentsHubPage } from './pages/documents/DocumentsHubPage';
import { LiaisonLookupPage } from './pages/liaison/LiaisonLookupPage';
import { ReportsPage } from './pages/reports/ReportsPage';
import { CustomReportsPage } from './pages/reports/CustomReportsPage';
import { ReportBuilderPage } from './pages/reports/builder/ReportBuilderPage';
import { BulkEnrollmentPage } from './pages/services/BulkEnrollmentPage';
import { ServicesHubPage } from './pages/services/ServicesHubPage';
import { WorkflowHubPage } from './pages/workflow/WorkflowHubPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { AccountChangePasswordPage } from './pages/account/AccountChangePasswordPage';
import { AdminConfigPage } from './pages/admin/AdminConfigPage';

import { CHANGE_PASSWORD_PATH, mustChangePassword } from './auth/accountPaths';
import { useAuth } from './auth/AuthContext';

function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) {
    return null;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (mustChangePassword(user)) {
    return <Navigate to={CHANGE_PASSWORD_PATH} replace />;
  }
  return <Navigate to={user.landingPath} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />

      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route path={CHANGE_PASSWORD_PATH} element={<AccountChangePasswordPage />} />
        <Route element={<AppShell />}>
          <Route element={<RestrictPlatformAdminScope />}>
            <Route path="/reports" element={<ReportsPage />} />

            <Route element={<RequireRole roles={['platform_admin']} />}>
              <Route path="/platform/tenants" element={<PlatformTenantsPage />} />
              <Route path="/platform/tenants/:tenantId" element={<PlatformTenantConfigurePage />} />
              <Route path="/platform/users" element={<PlatformUsersPage />} />
              <Route path="/platform/translations" element={<PlatformTranslationsPage />} />
              <Route path="/platform/settings" element={<Navigate to="/platform/tenants" replace />} />
              <Route path="/platform" element={<Navigate to="/platform/tenants" replace />} />
            </Route>

            <Route element={<RequireRole roles={['tenant_admin', 'organization_admin']} />}>
              <Route path="/admin" element={<Navigate to="/admin/users" replace />} />
              <Route path="/admin/users" element={<AdminUsersPage />} />
              <Route path="/admin/config" element={<AdminConfigPage />} />
              <Route path="/admin/labels" element={<Navigate to="/admin/users" replace />} />
              <Route path="/admin/audit" element={<AdminAuditPage />} />
            </Route>

          <Route element={<RequireRole capability="viewCaseDetail" />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/cases/new" element={<CaseCreationPage />} />
            <Route path="/cases/intake" element={<ReferralIntakePage />} />
            <Route path="/cases/search" element={<CaseSearchPage />} />
            <Route path="/cases/:caseId" element={<CaseWorkspacePage />} />
            <Route path="/clients/register" element={<ClientRegistrationPage />} />
            <Route path="/clients/search" element={<ClientSearchPage />} />
            <Route path="/clients/:clientId" element={<ClientProfilePage />} />
            <Route path="/workflow" element={<WorkflowHubPage />} />
            <Route path="/services" element={<ServicesHubPage />} />
            <Route path="/documents" element={<DocumentsHubPage />} />
            <Route path="/reports/custom" element={<CustomReportsPage />} />
            <Route path="/reports/custom/builder" element={<ReportBuilderPage />} />
          </Route>

          <Route element={<RequireRole capability="bulkEnroll" />}>
            <Route path="/services/bulk-enroll" element={<BulkEnrollmentPage />} />
          </Route>

          <Route element={<RequireRole capability="mergeDuplicates" />}>
            <Route path="/clients/duplicates" element={<AdminDuplicatesPage />} />
          </Route>

          <Route element={<RequireRole roles={['cross_program_liaison']} />}>
            <Route path="/liaison" element={<LiaisonLookupPage />} />
          </Route>
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
