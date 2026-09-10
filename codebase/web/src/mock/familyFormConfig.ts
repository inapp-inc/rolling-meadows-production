import type { I18nApi } from '../i18n/I18nContext';
import { familyForClient } from './caseWorkflow';
import type { CaseloadView } from './types';

export type IntakeQuestion = { key: string; fieldId: string; label: string };

/**
 * Labels and picklists for one program family, assembled the same way as the
 * prototype's `RM.I18n.familyFormConfig`: family values win, then `general`,
 * with shared section titles falling back to `forms.base`.
 */
export type FamilyFormConfig = {
  referralSectionTitle: string;
  intakeSectionTitle: string;
  screeningSectionTitle: string;
  livingLabel: string;
  backgroundLabel: string;
  sources: string[];
  reasons: string[];
  intakeQuestions: IntakeQuestion[];
  noteTypes: string[];
  reassessmentTriggers: string[];
  assessmentNoteLabel: string;
  assessmentNotePlaceholder: string;
  assessmentSummaryBackgroundLabel: string;
  riskOverrideLabel: string;
  carePlanIssueLabel: string;
  carePlanGoalLabel: string;
  carePlanServiceLabel: string;
  carePlanListTitle: string;
  servicesTitle: string;
  cboTitle: string;
  followupCadenceTitle: string;
  followupMonitoringTitle: string;
  closureServicesLabel: string;
  closureOutcomesLabel: string;
  closureRisksLabel: string;
  closureReferralLabel: string;
};

const BASE_LABEL_KEYS = [
  'referralSectionTitle',
  'intakeSectionTitle',
  'screeningSectionTitle',
  'livingLabel',
  'backgroundLabel',
] as const;

const LIST_KEYS = ['sources', 'reasons', 'intakeQuestions', 'noteTypes', 'reassessmentTriggers'] as const;

type RawConfig = Record<string, unknown>;

function pickList<T>(...candidates: (T[] | undefined | null)[]): T[] {
  for (const candidate of candidates) {
    if (candidate && candidate.length) return candidate;
  }
  return [];
}

export function familyFormConfig(i18n: I18nApi, family: string): FamilyFormConfig {
  const base = (i18n.tNode<RawConfig>('forms.base') ?? {}) as RawConfig;
  const general = (i18n.tNode<RawConfig>('forms.families.general') ?? {}) as RawConfig;
  const familyCfg = (i18n.tNode<RawConfig>(`forms.families.${family}`) ?? general) as RawConfig;

  const merged: RawConfig = { ...base, ...familyCfg };

  for (const key of BASE_LABEL_KEYS) {
    if (!merged[key] && base[key]) merged[key] = base[key];
  }

  for (const key of LIST_KEYS) {
    merged[key] = pickList(
      merged[key] as unknown[],
      familyCfg[key] as unknown[],
      general[key] as unknown[],
    );
  }

  return merged as unknown as FamilyFormConfig;
}

export function configForClient(i18n: I18nApi, client?: Partial<CaseloadView> | null): FamilyFormConfig {
  return familyFormConfig(i18n, familyForClient(client));
}

export function configForSubcategory(i18n: I18nApi, subcategoryId?: string | null): FamilyFormConfig {
  return familyFormConfig(i18n, familyForClient({ caseSubcategoryId: subcategoryId ?? '' }));
}
