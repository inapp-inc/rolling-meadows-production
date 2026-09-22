import { useEffect, useMemo, useState } from 'react';
import { ApiError, caseApi, eventsApi, type CaseWorkspace, type ServiceEvent } from '../../api/client';
import { USE_MOCK_AUTH, useAuth } from '../../auth/AuthContext';
import { DocumentVaultPanel } from '../../components/DocumentVaultPanel';
import { EmptyState } from '../../components/EmptyState';
import { RiskBadge } from '../../components/RiskBadge';
import { useToast } from '../../components/ToastContext';
import { useI18n } from '../../i18n/I18nContext';
import { calcComposite, nextTabId, stagesForClient } from '../../mock/caseWorkflow';
import { viewForCase } from '../../mock/caseService';
import { configForClient } from '../../mock/familyFormConfig';
import { useMockData } from '../../mock/MockDataContext';
import {
  addCarePlanItem,
  addCboReferral,
  addEnrollment,
  addNote,
  addReassessment,
  closeCase,
  saveAssessmentNotes,
  saveRisk,
  SERVICE_EVENTS,
  voidCarePlanItem,
  voidEnrollment,
  voidNote,
} from '../../mock/workspaceService';
import { nextTabForWorkspace, scopeFromWorkspace } from '../../utils/caseWorkspaceUtils';
import { RiskRatingsTable } from './RiskRatingsTable';
import { RiskScoreSummary } from './RiskScoreSummary';
import { RiskScoringGuide } from './RiskScoringGuide';

const CARE_STATUSES = ['Not Started', 'In Progress', 'Complete', 'Abandoned'];
const CLOSURE_REASONS = ['Goals met', 'Relocated', 'Transferred', 'Declined services', 'No longer needed'];
const CBO_STATUSES = ['Pending', 'Accepted', 'Declined', 'Completed'];

type Props = {
  caseId: string;
  ws: CaseWorkspace;
  activeTab: string;
  onUpdate: (ws: CaseWorkspace) => void;
  onMessage: (msg: string) => void;
  onError: (msg: string) => void;
  onTabChange: (tabId: string) => void;
};

