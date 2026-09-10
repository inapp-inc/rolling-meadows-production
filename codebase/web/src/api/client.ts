const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api';

export type UserRole =
  | 'platform_admin'
  | 'tenant_admin'
  | 'organization_admin'
  | 'supervisor'
  | 'case_manager'
  | 'cross_program_liaison'
  | 'auditor';

export interface TenantInfo {
  id: string;
  legalName: string;
  shortCode: string;
  status: string;
  defaultLocale?: string;
  enabledLocales?: string[];
  displayName?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  tenantId?: string | null;
  programId?: string | null;
  status: string;
  landingPath: string;
  tenant?: TenantInfo | null;
}

export interface LoginResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  user: UserProfile;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function correlationId(): string {
  return crypto.randomUUID();
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-correlation-id': correlationId(),
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!response.ok) {
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      body = undefined;
    }
    const message =
      typeof body === 'object' && body && 'detail' in body
        ? typeof (body as { detail: unknown }).detail === 'string'
          ? String((body as { detail: string }).detail)
          : typeof (body as { detail: { message?: string } }).detail === 'object' &&
              (body as { detail: { message?: string } }).detail?.message
            ? String((body as { detail: { message: string } }).detail.message)
            : response.statusText
        : typeof body === 'object' && body && 'message' in body
          ? String((body as { message: string }).message)
          : response.statusText;
    throw new ApiError(message, response.status, body);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

export const api = {
  login(email: string, password: string) {
    return request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },
  me(token: string) {
    return request<UserProfile>('/auth/me', {}, token);
  },
  logout(token: string) {
    return request<void>('/auth/logout', { method: 'POST' }, token);
  },
};

export const TOKEN_KEY = 'rm.accessToken';

export interface ClientSummary {
  id: string;
  name: string;
  phone: string;
  address: string;
  dob?: string | null;
  status: string;
  registeredAt?: string;
  crossProgramActive?: boolean;
}

export interface ClientDetail extends ClientSummary {
  registeredAt?: string;
  registrationSource?: string;
  contactReason?: string | null;
  screeningNotes?: string | null;
}

export interface DedupMatch {
  client: ClientSummary;
  score: number;
  matchedFields: string[];
}

export interface DuplicatePair {
  clientA: ClientSummary;
  clientB: ClientSummary;
  score: number;
  matchedFields: string[];
}

export interface CreateClientPayload {
  name: string;
  phone: string;
  address: string;
  dob?: string;
  contactReason?: string;
  screeningNotes?: string;
  emergencyTrigger?: string;
  serviceNeed?: boolean;
  confirmDespiteDuplicates?: boolean;
}

function authedRequest<T>(path: string, token: string, options: RequestInit = {}) {
  return request<T>(path, options, token);
}

