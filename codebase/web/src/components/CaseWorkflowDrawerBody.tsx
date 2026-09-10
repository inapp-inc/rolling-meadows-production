import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useI18n } from '../i18n/I18nContext';
import { findUser } from '../mock/caseService';
import { getAllStageStatuses, getStatus, workflowForClient } from '../mock/caseWorkflow';
import { useMockData } from '../mock/MockDataContext';
import { categoryLabel, subcategoryLabel } from '../mock/caseCategories';
import type { CaseloadView } from '../mock/types';
import { StepStatusPill } from './StepStatusPill';

/**
 * Full case/workflow summary shown in the side drawer from the dashboard,
 * workflow hub, case search, and client search. Mirrors the prototype's
 * `RM.Components.caseWorkflowDrawerBody`.
 */
export function CaseWorkflowDrawerBody({ client }: { client: CaseloadView }) {
  const { store } = useMockData();
  const i18n = useI18n();
  const { t } = i18n;
  const { user } = useAuth();

  const workflow = workflowForClient(client, i18n);
  const statuses = getAllStageStatuses(store, client, i18n);
  const current = getStatus(client, i18n);
  const caseManager = client.caseManagerId ? findUser(store, client.caseManagerId) : undefined;
  const referral =
    store.referrals.find((r) => r.caseId === client.caseId) ??
    store.referrals.find((r) => r.clientId === client.id);

  const workspaceUrl = client.caseId ? `/cases/${client.caseId}` : null;
  const profileUrl = client.caseId
    ? `/clients/${client.id}?caseId=${client.caseId}`
    : `/clients/${client.id}`;

  return (
    <div className="case-drawer-summary">
      <p className="case-detail-sub">{workflow.name}</p>

      <div className="client-drawer-badges">
        <span className="case-category-badge">
          {categoryLabel(client.caseCategoryId)} · {subcategoryLabel(client.caseSubcategoryId)}
        </span>
        <span className="workflow-stage-badge" data-stage={current.stage}>
          {current.shortLabel}
        </span>
      </div>

      <dl className="client-drawer-meta">
        <div className="drawer-meta-row">
          <dt>{t('components.caseManager')}</dt>
          <dd>{caseManager?.name ?? '—'}</dd>
        </div>
        <div className="drawer-meta-row">
          <dt>{t('components.opened')}</dt>
          <dd>{i18n.formatDate(client.openDate || client.createdAt)}</dd>
        </div>
        <div className="drawer-meta-row">
          <dt>{t('common.status')}</dt>
          <dd>{i18n.clientStatusLabel(client.status)}</dd>
        </div>
      </dl>

      <p className="case-detail-desc">{workflow.description}</p>

      {referral ? (
        <p className="case-detail-example">
          <strong>{t('components.referralLabel')}</strong>{' '}
          {i18n.referralSourceLabel(referral.source)} — {i18n.referralReasonLabel(referral.reason)}
        </p>
      ) : null}

      {workflow.exampleProgram ? (
        <p className="case-detail-example">
          <strong>{t('components.programExample')}</strong> {workflow.exampleProgram}
        </p>
      ) : null}

      <div className="drawer-section">
        <h4>{t('components.focusAreas')}</h4>
        {workflow.focusAreas.length ? (
          <ul className="case-focus-list">
            {workflow.focusAreas.map((area) => (
              <li key={area}>{area}</li>
            ))}
          </ul>
        ) : (
          <p className="text-muted">{t('components.noFocusAreas')}</p>
        )}
      </div>

      <div className="drawer-section">
        <h4>{t('components.workflowProgress')}</h4>
        <div className="case-stage-list">
          {statuses.map((s) => (
            <div
              key={s.tabId}
              className={`case-stage-row case-stage-${s.status}${
                s.stage === current.stage ? ' case-stage-current' : ''
              }`}
            >
              <span className="case-stage-num">{s.status === 'complete' ? '✓' : s.stage}</span>
              <div className="case-stage-body">
                <strong>{s.label}</strong>
                {s.deliverable ? <span className="case-stage-deliverable">{s.deliverable}</span> : null}
              </div>
              <StepStatusPill status={s.status} />
            </div>
          ))}
        </div>
      </div>

      <div className="drawer-actions">
        {workspaceUrl && user?.role !== 'auditor' ? (
          <Link to={workspaceUrl} className="btn btn-primary">
            {t('components.openCaseWorkspaceLower')}
          </Link>
        ) : null}
        <Link to={profileUrl} className="btn btn-secondary">
          {t('components.view360Lower')}
        </Link>
      </div>
    </div>
  );
}