export function CaseStageTabs({ caseId, ws, activeTab, onUpdate, onMessage, onError, onTabChange }: Props) {
  const { store, refresh } = useMockData();
  const { token } = useAuth();
  const i18n = useI18n();
  const { t } = i18n;
  const { showToast } = useToast();

  const readOnly = ws.readOnly;
  const domains = ws.riskDomains ?? ws.riskAssessment?.domains ?? [];
  const mockView = useMemo(() => (USE_MOCK_AUTH ? viewForCase(store, caseId) : null), [store, caseId]);
  const scope = useMemo(() => (USE_MOCK_AUTH ? mockView : scopeFromWorkspace(ws)), [mockView, ws]);
  const config = useMemo(() => configForClient(i18n, scope), [i18n, scope]);
  const stages = useMemo(
    () => (USE_MOCK_AUTH && mockView ? stagesForClient(mockView, i18n) : ws.workflow.stages),
    [mockView, i18n, ws.workflow.stages],
  );
  const stage = stages.find((s) => s.tabId === activeTab);
  const nextStage = stages.find((s) => {
    const nextId = USE_MOCK_AUTH && mockView ? nextTabId(activeTab, mockView) : nextTabForWorkspace(activeTab, ws);
    return s.tabId === nextId;
  });

  const [serviceEvents, setServiceEvents] = useState<ServiceEvent[]>(SERVICE_EVENTS);

  const noteTypes = config.noteTypes.length ? config.noteTypes : ['phone call'];
  const triggers = config.reassessmentTriggers.length ? config.reassessmentTriggers : ['Manual'];

  const [ratings, setRatings] = useState<Record<string, string>>({});
  const [overrideNote, setOverrideNote] = useState('');
  const [cpIssue, setCpIssue] = useState('');
  const [cpGoal, setCpGoal] = useState('');
  const [cpService, setCpService] = useState('');
  const [cpStatus, setCpStatus] = useState(CARE_STATUSES[0]);
  const [eventId, setEventId] = useState('');
  const [cboName, setCboName] = useState('');
  const [cboStatus, setCboStatus] = useState(CBO_STATUSES[0]);
  const [noteType, setNoteType] = useState(noteTypes[0]);
  const [noteText, setNoteText] = useState('');
  const [reTrigger, setReTrigger] = useState(triggers[0]);
  const [reRatings, setReRatings] = useState<Record<string, string>>({});
  const [assessmentNotes, setAssessmentNotes] = useState(ws.intake?.comprehensiveAssessmentNotes ?? '');
  const [closeReason, setCloseReason] = useState(CLOSURE_REASONS[0]);
  const [closeOutcomes, setCloseOutcomes] = useState({
    servicesProvided: '',
    outcomesAchieved: '',
    remainingRisks: '',
    referralForward: '',
  });
  const [saving, setSaving] = useState(false);

  const liveComposite = useMemo(() => {
    const allRated = domains.every((d) => ratings[d.key]);
    if (!allRated) {
      if (ws.riskAssessment?.compositeScore != null && activeTab === 'risk') {
        return {
          compositeScore: ws.riskAssessment.compositeScore,
          overallRisk: ws.riskAssessment.overallRisk,
          pending: false,
        };
      }
      return { pending: true as const };
    }
    return { ...calcComposite(ratings), pending: false as const };
  }, [ratings, domains, ws.riskAssessment, activeTab]);

  useEffect(() => {
    if (USE_MOCK_AUTH) {
      setServiceEvents(SERVICE_EVENTS);
      setEventId(SERVICE_EVENTS[0]?.id ?? '');
      return;
    }
    if (!token) return;
    eventsApi.list(token).then((res) => {
      setServiceEvents(res.items);
      setEventId(res.items[0]?.id ?? '');
    }).catch(() => {
      setServiceEvents([]);
    });
  }, [token]);

  useEffect(() => {
    const init: Record<string, string> = {};
    domains.forEach((d) => {
      init[d.key] = ws.riskAssessment?.ratings?.[d.key] ?? 'Low';
    });
    setRatings(init);
    setOverrideNote(ws.riskAssessment?.overrideNote ?? '');
    setReRatings(init);
    setAssessmentNotes(ws.intake?.comprehensiveAssessmentNotes ?? '');
  }, [ws, domains]);

  async function run(
    action: () => CaseWorkspace | Promise<CaseWorkspace>,
    success: string,
    advanceFrom?: string,
  ) {
    setSaving(true);
    onError('');
    try {
      const updated = await action();
      onUpdate(updated);
      if (USE_MOCK_AUTH) refresh();
      onMessage(success);
      showToast(success, 'success');
      if (advanceFrom) {
        const next =
          USE_MOCK_AUTH && mockView ? nextTabId(advanceFrom, mockView) : nextTabForWorkspace(advanceFrom, ws);
        if (next) onTabChange(next);
      }
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : i18n.tOr('common.saveFailed', 'Save failed');
      onError(msg);
      showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  }

  function promptVoid(): string | null {
    const reason = window.prompt(t('referralIntake.voidPrompt'));
    return reason?.trim() ? reason.trim() : null;
  }

  function VoidedLabel({ voided, reason }: { voided?: boolean; reason?: string }) {
    if (!voided) return null;
    return (
      <span className="voided-label">
        {t('components.voidedPrefix')} {reason || t('components.noReason')}
      </span>
    );
  }

  function StageHeading() {
    return (
      <>
        <h2>{stage?.label}</h2>
        {stage?.deliverable ? (
          <p className="workspace-stage-deliverable">
            <strong>{t('stepStatus.deliverablePrefix')}</strong> {stage.deliverable}
          </p>
        ) : null}
      </>
    );
  }

  const saveContinue = nextStage
    ? t('forms.common.saveContinue', { next: nextStage.label })
    : t('forms.common.save');

  if (activeTab === 'assessment') {
    return (
      <form
        className="card"
        id="comprehensive-form"
        onSubmit={(e) => {
          e.preventDefault();
          run(
            () =>
              USE_MOCK_AUTH
                ? saveAssessmentNotes(store, caseId, assessmentNotes)
                : caseApi.saveIntake(token!, caseId, {
                    intake: {
                      consentOnFile: ws.intake?.consentOnFile ?? false,
                      livingArrangement: ws.intake?.livingArrangement,
                      medicalHistory: ws.intake?.medicalHistory,
                      comprehensiveAssessmentNotes: assessmentNotes,
                    },
                  }),
            `${stage?.label ?? ''}${t('workspace.savedSuffix')}`,
            'assessment',
          );
        }}
      >
        <StageHeading />
        <h3 className="form-section-title">{t('workspace.intakeSummaryTitle')}</h3>
        <p>
          <strong>{t('forms.common.referralSource')}:</strong>{' '}
          {i18n.referralSourceLabel(ws.referral?.source) || '—'} ·{' '}
          <strong>{t('forms.common.reason')}:</strong>{' '}
          {i18n.referralReasonLabel(ws.referral?.reason) || '—'}
        </p>
        <p>
          <strong>{config.livingLabel}:</strong> {ws.intake?.livingArrangement || '—'}
        </p>
        <p>
          <strong>{config.assessmentSummaryBackgroundLabel}:</strong> {ws.intake?.medicalHistory || '—'}
        </p>
        <div className="form-group">
          <label htmlFor="comprehensive-notes">{config.assessmentNoteLabel}</label>
          <textarea
            id="comprehensive-notes"
            rows={5}
            placeholder={config.assessmentNotePlaceholder}
            value={assessmentNotes}
            onChange={(e) => setAssessmentNotes(e.target.value)}
            disabled={readOnly}
          />
        </div>
        {!readOnly ? (
          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? i18n.tOr('common.saving', 'Saving…') : saveContinue}
            </button>
          </div>
        ) : null}
      </form>
    );
  }

  if (activeTab === 'risk') {
    return (
      <form
        className="card"
        id="risk-form"
        onSubmit={(e) => {
          e.preventDefault();
          run(
            () =>
              USE_MOCK_AUTH
                ? saveRisk(store, caseId, ratings, overrideNote || undefined)
                : caseApi.saveRisk(token!, caseId, { ratings, overrideNote: overrideNote || undefined }),
            `${stage?.label ?? ''}${t('workspace.savedSuffix')}`,
            'risk',
          );
        }}
      >
        <StageHeading />
        <RiskScoringGuide />
        <RiskRatingsTable
          prefix="risk"
          domains={domains.map((d) => ({ key: d.key, label: i18n.domainLabel(d.key) }))}
          ratings={ratings}
          disabled={readOnly}
          onChange={setRatings}
        />
        <div className="form-group">
          <label htmlFor="override-note">{config.riskOverrideLabel}</label>
          <textarea
            id="override-note"
            rows={2}
            value={overrideNote}
            onChange={(e) => setOverrideNote(e.target.value)}
            disabled={readOnly}
          />
        </div>
        <RiskScoreSummary
          label={t('workspace.finalRiskScore')}
          compositeScore={liveComposite.pending ? undefined : liveComposite.compositeScore}
          overallRisk={liveComposite.pending ? undefined : liveComposite.overallRisk}
          assessedDate={liveComposite.pending ? undefined : ws.riskAssessment?.date}
          pending={liveComposite.pending}
        />
        {!readOnly ? (
          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? i18n.tOr('common.saving', 'Saving…') : saveContinue}
            </button>
          </div>
        ) : null}
      </form>
    );
  }

  if (activeTab === 'careplan') {
    const items = ws.carePlanItems ?? [];
    return (
      <div>
        {!readOnly ? (
          <form
            id="careplan-form"
            className="card"
            onSubmit={(e) => {
              e.preventDefault();
              run(
                () =>
                  USE_MOCK_AUTH
                    ? addCarePlanItem(store, caseId, {
                        issue: cpIssue,
                        goal: cpGoal,
                        service: cpService,
                        status: cpStatus,
                      })
                    : caseApi.addCarePlanItem(token!, caseId, {
                        issue: cpIssue,
                        goal: cpGoal,
                        service: cpService,
                        status: cpStatus,
                      }),
                t('workspace.carePlanAdded'),
              );
              setCpIssue('');
              setCpGoal('');
              setCpService('');
            }}
          >
            <StageHeading />
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="cp-issue">{config.carePlanIssueLabel}</label>
                <input id="cp-issue" value={cpIssue} onChange={(e) => setCpIssue(e.target.value)} required />
              </div>
              <div className="form-group">
                <label htmlFor="cp-goal">{config.carePlanGoalLabel}</label>
                <input id="cp-goal" value={cpGoal} onChange={(e) => setCpGoal(e.target.value)} required />
              </div>
              <div className="form-group">
                <label htmlFor="cp-service">{config.carePlanServiceLabel}</label>
                <input id="cp-service" value={cpService} onChange={(e) => setCpService(e.target.value)} required />
              </div>
              <div className="form-group">
                <label htmlFor="cp-status">{t('forms.common.status')}</label>
                <select id="cp-status" value={cpStatus} onChange={(e) => setCpStatus(e.target.value)}>
                  {CARE_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {i18n.enumLabel('carePlanStatus', s)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {t('workspace.addItem')}
              </button>
            </div>
          </form>
        ) : null}

        <div className="card">
          <h2>{config.carePlanListTitle}</h2>
          {!items.length ? (
            <EmptyState
              title={t('workspace.noPlanItems')}
              hint={t('workspace.addPlanHint', {
                issue: config.carePlanIssueLabel,
                goal: config.carePlanGoalLabel,
                service: config.carePlanServiceLabel,
              })}
            />
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{config.carePlanIssueLabel}</th>
                    <th>{config.carePlanGoalLabel}</th>
                    <th>{config.carePlanServiceLabel}</th>
                    <th>{t('forms.common.status')}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className={item.voided ? 'voided-row' : ''}>
                      <td>
                        {item.issue}
                        <VoidedLabel voided={item.voided} reason={item.voidReason} />
                      </td>
                      <td>{item.goal}</td>
                      <td>{item.service}</td>
                      <td>{i18n.enumLabel('carePlanStatus', item.status)}</td>
                      <td>
                        {!readOnly && !item.voided ? (
                          <button
                            type="button"
                            className="btn btn-sm btn-danger"
                            onClick={() => {
                              const reason = promptVoid();
                              if (!reason) return;
                              run(
                                () =>
                                  USE_MOCK_AUTH
                                    ? voidCarePlanItem(store, caseId, item.id, reason)
                                    : caseApi.voidCarePlanItem(token!, caseId, item.id, reason),
                                t('workspace.void'),
                              );
                            }}
                          >
                            {t('workspace.void')}
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (activeTab === 'services') {
    const enrollments = ws.enrollments ?? [];
    const referrals = ws.cboReferrals ?? [];
    return (
      <div className="card">
        <StageHeading />

        <h3 className="form-section-title">{config.servicesTitle}</h3>
        {!enrollments.length ? (
          <EmptyState title={t('workspace.noEnrollments')} hint={t('workspace.noEnrollmentsHint')} />
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('workspace.program')}</th>
                  <th>{t('workspace.date')}</th>
                  <th>{t('workspace.status')}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {enrollments.map((e) => (
                  <tr key={e.id} className={e.voided ? 'voided-row' : ''}>
                    <td>
                      {e.serviceLabel ?? e.serviceOrEventId}
                      <VoidedLabel voided={e.voided} reason={e.voidReason} />
                    </td>
                    <td>{i18n.formatDate(e.dateEnrolled)}</td>
                    <td>{i18n.enumLabel('enrollmentStatus', e.status)}</td>
                    <td>
                      {!readOnly && !e.voided && USE_MOCK_AUTH ? (
                        <button
                          type="button"
                          className="btn btn-sm btn-danger"
                          onClick={() => {
                            const reason = promptVoid();
                            if (!reason) return;
                            run(() => voidEnrollment(store, caseId, e.id, reason), t('workspace.void'));
                          }}
                        >
                          {t('workspace.void')}
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!readOnly ? (
          <form
            className="form-inline"
            onSubmit={(e) => {
              e.preventDefault();
              if (!eventId) return;
              run(
                () =>
                  USE_MOCK_AUTH
                    ? addEnrollment(store, caseId, eventId)
                    : caseApi.addEnrollment(token!, caseId, eventId),
                t('workspace.clientEnrolled'),
              );
            }}
          >
            <select
              aria-label={t('workspace.enrollInProgram')}
              value={eventId}
              onChange={(ev) => setEventId(ev.target.value)}
            >
              {serviceEvents.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {i18n.eventLabel(ev.id) || ev.label}
                </option>
              ))}
            </select>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {t('workspace.enrollClient')}
            </button>
          </form>
        ) : null}

        <h3 className="form-section-title">{config.cboTitle}</h3>
        {!referrals.length ? (
          <EmptyState title={t('workspace.noCboReferrals')} hint={t('workspace.noCboReferralsHint')} />
        ) : (
          <ul className="item-list">
            {referrals.map((r) => (
              <li key={r.id}>
                {r.cboName} — {i18n.enumLabel('cboStatus', r.status)} ({i18n.formatDate(r.date)})
              </li>
            ))}
          </ul>
        )}

        {!readOnly ? (
          <form
            className="form-inline"
            onSubmit={(e) => {
              e.preventDefault();
              run(
                () =>
                  USE_MOCK_AUTH
                    ? addCboReferral(store, caseId, cboName, cboStatus)
                    : caseApi.addCboReferral(token!, caseId, { cboName, status: cboStatus }),
                t('workspace.cboAdded'),
              );
              setCboName('');
            }}
          >
            <input
              placeholder={t('workspace.cboName')}
              aria-label={t('workspace.cboName')}
              value={cboName}
              onChange={(e) => setCboName(e.target.value)}
              required
            />
            <select
              aria-label={t('workspace.status')}
              value={cboStatus}
              onChange={(e) => setCboStatus(e.target.value)}
            >
              {CBO_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {i18n.enumLabel('cboStatus', s)}
                </option>
              ))}
            </select>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {t('workspace.addCboReferral')}
            </button>
          </form>
        ) : null}
      </div>
    );
  }

  if (activeTab === 'followup') {
    const cadence = ws.followUpCadence;
    const notes = ws.notes ?? [];
    return (
      <div className="card">
        <StageHeading />

        <h3 className="form-section-title">{config.followupCadenceTitle}</h3>
        {cadence ? (
          <p className={cadence.overdue ? 'alert alert-warning' : 'text-muted'}>
            {t('workspace.recommendedCadence')} {i18n.cadenceLabel(cadence.label)} ({cadence.days})
            {cadence.overdue
              ? ` · ${t('pages.reports.daysOverdueBadge', { count: cadence.daysOverdue ?? 0 })}`
              : ''}
          </p>
        ) : null}

        <h3 className="form-section-title">{config.followupMonitoringTitle}</h3>
        {!notes.length ? (
          <EmptyState title={t('workspace.noFollowUpNotes')} hint={t('workspace.noFollowUpNotesHint')} />
        ) : (
          <ul className="item-list">
            {notes.map((n) => (
              <li key={n.id} className={n.voided ? 'voided-row' : ''}>
                <strong>{i18n.formatDate(n.date)}</strong> · {i18n.noteTypeLabel(n.type)}: {n.text}
                <VoidedLabel voided={n.voided} reason={n.voidReason} />
                {!readOnly && !n.voided ? (
                  <button
                    type="button"
                    className="btn btn-sm btn-danger"
                    onClick={() => {
                      const reason = promptVoid();
                      if (!reason) return;
                      run(
                        () =>
                          USE_MOCK_AUTH
                            ? voidNote(store, caseId, n.id, reason)
                            : caseApi.voidNote(token!, caseId, n.id, reason),
                        t('workspace.void'),
                      );
                    }}
                  >
                    {t('workspace.void')}
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        {!readOnly ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              run(
                () =>
                  USE_MOCK_AUTH
                    ? addNote(store, caseId, noteType, noteText)
                    : caseApi.addNote(token!, caseId, { type: noteType, text: noteText }),
                t('workspace.followUpLogged'),
              );
              setNoteText('');
            }}
          >
            <div className="form-row form-row-2">
              <div className="form-group">
                <label htmlFor="note-type">{t('forms.common.status')}</label>
                <select id="note-type" value={noteType} onChange={(e) => setNoteType(e.target.value)}>
                  {noteTypes.map((type) => (
                    <option key={type} value={type}>
                      {i18n.noteTypeLabel(type)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="note-text">{t('workspace.note')}</label>
              <textarea
                id="note-text"
                rows={3}
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                required
              />
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {t('workspace.logFollowUp')}
              </button>
            </div>
          </form>
        ) : null}
      </div>
    );
  }

  if (activeTab === 'reassessment') {
    const history = ws.reassessments ?? [];
    return (
      <div>
        <form
          className="card form-card"
          onSubmit={(e) => {
            e.preventDefault();
            run(
              () =>
                USE_MOCK_AUTH
                  ? addReassessment(store, caseId, reTrigger, reRatings)
                  : caseApi.addReassessment(token!, caseId, { trigger: reTrigger, newRatings: reRatings }),
              t('workspace.reassessmentSaved'),
            );
          }}
        >
          <StageHeading />
          {ws.riskAssessment?.date ? (
            <p className="text-muted">
              {t('workspace.currentAssessment', { date: i18n.formatDate(ws.riskAssessment.date) })}
            </p>
          ) : null}
          <div className="form-group">
            <label htmlFor="re-trigger">{t('workspace.trigger')}</label>
            <select
              id="re-trigger"
              value={reTrigger}
              onChange={(e) => setReTrigger(e.target.value)}
              disabled={readOnly}
            >
              {triggers.map((trigger) => (
                <option key={trigger} value={trigger}>
                  {i18n.picklistLabel('reassessmentTriggers', trigger)}
                </option>
              ))}
            </select>
          </div>
          <RiskRatingsTable
            prefix="re"
            domains={domains.map((d) => ({ key: d.key, label: i18n.domainLabel(d.key) }))}
            ratings={reRatings}
            disabled={readOnly}
            onChange={setReRatings}
          />
          <RiskScoreSummary
            label={t('workspace.updatedRiskScore')}
            {...calcComposite(reRatings)}
            pending={!Object.keys(reRatings).length}
          />
          {!readOnly ? (
            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {t('workspace.saveReassessment')}
              </button>
            </div>
          ) : null}
        </form>

        <div className="card">
          <h2>{t('workspace.history')}</h2>
          {!history.length ? (
            <EmptyState title={t('workspace.noReassessments')} hint={t('workspace.noReassessmentsHint')} />
          ) : (
            history.map((r) => (
              <div className="reassessment-entry" key={r.id}>
                <h3>
                  {i18n.formatDate(r.date)} · {i18n.picklistLabel('reassessmentTriggers', r.trigger)}
                </h3>
                <table className="data-table ratings-compare-table">
                  <thead>
                    <tr>
                      <th>{t('forms.common.domain')}</th>
                      <th>{t('components.previous')}</th>
                      <th>{t('components.current')}</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {domains.map((d) => {
                      const prev = r.previousRatings?.[d.key];
                      const curr = r.newRatings?.[d.key];
                      if (!prev && !curr) return null;
                      const changed = Boolean(prev && curr && prev !== curr);
                      return (
                        <tr key={d.key} className={changed ? 'compare-changed' : ''}>
                          <td>{i18n.domainLabel(d.key)}</td>
                          <td>{prev ? <RiskBadge level={prev} /> : '—'}</td>
                          <td>{curr ? <RiskBadge level={curr} /> : '—'}</td>
                          <td>
                            {changed ? <span className="compare-delta">{t('components.changed')}</span> : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  if (activeTab === 'closure') {
    const voidedPlans = (ws.carePlanItems ?? []).filter((i) => i.voided);
    const voidedEnrollments = (ws.enrollments ?? []).filter((e) => e.voided);
    const voidedNotes = (ws.notes ?? []).filter((n) => n.voided);
    const hasVoided = voidedPlans.length + voidedEnrollments.length + voidedNotes.length > 0;

    const voidedSection = (
      <div className="card">
        <h2>{t('workspace.voidedEntries')}</h2>
        {!hasVoided ? (
          <EmptyState title={t('workspace.noVoidedEntries')} hint={t('workspace.voidedEntriesHint')} />
        ) : (
          <ul className="voided-summary-list">
            {voidedEnrollments.map((e) => (
              <li key={e.id} className="voided-row">
                {t('workspace.enrollmentVoidLabel', {
                  name: e.serviceLabel ?? e.serviceOrEventId,
                  reason: e.voidReason ?? t('components.noReason'),
                })}
              </li>
            ))}
            {voidedPlans.map((item) => (
              <li key={item.id} className="voided-row">
                {t('workspace.carePlanVoidLabel', {
                  issue: item.issue,
                  reason: item.voidReason ?? t('components.noReason'),
                })}
              </li>
            ))}
            {voidedNotes.map((n) => (
              <li key={n.id} className="voided-row">
                {t('workspace.noteVoidLabel', {
                  type: i18n.noteTypeLabel(n.type),
                  reason: n.voidReason ?? t('components.noReason'),
                })}
              </li>
            ))}
          </ul>
        )}
      </div>
    );

    if (ws.closure) {
      return (
        <div>
          <div className="card">
            <StageHeading />
            <p>{t('workspace.caseClosedOn', { date: i18n.formatDate(ws.closure.date) })}</p>
            <p>
              <strong>{t('workspace.closureReason')}:</strong>{' '}
              {i18n.enumLabel('closureReason', ws.closure.reason)}
            </p>
            {ws.closure.outcomesSummary ? (
              <dl className="client-drawer-meta">
                <div className="drawer-meta-row">
                  <dt>{config.closureServicesLabel}</dt>
                  <dd>{ws.closure.outcomesSummary.servicesProvided || '—'}</dd>
                </div>
                <div className="drawer-meta-row">
                  <dt>{config.closureOutcomesLabel}</dt>
                  <dd>{ws.closure.outcomesSummary.outcomesAchieved || '—'}</dd>
                </div>
                <div className="drawer-meta-row">
                  <dt>{config.closureRisksLabel}</dt>
                  <dd>{ws.closure.outcomesSummary.remainingRisks || '—'}</dd>
                </div>
                <div className="drawer-meta-row">
                  <dt>{config.closureReferralLabel}</dt>
                  <dd>{ws.closure.outcomesSummary.referralForward || '—'}</dd>
                </div>
              </dl>
            ) : null}
          </div>
          {voidedSection}
        </div>
      );
    }

    const closureFields = [
      { key: 'servicesProvided', label: config.closureServicesLabel },
      { key: 'outcomesAchieved', label: config.closureOutcomesLabel },
      { key: 'remainingRisks', label: config.closureRisksLabel },
      { key: 'referralForward', label: config.closureReferralLabel },
    ] as const;

    return (
      <div>
        <form
          className="card"
          onSubmit={(e) => {
            e.preventDefault();
            if (!window.confirm(t('workspace.completeClosureConfirm'))) return;
            run(
              () =>
                USE_MOCK_AUTH
                  ? closeCase(store, caseId, closeReason, closeOutcomes)
                  : caseApi.closeCase(token!, caseId, { reason: closeReason, outcomesSummary: closeOutcomes }),
              t('workspace.caseClosedToast'),
            );
          }}
        >
          <StageHeading />
          <div className="form-group">
            <label htmlFor="close-reason">{t('workspace.closureReason')}</label>
            <select
              id="close-reason"
              value={closeReason}
              onChange={(e) => setCloseReason(e.target.value)}
              disabled={readOnly}
            >
              {CLOSURE_REASONS.map((r) => (
                <option key={r} value={r}>
                  {i18n.enumLabel('closureReason', r)}
                </option>
              ))}
            </select>
          </div>
          {closureFields.map((field) => (
            <div className="form-group" key={field.key}>
              <label htmlFor={`close-${field.key}`}>{field.label}</label>
              <textarea
                id={`close-${field.key}`}
                rows={2}
                value={closeOutcomes[field.key]}
                onChange={(e) => setCloseOutcomes({ ...closeOutcomes, [field.key]: e.target.value })}
                disabled={readOnly}
              />
            </div>
          ))}
          {!readOnly ? (
            <div className="form-actions">
              <button type="submit" disabled={saving} className="btn btn-danger">
                {t('workspace.completeStageButtonPrefix')} {stage?.label}
              </button>
            </div>
          ) : null}
        </form>
        {voidedSection}
      </div>
    );
  }

  if (activeTab === 'documents') {
    return (
      <div className="card">
        <h2>{t('workspace.documentVault')}</h2>
        <DocumentVaultPanel
          clientId={ws.client.id}
          caseId={caseId}
          stageContext="case-workspace"
          readOnly={readOnly}
          showDelete
          workspaceDocuments={ws.documents}
          onWorkspaceUpdate={onUpdate}
        />
      </div>
    );
  }

  if (activeTab === 'activity') {
    const activity = ws.activity ?? [];
    return (
      <div className="card">
        <h2>{t('workspace.activityAuditTrail')}</h2>
        <h3 className="form-section-title">{i18n.tOr('components.assignments', 'Assignments')}</h3>
        <ul className="item-list">
          {(ws.assignmentHistory ?? []).map((a, i) => (
            <li key={a.id ?? i}>
              {i18n.formatDate(a.assignedAt)}: {a.caseManagerName} — {a.reason}
            </li>
          ))}
        </ul>
        <h3 className="form-section-title">{t('workspace.activityAuditTrail')}</h3>
        {!activity.length ? (
          <EmptyState
            title={t('components.noActivityTitle')}
            hint={t('components.noActivityMessage')}
          />
        ) : (
          <ul className="activity-log">
            {activity.map((a, i) => (
              <li className="activity-entry" key={i}>
                <span className="activity-action">{i18n.tOr(`audit.${a.action}`, a.action ?? '')}</span>
                <span className="activity-meta">
                  {a.actorName} · {i18n.formatDate(a.timestamp)}
                  {a.detail ? ` · ${a.detail}` : ''}
                  {a.reason ? ` · ${t('components.reasonPrefix')} ${a.reason}` : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return null;
}
