import { ReactNode, useEffect, useMemo, useState } from 'react';
import { ApiError, reportsApi, type IntegrityTierData } from '../../../api/client';
import { USE_MOCK_AUTH, useAuth } from '../../../auth/AuthContext';
import { useI18n } from '../../../i18n/I18nContext';
import { integrityClient, integrityReport } from '../../../mock/reportEngine';
import { reportFilterOptions, toReportI18n } from '../../../mock/customReportService';
import { useMockData } from '../../../mock/MockDataContext';
import { SideDrawer } from '../../../components/SideDrawer';
import { exportTierTable } from '../../../utils/reportExport';
import { buildClientCaseDrawerContent } from '../components/clientCaseDrawerContent';
import { ClientDrawerBody } from '../components/ClientDrawerBody';
import { ReportCard } from '../components/ReportCard';
import { ReportDataTable } from '../components/ReportDataTable';
import { ReportFiltersBar, type CaseloadFilterValues } from '../components/ReportFiltersBar';
import { StatCard, StatCardGrid } from '../components/StatCardGrid';

type DrawerState = { title: string; body: ReactNode } | null;

type IntegrityTierProps = {
  filters: CaseloadFilterValues;
  onFiltersChange: (values: CaseloadFilterValues) => void;
};

export function IntegrityTier({ filters, onFiltersChange }: IntegrityTierProps) {
  const { store } = useMockData();
  const { token } = useAuth();
  const i18n = useI18n();
  const { t } = i18n;
  const reportI18n = useMemo(() => toReportI18n(i18n), [i18n]);
  const [data, setData] = useState<IntegrityTierData | null>(null);
  const [error, setError] = useState('');
  const [drawer, setDrawer] = useState<DrawerState>(null);
  const [activeKey, setActiveKey] = useState<string | null>(null);

  const filterOptions = useMemo(() => reportFilterOptions(reportI18n), [reportI18n]);

  useEffect(() => {
    setDrawer(null);
    setActiveKey(null);
    if (USE_MOCK_AUTH) {
      setData(
        integrityReport(store, {
          period: filters.period,
          dateFrom: filters.dateFrom,
          dateTo: filters.dateTo,
          programId: filters.programId,
          caseStatus: filters.caseStatus,
          eventId: filters.eventId,
        }),
      );
      return;
    }
    if (!token) return;
    setError('');
    reportsApi
      .tier(token, 'integrity')
      .then((payload) => setData(payload as IntegrityTierData))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load integrity reports'));
  }, [store, filters, token]);

  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!data) return <p className="text-muted">Loading integrity reports…</p>;

  const { summary, issues, auditLog } = data;

  function closeDrawer() {
    setDrawer(null);
    setActiveKey(null);
  }

  return (
    <>
      <ReportFiltersBar
        values={filters}
        programs={filterOptions.programs}
        events={filterOptions.events}
        onChange={onFiltersChange}
      />

      <div className="report-tier-page">
        <p className="text-muted report-tier-lead">{t('pages.reports.tierIntegrityLead')}</p>

        <ReportCard
          title={t('pages.reports.clientDataIntegrity')}
          subscribeKey="integrity-client-data-integrity"
          lead="Duplicate, intake, and registration data quality issues. Select a row to open the client record."
          onDownloadTable={() =>
            exportTierTable(
              token,
              'integrity/data-integrity',
              'data-integrity',
              [
                { key: 'issueType', label: t('pages.reports.issueType') },
                { key: 'clientName', label: t('pages.reports.client') },
                { key: 'detail', label: t('pages.reports.detail') },
                { key: 'severity', label: t('pages.reports.severity') },
              ],
              issues,
            )
          }
        >
          <StatCardGrid>
            <StatCard value={summary.duplicatePairs} label={t('pages.reports.duplicatePairs')} tone="warning" />
            <StatCard value={summary.incompleteIntakes} label={t('pages.reports.incompleteIntakes')} tone="accent" />
            <StatCard value={summary.registrationOnly} label={t('pages.reports.registrationOnlyStat')} tone="primary" />
            <StatCard value={summary.missingCaseManager} label={t('pages.reports.missingCaseManager')} tone="success" />
          </StatCardGrid>

          <ReportDataTable
            columns={[
              { key: 'issueType', label: t('pages.reports.issueType') },
              { key: 'clientName', label: t('pages.reports.client') },
              { key: 'detail', label: t('pages.reports.detail') },
              { key: 'severity', label: t('pages.reports.severity') },
            ]}
            rows={issues}
            emptyTitle={t('pages.reports.noIntegrityIssues')}
            emptyHint={t('pages.reports.noIntegrityIssuesHint')}
            rowKey={(row, i) => `${row.clientId}-${row.issueType}-${i}`}
            activeRowKey={activeKey}
            rowAriaLabel={(row) => t('pages.reports.integrityRowAria', { name: row.clientName })}
            onRowClick={(row, i) => {
              const client = integrityClient(store, row.clientId);
              if (!client) return;
              setActiveKey(`${row.clientId}-${row.issueType}-${i}`);
              const drawerContent = buildClientCaseDrawerContent(store, client, i18n, {
                workspaceTab: 'intake',
                alert: { type: 'warning', message: `${row.issueType}: ${row.detail}` },
              });
              setDrawer({
                title: t('pages.reports.integrityDrawerTitle', { name: client.name }),
                body: <ClientDrawerBody client={client} {...drawerContent} />,
              });
            }}
          />
        </ReportCard>

        <ReportCard
          title={t('pages.reports.systemAuditLog')}
          subscribeKey="integrity-system-audit-log"
          lead="Recent platform actions for compliance review."
          onDownloadTable={() =>
            exportTierTable(
              token,
              'integrity/audit-log',
              'audit-log',
              [
                { key: 'timestamp', label: t('pages.reports.timestamp') },
                { key: 'actor', label: t('pages.reports.actor') },
                { key: 'action', label: t('pages.reports.action') },
                { key: 'entityRef', label: t('pages.reports.entityRef') },
                { key: 'reason', label: t('pages.reports.reason') },
              ],
              auditLog,
            )
          }
        >
          <ReportDataTable
            columns={[
              { key: 'timestamp', label: t('pages.reports.timestamp') },
              { key: 'actor', label: t('pages.reports.actor') },
              { key: 'action', label: t('pages.reports.action') },
              { key: 'entityRef', label: t('pages.reports.entityRef') },
              { key: 'reason', label: t('pages.reports.reason') },
            ]}
            rows={auditLog}
            emptyTitle={t('pages.reports.noAuditEntries')}
            emptyHint={t('pages.reports.noAuditEntriesHint')}
          />
        </ReportCard>
      </div>

      <SideDrawer title={drawer?.title ?? ''} open={Boolean(drawer)} onClose={closeDrawer}>
        {drawer?.body}
      </SideDrawer>
    </>
  );
}
