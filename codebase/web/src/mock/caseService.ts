import type { UserProfile } from '../api/client';
import type { CaseloadView, MockCase, MockClient, MockStore } from './types';

export function mergeClientCase(client: MockClient, caseRecord: MockCase): CaseloadView {
  return {
    ...client,
    caseId: caseRecord.id,
    caseNumber: caseRecord.caseNumber,
    programId: caseRecord.programId,
    caseCategoryId: caseRecord.caseCategoryId,
    caseSubcategoryId: caseRecord.caseSubcategoryId,
    caseManagerId: caseRecord.caseManagerId,
    status: caseRecord.status,
    currentStage: caseRecord.currentStage,
    incompleteIntake: caseRecord.incompleteIntake,
    openDate: caseRecord.openDate,
    createdAt: caseRecord.openDate || caseRecord.createdAt || client.registeredAt,
  };
}

export function viewForCase(store: MockStore, caseId: string): CaseloadView | null {
  const caseRecord = store.cases.find((c) => c.id === caseId);
  if (!caseRecord) return null;
  const client = store.clients.find((c) => c.id === caseRecord.clientId);
  return client ? mergeClientCase(client, caseRecord) : null;
}

export function resolveView(store: MockStore, clientId: string, caseId?: string): CaseloadView | null {
  if (caseId) {
    const byCase = viewForCase(store, caseId);
    if (byCase && byCase.id === clientId) return byCase;
  }
  const latest = store.cases
    .filter((c) => c.clientId === clientId)
    .sort((a, b) => (b.openDate > a.openDate ? 1 : -1))[0];
  if (latest) {
    const client = store.clients.find((c) => c.id === clientId);
    return client ? mergeClientCase(client, latest) : null;
  }
  const client = store.clients.find((c) => c.id === clientId);
  return client ? ({ ...client, caseId: '', caseNumber: '', programId: '', caseCategoryId: '', caseSubcategoryId: '', caseManagerId: '', status: '', currentStage: 0, openDate: '', createdAt: client.registeredAt } as CaseloadView) : null;
}

export function caseloadForUser(store: MockStore, user: UserProfile | { id: string; role: string }): CaseloadView[] {
  const cases =
    user.role === 'case_manager'
      ? store.cases.filter((c) => c.caseManagerId === user.id && c.status !== 'closed')
      : store.cases.filter((c) => c.status !== 'closed');
  return cases
    .map((caseRecord) => {
      const client = store.clients.find((c) => c.id === caseRecord.clientId);
      return client ? mergeClientCase(client, caseRecord) : null;
    })
    .filter((v): v is CaseloadView => v !== null);
}

export function findUser(store: MockStore, userId: string) {
  return store.users.find((u) => u.id === userId);
}

export function latestAssessment(store: MockStore, clientId: string) {
  return store.assessments
    .filter((a) => a.clientId === clientId)
    .sort((a, b) => (b.date > a.date ? 1 : -1))[0];
}

export function clientWithRisk(store: MockStore, view: CaseloadView) {
  const assessment = latestAssessment(store, view.id);
  return { client: view, riskLevel: assessment?.overallRisk ?? 'Unknown', assessment };
}

export function groupByRisk(store: MockStore, clients: CaseloadView[]) {
  const groups: Record<string, CaseloadView[]> = { High: [], Medium: [], Moderate: [], Low: [], Unknown: [] };
  clients.forEach((c) => {
    const level = clientWithRisk(store, c).riskLevel;
    if (!groups[level]) groups[level] = [];
    groups[level].push(c);
  });
  return groups;
}

export function enrollmentsForClient(store: MockStore, clientId: string) {
  return store.enrollments.filter((e) => e.clientId === clientId && !e.voided);
}

export function openCboReferrals(store: MockStore) {
  return store.cboReferrals.filter((r) => r.status === 'Pending' || r.status === 'Sent');
}

export function documentsForClient(store: MockStore, clientId: string) {
  return store.documents
    .filter((d) => d.clientId === clientId)
    .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
}

export function casesForClient(store: MockStore, clientId: string) {
  return store.cases.filter((c) => c.clientId === clientId);
}

export function registeredClients(store: MockStore) {
  return store.clients;
}

export function caseloadSuccessMetrics(store: MockStore, caseload: CaseloadView[], overdueCount: number) {
  const activeGoals = store.carePlans.filter((cp) => !cp.voided && cp.status !== 'Complete').length;
  const serviceEnrollments = store.enrollments.filter((e) => !e.voided).length;
  const clientsWithServices = new Set(store.enrollments.filter((e) => !e.voided).map((e) => e.clientId)).size;
  const cboConfirmed = store.cboReferrals.filter((r) => r.status === 'Confirmed').length;
  const completeIntakes = caseload.filter((c) => !c.incompleteIntake).length;
  const intakeCompletePct = caseload.length ? Math.round((completeIntakes / caseload.length) * 100) : 0;
  const followUpOnTrackPct = caseload.length ? Math.round(((caseload.length - overdueCount) / caseload.length) * 100) : 100;
  return {
    serviceEnrollments,
    activeGoals,
    riskImprovements: 3,
    clientsWithServices,
    cboConfirmed,
    intakeCompletePct,
    followUpOnTrackPct,
  };
}

export function getDueFollowUps(caseload: CaseloadView[], caseManagerId?: string | null) {
  const targets = caseManagerId ? caseload.filter((c) => c.caseManagerId === caseManagerId) : caseload;
  return targets
    .filter((c) => c.currentStage >= 6)
    .slice(0, 5)
    .map((c, i) => ({
      client: c,
      daysOverdue: [14, 7, 21, 3, 10][i % 5],
    }));
}
