import type {
  CaseloadReportData,
  DrilldownClient,
  ExecutiveTierData,
  IntegrityTierData,
  OperationalTierData,
} from '../api/client';
import { caseloadForUser, clientWithRisk, findUser, getDueFollowUps, viewForCase } from './caseService';
import { eventLabel, getStatus, SERVICE_EVENTS } from './caseWorkflow';
import type { CaseloadView, MockClient, MockStore } from './types';
import type { UserProfile } from '../api/client';

export type ReportPageFilters = {
  period?: string;
  dateFrom?: string;
  dateTo?: string;
  programId?: string;
  caseStatus?: string;
  eventId?: string;
};

function filteredCases(store: MockStore, filters?: ReportPageFilters) {
  let cases = store.cases.filter((c) => {
    if (filters?.caseStatus === 'closed') return c.status === 'closed';
    if (filters?.caseStatus === 'active' || !filters?.caseStatus) return c.status !== 'closed';
    return true;
  });
  if (filters?.programId) cases = cases.filter((c) => c.programId === filters.programId);
  return cases;
}

function clientMatchesFilters(store: MockStore, clientId: string, filters?: ReportPageFilters): boolean {
  const clientCases = filteredCases(store, filters).filter((c) => c.clientId === clientId);
  if (clientCases.length) return true;
  if (filters?.caseStatus === 'active' || !filters?.caseStatus) {
    return !store.cases.some((c) => c.clientId === clientId && c.status !== 'closed');
  }
  return false;
}

const PROGRAM_COLORS: Record<string, string> = {
  'prog-senior-services': '#2563eb',
  'prog-community-services': '#059669',
  'prog-parenting-support': '#7c3aed',
  'prog-mental-health': '#db2777',
};

const PROGRAM_LABELS: Record<string, string> = {
  'prog-senior-services': 'Senior Social Services',
  'prog-community-services': 'Community Social Services',
  'prog-parenting-support': 'Parenting Support Programs',
  'prog-mental-health': 'Mental Health Services',
};

function zipFromAddress(address?: string): string {
  const match = (address ?? '').match(/\b(\d{5})(?:-\d{4})?\b/);
  return match ? match[1] : 'Unknown';
}

