import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ApiError, caseApi, clientApi, type ClientDetail, type DedupMatch } from '../../api/client';
import { USE_MOCK_AUTH, useAuth } from '../../auth/AuthContext';
import { CrossProgramFlag, type CrossProgramFlagData } from '../../components/CrossProgramFlag';
import { DedupDrawer } from '../../components/DedupDrawer';
import {
  emptyIntakeValues,
  IntakeFormFields,
  type IntakeFormValues,
} from '../../components/IntakeFormFields';
import { PageHeader } from '../../components/PageHeader';
import { useI18n } from '../../i18n/I18nContext';
import { categoryLabel, subcategoryLabel } from '../../mock/caseCategories';
import { createCase } from '../../mock/caseCreationService';
import { workflowForSubcategory } from '../../mock/caseWorkflow';
import { crossProgramFlag, dedupCheck, getClient } from '../../mock/clientService';
import { configForSubcategory } from '../../mock/familyFormConfig';
import { useMockData } from '../../mock/MockDataContext';
import {
  clearPendingCase,
  clearPendingClientId,
  getPendingCase,
  setPendingClientId,
} from '../../mock/session';
import { saveStore } from '../../mock/store';
import { stagesForClient } from '../../mock/caseWorkflow';
import type { MockClient } from '../../mock/types';

