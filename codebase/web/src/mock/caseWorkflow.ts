import type { I18nApi } from '../i18n/I18nContext';
import catalog from './generated/workflows.json';
import type { CaseloadView, MockStore } from './types';

export type WorkflowStage = {
  stage: number;
  tabId: string;
  label: string;
  shortLabel: string;
  deliverable: string;
};

export type Workflow = {
  id: string;
  name: string;
  description: string;
  exampleProgram: string;
  focusAreas: string[];
  stages: WorkflowStage[];
};

export type StageStatus = 'complete' | 'in_progress' | 'not_started';

export const TAB_IDS = [
  'intake',
  'assessment',
  'risk',
  'careplan',
  'services',
  'followup',
  'reassessment',
  'closure',
] as const;

const WORKFLOWS_BY_SUBCATEGORY: Record<string, Workflow> = {};
for (const entry of catalog.workflows as (Workflow & { subcategoryId: string })[]) {
  const { subcategoryId, ...workflow } = entry;
  WORKFLOWS_BY_SUBCATEGORY[subcategoryId] = workflow;
}

const DEFAULT_WORKFLOW = catalog.defaultWorkflow as unknown as Workflow;

const FAMILY_BY_SUBCATEGORY = catalog.familyBySubcategory as Record<string, string>;
const DOMAINS_BY_FAMILY = catalog.domainsByFamily as Record<string, string[]>;

/** Stage list of the default (senior) workflow — kept for callers that need a static list. */
export const SENIOR_STAGES = DEFAULT_WORKFLOW.stages;

function scopeIdFor(client?: Partial<CaseloadView> | null): string {
  if (!client) return 'default';
  return client.caseSubcategoryId || client.caseCategoryId || 'default';
}

function resolveWorkflow(subcategoryId: string): Workflow {
  return WORKFLOWS_BY_SUBCATEGORY[subcategoryId] ?? DEFAULT_WORKFLOW;
}

/**
 * Applies `workflow.<scopeId>.*` locale overrides, mirroring the prototype's
 * `localizeWorkflow`. Pass the i18n api to translate; omit it for raw English.
 */
function localizeWorkflow(workflow: Workflow, scopeId: string, i18n?: I18nApi): Workflow {
  if (!i18n) return workflow;
  const base = `workflow.${scopeId}`;
  return {
    ...workflow,
    name: i18n.tOr(`${base}.name`, workflow.name),
    description: i18n.tOr(`${base}.description`, workflow.description),
    exampleProgram: i18n.tOr(`${base}.exampleProgram`, workflow.exampleProgram),
    stages: workflow.stages.map((stage) => {
      const stageBase = `${base}.stages.${stage.tabId}`;
      return {
        ...stage,
        label: i18n.tOr(`${stageBase}.label`, stage.label),
        shortLabel: i18n.tOr(`${stageBase}.label`, stage.shortLabel || stage.label),
        deliverable: i18n.tOr(`${stageBase}.deliverable`, stage.deliverable || ''),
      };
    }),
    focusAreas: (workflow.focusAreas ?? []).map((area, index) =>
      i18n.tOr(`${base}.focusAreas.${index}`, area),
    ),
  };
}

export function workflowForClient(client?: Partial<CaseloadView> | null, i18n?: I18nApi): Workflow {
  const scopeId = scopeIdFor(client);
  return localizeWorkflow(resolveWorkflow(scopeId), scopeId, i18n);
}

export function workflowForSubcategory(subcategoryId?: string | null, i18n?: I18nApi): Workflow {
  const scopeId = subcategoryId || 'default';
  return localizeWorkflow(resolveWorkflow(scopeId), scopeId, i18n);
}

export function stagesForClient(client?: Partial<CaseloadView> | null, i18n?: I18nApi): WorkflowStage[] {
  return workflowForClient(client, i18n).stages;
}

export function listWorkflows(): (Workflow & { subcategoryId: string })[] {
  return catalog.workflows as (Workflow & { subcategoryId: string })[];
}

export function tabsForClient(client?: Partial<CaseloadView> | null, i18n?: I18nApi) {
  const processTabs = stagesForClient(client, i18n).map((s) => ({
    id: s.tabId,
    label: s.label,
    process: true,
    stage: s.stage as number | undefined,
    deliverable: s.deliverable,
  }));
  return [
    ...processTabs,
    {
      id: 'documents',
      label: i18n ? i18n.t('workflow.tabs.documents') : 'Documents',
      process: false,
      stage: undefined,
      deliverable: '',
    },
    {
      id: 'activity',
      label: i18n ? i18n.t('workflow.tabs.activity') : 'Activity',
      process: false,
      stage: undefined,
      deliverable: '',
    },
  ];
}