export const clientApi = {
  list(token: string, q?: string) {
    const query = q ? `?q=${encodeURIComponent(q)}` : '';
    return authedRequest<{ items: ClientSummary[] }>(`/clients${query}`, token);
  },
  get(token: string, id: string) {
    return authedRequest<ClientDetail>(`/clients/${id}`, token);
  },
  create(token: string, payload: CreateClientPayload) {
    return authedRequest<ClientDetail>('/clients', token, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  dedupCheck(token: string, partial: Partial<CreateClientPayload> & { excludeClientId?: string }) {
    return authedRequest<{ matches: DedupMatch[]; threshold: number }>('/clients/dedup-check', token, {
      method: 'POST',
      body: JSON.stringify(partial),
    });
  },
  listDuplicates(token: string) {
    return authedRequest<{ pairs: DuplicatePair[] }>('/clients/duplicates', token);
  },
  merge(token: string, survivorId: string, duplicateId: string) {
    return authedRequest<ClientDetail>('/clients/merge', token, {
      method: 'POST',
      body: JSON.stringify({ survivorId, duplicateId }),
    });
  },
};

export interface CaseCategory {
  id: string;
  label: string;
  programId: string;
  subcategories: { id: string; label: string }[];
}

export interface WorkflowStage {
  stage: number;
  tabId: string;
  label: string;
  deliverable: string;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  exampleProgram: string;
  stages: WorkflowStage[];
  focusAreas: string[];
}

export interface StageStatus {
  tabId: string;
  stage: number | null;
  label: string;
  deliverable: string;
  status: 'complete' | 'in_progress' | 'pending' | 'available';
}

export interface CaseSummary {
  id: string;
  caseNumber: string;
  clientId: string;
  clientName?: string | null;
  programId: string;
  caseCategoryId: string;
  caseSubcategoryId: string;
  caseManagerId: string;
  status: string;
  incompleteIntake: boolean;
  currentStage: number;
  openDate?: string;
}

export interface CaseWorkspace {
  case: CaseSummary;
  client: ClientSummary;
  workflow: Workflow;
  stageStatuses: StageStatus[];
  currentStage: number;
  referral: {
    source?: string;
    reason?: string;
    referrerName?: string;
    dateReceived?: string;
  } | null;
  intake: {
    consentOnFile?: boolean;
    livingArrangement?: string;
    medicalHistory?: string;
    comprehensiveAssessmentNotes?: string;
    completeness?: string;
  } | null;
  riskAssessment?: {
    id?: string;
    date?: string;
    ratings?: Record<string, string>;
    compositeScore?: number;
    overallRisk?: string;
    overrideNote?: string;
    domains?: { key: string; label: string }[];
  } | null;
  carePlanItems?: CarePlanItem[];
  enrollments?: ServiceEnrollment[];
  cboReferrals?: CboReferral[];
  notes?: CaseNote[];
  reassessments?: Reassessment[];
  closure?: CaseClosure | null;
  documents?: DocumentSummary[];
  assignmentHistory?: AssignmentRecord[];
  activity?: ActivityEntry[];
  followUpCadence?: FollowUpCadence;
  riskDomains?: { key: string; label: string }[];
  readOnly: boolean;
}

export interface CarePlanItem {
  id: string;
  issue: string;
  goal: string;
  service: string;
  status: string;
  voided?: boolean;
  voidReason?: string;
}

export interface ServiceEnrollment {
  id: string;
  serviceOrEventId: string;
  serviceLabel?: string;
  dateEnrolled?: string;
  status?: string;
  voided?: boolean;
  voidReason?: string;
}

export interface CboReferral {
  id: string;
  cboName: string;
  status: string;
  date?: string;
}

export interface CaseNote {
  id: string;
  date?: string;
  type?: string;
  text?: string;
  authorId?: string;
  voided?: boolean;
  voidReason?: string;
}

export interface Reassessment {
  id: string;
  date?: string;
  trigger?: string;
  previousRatings?: Record<string, string>;
  newRatings?: Record<string, string>;
}

export interface CaseClosure {
  date?: string;
  reason?: string;
  outcomesSummary?: Record<string, string>;
}

export interface DocumentSummary {
  id: string;
  filename?: string;
  sourceType?: string;
  mimeType?: string;
  size?: number;
  externalUrl?: string;
  uploadedAt?: string;
  uploadedBy?: string;
  /** Data URL for demo uploads so preview works without a backend. */
  dataUrl?: string;
  stageContext?: string;
}

export interface AssignmentRecord {
  id?: string;
  caseManagerId?: string;
  caseManagerName?: string;
  assignedBy?: string;
  assignedByName?: string;
  reason?: string;
  assignedAt?: string;
}

export interface ActivityEntry {
  action?: string;
  actorId?: string;
  actorName?: string;
  timestamp?: string;
  detail?: string;
  reason?: string;
  meta?: Record<string, unknown>;
}

export interface FollowUpCadence {
  days: number;
  label: string;
  daysSinceLastContact?: number | null;
  overdue?: boolean;
  daysOverdue?: number;
}

export interface ServiceEvent {
  id: string;
  label: string;
}

export interface ReportCatalogItem {
  id: string;
  label: string;
  type: string;
}

export interface CustomReportPreviewData {
  reportType: 'table' | 'chart';
  meta?: string;
  error?: string;
  columns?: { key: string; label: string }[];
  rows?: Record<string, string>[];
  chartType?: string;
  xLabel?: string;
  yLabel?: string;
  points?: { label: string; value: number; color?: string }[];
  rowCount?: number;
}

export interface CustomReportConfig {
  id?: string | null;
  name: string;
  reportType: 'table' | 'chart';
  primaryEntity?: string;
  joins?: string[];
  columns?: { entity: string; field: string; label?: string }[];
  filters?: { entity: string; field: string; op: string; value: string }[];
  sortBy?: { entity: string; field: string; dir: string };
  joinAggregates?: Record<string, string>;
  chart?: {
    xAxis?: { entity: string; field: string } | null;
    yAxis?: { entity?: string; field?: string; aggregate: string; cumulative?: boolean };
    chartType?: string;
    xGrouping?: string;
  };
  updatedAt?: string;
}

export interface CustomReportItem {
  id: string;
  name: string;
  reportType: 'table' | 'chart';
  updatedAt?: string;
  primaryEntity?: string;
  preview?: CustomReportPreviewData;
}

export interface DrilldownClient {
  id: string;
  name: string;
  phone?: string;
  dob?: string;
  address?: string;
  caseId?: string;
  currentStage?: number;
  stageLabel?: string;
  incompleteIntake?: boolean;
  riskLevel?: string;
  programLabel?: string;
  caseManagerName?: string;
}

export interface CaseloadReportData {
  filters: {
    period: string;
    dateFrom: string;
    dateTo: string;
    programId: string;
    caseStatus: string;
    eventId: string;
  };
  filterOptions: {
    programs: { id: string; label: string }[];
    events: { id: string; label: string }[];
  };
  peopleByProgram: {
    programId: string;
    programLabel: string;
    count: number;
    color: string;
  }[];
  multiProgram: {
    count: number;
    distribution: {
      bucketId: string;
      programLabel: string;
      count: number;
      color: string;
    }[];
    clients: {
      clientId: string;
      clientName?: string;
      programCount: number;
      programs: string;
      openCases: number;
      bucketId: string;
    }[];
  };
  caseloadByRisk: { riskLevel: string; count: number }[];
  eventEnrollment: {
    clientId?: string;
    clientName?: string;
    dateEnrolled?: string;
    eventId?: string;
    eventName?: string;
  }[];
  overdueFollowUps: {
    clientId?: string;
    clientName?: string;
    riskLevel?: string;
    daysOverdue?: number;
    cadence?: string;
    lastNote?: { date?: string; type?: string; text?: string } | null;
  }[];
  openCboReferrals: {
    clientId?: string;
    clientName?: string;
    cboName?: string;
    status?: string;
    date?: string;
  }[];
  programGroups?: Record<string, DrilldownClient[]>;
  riskGroups?: Record<string, DrilldownClient[]>;
  clientsById?: Record<string, DrilldownClient>;
  otherEnrollmentsByClient?: Record<string, { eventName: string; dateEnrolled?: string }[]>;
  otherCbosByClient?: Record<string, { cboName: string; status: string; date?: string }[]>;
}

export interface ExecutiveTierData {
  tier: string;
  impact: {
    totalClients: number;
    activeCases: number;
    registrationOnly: number;
    servicesDelivered: number;
    zipDistribution: { zip: string; count: number }[];
    ageDistribution: { ageBand: string; ageBandLabel: string; count: number }[];
  };
  zipGroups?: Record<string, DrilldownClient[]>;
  ageGroups?: Record<string, DrilldownClient[]>;
  kpis: {
    referralCompletionRate: number | null;
    avgTimeToServiceDays: number | null;
    intakeWithin7DayPct: number | null;
    enrollmentTrendPct: number;
  };
  initiatives: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    status: string;
    targetOutreach: number;
    referralsGenerated: number;
    enrollments: number;
    completions: number;
    outreachPct: number;
    completionPct: number;
  }[];
}

export interface OperationalTierData {
  tier: string;
  subdivision: {
    subdivisionId: string;
    subdivisionLabel: string;
    openCases: number;
    uniqueClients: number;
    highRisk: number;
    incompleteIntake: number;
    color: string;
  }[];
  utilization: {
    months: string[];
    series: {
      category: string;
      categoryLabel: string;
      latestUnits: number;
      points: { month: string; units: number }[];
    }[];
  };
  staff: {
    staffId: string;
    staffName: string;
    role: string;
    caseload: number;
    notesLogged: number;
    enrollments: number;
    closures: number;
    estimatedDirectHours: number;
  }[];
  subdivisionGroups?: Record<string, DrilldownClient[]>;
  staffGroups?: Record<string, DrilldownClient[]>;
}

export interface IntegrityTierData {
  tier: string;
  summary: {
    duplicatePairs: number;
    incompleteIntakes: number;
    registrationOnly: number;
    missingCaseManager: number;
    totalIssues: number;
  };
  issues: {
    clientId: string;
    issueType: string;
    clientName: string;
    detail: string;
    severity: string;
  }[];
  auditLog: {
    timestamp: string;
    actor: string;
    action: string;
    entityRef: string;
    reason: string;
  }[];
}

export interface LiaisonRow {
  clientName: string;
  programLabel: string;
  caseManagerName: string;
  caseManagerStatus: string;
  contactPhone: string;
}

export interface WorkflowBoardItem extends CaseSummary {
  currentStageLabel?: string;
  currentStageStatus?: string;
  stageStatuses?: StageStatus[];
}

export const catalogApi = {
  categories(token: string) {
    return authedRequest<{ categories: CaseCategory[] }>('/catalog/case-categories', token);
  },
  workflow(token: string, subcategoryId: string) {
    return authedRequest<Workflow>(`/catalog/workflows/${subcategoryId}`, token);
  },
};

export const caseApi = {
  list(token: string, q?: string) {
    const query = q ? `?q=${encodeURIComponent(q)}` : '';
    return authedRequest<{ items: CaseSummary[] }>(`/cases${query}`, token);
  },
  create(
    token: string,
    payload: { clientId: string; categoryId: string; subcategoryId: string },
  ) {
    return authedRequest<CaseWorkspace>('/cases', token, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  workspace(token: string, caseId: string) {
    return authedRequest<CaseWorkspace>(`/cases/${caseId}/workspace`, token);
  },
  saveIntake(token: string, caseId: string, payload: Record<string, unknown>) {
    return authedRequest<CaseWorkspace>(`/cases/${caseId}/intake`, token, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },
  saveRisk(token: string, caseId: string, payload: { ratings: Record<string, string>; overrideNote?: string }) {
    return authedRequest<CaseWorkspace>(`/cases/${caseId}/risk`, token, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },
  addCarePlanItem(token: string, caseId: string, payload: Omit<CarePlanItem, 'id'>) {
    return authedRequest<CaseWorkspace>(`/cases/${caseId}/care-plan-items`, token, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  voidCarePlanItem(token: string, caseId: string, itemId: string, reason: string) {
    return authedRequest<CaseWorkspace>(`/cases/${caseId}/care-plan-items/${itemId}/void`, token, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },
  addEnrollment(token: string, caseId: string, serviceOrEventId: string) {
    return authedRequest<CaseWorkspace>(`/cases/${caseId}/enrollments`, token, {
      method: 'POST',
      body: JSON.stringify({ serviceOrEventId }),
    });
  },
  addCboReferral(token: string, caseId: string, payload: { cboName: string; status?: string }) {
    return authedRequest<CaseWorkspace>(`/cases/${caseId}/cbo-referrals`, token, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  addNote(token: string, caseId: string, payload: { type: string; text: string }) {
    return authedRequest<CaseWorkspace>(`/cases/${caseId}/notes`, token, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  voidNote(token: string, caseId: string, noteId: string, reason: string) {
    return authedRequest<CaseWorkspace>(`/cases/${caseId}/notes/${noteId}/void`, token, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },
  addReassessment(token: string, caseId: string, payload: { trigger: string; newRatings: Record<string, string> }) {
    return authedRequest<CaseWorkspace>(`/cases/${caseId}/reassessments`, token, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  closeCase(token: string, caseId: string, payload: { reason: string; outcomesSummary: Record<string, string> }) {
    return authedRequest<CaseWorkspace>(`/cases/${caseId}/closure`, token, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  assignToMe(token: string, caseId: string) {
    return authedRequest<CaseWorkspace>(`/cases/${caseId}/assign-to-me`, token, { method: 'POST' });
  },
};

export const eventsApi = {
  list(token: string) {
    return authedRequest<{ items: ServiceEvent[] }>('/catalog/events', token);
  },
  bulkEnroll(token: string, caseIds: string[], serviceOrEventId: string) {
    return authedRequest<{ created: number; skipped: number }>('/enrollments/bulk', token, {
      method: 'POST',
      body: JSON.stringify({ caseIds, serviceOrEventId }),
    });
  },
};

export const workflowApi = {
  board(token: string) {
    return authedRequest<{ board: WorkflowBoardItem[]; handoffs: WorkflowBoardItem[] }>('/workflow/board', token);
  },
};

export const liaisonApi = {
  lookup(token: string, q: string) {
    return authedRequest<{ items: LiaisonRow[] }>(`/liaison/lookup?q=${encodeURIComponent(q)}`, token);
  },
};

export const reportsApi = {
  catalog(token: string) {
    return authedRequest<{ items: ReportCatalogItem[] }>('/reports/catalog', token);
  },
  caseload(
    token: string,
    filters: {
      period?: string;
      dateFrom?: string;
      dateTo?: string;
      programId?: string;
      caseStatus?: string;
      eventId?: string;
    } = {},
  ) {
    const params = new URLSearchParams();
    if (filters.period) params.set('period', filters.period);
    if (filters.dateFrom) params.set('date_from', filters.dateFrom);
    if (filters.dateTo) params.set('date_to', filters.dateTo);
    if (filters.programId) params.set('program_id', filters.programId);
    params.set('case_status', filters.caseStatus ?? 'active');
    if (filters.eventId) params.set('event_id', filters.eventId);
    const query = params.toString();
    return authedRequest<CaseloadReportData>(`/reports/caseload${query ? `?${query}` : ''}`, token);
  },
  custom(
    token: string,
    filters: {
      period?: string;
      dateFrom?: string;
      dateTo?: string;
      programId?: string;
      caseStatus?: string;
      eventId?: string;
    } = {},
  ) {
    const params = new URLSearchParams();
    if (filters.period) params.set('period', filters.period);
    if (filters.dateFrom) params.set('date_from', filters.dateFrom);
    if (filters.dateTo) params.set('date_to', filters.dateTo);
    if (filters.programId) params.set('program_id', filters.programId);
    params.set('case_status', filters.caseStatus ?? 'active');
    if (filters.eventId) params.set('event_id', filters.eventId);
    const query = params.toString();
    return authedRequest<{
      items: CustomReportItem[];
      filterOptions: { programs: { id: string; label: string }[]; events: { id: string; label: string }[] };
    }>(`/reports/custom${query ? `?${query}` : ''}`, token);
  },
  getCustom(token: string, reportId: string) {
    return authedRequest<CustomReportConfig>(`/reports/custom/${encodeURIComponent(reportId)}`, token);
  },
  previewCustom(
    token: string,
    payload: {
      config: Record<string, unknown>;
      period?: string;
      dateFrom?: string;
      dateTo?: string;
      programId?: string;
      caseStatus?: string;
      eventId?: string;
    },
  ) {
    return authedRequest<CustomReportPreviewData>('/reports/custom/preview', token, {
      method: 'POST',
      body: JSON.stringify({
        config: payload.config,
        period: payload.period,
        dateFrom: payload.dateFrom,
        dateTo: payload.dateTo,
        programId: payload.programId,
        caseStatus: payload.caseStatus,
        eventId: payload.eventId,
      }),
    });
  },
  saveCustom(token: string, reportId: string, payload: Record<string, unknown>) {
    return authedRequest<CustomReportConfig>(`/reports/custom/${encodeURIComponent(reportId)}`, token, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },
  createCustom(token: string, payload: Record<string, unknown>) {
    return authedRequest<CustomReportConfig>('/reports/custom', token, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  tier(token: string, tierName: 'executive' | 'operational' | 'integrity') {
    return authedRequest<ExecutiveTierData | OperationalTierData | IntegrityTierData>(
      `/reports/tier/${tierName}`,
      token,
    );
  },
  run(token: string, reportId: string) {
    return authedRequest<{ reportId: string; chartType?: string; data?: { label: string; value: number }[]; rows?: Record<string, unknown>[] }>(
      `/reports/${reportId}`,
      token,
    );
  },
};

export const documentsApi = {
  list(token: string, caseId?: string) {
    const q = caseId ? `?caseId=${encodeURIComponent(caseId)}` : '';
    return authedRequest<{ items: (DocumentSummary & { caseId?: string; clientId?: string })[] }>(
      `/documents${q}`,
      token,
    );
  },
  upload(token: string, payload: { clientId: string; caseId?: string; filename: string; mimeType: string; dataBase64: string }) {
    return authedRequest<{ id: string }>('/documents/upload', token, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  addLink(token: string, payload: { clientId: string; caseId?: string; filename: string; externalUrl: string }) {
    return authedRequest<{ id: string }>('/documents/link', token, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