function ageFromDob(dob?: string): number | null {
  if (!dob) return null;
  const born = new Date(dob);
  if (Number.isNaN(born.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - born.getFullYear();
  if (today.getMonth() < born.getMonth() || (today.getMonth() === born.getMonth() && today.getDate() < born.getDate())) age -= 1;
  return age;
}

function ageBand(dob?: string): string {
  const age = ageFromDob(dob);
  if (age == null) return 'Unknown';
  if (age < 18) return '0-17';
  if (age < 60) return '18-59';
  if (age < 75) return '60-74';
  return '75+';
}

const AGE_BAND_LABELS: Record<string, string> = {
  '0-17': '0–17',
  '18-59': '18–59',
  '60-74': '60–74',
  '75+': '75+',
  Unknown: 'Unknown',
};

function viewToDrilldown(store: MockStore, view: CaseloadView): DrilldownClient {
  const status = getStatus(view);
  return {
    id: view.id,
    name: view.name,
    phone: view.phone,
    dob: view.dob,
    address: view.address,
    caseId: view.caseId,
    currentStage: view.currentStage,
    stageLabel: status.label,
    incompleteIntake: Boolean(view.incompleteIntake),
    riskLevel: clientWithRisk(store, view).riskLevel,
    programLabel: PROGRAM_LABELS[view.programId] ?? view.programId,
    caseManagerName: findUser(store, view.caseManagerId)?.name,
  };
}

function clientToDrilldown(store: MockStore, client: MockClient): DrilldownClient {
  const openCase = store.cases
    .filter((c) => c.clientId === client.id && c.status !== 'closed')
    .sort((a, b) => (b.openDate > a.openDate ? 1 : -1))[0];
  if (openCase) {
    const view = viewForCase(store, openCase.id);
    if (view) return viewToDrilldown(store, view);
  }
  return {
    id: client.id,
    name: client.name,
    phone: client.phone,
    dob: client.dob,
    address: client.address,
    stageLabel: 'Registration only',
  };
}

export function caseloadReport(
  store: MockStore,
  user: UserProfile,
  filters: {
    period?: string;
    dateFrom?: string;
    dateTo?: string;
    programId?: string;
    caseStatus?: string;
    eventId?: string;
  },
): CaseloadReportData {
  let cases = store.cases.filter((c) => {
    if (filters.caseStatus === 'closed') return c.status === 'closed';
    if (filters.caseStatus === 'active' || !filters.caseStatus) return c.status !== 'closed';
    return true;
  });
  if (filters.programId) cases = cases.filter((c) => c.programId === filters.programId);
  if (user.role === 'case_manager') cases = cases.filter((c) => c.caseManagerId === user.id);

  const programCounts: Record<string, number> = {};
  const programGroups: Record<string, DrilldownClient[]> = {};
  const riskCounts: Record<string, number> = { High: 0, Medium: 0, Low: 0, Unknown: 0 };
  const riskGroups: Record<string, DrilldownClient[]> = {};
  const clientPrograms: Record<string, Set<string>> = {};

  cases.forEach((c) => {
    programCounts[c.programId] = (programCounts[c.programId] ?? 0) + 1;
    if (!clientPrograms[c.clientId]) clientPrograms[c.clientId] = new Set();
    clientPrograms[c.clientId].add(c.programId);

    const view = viewForCase(store, c.id);
    if (!view) return;
    const entry = viewToDrilldown(store, view);

    if (!programGroups[c.programId]) programGroups[c.programId] = [];
    programGroups[c.programId].push(entry);

    const risk = entry.riskLevel ?? 'Unknown';
    riskCounts[risk] = (riskCounts[risk] ?? 0) + 1;
    if (!riskGroups[risk]) riskGroups[risk] = [];
    riskGroups[risk].push(entry);
  });

  const peopleByProgram = Object.entries(programCounts).map(([programId, count]) => ({
    programId,
    programLabel: PROGRAM_LABELS[programId] ?? programId,
    count,
    color: PROGRAM_COLORS[programId] ?? '#64748b',
  }));

  const multiClients = Object.entries(clientPrograms)
    .filter(([, programs]) => programs.size >= 2)
    .map(([clientId, programs]) => {
      const client = store.clients.find((c) => c.id === clientId);
      const openCases = cases.filter((c) => c.clientId === clientId).length;
      const programCount = programs.size;
      const bucketId = programCount >= 3 ? '3plus' : programCount === 2 ? '2' : '1';
      return {
        clientId,
        clientName: client?.name,
        programCount,
        programs: [...programs].map((p) => PROGRAM_LABELS[p] ?? p).join(', '),
        openCases,
        bucketId,
      };
    });

  const bucketCounts = {
    multi: multiClients.length,
    '1': Object.values(clientPrograms).filter((p) => p.size === 1).length,
    '2': multiClients.filter((c) => c.programCount === 2).length,
    '3plus': multiClients.filter((c) => c.programCount >= 3).length,
  };

  let enrollments = store.enrollments.filter((e) => !e.voided);
  if (filters.eventId) enrollments = enrollments.filter((e) => e.serviceOrEventId === filters.eventId);
  const eventEnrollment = enrollments.map((e) => {
    const client = store.clients.find((c) => c.id === e.clientId);
    return {
      clientId: e.clientId,
      clientName: client?.name,
      dateEnrolled: e.dateEnrolled,
      eventId: e.serviceOrEventId,
      eventName: eventLabel(e.serviceOrEventId),
    };
  });

  const caseload = caseloadForUser(store, user);
  const overdue = getDueFollowUps(caseload, user.role === 'case_manager' ? user.id : null);
  const overdueFollowUps = overdue.map((d) => {
    const riskLevel = clientWithRisk(store, d.client).riskLevel;
    const notes = store.notes
      .filter((n) => n.clientId === d.client.id)
      .sort((a, b) => (b.date > a.date ? 1 : -1));
    return {
      clientId: d.client.id,
      clientName: d.client.name,
      riskLevel,
      cadence: riskLevel === 'High' ? '14 days' : '30 days',
      daysOverdue: d.daysOverdue,
      lastNote: notes[0] ? { date: notes[0].date, type: notes[0].type, text: notes[0].text } : null,
    };
  });

  const openCbos = store.cboReferrals.filter((r) => r.status === 'Pending' || r.status === 'Sent');
  const openCboReferrals = openCbos.map((r) => {
    const client = store.clients.find((c) => c.id === r.clientId);
    return {
      clientId: r.clientId,
      clientName: client?.name,
      cboName: r.cboName,
      status: r.status,
      date: r.date,
    };
  });

  const clientsById: Record<string, DrilldownClient> = {};
  const registerClient = (clientId?: string) => {
    if (!clientId || clientsById[clientId]) return;
    const client = store.clients.find((c) => c.id === clientId);
    if (client) clientsById[clientId] = clientToDrilldown(store, client);
  };
  eventEnrollment.forEach((row) => registerClient(row.clientId));
  overdueFollowUps.forEach((row) => registerClient(row.clientId));
  openCboReferrals.forEach((row) => registerClient(row.clientId));
  multiClients.forEach((row) => registerClient(row.clientId));

  const otherEnrollmentsByClient: Record<string, { eventName: string; dateEnrolled?: string }[]> = {};
  Object.keys(clientsById).forEach((clientId) => {
    otherEnrollmentsByClient[clientId] = store.enrollments
      .filter((e) => e.clientId === clientId && !e.voided)
      .map((e) => ({ eventName: eventLabel(e.serviceOrEventId), dateEnrolled: e.dateEnrolled }));
  });

  const otherCbosByClient: Record<string, { cboName: string; status: string; date?: string }[]> = {};
  Object.keys(clientsById).forEach((clientId) => {
    otherCbosByClient[clientId] = openCbos
      .filter((r) => r.clientId === clientId)
      .map((r) => ({ cboName: r.cboName, status: r.status, date: r.date }));
  });

  return {
    filters: {
      period: filters.period ?? 'all',
      dateFrom: filters.dateFrom ?? '',
      dateTo: filters.dateTo ?? '',
      programId: filters.programId ?? '',
      caseStatus: filters.caseStatus ?? 'active',
      eventId: filters.eventId ?? '',
    },
    filterOptions: {
      programs: Object.entries(PROGRAM_LABELS).map(([id, label]) => ({ id, label })),
      events: SERVICE_EVENTS.map((e) => ({ id: e.id, label: e.label })),
    },
    peopleByProgram,
    multiProgram: {
      count: multiClients.length,
      distribution: [
        { bucketId: 'multi', programLabel: 'Multi-program (2+)', count: bucketCounts.multi, color: '#2563eb' },
        { bucketId: '1', programLabel: 'Single program', count: bucketCounts['1'], color: '#059669' },
        { bucketId: '2', programLabel: '2 programs', count: bucketCounts['2'], color: '#7c3aed' },
        { bucketId: '3plus', programLabel: '3+ programs', count: bucketCounts['3plus'], color: '#db2777' },
      ],
      clients: multiClients,
    },
    caseloadByRisk: Object.entries(riskCounts)
      .filter(([, count]) => count > 0)
      .map(([riskLevel, count]) => ({ riskLevel, count })),
    eventEnrollment,
    overdueFollowUps,
    openCboReferrals,
    programGroups,
    riskGroups,
    clientsById,
    otherEnrollmentsByClient,
    otherCbosByClient,
  };
}

export function executiveReport(store: MockStore): ExecutiveTierData {
  const clients = store.clients;
  const activeCases = store.cases.filter((c) => c.status !== 'closed');
  const regOnly = clients.filter((c) => !store.cases.some((cs) => cs.clientId === c.id && cs.status !== 'closed')).length;
  const zipMap: Record<string, number> = {};
  const ageMap: Record<string, number> = {};
  const zipGroups: Record<string, DrilldownClient[]> = {};
  const ageGroups: Record<string, DrilldownClient[]> = {};

  clients.forEach((c) => {
    const entry = clientToDrilldown(store, c);
    const zip = zipFromAddress(c.address);
    zipMap[zip] = (zipMap[zip] ?? 0) + 1;
    if (!zipGroups[zip]) zipGroups[zip] = [];
    zipGroups[zip].push(entry);

    const band = ageBand(c.dob);
    ageMap[band] = (ageMap[band] ?? 0) + 1;
    if (!ageGroups[band]) ageGroups[band] = [];
    ageGroups[band].push(entry);
  });

  return {
    tier: 'executive',
    impact: {
      totalClients: clients.length,
      activeCases: activeCases.length,
      registrationOnly: regOnly,
      servicesDelivered: store.enrollments.filter((e) => !e.voided).length,
      zipDistribution: Object.entries(zipMap).map(([zip, count]) => ({ zip, count })),
      ageDistribution: Object.entries(ageMap).map(([band, count]) => ({
        ageBand: band,
        ageBandLabel: AGE_BAND_LABELS[band] ?? band,
        count,
      })),
    },
    zipGroups,
    ageGroups,
    kpis: {
      referralCompletionRate: 87,
      avgTimeToServiceDays: 12,
      intakeWithin7DayPct: 92,
      enrollmentTrendPct: 8,
    },
    initiatives: store.initiatives.map((i) => ({
      ...i,
      outreachPct: i.targetOutreach ? Math.round((i.referralsGenerated / i.targetOutreach) * 100) : 0,
      completionPct: i.enrollments ? Math.round((i.completions / i.enrollments) * 100) : 0,
    })),
  };
}

export function operationalReport(store: MockStore, filters?: ReportPageFilters): OperationalTierData {
  const cases = filteredCases(store, filters);
  const subdivisions = [
    { id: 'senior', label: 'Senior Services', programId: 'prog-senior-services' },
    { id: 'community', label: 'Community Services', programId: 'prog-community-services' },
  ];
  const subdivisionGroups: Record<string, DrilldownClient[]> = {};

  const subdivision = subdivisions.map((sub) => {
    const subCases = cases.filter((c) => c.programId === sub.programId);
    const clientIds = new Set(subCases.map((c) => c.clientId));
    let highRisk = 0;
    let incompleteIntake = 0;
    subdivisionGroups[sub.id] = [];
    subCases.forEach((c) => {
      const view = viewForCase(store, c.id);
      if (!view) return;
      const entry = viewToDrilldown(store, view);
      subdivisionGroups[sub.id].push(entry);
      if (entry.riskLevel === 'High') highRisk += 1;
      if (c.incompleteIntake) incompleteIntake += 1;
    });
    return {
      subdivisionId: sub.id,
      subdivisionLabel: sub.label,
      openCases: subCases.length,
      uniqueClients: clientIds.size,
      highRisk,
      incompleteIntake,
      color: PROGRAM_COLORS[sub.programId] ?? '#64748b',
    };
  });

  const staffUsers = store.users.filter((u) => u.role === 'case_manager' || u.role === 'supervisor');
  const staffGroups: Record<string, DrilldownClient[]> = {};
  staffUsers.forEach((u) => {
    staffGroups[u.id] = cases
      .filter((c) => c.caseManagerId === u.id)
      .map((c) => viewForCase(store, c.id))
      .filter((v): v is CaseloadView => v !== null)
      .map((v) => viewToDrilldown(store, v));
  });

  return {
    tier: 'operational',
    subdivision,
    subdivisionGroups,
    utilization: {
      months: ['May', 'Jun', 'Jul'],
      series: [
        {
          category: 'food_pantry',
          categoryLabel: 'Food pantry',
          latestUnits: 42,
          points: [
            { month: 'May', units: 38 },
            { month: 'Jun', units: 40 },
            { month: 'Jul', units: 42 },
          ],
        },
        {
          category: 'therapy',
          categoryLabel: 'Therapy',
          latestUnits: 18,
          points: [
            { month: 'May', units: 15 },
            { month: 'Jun', units: 16 },
            { month: 'Jul', units: 18 },
          ],
        },
      ],
    },
    staff: staffUsers.map((u) => ({
      staffId: u.id,
      staffName: u.name,
      role: u.role === 'supervisor' ? 'Supervisor' : 'Case Manager',
      caseload: staffGroups[u.id].length,
      notesLogged: store.notes.filter((n) => store.cases.find((c) => c.id === n.caseId)?.caseManagerId === u.id).length,
      enrollments: store.enrollments.filter((e) => store.cases.find((c) => c.id === e.caseId)?.caseManagerId === u.id).length,
      closures: store.closures.filter((cl) => store.cases.find((c) => c.id === cl.caseId)?.caseManagerId === u.id).length,
      estimatedDirectHours: 32,
    })),
    staffGroups,
  };
}

export function integrityReport(store: MockStore, filters?: ReportPageFilters): IntegrityTierData {
  const activeCases = filteredCases(store, filters);
  const incompleteIntakes = activeCases.filter((c) => c.incompleteIntake).length;
  const regOnly = store.clients.filter((c) => {
    if (!clientMatchesFilters(store, c.id, filters)) return false;
    return !store.cases.some((cs) => cs.clientId === c.id);
  }).length;
  const issues: IntegrityTierData['issues'] = [];

  activeCases.filter((c) => c.incompleteIntake).forEach((c) => {
    const client = store.clients.find((cl) => cl.id === c.clientId);
    issues.push({
      issueType: 'Incomplete intake',
      clientId: c.clientId,
      clientName: client?.name ?? '—',
      detail: 'Consent or DOB missing',
      severity: 'Medium',
    });
  });

  [['cli-oconnor-a', 'cli-oconnor-b'], ['cli-walsh-a', 'cli-walsh-b']].forEach(([a, b]) => {
    const ca = store.clients.find((c) => c.id === a);
    const cb = store.clients.find((c) => c.id === b);
    if (ca && cb && clientMatchesFilters(store, a, filters) && clientMatchesFilters(store, b, filters)) {
      issues.push({
        issueType: 'Potential duplicate',
        clientId: a,
        clientName: ca.name,
        detail: `Possible match with ${cb.name}`,
        severity: 'High',
      });
    }
  });

  return {
    tier: 'integrity',
    summary: {
      duplicatePairs: 2,
      incompleteIntakes,
      registrationOnly: regOnly,
      missingCaseManager: 0,
      totalIssues: issues.length,
    },
    issues,
    auditLog: store.auditLog.map((a) => ({
      timestamp: a.timestamp,
      actor: a.actor,
      action: a.action,
      entityRef: a.entityRef,
      reason: a.reason ?? '',
    })),
  };
}

export function integrityClient(store: MockStore, clientId: string): DrilldownClient | null {
  const client = store.clients.find((c) => c.id === clientId);
  return client ? clientToDrilldown(store, client) : null;
}