export function nextTabId(currentTabId: string, client?: Partial<CaseloadView> | null): string | null {
  const stages = stagesForClient(client);
  const idx = stages.findIndex((s) => s.tabId === currentTabId);
  if (idx >= 0 && idx < stages.length - 1) return stages[idx + 1].tabId;
  return null;
}

export function saveContinueLabel(
  currentTabId: string,
  fallback = 'Save',
  client?: Partial<CaseloadView> | null,
  i18n?: I18nApi,
): string {
  const next = nextTabId(currentTabId, client);
  if (!next) return fallback;
  const nextStage = stagesForClient(client, i18n).find((s) => s.tabId === next);
  if (!nextStage) return fallback;
  return i18n
    ? i18n.t('workspace.saveContinue', { next: nextStage.label })
    : `Save & continue to ${nextStage.label}`;
}

export function stageForTab(tabId: string, client?: Partial<CaseloadView> | null): number {
  return stagesForClient(client).find((s) => s.tabId === tabId)?.stage ?? 1;
}

export function tabForStage(stageNum: number, client?: Partial<CaseloadView> | null): string {
  return stagesForClient(client).find((s) => s.stage === stageNum)?.tabId ?? 'intake';
}

export function deliverableForStage(stageNum: number, client?: Partial<CaseloadView> | null): string {
  return stagesForClient(client).find((s) => s.stage === stageNum)?.deliverable ?? '';
}

export function getStatus(client: CaseloadView, i18n?: I18nApi) {
  const stage = client.currentStage || 1;
  const stages = stagesForClient(client, i18n);
  const match = stages.find((s) => s.stage === stage);
  return {
    stage,
    label: match?.label ?? `Stage ${stage}`,
    shortLabel: match?.shortLabel ?? match?.label ?? `Stage ${stage}`,
  };
}

function isClosed(client: CaseloadView): boolean {
  return client.status === 'closed';
}

/**
 * Evidence-based stage status, mirroring the prototype's `_rawStageStatus`:
 * progress is inferred from the records that exist, not from a stage counter.
 */
function rawStageStatus(store: MockStore, client: CaseloadView, stage: number): StageStatus {
  if (isClosed(client)) return 'complete';

  const caseId = client.caseId;
  const intake = store.intakes.find((i) => i.caseId === caseId);
  const referralCount = store.referrals.filter((r) => r.caseId === caseId).length;
  const assessment = store.assessments
    .filter((a) => a.clientId === client.id)
    .sort((a, b) => (b.date > a.date ? 1 : -1))[0];
  const carePlans = store.carePlans.filter((cp) => cp.caseId === caseId && !cp.voided);
  const enrollments = store.enrollments.filter((e) => e.clientId === client.id && !e.voided);
  const notes = store.notes.filter((n) => n.caseId === caseId && !n.voided);
  const reassessments = store.reassessments.filter((r) => r.caseId === caseId);

  switch (stage) {
    case 1:
      if (intake && referralCount && !client.incompleteIntake && intake.completeness !== 'incomplete') {
        return 'complete';
      }
      return referralCount || intake ? 'in_progress' : 'not_started';
    case 2:
      if (intake?.comprehensiveAssessmentNotes) return 'complete';
      return intake && !client.incompleteIntake ? 'in_progress' : 'not_started';
    case 3:
      if (assessment) return 'complete';
      return intake?.comprehensiveAssessmentNotes ? 'in_progress' : 'not_started';
    case 4:
      if (carePlans.length) return 'complete';
      return assessment ? 'in_progress' : 'not_started';
    case 5:
      if (enrollments.length) return 'complete';
      return carePlans.length ? 'in_progress' : 'not_started';
    case 6:
      if (notes.length) return 'complete';
      return enrollments.length ? 'in_progress' : 'not_started';
    case 7:
      if (reassessments.length) return 'complete';
      return notes.length ? 'in_progress' : 'not_started';
    case 8:
      return isClosed(client) ? 'complete' : 'not_started';
    default:
      return 'not_started';
  }
}

/** Stage status with the prototype's "first open stage is in progress" normalisation. */
export function getStageStatus(store: MockStore, client: CaseloadView, stage: number): StageStatus {
  const raw = rawStageStatus(store, client, stage);
  let firstOpen: number | null = null;
  for (let s = 1; s <= 8; s += 1) {
    if (rawStageStatus(store, client, s) !== 'complete') {
      firstOpen = s;
      break;
    }
  }

  if (firstOpen === null) return raw;
  if (stage < firstOpen) return 'complete';
  if (stage === firstOpen) return raw === 'not_started' ? 'in_progress' : raw;
  return 'not_started';
}

