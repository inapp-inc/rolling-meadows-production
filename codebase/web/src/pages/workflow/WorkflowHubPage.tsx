import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ApiError,
  caseApi,
  workflowApi,
  type WorkflowBoardItem,
} from '../../api/client';
import { USE_MOCK_AUTH, useAuth } from '../../auth/AuthContext';
import { AppLayout } from '../../components/AppLayout';
import { CaseWorkflowDrawerBody } from '../../components/CaseWorkflowDrawerBody';
import { EmptyState } from '../../components/EmptyState';
import { SideDrawer } from '../../components/SideDrawer';
import { StepStatusPill } from '../../components/StepStatusPill';
import { useToast } from '../../components/ToastContext';
import { useI18n } from '../../i18n/I18nContext';
import { categoryLabel, subcategoryLabel } from '../../mock/caseCategories';
import { caseloadForUser, findUser } from '../../mock/caseService';
import { useMockData } from '../../mock/MockDataContext';
import { saveStore } from '../../mock/store';
import type { CaseloadView } from '../../mock/types';
import { getAllStageStatuses, getStageStatus, getStatus, workflowForClient } from '../../mock/workflow';

function ProgressTrack({
  name,
  steps,
}: {
  name: string;
  steps: Array<{ tabId?: string; stage: number; label: string; status: string }>;
}) {
  const i18n = useI18n();
  const { t } = i18n;
  const completeCount = steps.filter((step) => step.status === 'complete').length;

  return (
    <div className="workflow-track-wrap">
      <div
        className="workflow-track"
        role="img"
        aria-label={t('pages.workflowHub.processProgressAria', { name })}
      >
        {steps.map((step) => {
          const statusText = i18n.stepStatusLabel(step.status);
          return (
            <span
              key={step.tabId ?? step.stage}
              className={`workflow-track-seg workflow-track-${step.status}`}
              title={`${step.label} — ${statusText}`}
              aria-label={t('pages.workflowHub.stageAria', {
                num: step.stage ?? 0,
                label: step.label,
                status: statusText,
              })}
            >
              <span className="workflow-track-seg-num">
                {step.status === 'complete' ? '✓' : step.stage}
              </span>
            </span>
          );
        })}
      </div>
      <span className="workflow-track-summary">
        {t('pages.workflowHub.stageComplete', { complete: completeCount, total: steps.length })}
      </span>
    </div>
  );
}

function MockProgressTrack({ client }: { client: CaseloadView }) {
  const { store } = useMockData();
  const i18n = useI18n();
  const steps = getAllStageStatuses(store, client, i18n).map((step) => ({
    tabId: step.tabId,
    stage: step.stage,
    label: step.label,
    status: step.status,
  }));
  return <ProgressTrack name={client.name} steps={steps} />;
}

function ApiWorkflowDrawer({ item }: { item: WorkflowBoardItem }) {
  const i18n = useI18n();
  const { t } = i18n;
  const stages = item.stageStatuses ?? [];
  const current = stages.find((stage) => stage.stage === item.currentStage) ?? stages[0];

  return (
    <div className="case-drawer-summary">
      <div className="client-drawer-badges">
        <span className="case-category-badge">
          {categoryLabel(item.caseCategoryId ?? '')} · {subcategoryLabel(item.caseSubcategoryId ?? '')}
        </span>
        {current ? (
          <span className="workflow-stage-badge" data-stage={current.stage}>
            {current.label}
          </span>
        ) : null}
      </div>
      <dl className="client-drawer-meta">
        <div className="drawer-meta-row">
          <dt>{t('components.opened')}</dt>
          <dd>{item.openDate ? i18n.formatDate(item.openDate) : '—'}</dd>
        </div>
        <div className="drawer-meta-row">
          <dt>{t('common.status')}</dt>
          <dd>{i18n.clientStatusLabel(item.status ?? 'active')}</dd>
        </div>
      </dl>
      <div className="drawer-section">
        <h4>{t('components.workflowProgress')}</h4>
        <div className="case-stage-list">
          {stages.map((stage) => (
            <div
              key={stage.tabId ?? stage.stage}
              className={`case-stage-row case-stage-${stage.status}${
                stage.stage === item.currentStage ? ' case-stage-current' : ''
              }`}
            >
              <span className="case-stage-num">{stage.status === 'complete' ? '✓' : stage.stage}</span>
              <div className="case-stage-body">
                <strong>{stage.label}</strong>
                {stage.deliverable ? <span className="case-stage-deliverable">{stage.deliverable}</span> : null}
              </div>
              <StepStatusPill status={stage.status} />
            </div>
          ))}
        </div>
      </div>
      <div className="drawer-actions">
        <Link to={`/cases/${item.id}`} className="btn btn-primary">
          {t('components.openCaseWorkspaceLower')}
        </Link>
        <Link to={`/clients/${item.clientId}?caseId=${item.id}`} className="btn btn-secondary">
          {t('components.view360Lower')}
        </Link>
      </div>
    </div>
  );
}

