import { ReactNode, useEffect, useState } from 'react';
import { ApiError, reportsApi, type DrilldownClient, type ExecutiveTierData } from '../../../api/client';
import { USE_MOCK_AUTH, useAuth } from '../../../auth/AuthContext';
import { useMockData } from '../../../mock/MockDataContext';
import { executiveReport } from '../../../mock/reportEngine';
import { ReportBarChart } from '../../../components/ReportBarChart';
import { SideDrawer } from '../../../components/SideDrawer';
import { downloadBarChartPng, downloadTableCsv } from '../../../utils/reportExport';
import { ClientChipList } from '../components/ClientChipList';
import { ReportCard } from '../components/ReportCard';
import { ReportDataTable } from '../components/ReportDataTable';
import { StatCard, StatCardGrid } from '../components/StatCardGrid';

type DrawerState = { title: string; body: ReactNode } | null;

export function ExecutiveTier() {
  const { store } = useMockData();
  const { token } = useAuth();
  const [data, setData] = useState<ExecutiveTierData | null>(null);
  const [error, setError] = useState('');
  const [drawer, setDrawer] = useState<DrawerState>(null);
  const [activeChart, setActiveChart] = useState<{ chart: string; key: string } | null>(null);

  useEffect(() => {
    setDrawer(null);
    setActiveChart(null);
    if (USE_MOCK_AUTH) {
      setData(executiveReport(store));
      return;
    }
    if (!token) return;
    setError('');
    reportsApi
      .tier(token, 'executive')
      .then((payload) => setData(payload as ExecutiveTierData))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load executive reports'))
      .finally(() => {
        if (!USE_MOCK_AUTH) return;
      });
  }, [store, token]);

  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!data) return <p className="text-muted">Loading executive reports…</p>;

  const { impact, kpis, initiatives } = data;

  function openClients(chart: string, key: string, title: string, clients: DrilldownClient[]) {
    setActiveChart({ chart, key });
    setDrawer({
      title,
      body: (
        <ClientChipList
          clients={clients}
          emptyTitle="No clients in this group"
          emptyHint="No registered clients match this selection."
        />
      ),
    });
  }

  function closeDrawer() {
    setDrawer(null);
    setActiveChart(null);
  }

  return (
    <>
      <StatCardGrid>
        <StatCard value={impact.totalClients} label="Total clients" tone="primary" />
        <StatCard value={impact.activeCases} label="Active cases" tone="success" />
        <StatCard value={impact.registrationOnly} label="Registration only" tone="accent" />
        <StatCard value={impact.servicesDelivered} label="Service enrollments" tone="warning" />
      </StatCardGrid>

      <ReportCard
        title="Community Impact Dashboard"
        subscribeKey="executive-community-impact"
        lead="Geographic and demographic distribution of served clients. Select a bar to list the people behind it."
        onDownloadTable={() =>
          downloadTableCsv(
            'community-impact',
            [
              { key: 'label', label: 'Group' },
              { key: 'count', label: 'Clients' },
            ],
            [
              ...impact.zipDistribution.map((r) => ({ label: `ZIP ${r.zip}`, count: r.count })),
              ...impact.ageDistribution.map((r) => ({ label: r.ageBandLabel, count: r.count })),
            ],
          )
        }
      >
        <div className="auditor-summary-grid">
          <div>
            <h3>Clients by ZIP code</h3>
            <ReportBarChart
              data={impact.zipDistribution.slice(0, 8).map((r) => ({
                key: r.zip,
                label: r.zip,
                value: r.count,
              }))}
              variant="program"
              activeKey={activeChart?.chart === 'zip' ? activeChart.key : null}
              ariaLabel={(row) => `Show the ${row.value} clients in ZIP ${row.label}`}
              onSelect={(zip, row) =>
                openClients(
                  'zip',
                  zip,
                  `ZIP ${zip} — ${row.value} ${row.value === 1 ? 'client' : 'clients'}`,
                  data.zipGroups?.[zip] ?? [],
                )
              }
            />
          </div>
          <div>
            <h3>Clients by age band</h3>
            <ReportBarChart
              data={impact.ageDistribution.map((r) => ({
                key: r.ageBand,
                label: r.ageBandLabel,
                value: r.count,
              }))}
              variant="program"
              activeKey={activeChart?.chart === 'age' ? activeChart.key : null}
              ariaLabel={(row) => `Show the ${row.value} clients aged ${row.label}`}
              onSelect={(band, row) =>
                openClients(
                  'age',
                  band,
                  `Age ${row.label} — ${row.value} ${row.value === 1 ? 'client' : 'clients'}`,
                  data.ageGroups?.[band] ?? [],
                )
              }
            />
          </div>
        </div>
      </ReportCard>

      <ReportCard
        title="Initiative Performance Tracker"
        subscribeKey="executive-initiative-performance"
        lead="Outreach campaigns and program event performance."
        onDownloadTable={() =>
          downloadTableCsv(
            'initiative-performance',
            [
              { key: 'name', label: 'Initiative' },
              { key: 'startDate', label: 'Start date' },
              { key: 'endDate', label: 'End date' },
              { key: 'targetOutreach', label: 'Target outreach' },
              { key: 'referralsGenerated', label: 'Referrals generated' },
              { key: 'enrollments', label: 'Enrollments' },
              { key: 'completions', label: 'Completions' },
              { key: 'outreachPct', label: 'Outreach %' },
              { key: 'completionPct', label: 'Completion %' },
            ],
            initiatives,
          )
        }
        onDownloadImage={() =>
          downloadBarChartPng(
            'initiative-enrollments',
            'Initiative enrollments',
            initiatives.map((i) => ({ label: i.name, value: i.enrollments })),
          )
        }
      >
        <ReportDataTable
          columns={[
            { key: 'name', label: 'Initiative' },
            { key: 'startDate', label: 'Start date' },
            { key: 'endDate', label: 'End date' },
            { key: 'targetOutreach', label: 'Target outreach' },
            { key: 'referralsGenerated', label: 'Referrals generated' },
            { key: 'enrollments', label: 'Enrollments' },
            { key: 'completions', label: 'Completions' },
            { key: 'outreachPct', label: 'Outreach %' },
            { key: 'completionPct', label: 'Completion %' },
          ]}
          rows={initiatives}
          emptyTitle="No initiatives tracked"
          emptyHint="Initiatives appear here when outreach campaigns are configured."
        />
      </ReportCard>

      <ReportCard
        title="Performance Outcome KPIs"
        subscribeKey="executive-outcome-kpis"
        lead="Referral completion, time-to-service, and enrollment trends."
        onDownloadTable={() =>
          downloadTableCsv(
            'outcome-kpis',
            [
              { key: 'metric', label: 'Metric' },
              { key: 'value', label: 'Value' },
            ],
            [
              { metric: 'Referral completion rate', value: `${kpis.referralCompletionRate ?? '—'}%` },
              { metric: 'Avg. days to first service', value: kpis.avgTimeToServiceDays ?? '—' },
              { metric: 'Intake complete ≤ 7 days', value: `${kpis.intakeWithin7DayPct ?? '—'}%` },
              { metric: 'Enrollment trend (30 days)', value: `${kpis.enrollmentTrendPct}%` },
            ],
          )
        }
      >
        <StatCardGrid>
          <StatCard
            value={kpis.referralCompletionRate != null ? `${kpis.referralCompletionRate}%` : '—'}
            label="Referral completion rate"
            tone="primary"
          />
          <StatCard value={kpis.avgTimeToServiceDays ?? '—'} label="Avg. days to first service" tone="success" />
          <StatCard
            value={kpis.intakeWithin7DayPct != null ? `${kpis.intakeWithin7DayPct}%` : '—'}
            label="Intake complete ≤ 7 days"
            tone="accent"
          />
          <StatCard
            value={`${kpis.enrollmentTrendPct > 0 ? '+' : ''}${kpis.enrollmentTrendPct}%`}
            label="Enrollment trend (30 days)"
            tone="warning"
          />
        </StatCardGrid>
      </ReportCard>

      <SideDrawer title={drawer?.title ?? ''} open={Boolean(drawer)} onClose={closeDrawer}>
        {drawer?.body}
      </SideDrawer>
    </>
  );
}