export function getAllStageStatuses(store: MockStore, client: CaseloadView, i18n?: I18nApi) {
  return stagesForClient(client, i18n).map((s) => ({
    stage: s.stage,
    tabId: s.tabId,
    label: s.label,
    shortLabel: s.shortLabel || s.label,
    deliverable: s.deliverable,
    status: getStageStatus(store, client, s.stage),
  }));
}

export function normalizeTab(tab: string | null, client: CaseloadView): string {
  const tabs = tabsForClient(client);
  return tabs.some((t) => t.id === tab) ? tab! : 'intake';
}

export function clientStatusLabel(status?: string): string {
  if (status === 'active' || status === 'open') return 'Active';
  if (status === 'closed') return 'Closed';
  return status ?? '—';
}

export function formatDate(value?: string): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function processStageBadge(client: CaseloadView, i18n?: I18nApi) {
  const status = getStatus(client, i18n);
  return { stage: status.stage, label: status.label, shortLabel: status.shortLabel };
}

/** Program family (senior, parenting, mental_health, …) driving forms and risk domains. */
export function familyForClient(client?: Partial<CaseloadView> | null): string {
  if (!client) return 'general';
  return (
    FAMILY_BY_SUBCATEGORY[client.caseSubcategoryId ?? ''] ??
    FAMILY_BY_SUBCATEGORY[client.caseCategoryId ?? ''] ??
    'general'
  );
}

export function domainsForClient(client?: Partial<CaseloadView> | null): string[] {
  return DOMAINS_BY_FAMILY[familyForClient(client)] ?? DOMAINS_BY_FAMILY.senior;
}

/** Domain keys to render: the family's domains plus any extra keys already rated. */
export function ratingDomainKeys(
  client?: Partial<CaseloadView> | null,
  ratings?: Record<string, string> | null,
): string[] {
  const keys = domainsForClient(client).slice();
  if (ratings) {
    for (const key of Object.keys(ratings)) {
      if (!keys.includes(key)) keys.push(key);
    }
  }
  return keys;
}

export const SERVICE_EVENTS = [
  { id: 'evt-meals', label: 'Meals on Wheels Program' },
  { id: 'evt-holiday', label: 'Holiday Meal Program' },
  { id: 'evt-safety', label: 'Home Safety Workshop' },
  { id: 'evt-food-pantry', label: 'Food Pantry' },
  { id: 'evt-therapy', label: 'Therapy Sessions' },
  { id: 'evt-court-advocacy', label: 'Court Advocacy' },
  { id: 'evt-crisis-counseling', label: 'Crisis Counseling' },
  { id: 'evt-flu-awareness', label: 'Flu Shot Awareness' },
];

export function eventLabel(eventId: string): string {
  return SERVICE_EVENTS.find((e) => e.id === eventId)?.label ?? eventId;
}

/**
 * Composite risk score. Mirrors the prototype: `Moderate` weighs the same as
 * `Medium`, and the Medium cut-off is an average of 1.5 (not 1.75).
 */
export function calcComposite(ratings: Record<string, string>): {
  compositeScore: number;
  overallRisk: string;
} {
  const weights: Record<string, number> = { Low: 1, Medium: 2, Moderate: 2, High: 3 };
  const vals = Object.values(ratings)
    .filter((r) => r)
    .map((r) => weights[r] ?? 1);
  const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 1;
  const compositeScore = Math.round(avg * 25);
  const overallRisk = avg >= 2.5 ? 'High' : avg >= 1.5 ? 'Medium' : 'Low';
  return { compositeScore, overallRisk };
}

/** Follow-up cadence by risk level — matches the prototype's FollowUpCadenceService. */
export const FOLLOW_UP_CADENCE: Record<string, { days: number; key: string }> = {
  High: { days: 7, key: 'Weekly' },
  Medium: { days: 30, key: 'Monthly' },
  Moderate: { days: 30, key: 'Monthly' },
  Low: { days: 90, key: 'Quarterly' },
  Unknown: { days: 90, key: 'Quarterly' },
};

export function cadenceForRisk(riskLevel?: string): { days: number; key: string } {
  return FOLLOW_UP_CADENCE[riskLevel ?? 'Unknown'] ?? FOLLOW_UP_CADENCE.Unknown;
}
