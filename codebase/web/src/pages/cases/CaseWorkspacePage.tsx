import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ApiError, caseApi, type CaseWorkspace, type StageStatus } from '../../api/client';
import { USE_MOCK_AUTH, useAuth } from '../../auth/AuthContext';
import { CaseStageTabs } from './CaseStageTabs';
import {
  emptyIntakeValues,
  IntakeFormFields,
  type IntakeFormValues,
} from '../../components/IntakeFormFields';
import { useI18n } from '../../i18n/I18nContext';
import { programLabel } from '../../mock/caseCategories';
import { viewForCase } from '../../mock/caseService';
import { normalizeTab, tabsForClient, getStatus, nextTabId, stagesForClient } from '../../mock/caseWorkflow';
import { configForClient } from '../../mock/familyFormConfig';
import { useMockData } from '../../mock/MockDataContext';
import { buildWorkspace, saveIntake } from '../../mock/workspaceService';
import { RiskBadge } from '../../components/RiskBadge';
import {
  applyIntakeFormFromWorkspace,
  normalizeTabForWorkspace,
  nextTabForWorkspace,
  scopeFromWorkspace,
  stageStatusForWorkspace,
  tabsForWorkspace,
} from '../../utils/caseWorkspaceUtils';

function stepperClass(status: string): string {
  if (status === 'complete') return 'complete';
  if (status === 'in_progress') return 'in_progress';
  return 'not_started';
}

