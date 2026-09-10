import type { CaseWorkspace } from '../api/client';
import type { I18nApi } from '../i18n/I18nContext';
import type { CaseloadView } from '../mock/types';

/** Minimal caseload scope derived from API workspace (for form config + tab navigation). */
export function scopeFromWorkspace(ws: CaseWorkspace): Partial<CaseloadView> {
  return {
    id: ws.client.id,
    caseId: ws.case.id,
    caseCategoryId: ws.case.caseCategoryId,
    caseSubcategoryId: ws.case.caseSubcategoryId,
    currentStage: ws.currentStage,
    status: ws.case.status,
    incompleteIntake: ws.case.incompleteIntake,
    name: ws.client.name,
    phone: ws.client.phone,
    address: ws.client.address,
    caseNumber: ws.case.caseNumber,
    caseManagerId: ws.case.caseManagerId,
    programId: ws.case.programId,
    createdAt: ws.case.openDate,
  };
}

export function tabsForWorkspace(ws: CaseWorkspace, i18n: I18nApi) {
  const processTabs = ws.workflow.stages.map((s) => ({
    id: s.tabId,
    label: s.label,
    process: true,
    stage: s.stage,
    deliverable: s.deliverable,
  }));
  return [
    ...processTabs,
    {
      id: 'documents',
      label: i18n.t('workflow.tabs.documents'),
      process: false,
      stage: undefined,
      deliverable: '',
    },
    {
      id: 'activity',
      label: i18n.t('workflow.tabs.activity'),
      process: false,
      stage: undefined,
      deliverable: '',
    },
  ];
}

export function normalizeTabForWorkspace(tab: string | null, ws: CaseWorkspace, i18n: I18nApi): string {
  const tabs = tabsForWorkspace(ws, i18n);
  return tabs.some((t) => t.id === tab) ? tab! : 'intake';
}

export function nextTabForWorkspace(currentTabId: string, ws: CaseWorkspace): string | null {
  const stages = ws.workflow.stages;
  const idx = stages.findIndex((s) => s.tabId === currentTabId);
  if (idx >= 0 && idx < stages.length - 1) return stages[idx + 1].tabId;
  return null;
}

export function stageStatusForWorkspace(ws: CaseWorkspace) {
  const stage = ws.currentStage || 1;
  const match = ws.workflow.stages.find((s) => s.stage === stage);
  return {
    stage,
    label: match?.label ?? `Stage ${stage}`,
    shortLabel: match?.label ?? `Stage ${stage}`,
  };
}

export function applyIntakeFormFromWorkspace(
  ws: CaseWorkspace,
  setIntakeValues: (values: import('../components/IntakeFormFields').IntakeFormValues) => void,
  setAssessmentNotes: (notes: string) => void,
) {
  setIntakeValues({
    refSource: ws.referral?.source ?? '',
    refReason: ws.referral?.reason ?? '',
    refBy: ws.referral?.referrerName ?? '',
    clientName: ws.client.name,
    clientDob: ws.client.dob ?? '',
    clientPhone: ws.client.phone,
    clientAddress: ws.client.address,
    living: ws.intake?.livingArrangement ?? '',
    medical: ws.intake?.medicalHistory ?? '',
    consent: Boolean(ws.intake?.consentOnFile),
    intakeQuestions: {},
  });
  setAssessmentNotes(ws.intake?.comprehensiveAssessmentNotes ?? '');
}
