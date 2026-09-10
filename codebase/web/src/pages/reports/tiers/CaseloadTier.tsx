import { ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { ApiError, reportsApi, type CaseloadReportData, type DrilldownClient } from '../../../api/client';
import { USE_MOCK_AUTH, useAuth } from '../../../auth/AuthContext';
import { useMockData } from '../../../mock/MockDataContext';
import { caseloadReport } from '../../../mock/reportEngine';
import { formatDate } from '../../../mock/workflow';
import { EmptyState } from '../../../components/EmptyState';
import { ReportBarChart } from '../../../components/ReportBarChart';
import { RiskBadge } from '../../../components/RiskBadge';
import { SideDrawer } from '../../../components/SideDrawer';
import {
  downloadBarChartPng,
  downloadTableCsv,
  downloadTablePng,
} from '../../../utils/reportExport';
import { ClientChipList } from '../components/ClientChipList';
import { ClientDrawerBody, type DrawerMetaRow, type DrawerSection } from '../components/ClientDrawerBody';
import { ReportCard } from '../components/ReportCard';
import { ReportDataTable } from '../components/ReportDataTable';
import {
  DEFAULT_CASELOAD_FILTERS,
  ReportFiltersBar,
  type CaseloadFilterValues,
} from '../components/ReportFiltersBar';

type CaseloadTierProps = {
  filters: CaseloadFilterValues;
  onFiltersChange: (values: CaseloadFilterValues, immediate?: boolean) => void;
};

const MULTI_PROGRAM_TABLE_TITLES: Record<string, string> = {
  multi: 'Clients in multiple programs',
  '1': 'Clients in a single program',
  '2': 'Clients in 2 programs',
  '3plus': 'Clients in 3+ programs',
};

const RISK_COLORS: Record<string, string> = {
  High: '#dc2626',
  Medium: '#d97706',
  Low: '#059669',
  Unknown: '#64748b',
};

type DrawerState = { title: string; body: ReactNode } | null;
type ActiveRow = { report: string; key: string } | null;

export function CaseloadTier({ filters, onFiltersChange }: CaseloadTierProps) {
  const { user, token } = useAuth();
  const { store } = useMockData();
  const [data, setData] = useState<CaseloadReportData | null>(null);
  const [error, setError] = useState('');
  const [activeBucketId, setActiveBucketId] = useState<string | null>(null);
  const [drawer, setDrawer] = useState<DrawerState>(null);
  const [activeRow, setActiveRow] = useState<ActiveRow>(null);

  useEffect(() => {
    if (!user) return;
    setActiveBucketId(null);
    setDrawer(null);
    setActiveRow(null);
    if (USE_MOCK_AUTH) {
      setData(
        caseloadReport(store, user, {
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
      .caseload(token, {
        period: filters.period,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        programId: filters.programId,
        caseStatus: filters.caseStatus,
        eventId: filters.eventId,
      })
      .then(setData)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load caseload reports'));
  }, [store, user, filters, token]);

  const closeDrawer = useCallback(() => {
    setDrawer(null);
    setActiveRow(null);
  }, []);

  const openClientList = useCallback(
    (report: string, rowKey: string, title: string, clients: DrilldownClient[]) => {
      setActiveRow({ report, key: rowKey });
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
    },
    [],
  );

  const openClientDetail = useCallback(
    (
      report: string,
      rowKey: string,
      title: string,
      client: DrilldownClient,
      options: {
        workspaceTab?: string;
        badge?: ReactNode;
        alert?: { type: 'info' | 'warning' | 'success'; message: string };
        metaRows?: DrawerMetaRow[];
        sections?: DrawerSection[];
      },
    ) => {
      setActiveRow({ report, key: rowKey });
      setDrawer({ title, body: <ClientDrawerBody client={client} {...options} /> });
    },
    [],
  );

  const filterOptions = data?.filterOptions ?? { programs: [], events: [] };

  const multiProgramClients = useMemo(() => {
    if (!data) return [];
    const rows = data.multiProgram.clients;
    if (!activeBucketId || activeBucketId === 'multi') {
      return rows.filter((row) => row.programCount >= 2);
    }
    if (activeBucketId === '3plus') return rows.filter((row) => row.programCount >= 3);
    if (activeBucketId === '2') return rows.filter((row) => row.programCount === 2);
    return rows.filter((row) => row.programCount === 1);
  }, [activeBucketId, data]);

  const multiProgramTableTitle =
    MULTI_PROGRAM_TABLE_TITLES[activeBucketId ?? 'multi'] ?? MULTI_PROGRAM_TABLE_TITLES.multi;

  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!data) return <p className="text-muted">Loading reports…</p>;

  const clientsById = data.clientsById ?? {};
  const activeKeyFor = (report: string) => (activeRow?.report === report ? activeRow.key : null);

  return (
    <>
      <ReportFiltersBar
        values={filters}
        programs={filterOptions.programs}
        events={filterOptions.events}
        onChange={onFiltersChange}
      />

      <div className="report-tier-page">
        <p className="text-muted report-tier-lead">
          Existing caseload, enrollment, follow-up, and referral reports. Select any chart bar or table
          row to open the detail drawer.
        </p>

        <ReportCard
          title="People by Program"
          catalogId="clients-by-program"
          subscribeKey="people-by-program"
          subscribeKind="catalog"
          lead="Unique people with an open case in each program. Select a bar to list the people behind it."
          onDownloadImage={() =>
            downloadBarChartPng(
              'people-by-program',
              'People by Program',
              data.peopleByProgram.map((row) => ({
                label: row.programLabel,
                value: row.count,
                color: row.color,
              })),
            )
          }
          onDownloadTable={() =>
            downloadTableCsv(
              'people-by-program',
              [
                { key: 'programLabel', label: 'Program' },
                { key: 'count', label: 'Open cases' },
              ],
              data.peopleByProgram,
            )
          }
        >
          <ReportBarChart
            data={data.peopleByProgram.map((row) => ({
              key: row.programId,
              label: row.programLabel,
              value: row.count,
              color: row.color,
            }))}
            variant="program"
            activeKey={activeKeyFor('program')}
            ariaLabel={(row) => `Show the ${row.value} people in ${row.label}`}
            onSelect={(programId, row) =>
              openClientList(
                'program',
                programId,
                `${row.label} — ${row.value} ${row.value === 1 ? 'person' : 'people'}`,
                data.programGroups?.[programId] ?? [],
              )
            }
            emptyTitle="No people to report"
            emptyHint="Register clients or open cases to populate this report."
          />
        </ReportCard>

        <ReportCard
          title="Multi-Program Enrollment"
          catalogId="multi-program-enrollment"
          subscribeKey="multi-program-enrollment"
          subscribeKind="catalog"
          lead="People with open cases in more than one program. Select a bar to filter the list below."
          onDownloadImage={() =>
            downloadBarChartPng(
              'multi-program-enrollment',
              'Multi-Program Enrollment',
              data.multiProgram.distribution.map((row) => ({
                label: row.programLabel,
                value: row.count,
                color: row.color,
              })),
            )
          }
          onDownloadTable={() =>
            downloadTableCsv(
              'multi-program-enrollment',
              [
                { key: 'clientName', label: 'Client' },
                { key: 'programCount', label: 'Programs' },
                { key: 'programs', label: 'Program list' },
                { key: 'openCases', label: 'Open cases' },
              ],
              multiProgramClients,
            )
          }
        >
          <p className="liaison-results-summary">
            {data.multiProgram.count === 1
              ? `${data.multiProgram.count} person enrolled in multiple programs.`
              : `${data.multiProgram.count} people enrolled in multiple programs.`}
          </p>
          <ReportBarChart
            data={data.multiProgram.distribution.map((row) => ({
              key: row.bucketId,
              label: row.programLabel,
              value: row.count,
              color: row.color,
            }))}
            variant="program"
            activeKey={activeBucketId}
            ariaLabel={(row) => `Filter the list to the ${row.value} clients in ${row.label}`}
            onSelect={(bucketId) => setActiveBucketId(activeBucketId === bucketId ? null : bucketId)}
            emptyTitle="No multi-program clients"
            emptyHint="No one currently has open cases in more than one program."
          />
          <h3 className="form-section-title" style={{ fontSize: '0.9375rem', margin: '1rem 0 0.75rem' }}>
            {multiProgramTableTitle}
          </h3>
          <ReportDataTable
            columns={[
              { key: 'clientName', label: 'Client' },
              { key: 'programCount', label: 'Programs' },
              { key: 'programs', label: 'Program list' },
              { key: 'openCases', label: 'Open cases' },
            ]}
            rows={multiProgramClients}
            emptyTitle="No clients in this group"
            emptyHint="No open cases match this chart segment."
            rowKey={(row) => row.clientId}
            activeRowKey={activeKeyFor('multi')}
            rowAriaLabel={(row) => `Open details for ${row.clientName}`}
            onRowClick={(row) => {
              const client = clientsById[row.clientId];
              if (!client) return;
              openClientDetail('multi', row.clientId, client.name, client, {
                metaRows: [
                  { label: 'Programs', value: row.programs },
                  { label: 'Program count', value: row.programCount },
                  { label: 'Open cases', value: row.openCases },
                  { label: 'Phone', value: client.phone },
                  { label: 'Case manager', value: client.caseManagerName },
                ],
              });
            }}
          />
        </ReportCard>

        <ReportCard
          title="Caseload by Risk Level"
          catalogId="caseload-by-risk"
          subscribeKey="caseload-by-risk"
          subscribeKind="catalog"
          lead="Open cases grouped by latest assessed risk level. Select a row to see who is in each band."
          onDownloadImage={() =>
            downloadBarChartPng(
              'caseload-by-risk',
              'Caseload by Risk Level',
              data.caseloadByRisk.map((row) => ({
                label: row.riskLevel,
                value: row.count,
                color: RISK_COLORS[row.riskLevel] ?? '#2563eb',
              })),
            )
          }
          onDownloadTable={() =>
            downloadTableCsv(
              'caseload-by-risk-detail',
              [
                { key: 'name', label: 'Client' },
                { key: 'dob', label: 'DOB' },
                { key: 'phone', label: 'Phone' },
                { key: 'riskLevel', label: 'Risk level' },
                { key: 'stageLabel', label: 'Process stage' },
                { key: 'caseManagerName', label: 'Case manager' },
              ],
              Object.values(data.riskGroups ?? {}).flat(),
            )
          }
        >
          <ReportDataTable
            columns={[
              {
                key: 'riskLevel',
                label: 'Risk Level',
                render: (row) => <RiskBadge level={String(row.riskLevel)} />,
              },
              { key: 'count', label: 'Count' },
            ]}
            rows={data.caseloadByRisk}
            emptyTitle="No risk data"
            emptyHint="Complete assessments to populate this report."
            rowKey={(row) => row.riskLevel}
            activeRowKey={activeKeyFor('risk')}
            rowAriaLabel={(row) => `Show the ${row.count} clients at ${row.riskLevel} risk`}
            onRowClick={(row) =>
              openClientList(
                'risk',
                row.riskLevel,
                `${row.riskLevel} risk — ${row.count} ${row.count === 1 ? 'client' : 'clients'}`,
                data.riskGroups?.[row.riskLevel] ?? [],
              )
            }
          />
        </ReportCard>

        <ReportCard
          title="Clients Enrolled in Event"
          catalogId="event-enrollment"
          subscribeKey="event-enrollment"
          subscribeKind="catalog"
          lead="Use the report filters above to narrow by enrollment period and event."
          onDownloadImage={() =>
            downloadTablePng(
              'event-enrollment',
              'Clients Enrolled in Event',
              [
                { key: 'clientName', label: 'Client' },
                { key: 'dateEnrolled', label: 'Date enrolled' },
                { key: 'eventName', label: 'Event' },
              ],
              data.eventEnrollment,
              filters.eventId
                ? filterOptions.events.find((e) => e.id === filters.eventId)?.label
                : 'All events',
            )
          }
          onDownloadTable={() =>
            downloadTableCsv(
              'event-enrollment',
              [
                { key: 'clientName', label: 'Client' },
                { key: 'dateEnrolled', label: 'Date enrolled' },
                { key: 'eventName', label: 'Event' },
              ],
              data.eventEnrollment,
            )
          }
        >
          <ReportDataTable
            columns={[
              { key: 'clientName', label: 'Client' },
              { key: 'dateEnrolled', label: 'Date Enrolled' },
              { key: 'eventName', label: 'Event' },
            ]}
            rows={data.eventEnrollment}
            emptyTitle="No enrollments"
            emptyHint="Bulk-enroll clients to see them here live."
            rowKey={(row, i) => `${row.clientId}-${row.eventId}-${i}`}
            activeRowKey={activeKeyFor('event')}
            rowAriaLabel={(row) => `Open enrollment details for ${row.clientName}`}
            onRowClick={(row, i) => {
              const client = row.clientId ? clientsById[row.clientId] : undefined;
              if (!client) return;
              const others = (data.otherEnrollmentsByClient?.[client.id] ?? []).filter(
                (e) => e.eventName !== row.eventName,
              );
              openClientDetail(
                'event',
                `${row.clientId}-${row.eventId}-${i}`,
                `${client.name} — enrollment`,
                client,
                {
                  workspaceTab: 'services',
                  alert: {
                    type: 'info',
                    message: `Enrolled in ${row.eventName} on ${formatDate(row.dateEnrolled)}.`,
                  },
                  metaRows: [
                    { label: 'Program event', value: row.eventName },
                    { label: 'Date enrolled', value: formatDate(row.dateEnrolled) },
                    { label: 'Phone', value: client.phone },
                    { label: 'Address', value: client.address },
                  ],
                  sections: others.length
                    ? [
                        {
                          title: 'Other enrollments',
                          body: (
                            <ul className="drawer-list">
                              {others.map((e) => (
                                <li key={`${e.eventName}-${e.dateEnrolled}`}>
                                  {e.eventName} — {formatDate(e.dateEnrolled)}
                                </li>
                              ))}
                            </ul>
                          ),
                        },
                      ]
                    : [],
                },
              );
            }}
          />
        </ReportCard>

        <ReportCard
          title="Overdue Follow-ups"
          catalogId="overdue-follow-ups"
          subscribeKey="overdue-follow-ups"
          subscribeKind="catalog"
          lead="Cases past their follow-up cadence. Select a row to review the last contact."
          onDownloadImage={() =>
            downloadTablePng(
              'overdue-followups',
              'Overdue Follow-ups',
              [
                { key: 'clientName', label: 'Client' },
                { key: 'riskLevel', label: 'Risk' },
                { key: 'cadence', label: 'Cadence' },
                { key: 'daysOverdue', label: 'Days overdue' },
              ],
              data.overdueFollowUps,
            )
          }
          onDownloadTable={() =>
            downloadTableCsv(
              'overdue-followups',
              [
                { key: 'clientName', label: 'Client' },
                { key: 'riskLevel', label: 'Risk' },
                { key: 'cadence', label: 'Cadence' },
                { key: 'daysOverdue', label: 'Days overdue' },
              ],
              data.overdueFollowUps,
            )
          }
        >
          <ReportDataTable
            columns={[
              { key: 'clientName', label: 'Client' },
              {
                key: 'riskLevel',
                label: 'Risk',
                render: (row) => (row.riskLevel ? <RiskBadge level={String(row.riskLevel)} /> : '—'),
              },
              { key: 'cadence', label: 'Cadence' },
              { key: 'daysOverdue', label: 'Days Overdue' },
            ]}
            rows={data.overdueFollowUps}
            emptyTitle="No overdue follow-ups"
            emptyHint="All follow-ups are current."
            rowKey={(row, i) => `${row.clientId}-${i}`}
            activeRowKey={activeKeyFor('overdue')}
            rowAriaLabel={(row) => `Open follow-up details for ${row.clientName}`}
            onRowClick={(row, i) => {
              const client = row.clientId ? clientsById[row.clientId] : undefined;
              if (!client) return;
              openClientDetail('overdue', `${row.clientId}-${i}`, `${client.name} — overdue follow-up`, client, {
                workspaceTab: 'followup',
                badge: <span className="incomplete-badge">{row.daysOverdue} days overdue</span>,
                alert: {
                  type: 'warning',
                  message: `Follow-up cadence of ${row.cadence} has been exceeded.`,
                },
                metaRows: [
                  { label: 'Days overdue', value: row.daysOverdue },
                  { label: 'Cadence', value: row.cadence },
                  { label: 'Risk level', value: row.riskLevel },
                  { label: 'Phone', value: client.phone },
                  { label: 'Case manager', value: client.caseManagerName },
                ],
                sections: [
                  {
                    title: 'Last follow-up',
                    body: row.lastNote ? (
                      <div className="note-entry drawer-note">
                        <div className="note-meta">
                          {formatDate(row.lastNote.date)} · {row.lastNote.type}
                        </div>
                        <p>{row.lastNote.text}</p>
                      </div>
                    ) : (
                      <p>No case notes recorded yet.</p>
                    ),
                  },
                ],
              });
            }}
          />
        </ReportCard>

        <ReportCard
          title="Open CBO Referrals"
          catalogId="open-cbo-referrals"
          subscribeKey="open-cbo-referrals"
          subscribeKind="catalog"
          lead="Referrals to community-based organizations awaiting confirmation."
          onDownloadImage={() =>
            downloadTablePng(
              'open-cbo-referrals',
              'Open CBO Referrals',
              [
                { key: 'clientName', label: 'Client' },
                { key: 'cboName', label: 'CBO' },
                { key: 'status', label: 'Status' },
                { key: 'date', label: 'Date' },
              ],
              data.openCboReferrals,
            )
          }
          onDownloadTable={() =>
            downloadTableCsv(
              'open-cbo-referrals',
              [
                { key: 'clientName', label: 'Client' },
                { key: 'cboName', label: 'CBO' },
                { key: 'status', label: 'Status' },
                { key: 'date', label: 'Date' },
              ],
              data.openCboReferrals,
            )
          }
        >
          <ReportDataTable
            columns={[
              { key: 'clientName', label: 'Client' },
              { key: 'cboName', label: 'CBO' },
              { key: 'status', label: 'Status' },
              { key: 'date', label: 'Date' },
            ]}
            rows={data.openCboReferrals}
            emptyTitle="No open CBO referrals"
            emptyHint="All referrals confirmed."
            rowKey={(row, i) => `${row.clientId}-${i}`}
            activeRowKey={activeKeyFor('cbo')}
            rowAriaLabel={(row) => `Open referral details for ${row.clientName}`}
            onRowClick={(row, i) => {
              const client = row.clientId ? clientsById[row.clientId] : undefined;
              if (!client) return;
              const others = (data.otherCbosByClient?.[client.id] ?? []).filter(
                (r) => r.cboName !== row.cboName || r.date !== row.date,
              );
              openClientDetail('cbo', `${row.clientId}-${i}`, `${client.name} — CBO referral`, client, {
                workspaceTab: 'services',
                badge: <span className="client-status-badge">{row.status}</span>,
                alert: { type: 'info', message: `Referred to ${row.cboName}.` },
                metaRows: [
                  { label: 'Organization', value: row.cboName },
                  { label: 'Referral status', value: row.status },
                  { label: 'Date referred', value: formatDate(row.date) },
                  { label: 'Phone', value: client.phone },
                  { label: 'Case manager', value: client.caseManagerName },
                ],
                sections: others.length
                  ? [
                      {
                        title: 'Other open referrals',
                        body: (
                          <ul className="drawer-list">
                            {others.map((r) => (
                              <li key={`${r.cboName}-${r.date}`}>
                                {r.cboName} — {r.status} ({formatDate(r.date)})
                              </li>
                            ))}
                          </ul>
                        ),
                      },
                    ]
                  : [],
              });
            }}
          />
        </ReportCard>

        {!data.peopleByProgram.length && !data.caseloadByRisk.length ? (
          <EmptyState
            title="No caseload data"
            hint="Adjust the filters above or open a case to populate these reports."
          />
        ) : null}
      </div>

      <SideDrawer title={drawer?.title ?? ''} open={Boolean(drawer)} onClose={closeDrawer}>
        {drawer?.body}
      </SideDrawer>
    </>
  );
}

export { DEFAULT_CASELOAD_FILTERS };
