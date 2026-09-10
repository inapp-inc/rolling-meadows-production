import { ReactNode, useEffect, useMemo, useState } from 'react';
import { ApiError, reportsApi, type DrilldownClient, type OperationalTierData } from '../../../api/client';
import { USE_MOCK_AUTH, useAuth } from '../../../auth/AuthContext';
import { useI18n } from '../../../i18n/I18nContext';
import { operationalReport } from '../../../mock/reportEngine';
import { reportFilterOptions, toReportI18n } from '../../../mock/customReportService';
import { useMockData } from '../../../mock/MockDataContext';
import { ReportBarChart } from '../../../components/ReportBarChart';
import { SideDrawer } from '../../../components/SideDrawer';
import { downloadBarChartPng, downloadTableCsv } from '../../../utils/reportExport';
import { ClientChipList } from '../components/ClientChipList';
import { ReportCard } from '../components/ReportCard';
import { ReportDataTable } from '../components/ReportDataTable';
import { ReportFiltersBar, type CaseloadFilterValues } from '../components/ReportFiltersBar';

type DrawerState = { title: string; body: ReactNode } | null;

type OperationalTierProps = {
  filters: CaseloadFilterValues;
  onFiltersChange: (values: CaseloadFilterValues) => void;
};

export function OperationalTier({ filters, onFiltersChange }: OperationalTierProps) {
  const { store } = useMockData();
  const { token } = useAuth();
  const i18n = useI18n();
  const { t } = i18n;
  const reportI18n = useMemo(() => toReportI18n(i18n), [i18n]);
  const [data, setData] = useState<OperationalTierData | null>(null);
  const [error, setError] = useState('');
  const [drawer, setDrawer] = useState<DrawerState>(null);
  const [active, setActive] = useState<{ report: string; key: string } | null>(null);

  const filterOptions = useMemo(() => reportFilterOptions(reportI18n), [reportI18n]);

  useEffect(() => {
    setDrawer(null);
    setActive(null);
    if (USE_MOCK_AUTH) {
      setData(
        operationalReport(store, {
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
      .tier(token, 'operational')
      .then((payload) => setData(payload as OperationalTierData))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load operational reports'));
  }, [store, filters, token]);

  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!data) return <p className="text-muted">Loading operational reports…</p>;

  const { subdivision, utilization, staff } = data;

  function openClients(report: string, key: string, title: string, clients: DrilldownClient[]) {
    setActive({ report, key });
    setDrawer({
      title,
      body: (
        <ClientChipList
          clients={clients}
          emptyTitle="No clients in this group"
          emptyHint="No open cases match this selection."
        />
      ),
    });
  }

  function closeDrawer() {
    setDrawer(null);
    setActive(null);
  }

  const activeKeyFor = (report: string) => (active?.report === report ? active.key : null);

  return (
    <>
      <ReportFiltersBar
        values={filters}
        programs={filterOptions.programs}
        events={filterOptions.events}
        onChange={onFiltersChange}
      />

      <div className="report-tier-page">
        <p className="text-muted report-tier-lead">{t('pages.reports.tierOperationalLead')}</p>

        <ReportCard
          title={t('pages.reports.subdivisionCaseload')}
          subscribeKey="operational-subdivision-caseload"
          lead="Open cases grouped by program subdivision. Select a bar to list the caseload."
          onDownloadImage={() =>
            downloadBarChartPng(
              'subdivision-caseload',
              t('pages.reports.subdivisionCaseload'),
              subdivision.map((r) => ({ label: r.subdivisionLabel, value: r.openCases, color: r.color })),
            )
          }
          onDownloadTable={() =>
            downloadTableCsv(
              'subdivision-caseload',
              [
                { key: 'subdivisionLabel', label: t('pages.reports.subdivisionLabel') },
                { key: 'openCases', label: t('pages.reports.openCases') },
                { key: 'uniqueClients', label: t('pages.reports.uniqueClients') },
                { key: 'highRisk', label: t('pages.reports.highRisk') },
                { key: 'incompleteIntake', label: t('pages.reports.incompleteIntakes') },
              ],
              subdivision,
            )
          }
        >
          <ReportBarChart
            data={subdivision.map((r) => ({
              key: r.subdivisionId,
              label: r.subdivisionLabel,
              value: r.openCases,
              color: r.color,
            }))}
            variant="program"
            activeKey={activeKeyFor('subdivision')}
            ariaLabel={(row) =>
              t('pages.reports.subdivisionDrilldownAria', { count: row.value, subdivision: row.label })
            }
            onSelect={(subdivisionId, row) =>
              openClients(
                'subdivision',
                subdivisionId,
                t('pages.reports.subdivisionDrawerTitle', { subdivision: row.label, count: row.value }),
                data.subdivisionGroups?.[subdivisionId] ?? [],
              )
            }
          />
          <ReportDataTable
            columns={[
              { key: 'subdivisionLabel', label: t('pages.reports.subdivisionLabel') },
              { key: 'openCases', label: t('pages.reports.openCases') },
              { key: 'uniqueClients', label: t('pages.reports.uniqueClients') },
              { key: 'highRisk', label: t('pages.reports.highRisk') },
              { key: 'incompleteIntake', label: t('pages.reports.incompleteIntakes') },
            ]}
            rows={subdivision}
            emptyTitle={t('pages.reports.noSubdivisionData')}
            emptyHint={t('pages.reports.noSubdivisionDataHint')}
          />
        </ReportCard>

        <ReportCard
          title={t('pages.reports.serviceUtilizationTrend')}
          subscribeKey="operational-service-utilization"
          lead="Monthly service delivery counts by category (latest month shown). Select a bar for the month-by-month breakdown."
          onDownloadImage={() =>
            downloadBarChartPng(
              'service-utilization',
              t('pages.reports.serviceUtilizationTrend'),
              utilization.series.map((s) => ({ label: s.categoryLabel, value: s.latestUnits })),
            )
          }
          onDownloadTable={() =>
            downloadTableCsv(
              'service-utilization',
              [
                { key: 'month', label: t('pages.reports.month') },
                { key: 'category', label: t('pages.reports.category') },
                { key: 'units', label: t('pages.reports.units') },
              ],
              utilization.series.flatMap((s) =>
                s.points.map((p) => ({ month: p.month, category: s.categoryLabel, units: p.units })),
              ),
            )
          }
        >
          <ReportBarChart
            data={utilization.series.map((s) => ({
              key: s.category,
              label: s.categoryLabel,
              value: s.latestUnits,
            }))}
            variant="program"
            activeKey={activeKeyFor('utilization')}
            ariaLabel={(row) => t('pages.reports.utilizationDrilldownAria', { count: row.value, category: row.label })}
            onSelect={(category, row) => {
              const series = utilization.series.find((s) => s.category === category);
              setActive({ report: 'utilization', key: category });
              setDrawer({
                title: t('pages.reports.utilizationDrawerTitle', { category: row.label }),
                body: (
                  <ReportDataTable
                    columns={[
                      { key: 'month', label: t('pages.reports.month') },
                      { key: 'units', label: t('pages.reports.serviceDeliveries') },
                    ]}
                    rows={series?.points ?? []}
                    emptyTitle={t('pages.reports.noUtilizationData')}
                    emptyHint={t('pages.reports.noUtilizationDataHint')}
                  />
                ),
              });
            }}
          />
          <p className="text-muted" style={{ margin: '0.75rem 0 0', fontSize: '0.8125rem' }}>
            {t('pages.reports.utilizationTrendFootnote', { month: utilization.months[utilization.months.length - 1] })}
          </p>
        </ReportCard>

        <ReportCard
          title={t('pages.reports.staffActivity')}
          subscribeKey="operational-staff-activity"
          lead="Caseload, notes, enrollments, and estimated direct hours. Select a row to see that staff member's caseload."
          onDownloadTable={() =>
            downloadTableCsv(
              'staff-activity',
              [
                { key: 'staffName', label: t('pages.reports.staffName') },
                { key: 'role', label: t('pages.reports.role') },
                { key: 'caseload', label: t('pages.reports.caseload') },
                { key: 'notesLogged', label: t('pages.reports.notesLogged') },
                { key: 'enrollments', label: t('pages.reports.enrollments') },
                { key: 'closures', label: t('pages.reports.closures') },
                { key: 'estimatedDirectHours', label: t('pages.reports.estimatedHours') },
              ],
              staff,
            )
          }
          onDownloadImage={() =>
            downloadBarChartPng(
              'staff-caseload',
              'Staff caseload',
              staff.map((s) => ({ label: s.staffName, value: s.caseload })),
            )
          }
        >
          <ReportDataTable
            columns={[
              { key: 'staffName', label: t('pages.reports.staffName') },
              { key: 'role', label: t('pages.reports.role') },
              { key: 'caseload', label: t('pages.reports.caseload') },
              { key: 'notesLogged', label: t('pages.reports.notesLogged') },
              { key: 'enrollments', label: t('pages.reports.enrollments') },
              { key: 'closures', label: t('pages.reports.closures') },
              { key: 'estimatedDirectHours', label: t('pages.reports.estimatedHours') },
            ]}
            rows={staff}
            emptyTitle={t('pages.reports.noStaffActivity')}
            emptyHint={t('pages.reports.noStaffActivityHint')}
            rowKey={(row) => row.staffId}
            activeRowKey={activeKeyFor('staff')}
            rowAriaLabel={(row) => t('pages.reports.staffDrilldownAria', { name: row.staffName, count: row.caseload })}
            onRowClick={(row) =>
              openClients(
                'staff',
                row.staffId,
                t('pages.reports.staffDrawerTitle', { name: row.staffName, count: row.caseload }),
                data.staffGroups?.[row.staffId] ?? [],
              )
            }
          />
        </ReportCard>
      </div>

      <SideDrawer title={drawer?.title ?? ''} open={Boolean(drawer)} onClose={closeDrawer}>
        {drawer?.body}
      </SideDrawer>
    </>
  );
}