export function WorkflowHubPage() {
  const { user, token } = useAuth();
  const { store, refresh } = useMockData();
  const i18n = useI18n();
  const { t } = i18n;
  const { showToast } = useToast();
  const [drawerClient, setDrawerClient] = useState<CaseloadView | null>(null);
  const [drawerItem, setDrawerItem] = useState<WorkflowBoardItem | null>(null);
  const [board, setBoard] = useState<WorkflowBoardItem[]>([]);
  const [handoffItems, setHandoffItems] = useState<WorkflowBoardItem[]>([]);
  const [loading, setLoading] = useState(!USE_MOCK_AUTH);
  const [error, setError] = useState('');

  const mockCaseload = useMemo(() => (user ? caseloadForUser(store, user) : []), [store, user]);
  const mockHandoffs = useMemo(
    () =>
      mockCaseload
        .filter((client) => client.incompleteIntake || getStageStatus(store, client, 3) === 'in_progress')
        .slice(0, 8),
    [mockCaseload, store],
  );

  const loadBoard = useCallback(async () => {
    if (USE_MOCK_AUTH || !token) return;
    setLoading(true);
    setError('');
    try {
      const payload = await workflowApi.board(token);
      setBoard(payload.board);
      setHandoffItems(payload.handoffs.slice(0, 8));
    } catch (err) {
      setBoard([]);
      setHandoffItems([]);
      setError(err instanceof ApiError ? err.message : t('pages.workflowHub.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [token, t]);

  useEffect(() => {
    void loadBoard();
  }, [loadBoard]);

  function assignToMeMock(client: CaseloadView) {
    if (!user) return;
    const caseRecord = store.cases.find((c) => c.id === client.caseId);
    if (!caseRecord) return;
    caseRecord.caseManagerId = user.id;
    store.auditLog.push({
      id: `aud-handoff-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor: user.name,
      action: 'case_handoff',
      entityRef: `client:${client.id}`,
      detail: t('audit.assignedTo', { name: user.name }),
    });
    saveStore(store);
    refresh();
    showToast(t('pages.workflowHub.caseAssignedToast'), 'success');
  }

  async function assignToMeApi(item: WorkflowBoardItem) {
    if (!user || !token) return;
    try {
      await caseApi.assignToMe(token, item.id);
      showToast(t('pages.workflowHub.caseAssignedToast'), 'success');
      await loadBoard();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : t('pages.workflowHub.assignFailed'), 'error');
    }
  }

  const caseload = USE_MOCK_AUTH ? mockCaseload : board;
  const handoffs = USE_MOCK_AUTH ? mockHandoffs : handoffItems;

  return (
    <AppLayout navId="workflow-hub">
      {error ? <div className="alert alert-danger">{error}</div> : null}
      <div className="card">
        <div className="card-header">
          <h2>{t('pages.workflowHub.activeByStep')}</h2>
        </div>
        <div id="workflow-board">
          {loading ? (
            <p className="text-muted">{t('common.loading')}</p>
          ) : !caseload.length ? (
            <EmptyState
              title={t('pages.workflowHub.noActiveCases')}
              hint={t('pages.workflowHub.noActiveCasesHint')}
            />
          ) : USE_MOCK_AUTH ? (
            <ul className="workflow-board-list">
              {mockCaseload.map((client) => {
                const workflow = workflowForClient(client, i18n);
                const stageStatus = getStatus(client, i18n);
                const steps = getAllStageStatuses(store, client, i18n);
                const currentStep = steps.find((step) => step.stage === stageStatus.stage);
                const statusClass = currentStep?.status ?? 'not_started';
                const program =
                  subcategoryLabel(client.caseSubcategoryId) || categoryLabel(client.caseCategoryId);
                return (
                  <li
                    key={client.caseId}
                    className="workflow-board-card"
                    data-client-id={client.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setDrawerClient(client)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setDrawerClient(client);
                      }
                    }}
                  >
                    <div className="workflow-board-card-head">
                      <div className="workflow-board-card-title">
                        <strong>{client.name}</strong>
                        <span
                          className={`step-status-pill step-status-${statusClass} workflow-board-current`}
                          title={stageStatus.label}
                        >
                          {t('workspace.stageChip', { stage: stageStatus.stage })}
                        </span>
                      </div>
                      <Link
                        to={`/cases/${client.caseId}`}
                        className="btn btn-sm btn-secondary"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {t('pages.workflowHub.open')}
                      </Link>
                    </div>
                    <p className="workflow-board-meta">
                      {program} · {workflow.name}
                    </p>
                    <p className="workflow-board-current-label">{stageStatus.label}</p>
                    <MockProgressTrack client={client} />
                  </li>
                );
              })}
            </ul>
          ) : (
            <ul className="workflow-board-list">
              {board.map((item) => {
                const program =
                  subcategoryLabel(item.caseSubcategoryId ?? '') || categoryLabel(item.caseCategoryId ?? '');
                const stages = (item.stageStatuses ?? []).map((step) => ({
                  tabId: step.tabId,
                  stage: step.stage ?? 0,
                  label: step.label,
                  status: step.status,
                }));
                const currentStep = stages.find((step) => step.stage === item.currentStage);
                const statusClass = currentStep?.status ?? item.currentStageStatus ?? 'not_started';
                return (
                  <li
                    key={item.id}
                    className="workflow-board-card"
                    data-client-id={item.clientId}
                    role="button"
                    tabIndex={0}
                    onClick={() => setDrawerItem(item)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setDrawerItem(item);
                      }
                    }}
                  >
                    <div className="workflow-board-card-head">
                      <div className="workflow-board-card-title">
                        <strong>{item.clientName}</strong>
                        <span
                          className={`step-status-pill step-status-${statusClass} workflow-board-current`}
                          title={item.currentStageLabel}
                        >
                          {t('workspace.stageChip', { stage: item.currentStage ?? 1 })}
                        </span>
                      </div>
                      <Link
                        to={`/cases/${item.id}`}
                        className="btn btn-sm btn-secondary"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {t('pages.workflowHub.open')}
                      </Link>
                    </div>
                    <p className="workflow-board-meta">{program}</p>
                    <p className="workflow-board-current-label">{item.currentStageLabel}</p>
                    <ProgressTrack name={item.clientName ?? ''} steps={stages} />
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>{t('pages.workflowHub.roleHandoffs')}</h2>
        </div>
        <div id="handoff-list">
          {!handoffs.length ? (
            <EmptyState
              title={t('pages.workflowHub.noPendingHandoffs')}
              hint={t('pages.workflowHub.noPendingHandoffsHint')}
            />
          ) : USE_MOCK_AUTH ? (
            <ul className="handoff-list">
              {mockHandoffs.map((client) => {
                const cm = findUser(store, client.caseManagerId);
                const task = client.incompleteIntake
                  ? t('pages.workflowHub.completeIntakeTask')
                  : t('pages.workflowHub.reviewRiskTask');
                return (
                  <li key={client.caseId} className="handoff-item">
                    <div>
                      <strong>{client.name}</strong>
                      <span className="handoff-task">{task}</span>
                    </div>
                    <div className="handoff-meta">
                      {t('pages.workflowHub.assigned')}{' '}
                      {cm?.name ?? t('pages.workflowHub.unassigned')}
                      {user?.role === 'supervisor' ? (
                        <>
                          {' · '}
                          <button
                            type="button"
                            className="btn btn-sm btn-secondary handoff-claim"
                            onClick={() => assignToMeMock(client)}
                          >
                            {t('pages.workflowHub.assignToMe')}
                          </button>
                        </>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <ul className="handoff-list">
              {handoffItems.map((item) => {
                const task = item.incompleteIntake
                  ? t('pages.workflowHub.completeIntakeTask')
                  : t('pages.workflowHub.reviewRiskTask');
                return (
                  <li key={item.id} className="handoff-item">
                    <div>
                      <strong>{item.clientName}</strong>
                      <span className="handoff-task">{task}</span>
                    </div>
                    <div className="handoff-meta">
                      {t('pages.workflowHub.assigned')}{' '}
                      {item.caseManagerId ?? t('pages.workflowHub.unassigned')}
                      {user?.role === 'supervisor' ? (
                        <>
                          {' · '}
                          <button
                            type="button"
                            className="btn btn-sm btn-secondary handoff-claim"
                            onClick={() => void assignToMeApi(item)}
                          >
                            {t('pages.workflowHub.assignToMe')}
                          </button>
                        </>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {USE_MOCK_AUTH ? (
        <SideDrawer
          title={drawerClient?.name ?? ''}
          open={Boolean(drawerClient)}
          onClose={() => setDrawerClient(null)}
        >
          {drawerClient ? <CaseWorkflowDrawerBody client={drawerClient} /> : null}
        </SideDrawer>
      ) : (
        <SideDrawer
          title={drawerItem?.clientName ?? ''}
          open={Boolean(drawerItem)}
          onClose={() => setDrawerItem(null)}
        >
          {drawerItem ? <ApiWorkflowDrawer item={drawerItem} /> : null}
        </SideDrawer>
      )}
    </AppLayout>
  );
}
