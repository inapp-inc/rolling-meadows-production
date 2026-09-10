import type { UserRole } from '../api/client';

export type MockUser = {
  id: string;
  name: string;
  role: UserRole;
  programId: string;
  status: string;
  /** Direct line surfaced to cross-program liaisons who cannot see case detail. */
  contactPhone?: string;
};

/** Free-text screening answers keyed by question id (livesWith, mealPrep, …). */
export type IntakeQuestionAnswers = Record<string, string>;

export type MockClient = {
  id: string;
  name: string;
  dob: string;
  phone: string;
  address: string;
  registeredAt: string;
  registrationSource?: string;
  demographics?: Record<string, unknown>;
  contactReason?: string;
  screeningNotes?: string;
  emergencyTrigger?: string;
  serviceNeed?: boolean;
  status?: string;
  crossProgramActive?: boolean;
  screening?: {
    date?: string;
    contactReason?: string;
    notes?: string;
    intakeQuestions?: IntakeQuestionAnswers;
  };
};

export type MockReportSubscription = {
  id: string;
  userId: string;
  reportKey: string;
  reportKind: string;
  reportLabel: string;
  email: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  createdAt: string;
  updatedAt: string;
};

export type MockCase = {
  id: string;
  clientId: string;
  caseNumber: string;
  programId: string;
  caseCategoryId: string;
  caseSubcategoryId: string;
  caseManagerId: string;
  status: string;
  currentStage: number;
  incompleteIntake?: boolean;
  openDate: string;
  createdAt: string;
};

export type CaseloadView = MockClient & {
  caseId: string;
  caseNumber: string;
  programId: string;
  caseCategoryId: string;
  caseSubcategoryId: string;
  caseManagerId: string;
  status: string;
  currentStage: number;
  incompleteIntake?: boolean;
  openDate: string;
  createdAt: string;
};

export type MockAssessment = {
  id: string;
  clientId: string;
  caseId: string;
  date: string;
  overallRisk: string;
  compositeScore: number;
  ratings: Record<string, string>;
  /** Case manager's justification when overriding the calculated level. */
  overrideNote?: string;
  assessorId?: string;
};

export type MockEnrollment = {
  id: string;
  clientId: string;
  caseId: string;
  serviceOrEventId: string;
  dateEnrolled: string;
  status?: string;
  voided?: boolean;
  voidReason?: string;
};

export type MockCboReferral = {
  id: string;
  clientId: string;
  caseId: string;
  cboName: string;
  status: string;
  date: string;
};

export type MockDocument = {
  id: string;
  clientId: string;
  caseId?: string;
  name: string;
  /** 'link' | 'upload' | 'file' for uploads, legacy seed values like consent/assessment. */
  type: string;
  uploadedAt: string;
  uploadedBy?: string;
  externalUrl?: string;
  mimeType?: string;
  /** Data URL for locally "uploaded" demo files, so preview works offline. */
  dataUrl?: string;
  size?: number;
  /** Where the document was added (case-workspace, client-profile, intake, etc.). */
  stageContext?: string;
};

export type MockCarePlan = {
  id: string;
  clientId: string;
  caseId: string;
  issue: string;
  goal: string;
  service: string;
  status: string;
  voided?: boolean;
  voidReason?: string;
};

export type MockCustomReport = {
  id: string;
  name: string;
  reportType: 'table' | 'chart';
  ownerId: string;
  shared: boolean;
  primaryEntity: string;
  joins: string[];
  columns: { entity: string; field: string; label?: string }[];
  filters: { entity: string; field: string; op: string; value: string }[];
  sortBy: { entity: string; field: string; dir: string };
  joinAggregates: Record<string, string>;
  chart?: {
    xAxis?: { entity: string; field: string } | null;
    yAxis?: { entity?: string; field?: string; aggregate: string; cumulative?: boolean };
    chartType?: string;
    xGrouping?: string;
  };
  updatedAt: string;
};

export type MockNote = {
  id: string;
  clientId: string;
  caseId: string;
  date: string;
  type: string;
  text: string;
  voided?: boolean;
  voidReason?: string;
};

export type MockReferral = {
  id: string;
  clientId: string;
  caseId: string;
  source: string;
  reason: string;
  referredBy?: string;
  dateReceived: string;
};

export type MockIntake = {
  id: string;
  clientId: string;
  caseId: string;
  consentOnFile?: boolean;
  livingArrangement?: string;
  medicalHistory?: string;
  comprehensiveAssessmentNotes?: string;
  completeness?: string;
  intakeQuestions?: IntakeQuestionAnswers;
};

export type MockReassessment = {
  id: string;
  clientId: string;
  caseId: string;
  date: string;
  trigger?: string;
  previousRatings?: Record<string, string>;
  newRatings?: Record<string, string>;
};

export type MockClosure = {
  id: string;
  clientId: string;
  caseId: string;
  date: string;
  reason: string;
  outcomesSummary?: Record<string, string>;
};

export type MockInitiative = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
  targetOutreach: number;
  referralsGenerated: number;
  enrollments: number;
  completions: number;
};

export type MockAuditEntry = {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  /** Either a bare case id or a `"<entity>:<id>"` reference (e.g. `enrollment:enr-1`). */
  entityRef: string;
  detail?: string;
  reason?: string;
};

export type MockStore = {
  users: MockUser[];
  clients: MockClient[];
  cases: MockCase[];
  assessments: MockAssessment[];
  enrollments: MockEnrollment[];
  cboReferrals: MockCboReferral[];
  documents: MockDocument[];
  carePlans: MockCarePlan[];
  notes: MockNote[];
  referrals: MockReferral[];
  intakes: MockIntake[];
  reassessments: MockReassessment[];
  closures: MockClosure[];
  initiatives: MockInitiative[];
  auditLog: MockAuditEntry[];
  customReports: MockCustomReport[];
  reportSubscriptions: MockReportSubscription[];
  meta: MockStoreMeta;
};

/** Loose key/value bag mirroring the prototype's `RM.Store.getMeta` / `setMeta`. */
export type MockStoreMeta = {
  /** `"idA::idB"` (ids sorted) for duplicate pairs a supervisor chose to keep separate. */
  dismissedDuplicatePairs?: string[];
  [key: string]: unknown;
};