function WorkspaceStepper({
  stages,
  activeTab,
  onSelectTab,
}: {
  stages: StageStatus[];
  activeTab: string;
  onSelectTab: (tabId: string) => void;
}) {
  const { t } = useI18n();
  const processStages = stages.filter((s) => s.stage);
  const activeStage = processStages.find((s) => s.tabId === activeTab)?.stage;

  return (
    <div className="stepper-wrap">
      <div className="stepper-legend" aria-hidden="true">
        <span className="step-legend-item step-legend-complete">{t('stepStatus.legendComplete')}</span>
        <span className="step-legend-item step-legend-in-progress">{t('stepStatus.legendInProgress')}</span>
        <span className="step-legend-item step-legend-not-started">{t('stepStatus.legendNotStarted')}</span>
      </div>
      <nav className="workflow-stepper workflow-stepper-fit" aria-label={t('components.processStageTitle')}>
        <ol>
          {processStages.map((s) => {
            const cls = [stepperClass(s.status), s.stage === activeStage ? 'active' : ''].filter(Boolean).join(' ');
            const indicator = s.status === 'complete' ? '✓' : String(s.stage);
            return (
              <li key={s.tabId} className={cls} title={s.deliverable}>
                <a
                  href={`?tab=${s.tabId}`}
                  onClick={(event) => {
                    event.preventDefault();
                    onSelectTab(s.tabId);
                  }}
                >
                  <span className="step-num">{indicator}</span>
                  <span className="step-label">{s.label}</span>
                </a>
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}

export function CaseWorkspacePage() {
  const { caseId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { token } = useAuth();
  const { store, refresh } = useMockData();
  const i18n = useI18n();
  const { t } = i18n;
  const [ws, setWs] = useState<CaseWorkspace | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!USE_MOCK_AUTH);

  const rawTab = searchParams.get('tab');
  const mockView = useMemo(() => (caseId && USE_MOCK_AUTH ? viewForCase(store, caseId) : null), [store, caseId]);
  const scope = useMemo(() => (ws ? scopeFromWorkspace(ws) : mockView), [ws, mockView]);

  const activeTab = useMemo(() => {
    if (USE_MOCK_AUTH && mockView) return normalizeTab(rawTab, mockView);
    if (ws) return normalizeTabForWorkspace(rawTab, ws, i18n);
    return 'intake';
  }, [rawTab, mockView, ws, i18n]);

  const formConfig = useMemo(() => configForClient(i18n, scope), [i18n, scope]);

  const [intakeValues, setIntakeValues] = useState<IntakeFormValues>(emptyIntakeValues);
  const [assessmentNotes, setAssessmentNotes] = useState('');

  const loadWorkspace = useCallback(async () => {
    if (!caseId) return;
    if (USE_MOCK_AUTH) {
      try {
        const data = buildWorkspace(store, caseId);
        setWs(data);
        applyIntakeFormFromWorkspace(data, setIntakeValues, setAssessmentNotes);
        setIntakeValues((current) => ({
          ...current,
          intakeQuestions: { ...(store.intakes.find((i) => i.caseId === caseId)?.intakeQuestions ?? {}) },
        }));
        setError('');
      } catch {
        setError(t('workspace.clientNotFound'));
        setWs(null);
      }
      return;
    }

    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const data = await caseApi.workspace(token, caseId);
      setWs(data);
      applyIntakeFormFromWorkspace(data, setIntakeValues, setAssessmentNotes);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('workspace.clientNotFound'));
      setWs(null);
    } finally {
      setLoading(false);
    }
  }, [caseId, store, token, t]);

  useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);

  useEffect(() => {
    if (rawTab !== activeTab && caseId) {
      setSearchParams({ tab: activeTab });
    }
  }, [activeTab, rawTab, caseId, setSearchParams]);

  function selectTab(tabId: string) {
    setSearchParams({ tab: tabId });
    setMessage('');
  }

  function handleUpdate(updated: CaseWorkspace) {
    setWs(updated);
    applyIntakeFormFromWorkspace(updated, setIntakeValues, setAssessmentNotes);
    if (USE_MOCK_AUTH) refresh();
  }

  function advanceAfterSave(tabId: string) {
    if (USE_MOCK_AUTH && mockView) {
      const next = nextTabId(tabId, mockView);
      if (next) selectTab(next);
      return;
    }
    if (ws) {
      const next = nextTabForWorkspace(tabId, ws);
      if (next) selectTab(next);
    }
  }

  async function saveIntakeForm(e: FormEvent) {
    e.preventDefault();
    if (!caseId || ws?.readOnly) return;
    setSaving(true);
    setMessage('');
    setError('');
    try {
      if (USE_MOCK_AUTH) {
        const updated = saveIntake(store, caseId, {
          name: intakeValues.clientName,
          dob: intakeValues.clientDob || undefined,
          phone: intakeValues.clientPhone,
          address: intakeValues.clientAddress,
          referral: {
            source: intakeValues.refSource,
            reason: intakeValues.refReason,
            referrerName: intakeValues.refBy,
          },
          intake: {
            consentOnFile: intakeValues.consent,
            livingArrangement: intakeValues.living,
            medicalHistory: intakeValues.medical,
            comprehensiveAssessmentNotes: assessmentNotes,
            intakeQuestions: intakeValues.intakeQuestions,
          },
        });
        handleUpdate(updated);
      } else if (token) {
        const updated = await caseApi.saveIntake(token, caseId, {
          name: intakeValues.clientName,
          dob: intakeValues.clientDob || undefined,
          phone: intakeValues.clientPhone,
          address: intakeValues.clientAddress,
          referral: {
            source: intakeValues.refSource,
            reason: intakeValues.refReason,
            referrerName: intakeValues.refBy,
          },
          intake: {
            consentOnFile: intakeValues.consent,
            livingArrangement: intakeValues.living,
            medicalHistory: intakeValues.medical,
            comprehensiveAssessmentNotes: assessmentNotes,
          },
        });
        handleUpdate(updated);
      }
      setMessage(`${intakeStage?.label ?? ''}${t('workspace.savedSuffix')}`);
      advanceAfterSave('intake');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : i18n.tOr('common.saveFailed', 'Save failed'));
    } finally {
      setSaving(false);
    }
  }

  const workflowStages = USE_MOCK_AUTH && mockView ? stagesForClient(mockView, i18n) : (ws?.workflow.stages ?? []);
  const intakeStage = workflowStages.find((s) => s.tabId === 'intake');

  if (error && !ws) {
    return (
      <>
        <p className="error">{error}</p>
        <Link to="/cases/search">{t('workspace.backToCaseSearch')}</Link>
      </>
    );
  }

  if (loading || !ws || !caseId) {
    return <p className="muted">{i18n.tOr('common.loading', 'Loading workspace…')}</p>;
  }

  const tabs = USE_MOCK_AUTH && mockView ? tabsForClient(mockView, i18n) : tabsForWorkspace(ws, i18n);
  const supportTabs = tabs.filter((tab) => !tab.process);
  const stageStatus =
    USE_MOCK_AUTH && mockView ? getStatus(mockView, i18n) : stageStatusForWorkspace(ws);

  const localizedStages: StageStatus[] = ws.stageStatuses.map((s) => ({
    ...s,
    label: workflowStages.find((w) => w.tabId === s.tabId)?.label ?? s.label,
    deliverable: workflowStages.find((w) => w.tabId === s.tabId)?.deliverable ?? s.deliverable,
  }));
  const currentStageMeta = localizedStages.find((s) => s.tabId === activeTab);

  return (
    <>
      <nav className="workspace-breadcrumb" aria-label="Breadcrumb">
        <Link to="/cases/search">{t('workspace.breadcrumbCaseSearch')}</Link>
        <span className="breadcrumb-sep" aria-hidden="true">
          ›
        </span>
        <span>
          <strong>{ws.client.name}</strong>
          {ws.case.caseNumber ? <span className="text-muted"> ({ws.case.caseNumber})</span> : null}
        </span>
      </nav>

      <div className="workspace-header">
        <div className="workspace-client">
          <h1>{ws.client.name}</h1>
          <p className="workspace-meta">
            {i18n.formatDate(ws.client.dob ?? undefined)} · {ws.client.phone} · {stageStatus?.label}
          </p>
          <p className="workspace-workflow-meta">{ws.workflow.name}</p>
          <div className="workspace-badges">
            <span className="case-type-chip">{programLabel(scope ?? {})}</span>
            <span className="case-stage-chip">{t('workspace.stageChip', { stage: ws.currentStage })}</span>
            {ws.riskAssessment?.overallRisk ? <RiskBadge level={ws.riskAssessment.overallRisk} /> : null}
            {ws.case.incompleteIntake ? (
              <span className="incomplete-badge">{t('components.incompleteIntake')}</span>
            ) : null}
            {ws.closure ? <span className="client-status-badge">{t('workspace.closedBadge')}</span> : null}
          </div>
        </div>
        <div className="workspace-actions">
          <Link to={`/clients/${ws.client.id}?caseId=${ws.case.id}`} className="btn btn-secondary btn-sm">
            {t('workspace.view360')}
          </Link>
          <Link to="/cases/search" className="btn btn-secondary btn-sm">
            {t('workspace.backToCaseSearch')}
          </Link>
        </div>
      </div>

      <div id="workspace-stepper">
        <WorkspaceStepper stages={localizedStages} activeTab={activeTab} onSelectTab={selectTab} />
      </div>

      <div id="workspace-alerts">
        {message ? <div className="alert alert-success">{message}</div> : null}
        {error ? <div className="alert alert-danger">{error}</div> : null}
      </div>

      <nav className="workspace-tabs workspace-tabs-support" aria-label={t('workspace.caseRecordsAria')}>
        {supportTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`workspace-tab workspace-tab-support${activeTab === tab.id ? ' active' : ''}`}
            onClick={() => selectTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div id="workspace-panel" className="workspace-panel">
        {activeTab === 'intake' ? (
          <form className="card" id="intake-form" onSubmit={saveIntakeForm}>
            <h2>{currentStageMeta?.label ?? intakeStage?.label}</h2>
            {currentStageMeta?.deliverable ? (
              <p className="workspace-stage-deliverable">
                <strong>{t('stepStatus.deliverablePrefix')}</strong> {currentStageMeta.deliverable}
              </p>
            ) : null}
            {ws.workflow.focusAreas?.length ? (
              <p className="workspace-stage-focus">
                <strong>{t('forms.common.focusAreas')}</strong> {ws.workflow.focusAreas.join(' · ')}
              </p>
            ) : null}

            <IntakeFormFields
              config={formConfig}
              values={intakeValues}
              onChange={(next) => setIntakeValues((current) => ({ ...current, ...next }))}
              readOnly={ws.readOnly}
            />

            {!ws.readOnly ? (
              <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving
                    ? i18n.tOr('common.saving', 'Saving…')
                    : t('forms.common.saveContinue', {
                        next: workflowStages.find((s) => s.tabId === 'assessment')?.label ?? '',
                      })}
                </button>
              </div>
            ) : null}
          </form>
        ) : (
          <CaseStageTabs
            caseId={caseId}
            ws={ws}
            activeTab={activeTab}
            onUpdate={handleUpdate}
            onMessage={setMessage}
            onError={setError}
            onTabChange={selectTab}
          />
        )}
      </div>
    </>
  );
}
