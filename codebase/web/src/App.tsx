import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute, PublicOnlyRoute } from './auth/ProtectedRoute';
import { RequireRole } from './auth/RequireRole';
import { AppShell } from './components/AppShell';
import { LoginPage } from './pages/LoginPage';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { AdminConfigPage } from './pages/admin/AdminConfigPage';
import { AdminLabelsPage } from './pages/admin/AdminLabelsPage';
import { AdminAuditPage } from './pages/admin/AdminAuditPage';
import { PlatformTenantsPage } from './pages/platform/PlatformTenantsPage';
import { PlatformTranslationsPage } from './pages/platform/PlatformTranslationsPage';
import { PlatformSettingsPage } from './pages/platform/PlatformSettingsPage';
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

import { useAuth } from './auth/AuthContext';

function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) {
    return null;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
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
        <Route element={<AppShell />}>
          <Route path="/reports" element={<ReportsPage />} />

          <Route element={<RequireRole roles={['platform_admin']} />}>
            <Route path="/platform/tenants" element={<PlatformTenantsPage />} />
            <Route path="/platform/translations" element={<PlatformTranslationsPage />} />
            <Route path="/platform/settings" element={<PlatformSettingsPage />} />
            <Route path="/platform" element={<Navigate to="/platform/tenants" replace />} />
          </Route>

          <Route element={<RequireRole roles={['tenant_admin', 'organization_admin']} />}>
            <Route path="/admin" element={<AdminDashboardPage />} />
            <Route path="/admin/users" element={<AdminUsersPage />} />
            <Route path="/admin/config" element={<AdminConfigPage />} />
            <Route path="/admin/labels" element={<AdminLabelsPage />} />
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

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
