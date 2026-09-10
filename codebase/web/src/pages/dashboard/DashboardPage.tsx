import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { AppLayout } from '../../components/AppLayout';
import { CaseWorkflowDrawerBody } from '../../components/CaseWorkflowDrawerBody';
import { EmptyState } from '../../components/EmptyState';
import { RiskBadge } from '../../components/RiskBadge';
import { RiskDonut, type RiskDonutSlice } from '../../components/RiskDonut';
import { SideDrawer } from '../../components/SideDrawer';
import { useToast } from '../../components/ToastContext';
import { DownloadComboButton } from '../../components/UiIcon';
import { useI18n } from '../../i18n/I18nContext';
import {
  caseloadForUser,
  caseloadSuccessMetrics,
  findUser,
  getDueFollowUps,
  groupByRisk,
  latestAssessment,
} from '../../mock/caseService';
import { useMockData } from '../../mock/MockDataContext';
import type { CaseloadView } from '../../mock/types';
import { cadenceForRisk, getStatus } from '../../mock/workflow';
import { downloadTableCsv, type ExportColumn } from '../../utils/reportExport';
import { ReportSubscribeButton } from '../reports/components/ReportSubscribeButton';
import { CaseloadChipList } from './CaseloadChipList';
import { DashboardStatCard } from './DashboardStatCard';
import { ProgramImpactCard } from './ProgramImpactCard';
import { RiskChart } from './RiskChart';
import {
  exportDonutChartPng,
  exportProgramImpactPng,
  exportProgramOverviewPng,
  type DashboardMetrics,
} from './dashboardExport';

type CaseloadFilter = 'all' | 'overdue' | 'incomplete';

type DrawerState =
  | { kind: 'risk'; level: string }
  | { kind: 'case'; client: CaseloadView }
  | null;

type OverdueEntry = { daysOverdue: number; cadence: string };

const RISK_ORDER = ['High', 'Medium', 'Moderate', 'Low', 'Unknown'];