const DEFAULT_SELECTION = {
  categoryId: 'cat-senior-services',
  subcategoryId: 'sub-seniors-at-risk',
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Dedup is noisy on a half-typed name, so only run it on real input. */
function hasMeaningfulDedupInput(partial: { name: string; dob: string; phone: string }): boolean {
  if (partial.dob.trim()) return true;
  if (partial.name.trim().length >= 2) return true;
  return partial.phone.replace(/\D/g, '').length >= 7;
}

/**
 * Step 2 of case creation: capture the referral, intake, and screening detail,
 * then open the case and hand off to the workspace assessment tab.
 */
export function ReferralIntakePage() {
  const { user, token } = useAuth();
  const { store, refresh } = useMockData();
  const i18n = useI18n();
  const { t } = i18n;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const pending = useMemo(() => getPendingCase() ?? DEFAULT_SELECTION, []);
  const urlClientId = searchParams.get('clientId');
  const existingClient: MockClient | null =
    USE_MOCK_AUTH && urlClientId ? getClient(store, urlClientId) : null;
  const [apiClient, setApiClient] = useState<ClientDetail | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const config = useMemo(
    () => configForSubcategory(i18n, pending.subcategoryId),
    [i18n, pending.subcategoryId],
  );
  const workflow = useMemo(
    () => workflowForSubcategory(pending.subcategoryId, i18n),
    [i18n, pending.subcategoryId],
  );
  const stages = useMemo(
    () => stagesForClient({ caseSubcategoryId: pending.subcategoryId }, i18n),
    [i18n, pending.subcategoryId],
  );
  const intakeStage = stages.find((s) => s.tabId === 'intake');
  const assessmentStage = stages.find((s) => s.tabId === 'assessment');

  const [values, setValues] = useState<IntakeFormValues>(() => {
    const base = emptyIntakeValues();
    if (!existingClient) return base;
    return {
      ...base,
      clientName: existingClient.name,
      clientDob: existingClient.dob,
      clientPhone: existingClient.phone,
      clientAddress: existingClient.address,
      intakeQuestions: { ...(existingClient.screening?.intakeQuestions ?? {}) },
    };
  });

  const [liveFlag, setLiveFlag] = useState<CrossProgramFlagData | null>(null);
  const [submitFlag, setSubmitFlag] = useState<CrossProgramFlagData | null>(null);
  const [dedupMatches, setDedupMatches] = useState<DedupMatch[]>([]);
  const [confirmMatches, setConfirmMatches] = useState<DedupMatch[]>([]);

  useEffect(() => {
    if (existingClient) setPendingClientId(existingClient.id);
    else if (!urlClientId) clearPendingClientId();
  }, [existingClient, urlClientId]);

  useEffect(() => {
    if (USE_MOCK_AUTH || !token || !urlClientId) {
      setApiClient(null);
      return;
    }
    clientApi
      .get(token, urlClientId)
      .then((detail) => {
        setApiClient(detail);
        setValues((current) => ({
          ...current,
          clientName: detail.name,
          clientDob: detail.dob ?? '',
          clientPhone: detail.phone ?? '',
          clientAddress: detail.address ?? '',
        }));
      })
      .catch(() => setApiClient(null));
  }, [token, urlClientId]);

  const linkedClientName = existingClient?.name ?? apiClient?.name ?? null;

  const hasScreeningPrefill = Boolean(
    existingClient && Object.keys(existingClient.screening?.intakeQuestions ?? {}).length,
  );

  function patch(next: Partial<IntakeFormValues>) {
    setValues((current) => ({ ...current, ...next }));
  }

  function identityPartial(source = values) {
    return { name: source.clientName, dob: source.clientDob, phone: source.clientPhone };
  }

  function handleIdentityInput() {
    if (existingClient || apiClient) return;
    setLiveFlag(crossProgramFlag(store, identityPartial()));
  }

  function handleIdentityBlur() {
    if (existingClient || apiClient) return;
    const partial = identityPartial();
    if (!hasMeaningfulDedupInput({ name: partial.name, dob: partial.dob, phone: partial.phone })) {
      setDedupMatches([]);
      return;
    }
    setDedupMatches(dedupCheck(store, partial));
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitError('');
    if (!USE_MOCK_AUTH) {
      void saveCaseApi(urlClientId);
      return;
    }
    if (existingClient) {
      saveCase(existingClient);
      return;
    }

    const partial = identityPartial();
    setSubmitFlag(crossProgramFlag(store, partial));

    const matches = dedupCheck(store, partial);
    if (matches.length) {
      setConfirmMatches(matches);
      return;
    }
    saveCase(null);
  }

  async function saveCaseApi(knownClientId: string | null) {
    if (!token) return;
    setSubmitting(true);
    try {
      let clientId = knownClientId;
      if (!clientId) {
        const created = await clientApi.create(token, {
          name: values.clientName.trim(),
          phone: values.clientPhone.trim(),
          address: values.clientAddress.trim(),
          dob: values.clientDob || undefined,
        });
        clientId = created.id;
      }
      const ws = await caseApi.create(token, {
        clientId,
        categoryId: pending.categoryId,
        subcategoryId: pending.subcategoryId,
      });
      await caseApi.saveIntake(token, ws.case.id, {
        name: values.clientName.trim(),
        dob: values.clientDob || undefined,
        phone: values.clientPhone.trim(),
        address: values.clientAddress.trim(),
        referral: {
          source: values.refSource,
          reason: values.refReason,
          referrerName: values.refBy,
        },
        intake: {
          consentOnFile: values.consent,
          livingArrangement: values.living,
          medicalHistory: values.medical,
        },
      });
      clearPendingCase();
      clearPendingClientId();
      navigate(`/cases/${ws.case.id}?tab=assessment`);
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Could not save case.');
    } finally {
      setSubmitting(false);
    }
  }

  function saveCase(client: MockClient | null) {
    if (!user) return;
    const incomplete = !values.clientDob || !values.consent;
    const stamp = today();

    let target = client;
    if (target) {
      target.address = values.clientAddress.trim() || target.address;
      target.screening = {
        ...target.screening,
        intakeQuestions: values.intakeQuestions,
      };
    } else {
      target = {
        id: `cli-${Date.now()}`,
        name: values.clientName.trim(),
        dob: values.clientDob,
        phone: values.clientPhone.trim(),
        address: values.clientAddress.trim(),
        registeredAt: stamp,
        registrationSource: 'referral_intake',
        status: 'registered',
        screening: { date: stamp, intakeQuestions: values.intakeQuestions },
      };
      store.clients.push(target);
      store.auditLog.push({
        id: `aud-reg-${target.id}`,
        timestamp: new Date().toISOString(),
        actor: user.name,
        action: 'client_registered',
        entityRef: `client:${target.id}`,
        detail: target.name,
      });
    }

    const caseRecord = createCase(store, {
      clientId: target.id,
      categoryId: pending.categoryId,
      subcategoryId: pending.subcategoryId,
      caseManagerId: user.id,
      incompleteIntake: incomplete,
    });

    store.referrals.push({
      id: `ref-${caseRecord.id}`,
      clientId: target.id,
      caseId: caseRecord.id,
      source: values.refSource,
      reason: values.refReason,
      referredBy: values.refBy,
      dateReceived: stamp,
    });

    store.intakes.push({
      id: `int-${caseRecord.id}`,
      clientId: target.id,
      caseId: caseRecord.id,
      consentOnFile: values.consent,
      livingArrangement: values.living,
      medicalHistory: values.medical,
      intakeQuestions: values.intakeQuestions,
      completeness: incomplete ? 'incomplete' : 'complete',
    });

    store.auditLog.push({
      id: `aud-intake-${caseRecord.id}`,
      timestamp: new Date().toISOString(),
      actor: user.name,
      action: 'case_intake_saved',
      entityRef: `case:${caseRecord.id}`,
      detail: target.name,
    });

    clearPendingCase();
    clearPendingClientId();
    saveStore(store);
    refresh();
    navigate(`/cases/${caseRecord.id}?tab=assessment`);
  }

  const changeHref = existingClient ? `/cases/new?clientId=${existingClient.id}` : '/cases/new';

  return (
    <>
      <PageHeader
        title={intakeStage?.label ?? t('nav.referralIntake')}
        moduleId="cases"
        lead={t('pages.referralIntake.stepLead')}
      />

      <div className="case-category-banner">
        <strong>{t('case.categoryBanner')}</strong> {categoryLabel(pending.categoryId)} ·{' '}
        <strong>{t('case.subcategoryBanner')}</strong> {subcategoryLabel(pending.subcategoryId)} ·{' '}
        <strong>{t('pages.referralIntake.workflowLabel')}</strong> {workflow.name} ·{' '}
        <Link to={changeHref}>{t('pages.referralIntake.change')}</Link>
        {existingClient ? (
          <>
            {' · '}
            <Link to="/cases/new">{t('pages.caseCreation.reset')}</Link>
          </>
        ) : null}
      </div>

      {linkedClientName ? (
        <div className="alert alert-info">
          {t('pages.referralIntake.existingClientBanner', { name: linkedClientName })}
        </div>
      ) : null}

      {hasScreeningPrefill ? (
        <div className="alert alert-info">{t('pages.referralIntake.screeningPrefillHint')}</div>
      ) : null}

      <div id="alerts">
        <CrossProgramFlag flag={submitFlag} />
      </div>

      <form id="referral-intake-form" className="card" onSubmit={handleSubmit}>
        <h2>{intakeStage?.label}</h2>
        {intakeStage?.deliverable ? (
          <p className="workspace-stage-deliverable">
            <strong>{t('forms.common.deliverable')}</strong> {intakeStage.deliverable}
          </p>
        ) : null}
        {workflow.focusAreas.length ? (
          <p className="workspace-stage-focus">
            <strong>{t('forms.common.focusAreas')}</strong> {workflow.focusAreas.join(' · ')}
          </p>
        ) : null}

        <IntakeFormFields
          config={config}
          values={values}
          onChange={patch}
          readOnlyClient={Boolean(existingClient || apiClient)}
          onIdentityInput={handleIdentityInput}
          onIdentityBlur={handleIdentityBlur}
        />

        {submitError ? <div className="alert alert-danger">{submitError}</div> : null}

        <div id="live-cross-program">
          <CrossProgramFlag flag={liveFlag} />
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? `${t('common.save')}…` : t('pages.referralIntake.saveOpen', { next: assessmentStage?.label ?? '' })}
          </button>
        </div>
      </form>

      {confirmMatches.length ? (
        <DedupDrawer
          matches={confirmMatches}
          showContinue
          onContinue={() => {
            setConfirmMatches([]);
            saveCase(null);
          }}
          onClose={() => setConfirmMatches([])}
        />
      ) : (
        <DedupDrawer matches={dedupMatches} onClose={() => setDedupMatches([])} />
      )}
    </>
  );
}
