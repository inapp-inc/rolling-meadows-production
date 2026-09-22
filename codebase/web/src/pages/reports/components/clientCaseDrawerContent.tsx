import type { ReactNode } from 'react';
import type { DrilldownClient } from '../../../api/client';
import type { I18nApi } from '../../../i18n/I18nContext';
import { categoryLabel } from '../../../mock/caseCategories';
import { viewForCase } from '../../../mock/caseService';
import { configForClient } from '../../../mock/familyFormConfig';
import type { MockStore } from '../../../mock/types';
import type { DrawerMetaRow, DrawerSection } from './ClientDrawerBody';

type ClientCaseDrawerOptions = {
  workspaceTab?: string;
  badge?: ReactNode;
  alert?: { type: 'info' | 'warning' | 'success'; message: string };
};

export function buildClientCaseDrawerContent(
  store: MockStore,
  client: DrilldownClient,
  i18n: I18nApi,
  options: ClientCaseDrawerOptions = {},
): {
  workspaceTab?: string;
  badge?: ReactNode;
  alert?: ClientCaseDrawerOptions['alert'];
  metaRows: DrawerMetaRow[];
  sections: DrawerSection[];
} {
  const { t, referralSourceLabel, referralReasonLabel, intakeCompletenessLabel, riskLabel, noteTypeLabel, formatDate } =
    i18n;
  const caseId = client.caseId;
  const view = caseId ? viewForCase(store, caseId) : null;
  const cfg = configForClient(i18n, view);
  const openCase = caseId ? store.cases.find((c) => c.id === caseId) : undefined;

  const referral =
    (caseId ? store.referrals.find((r) => r.caseId === caseId) : undefined) ??
    store.referrals.find((r) => r.clientId === client.id);
  const intake = caseId ? store.intakes.find((i) => i.caseId === caseId) : undefined;
  const assessment = store.assessments
    .filter((a) => a.clientId === client.id)
    .sort((a, b) => (b.date > a.date ? 1 : -1))[0];
  const carePlans = caseId ? store.carePlans.filter((cp) => cp.caseId === caseId) : [];
  const latestNote = store.notes
    .filter((n) => n.clientId === client.id)
    .sort((a, b) => (b.date > a.date ? 1 : -1))[0];

  const metaRows: DrawerMetaRow[] = [
    { label: t('components.dob'), value: formatDate(client.dob) },
    { label: t('components.phone'), value: client.phone },
    { label: t('components.address'), value: client.address },
    { label: t('case.caseCategory'), value: categoryLabel(openCase?.caseCategoryId) },
    { label: t('common.processStage'), value: client.stageLabel },
    { label: t('components.caseManager'), value: client.caseManagerName },
  ];

  const sections: DrawerSection[] = [];

  if (referral || intake) {
    sections.push({
      title: cfg.intakeSectionTitle,
      body: (
        <>
          {referral ? (
            <>
              <p>
                <strong>{t('components.sourceLabel')}</strong> {referralSourceLabel(referral.source)}
              </p>
              <p>
                <strong>{t('components.reasonLabel')}</strong> {referralReasonLabel(referral.reason)}
              </p>
              <p>
                <strong>{t('components.receivedLabel')}</strong> {formatDate(referral.dateReceived)}
              </p>
            </>
          ) : null}
          {intake ? (
            <>
              <p>
                <strong>{cfg.livingLabel}:</strong> {intake.livingArrangement || '—'}
              </p>
              <p>
                <strong>{cfg.backgroundLabel}:</strong> {intake.medicalHistory || '—'}
              </p>
              <p>
                <strong>{t('components.consentLabel')}</strong>{' '}
                {intake.consentOnFile ? t('components.consentOnFile') : t('components.consentMissing')}
              </p>
              <p>
                <strong>{t('components.statusLabel')}</strong> {intakeCompletenessLabel(intake.completeness) || '—'}
              </p>
            </>
          ) : null}
        </>
      ),
    });
  }

  if (intake?.comprehensiveAssessmentNotes) {
    sections.push({
      title: cfg.screeningSectionTitle,
      body: (
        <p>
          <strong>{cfg.assessmentNoteLabel}:</strong> {intake.comprehensiveAssessmentNotes}
        </p>
      ),
    });
  }

  if (assessment) {
    sections.push({
      title: t('pages.reportBuilder.entities.riskAssessment'),
      body: (
        <>
          <p className="profile-inline-meta">
            {formatDate(assessment.date)} · {t('components.composite')} {assessment.compositeScore} ·{' '}
            {riskLabel(assessment.overallRisk)}
          </p>
          {assessment.ratings ? (
            <ul className="drawer-list">
              {Object.entries(assessment.ratings).map(([domain, rating]) => (
                <li key={domain}>
                  <strong>{domain}</strong> — {rating}
                </li>
              ))}
            </ul>
          ) : null}
        </>
      ),
    });
  }

  if (carePlans.length) {
    sections.push({
      title: cfg.carePlanListTitle,
      body: (
        <ul className="drawer-list">
          {carePlans.slice(0, 3).map((cp) => (
            <li key={cp.id}>
              <strong>{cp.issue}</strong> — {cp.goal} · {cp.status}
            </li>
          ))}
          {carePlans.length > 3 ? (
            <li className="drawer-list-more">{t('components.moreInWorkspace', { count: carePlans.length - 3 })}</li>
          ) : null}
        </ul>
      ),
    });
  }

  if (latestNote) {
    sections.push({
      title: cfg.followupMonitoringTitle,
      body: (
        <div className="note-entry drawer-note">
          <div className="note-meta">
            {formatDate(latestNote.date)} · {noteTypeLabel(latestNote.type)}
          </div>
          <p>{latestNote.text}</p>
        </div>
      ),
    });
  }

  return {
    workspaceTab: options.workspaceTab,
    badge: options.badge,
    alert: options.alert,
    metaRows,
    sections,
  };
}
