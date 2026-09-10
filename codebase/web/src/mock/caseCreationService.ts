import { workflowForSubcategory } from './caseWorkflow';
import { saveStore } from './store';
import type { MockCase, MockStore } from './types';

const CATEGORY_PROGRAM: Record<string, string> = {
  'cat-senior-services': 'prog-senior-services',
  'cat-community-services': 'prog-community-services',
  'cat-parenting-support': 'prog-parenting-support',
  'cat-mental-health': 'prog-mental-health',
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function nextCaseNumber(store: MockStore): string {
  const year = new Date().getFullYear();
  const seq = store.cases.length + 1;
  return `RM-${year}-${String(seq).padStart(4, '0')}`;
}

export function createCase(
  store: MockStore,
  payload: {
    clientId: string;
    categoryId: string;
    subcategoryId: string;
    caseManagerId: string;
    incompleteIntake?: boolean;
  },
): MockCase {
  const client = store.clients.find((c) => c.id === payload.clientId);
  if (!client) throw new Error('Client not found');

  const caseRecord: MockCase = {
    id: `case-${Date.now()}`,
    clientId: payload.clientId,
    caseNumber: nextCaseNumber(store),
    programId: CATEGORY_PROGRAM[payload.categoryId] ?? 'prog-senior-services',
    caseCategoryId: payload.categoryId,
    caseSubcategoryId: payload.subcategoryId,
    caseManagerId: payload.caseManagerId,
    status: 'active',
    currentStage: 1,
    incompleteIntake: payload.incompleteIntake ?? true,
    openDate: today(),
    createdAt: today(),
  };

  store.cases.push(caseRecord);
  store.auditLog.push({
    id: `aud-case-${caseRecord.id}`,
    timestamp: new Date().toISOString(),
    actor: 'Case Manager',
    action: 'case_opened',
    entityRef: caseRecord.id,
    reason: `${caseRecord.caseNumber} — ${client.name}`,
  });
  saveStore(store);
  return caseRecord;
}

export function categoryProgramId(categoryId: string): string {
  return CATEGORY_PROGRAM[categoryId] ?? 'prog-senior-services';
}

export function workflowPreviewForSubcategory(subcategoryId: string) {
  return workflowForSubcategory(subcategoryId);
}