export function DashboardPage() {
  const { user } = useAuth();
  const { store } = useMockData();
  const i18n = useI18n();
  const { t } = i18n;
  const { showToast } = useToast();

  const [filter, setFilter] = useState<CaseloadFilter>('all');
  const [drawer, setDrawer] = useState<DrawerState>(null);
  const caseloadSection = useRef<HTMLDivElement>(null);

  const caseload = useMemo(() => (user ? caseloadForUser(store, user) : []), [store, user]);
  const overdue = useMemo(
    () => getDueFollowUps(caseload, user?.role === 'case_manager' ? user.id : null),
    [caseload, user],
  );
  const overdueByClientId = useMemo(() => {
    const map: Record<string, OverdueEntry> = {};
    overdue.forEach((entry) => {
      const level = latestAssessment(store, entry.client.id)?.overallRisk ?? 'Unknown';
      map[entry.client.id] = {
        daysOverdue: entry.daysOverdue,
        cadence: i18n.cadenceLabel(cadenceForRisk(level).key),
      };
    });
    return map;
  }, [overdue, store, i18n]);

  const incomplete = useMemo(() => caseload.filter((c) => c.incompleteIntake), [caseload]);
  const riskGroups = useMemo(() => groupByRisk(store, caseload), [store, caseload]);
  const highCount = (riskGroups.High ?? []).length;

  const riskReport = useMemo<RiskDonutSlice[]>(
    () =>
      RISK_ORDER.map((riskLevel) => ({ riskLevel, count: (riskGroups[riskLevel] ?? []).length })).filter(
        (row) => row.count > 0,
      ),
    [riskGroups],
  );

  const metrics = useMemo<DashboardMetrics>(() => {
    const base = caseloadSuccessMetrics(store, caseload, overdue.length);
    return {
      ...base,
      servicesConnectedPct: caseload.length
        ? Math.min(100, Math.round((base.clientsWithServices / caseload.length) * 100))
        : 0,
    };
  }, [store, caseload, overdue.length]);

  const filteredCaseload = useMemo(() => {
    if (filter === 'overdue') return caseload.filter((c) => overdueByClientId[c.id]);
    if (filter === 'incomplete') return incomplete;
    return caseload;
  }, [filter, caseload, overdueByClientId, incomplete]);

  const riskDrilldownRows = useMemo(
    () =>
      caseload
        .map((client) => {
          const assessment = latestAssessment(store, client.id);
          return {
            clientName: client.name,
            dob: i18n.formatDate(client.dob),
            phone: client.phone ?? '',
            riskLevel: i18n.riskLabel(assessment?.overallRisk ?? 'Unknown'),
            compositeScore: assessment?.compositeScore ?? '',
            processStage: getStatus(client, i18n).label,
            caseManager: findUser(store, client.caseManagerId)?.name ?? '',
            intakeStatus: i18n.intakeCompletenessLabel(
              client.incompleteIntake ? 'incomplete' : 'complete',
            ),
          };
        })
        .sort((a, b) => a.clientName.localeCompare(b.clientName)),
    [caseload, store, i18n],
  );

  const caseloadDrilldownRows = useMemo(
    () =>
      filteredCaseload
        .map((client) => {
          const assessment = latestAssessment(store, client.id);
          const due = overdueByClientId[client.id];
          return {
            clientName: client.name,
            dob: i18n.formatDate(client.dob),
            phone: client.phone ?? '',
            processStage: getStatus(client, i18n).label,
            riskLevel: i18n.riskLabel(assessment?.overallRisk ?? 'Unknown'),
            followUpStatus: due
              ? `${t('pages.reports.daysOverdueBadge', { count: due.daysOverdue })} (${due.cadence})`
              : t('pages.reports.followUpCurrent'),
            intakeStatus: i18n.intakeCompletenessLabel(
              client.incompleteIntake ? 'incomplete' : 'complete',
            ),
          };
        })
        .sort((a, b) => a.clientName.localeCompare(b.clientName)),
    [filteredCaseload, store, overdueByClientId, i18n, t],
  );

  function showCaseloadFilter(next: CaseloadFilter) {
    setFilter(next);
    caseloadSection.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function exportRows<T extends object>(filename: string, columns: ExportColumn[], rows: T[]) {
    if (!rows.length) {
      showToast(t('components.noDataExport'), 'warning');
      return;
    }
    downloadTableCsv(filename, columns, rows);
  }

  const activeRiskLevel = drawer?.kind === 'risk' ? drawer.level : null;
  const activeCaseId = drawer?.kind === 'case' ? drawer.client.caseId : null;
  const showAttention = filter !== 'all';

  const drilldownClients = activeRiskLevel ? riskGroups[activeRiskLevel] ?? [] : [];
  const drawerTitle =
    drawer?.kind === 'case'
      ? drawer.client.name
      : activeRiskLevel
        ? t(
            drilldownClients.length === 1
              ? 'pages.reports.riskDrawerTitle'
              : 'pages.reports.riskDrawerTitlePlural',
            { level: i18n.riskLabel(activeRiskLevel), count: drilldownClients.length },
          )
        : '';

  const emptyCaseloadTitle =
    filter === 'overdue'
      ? t('dashboard.noOverdue')
      : filter === 'incomplete'
        ? t('dashboard.noIncomplete')
        : t('dashboard.noActiveCases');
  const emptyCaseloadHint =
    filter === 'overdue'
      ? t('dashboard.noOverdueHint')
      : filter === 'incomplete'
        ? t('dashboard.noIncompleteHint')
        : t('dashboard.noActiveCasesHint');

  return (
    <AppLayout navId="dashboard">
      <ProgramImpactCard
        metrics={metrics}
        onDownloadImage={() => exportProgramImpactPng(i18n, metrics, 'program-impact.png')}
      />

      <div className="card-grid dashboard-stat-grid">
        <DashboardStatCard
          value={metrics.serviceEnrollments}
          label={t('dashboard.servicesConnected')}
          icon="link"
          tone="success"
        />
        <DashboardStatCard
          value={metrics.activeGoals}
          label={t('dashboard.careGoalsActive')}
          icon="clipboard"
          tone="success"
        />
        <DashboardStatCard
          value={metrics.riskImprovements}
          label={t('dashboard.riskImprovements')}
          icon="trendUp"
          tone="success"
        />
        <DashboardStatCard
          value={caseload.length}
          label={t('dashboard.activeCaseload')}
          icon="users"
          tone="primary"
          activateLabel={t('dashboard.showStatInCaseloadTable', { label: t('dashboard.activeCaseload') })}
          onActivate={() => showCaseloadFilter('all')}
        />
        <DashboardStatCard
          value={overdue.length}
          label={t('dashboard.overdueFollowUps')}
          icon="clock"
          tone="warning"
          activateLabel={t('dashboard.showStatInCaseloadTable', {
            label: t('dashboard.overdueFollowUps'),
          })}
          onActivate={() => showCaseloadFilter('overdue')}
        />
        <DashboardStatCard
          value={incomplete.length}
          label={t('dashboard.incompleteIntakes')}
          icon="clipboard"
          tone="accent"
          activateLabel={t('dashboard.showStatInCaseloadTable', {
            label: t('dashboard.incompleteIntakes'),
          })}
          onActivate={() => showCaseloadFilter('incomplete')}
        />
      </div>

      <div className="dashboard-stack">
        <div className="card">
          <div className="card-header">
            <h2>{t('dashboard.programOverview')}</h2>
            <div className="report-card-actions">
              <ReportSubscribeButton
                reportKey="dashboard-program-overview"
                reportKind="dashboard"
                reportLabel={t('dashboard.programOverview')}
              />
              <div className="download-actions">
                <DownloadComboButton
                  kind="image"
                  label={t('export.downloadImage')}
                  onClick={() =>
                    exportProgramOverviewPng(
                      i18n,
                      metrics,
                      riskReport,
                      caseload.length,
                      {
                        highCount,
                        overdueCount: overdue.length,
                        incompleteCount: incomplete.length,
                      },
                      'program-overview.png',
                    )
                  }
                />
                <DownloadComboButton
                  kind="spreadsheet"
                  label={t('export.downloadXlsx')}
                  onClick={() =>
                    exportRows(
                      t('export.caseloadRiskDetailTitle'),
                      [
                        { key: 'clientName', label: t('common.client') },
                        { key: 'dob', label: t('dashboard.tableDob') },
                        { key: 'phone', label: t('common.phone') },
                        { key: 'riskLevel', label: t('common.riskLevel') },
                        { key: 'compositeScore', label: t('common.compositeScore') },
                        { key: 'processStage', label: t('common.processStage') },
                        { key: 'caseManager', label: t('common.caseManager') },
                        { key: 'intakeStatus', label: t('common.intakeStatus') },
                      ],
                      riskDrilldownRows,
                    )
                  }
                />
              </div>
            </div>
          </div>
          <div id="dashboard-program-visual">
            <div className="snapshot-bar snapshot-bar-success">
              <div className="snapshot-item snap-success">
                <span className="snap-value">{metrics.intakeCompletePct}%</span>
                <span className="snap-label">{t('dashboard.intakesComplete')}</span>
              </div>
              <div className="snapshot-item snap-success">
                <span className="snap-value">{metrics.followUpOnTrackPct}%</span>
                <span className="snap-label">{t('dashboard.followUpsOnTrack')}</span>
              </div>
              <div className="snapshot-item snap-success">
                <span className="snap-value">{metrics.clientsWithServices}</span>
                <span className="snap-label">{t('dashboard.receivingServices')}</span>
              </div>
              <div className="snapshot-item snap-success">
                <span className="snap-value">{metrics.cboConfirmed}</span>
                <span className="snap-label">{t('dashboard.cboPartnersConfirmed')}</span>
              </div>
            </div>
            <div className="snapshot-bar">
              <div className="snapshot-item">
                <span className="snap-value">{caseload.length}</span>
                <span className="snap-label">{t('dashboard.totalActive')}</span>
              </div>
              <div className="snapshot-item snap-alert">
                <span className="snap-value">{highCount}</span>
                <span className="snap-label">{t('dashboard.highRisk')}</span>
              </div>
              <div className="snapshot-item">
                <span className="snap-value">{overdue.length}</span>
                <span className="snap-label">{t('dashboard.needFollowUp')}</span>
              </div>
              <div className="snapshot-item">
                <span className="snap-value">{incomplete.length}</span>
                <span className="snap-label">{t('dashboard.incompleteIntake')}</span>
              </div>
            </div>
            <h3 className="dashboard-subheading">{t('dashboard.caseloadByRisk')}</h3>
            <RiskChart
              rows={riskReport}
              total={caseload.length}
              activeLevel={activeRiskLevel}
              onSelect={(level) => setDrawer({ kind: 'risk', level })}
            />
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2>{t('dashboard.riskMix')}</h2>
            <div className="report-card-actions">
              <ReportSubscribeButton
                reportKey="dashboard-risk-mix"
                reportKind="dashboard"
                reportLabel={t('dashboard.riskMix')}
              />
              <div className="download-actions">
                <DownloadComboButton
                  kind="image"
                  label={t('export.downloadImage')}
                  onClick={() =>
                    exportDonutChartPng(i18n, riskReport, caseload.length, 'risk-mix-chart.png')
                  }
                />
              </div>
            </div>
          </div>
          <div id="donut-chart-visual">
            <div id="donut-chart">
              <RiskDonut
                slices={riskReport}
                total={caseload.length}
                centerLabel={t('dashboard.donutActive')}
                emptyTitle={t('dashboard.noData')}
                emptyHint={t('dashboard.noActiveClients')}
                activeLevel={activeRiskLevel}
                onSelect={(level) => setDrawer({ kind: 'risk', level })}
              />
            </div>
          </div>
        </div>

        <div className="card" id="caseload-section" ref={caseloadSection}>
          <div className="card-header caseload-card-header">
            <h2>{t('dashboard.fullCaseload')}</h2>
            <div className="caseload-card-actions report-card-actions">
              <ReportSubscribeButton
                reportKey="dashboard-full-caseload"
                reportKind="dashboard"
                reportLabel={t('dashboard.fullCaseload')}
              />
              <div className="download-actions">
                <DownloadComboButton
                  kind="spreadsheet"
                  label={t('export.downloadXlsx')}
                  onClick={() =>
                    exportRows(
                      t('export.fullCaseloadDetailTitle'),
                      [
                        { key: 'clientName', label: t('common.client') },
                        { key: 'dob', label: t('dashboard.tableDob') },
                        { key: 'phone', label: t('common.phone') },
                        { key: 'processStage', label: t('common.processStage') },
                        { key: 'riskLevel', label: t('common.riskLevel') },
                        { key: 'followUpStatus', label: t('common.followUpStatus') },
                        { key: 'intakeStatus', label: t('common.intakeStatus') },
                      ],
                      caseloadDrilldownRows,
                    )
                  }
                />
              </div>
              <Link to="/clients/search" className="btn btn-sm btn-secondary report-card-btn">
                {t('dashboard.searchAll')}
              </Link>
            </div>
          </div>
          <div className="caseload-filter-bar" role="toolbar" aria-label={t('dashboard.filterCaseload')}>
            <button
              type="button"
              className={`caseload-filter-btn${filter === 'all' ? ' is-active' : ''}`}
              aria-pressed={filter === 'all'}
              onClick={() => setFilter('all')}
            >
              {t('dashboard.filterAll', { count: caseload.length })}
            </button>
            <button
              type="button"
              className={`caseload-filter-btn${filter === 'overdue' ? ' is-active' : ''}`}
              aria-pressed={filter === 'overdue'}
              disabled={!overdue.length}
              onClick={() => setFilter('overdue')}
            >
              {t('dashboard.filterOverdue', { count: overdue.length })}
            </button>
            <button
              type="button"
              className={`caseload-filter-btn${filter === 'incomplete' ? ' is-active' : ''}`}
              aria-pressed={filter === 'incomplete'}
              disabled={!incomplete.length}
              onClick={() => setFilter('incomplete')}
            >
              {t('dashboard.filterIncomplete', { count: incomplete.length })}
            </button>
          </div>
          <div id="caseload-table">
            {!filteredCaseload.length ? (
              <EmptyState title={emptyCaseloadTitle} hint={emptyCaseloadHint} />
            ) : (
              <div className="table-responsive">
                <table className="data-table data-table-interactive">
                  <thead>
                    <tr>
                      <th>{t('dashboard.tableName')}</th>
                      <th>{t('dashboard.tableDob')}</th>
                      <th>{t('dashboard.tableProcessStage')}</th>
                      <th>{t('dashboard.tableRisk')}</th>
                      {showAttention ? (
                        <th>
                          {filter === 'overdue'
                            ? t('dashboard.tableFollowUp')
                            : t('dashboard.tableIntakeStatus')}
                        </th>
                      ) : null}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCaseload.map((client) => {
                      const assessment = latestAssessment(store, client.id);
                      const status = getStatus(client, i18n);
                      const due = overdueByClientId[client.id];
                      return (
                        <tr
                          key={client.caseId || client.id}
                          className={`caseload-row${activeCaseId === client.caseId ? ' active' : ''}`}
                          role="button"
                          tabIndex={0}
                          aria-label={t('dashboard.viewCaseAria', { name: client.name })}
                          onClick={() => setDrawer({ kind: 'case', client })}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              setDrawer({ kind: 'case', client });
                            }
                          }}
                        >
                          <td>{client.name}</td>
                          <td>{i18n.formatDate(client.dob)}</td>
                          <td>
                            <span
                              className="workflow-stage-badge"
                              data-stage={status.stage}
                              title={t('components.processStageTitle')}
                            >
                              {status.shortLabel}
                            </span>
                          </td>
                          <td>
                            {assessment ? <RiskBadge level={assessment.overallRisk} /> : '—'}
                          </td>
                          {showAttention ? (
                            <td>
                              {filter === 'overdue' && due
                                ? `${t('pages.reports.daysOverdueBadge', { count: due.daysOverdue })} · ${due.cadence}`
                                : filter === 'incomplete' && client.incompleteIntake
                                  ? (
                                      <span className="incomplete-badge">
                                        {t('components.incompleteIntake')}
                                      </span>
                                    )
                                  : '—'}
                            </td>
                          ) : null}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      <SideDrawer title={drawerTitle} open={Boolean(drawer)} onClose={() => setDrawer(null)}>
        {drawer?.kind === 'case' ? <CaseWorkflowDrawerBody client={drawer.client} /> : null}
        {drawer?.kind === 'risk' ? <CaseloadChipList clients={drilldownClients} /> : null}
      </SideDrawer>
    </AppLayout>
  );
}
