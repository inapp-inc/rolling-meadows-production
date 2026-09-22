import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { DedupMatch } from '../../api/client';
import { ApiError, clientApi } from '../../api/client';
import { USE_MOCK_AUTH, useAuth } from '../../auth/AuthContext';
import { AppLayout } from '../../components/AppLayout';
import { CaseWorkflowDrawerBody } from '../../components/CaseWorkflowDrawerBody';
import { ClientCasesDrawerBody } from '../../components/ClientCasesDrawerBody';
import { CrossProgramFlag, type CrossProgramFlagData } from '../../components/CrossProgramFlag';
import { DedupDrawer } from '../../components/DedupDrawer';
import { SideDrawer } from '../../components/SideDrawer';
import { useI18n } from '../../i18n/I18nContext';
import {
  crossProgramFlag,
  dedupCheck,
  getClient,
  registerClient,
  shouldRouteToCaseCreation,
} from '../../mock/clientService';
import { familyFormConfig } from '../../mock/familyFormConfig';
import { useMockData } from '../../mock/MockDataContext';
import { setPendingClientId } from '../../mock/session';
import { saveStore } from '../../mock/store';
import type { CaseloadView, IntakeQuestionAnswers, MockClient } from '../../mock/types';
import { DedupMatchList } from './DedupMatchList';

const DEDUP_DEBOUNCE_MS = 250;

const CONTACT_REASONS = [
  { value: 'information', labelKey: 'pages.clientRegistration.reasonInformation' },
  { value: 'brochure', labelKey: 'pages.clientRegistration.reasonBrochure' },
  { value: 'service_need', labelKey: 'pages.clientRegistration.reasonServiceNeed' },
  { value: 'emergency', labelKey: 'pages.clientRegistration.reasonEmergency' },
] as const;

type Notice = { kind: 'success' | 'warning'; message: string };

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Dedup is noisy on a half-typed name, so only run it on real input. */
function hasMeaningfulDedupInput(partial: { name: string; dob: string; phone: string }): boolean {
  if (partial.dob.trim()) return true;
  if (partial.name.trim().length >= 2) return true;
  return partial.phone.replace(/\D/g, '').length >= 7;
}

export function ClientRegistrationPage() {
  const { user, token } = useAuth();
  const { store, refresh } = useMockData();
  const i18n = useI18n();
  const { t } = i18n;
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [contactReason, setContactReason] = useState<string>(CONTACT_REASONS[0].value);
  const [screeningNotes, setScreeningNotes] = useState('');
  const [emergencyTrigger, setEmergencyTrigger] = useState('');
  const [serviceNeed, setServiceNeed] = useState(false);
  const [answers, setAnswers] = useState<IntakeQuestionAnswers>({});

  const [notice, setNotice] = useState<Notice | null>(null);
  const [submitFlag, setSubmitFlag] = useState<CrossProgramFlagData | null>(null);
  const [liveFlag, setLiveFlag] = useState<CrossProgramFlagData | null>(null);
  const [inlineMatches, setInlineMatches] = useState<DedupMatch[]>([]);
  const [drawerMatches, setDrawerMatches] = useState<DedupMatch[]>([]);
  const [confirmMatches, setConfirmMatches] = useState<DedupMatch[]>([]);
  const [drawerClient, setDrawerClient] = useState<MockClient | null>(null);
  const [drawerCase, setDrawerCase] = useState<CaseloadView | null>(null);

  const routeTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (routeTimer.current !== null) window.clearTimeout(routeTimer.current);
    },
    [],
  );

  const screeningConfig = useMemo(() => familyFormConfig(i18n, 'general'), [i18n]);
  const screeningQuestions = useMemo(
    () => screeningConfig.intakeQuestions.map((q) => ({ ...q, fieldId: `reg-${q.fieldId}` })),
    [screeningConfig],
  );

  const identity = { name, dob, phone };
  const meaningful = hasMeaningfulDedupInput(identity);

  useEffect(() => {
    setLiveFlag(meaningful ? crossProgramFlag(store, { name, phone, dob: dob || undefined }) : null);
  }, [store, name, phone, dob, meaningful]);

  const runDedupCheck = useCallback(
    async (partial: { name: string; phone: string; dob?: string }) => {
      if (USE_MOCK_AUTH) {
        return dedupCheck(store, partial);
      }
      if (!token) return [];
      try {
        const result = await clientApi.dedupCheck(token, partial);
        return result.matches;
      } catch {
        return [];
      }
    },
    [store, token],
  );

  useEffect(() => {
    if (!meaningful) {
      setInlineMatches([]);
      return undefined;
    }
    const timer = window.setTimeout(() => {
      runDedupCheck({ name, phone, dob: dob || undefined }).then(setInlineMatches);
    }, DEDUP_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [name, phone, dob, meaningful, runDedupCheck]);

  function openClientRecord(clientId: string) {
    if (USE_MOCK_AUTH) {
      const client = getClient(store, clientId);
      if (client) setDrawerClient(client);
      return;
    }
    navigate(`/clients/${clientId}`);
  }

  function resetForm() {
    setName('');
    setDob('');
    setPhone('');
    setAddress('');
    setContactReason(CONTACT_REASONS[0].value);
    setScreeningNotes('');
    setEmergencyTrigger('');
    setServiceNeed(false);
    setAnswers({});
    setLiveFlag(null);
    setInlineMatches([]);
    setDrawerMatches([]);
  }

  async function handleIdentityBlur() {
    if (!meaningful) {
      setDrawerMatches([]);
      return;
    }
    setDrawerMatches(await runDedupCheck({ name, phone, dob: dob || undefined }));
  }

  async function finishRegistration(confirmDespiteDuplicates = false) {
    const payload = {
      name: name.trim(),
      dob: dob || undefined,
      phone: phone.trim(),
      address: address.trim(),
      contactReason,
      screeningNotes: screeningNotes.trim(),
      emergencyTrigger: emergencyTrigger.trim(),
      serviceNeed,
      confirmDespiteDuplicates,
    };

    if (!USE_MOCK_AUTH) {
      if (!token) return;
      try {
        const client = await clientApi.create(token, payload);
        setSubmitFlag(null);
        setConfirmMatches([]);
        setDrawerMatches([]);
        if (shouldRouteToCaseCreation(payload)) {
          setPendingClientId(client.id);
          setNotice({
            kind: 'warning',
            message: t('pages.clientRegistration.caseRequiredNotice', { name: client.name }),
          });
          const urgent = contactReason === 'emergency' || Boolean(payload.emergencyTrigger) ? '&urgent=1' : '';
          routeTimer.current = window.setTimeout(() => {
            navigate(`/cases/new?clientId=${encodeURIComponent(client.id)}${urgent}`);
          }, 800);
          return;
        }
        setNotice({
          kind: 'success',
          message: t('pages.clientRegistration.successNoCase', { name: client.name }),
        });
        resetForm();
      } catch (err) {
        if (err instanceof ApiError && err.status === 409) {
          const detail = err.body as { detail?: { matches?: DedupMatch[] } };
          setConfirmMatches(detail.detail?.matches ?? []);
          return;
        }
        setNotice({
          kind: 'warning',
          message: err instanceof Error ? err.message : t('pages.clientRegistration.createError'),
        });
      }
      return;
    }

    const client = registerClient(store, payload);
    client.screening = {
      date: today(),
      contactReason,
      notes: payload.screeningNotes,
      intakeQuestions: answers,
    };
    // `registerClient` stamps a generic actor and a bare client id; the activity
    // log keys off the `client:<id>` reference.
    const entry = store.auditLog.find((a) => a.id === `aud-reg-${client.id}`);
    if (entry) {
      entry.actor = user?.name ?? entry.actor;
      entry.entityRef = `client:${client.id}`;
    }
    saveStore(store);
    refresh();

    setSubmitFlag(null);
    setConfirmMatches([]);
    setDrawerMatches([]);

    if (shouldRouteToCaseCreation(payload)) {
      setPendingClientId(client.id);
      setNotice({
        kind: 'warning',
        message: t('pages.clientRegistration.caseRequiredNotice', { name: client.name }),
      });
      const urgent = contactReason === 'emergency' || Boolean(payload.emergencyTrigger) ? '&urgent=1' : '';
      routeTimer.current = window.setTimeout(() => {
        navigate(`/cases/new?clientId=${encodeURIComponent(client.id)}${urgent}`);
      }, 800);
      return;
    }

    setNotice({
      kind: 'success',
      message: t('pages.clientRegistration.successNoCase', { name: client.name }),
    });
    resetForm();
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setNotice(null);

    const partial = { name: name.trim(), phone: phone.trim(), dob: dob || undefined };
    if (USE_MOCK_AUTH) {
      setSubmitFlag(crossProgramFlag(store, partial));
    } else {
      setSubmitFlag(null);
    }

    if (!meaningful) {
      await finishRegistration();
      return;
    }

    const matches = await runDedupCheck(partial);
    if (matches.length) {
      setConfirmMatches(matches);
      return;
    }
    await finishRegistration();
  }

  return (
    <AppLayout navId="client-registration">
      <p className="page-lead">{t('pages.clientRegistration.lead')}</p>

      <div id="registration-alerts">
        {notice ? (
          <div className={`alert alert-${notice.kind}`} role="alert">
            {notice.message}
          </div>
        ) : (
          <CrossProgramFlag flag={submitFlag} />
        )}
      </div>

      <form id="client-registration-form" className="card" onSubmit={handleSubmit}>
        <h2 className="form-section-title">{t('pages.clientRegistration.basicInfoTitle')}</h2>
        <div className="form-row form-row-2">
          <div className="form-group">
            <label htmlFor="reg-name">{t('pages.clientRegistration.nameLabel')}</label>
            <input
              id="reg-name"
              type="text"
              required
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              onBlur={handleIdentityBlur}
            />
          </div>
          <div className="form-group">
            <label htmlFor="reg-dob">{t('pages.clientRegistration.dobLabel')}</label>
            <input
              id="reg-dob"
              type="date"
              value={dob}
              onChange={(event) => setDob(event.target.value)}
              onBlur={handleIdentityBlur}
            />
          </div>
        </div>
        <div className="form-row form-row-2">
          <div className="form-group">
            <label htmlFor="reg-phone">{t('pages.clientRegistration.phoneLabel')}</label>
            <input
              id="reg-phone"
              type="tel"
              required
              autoComplete="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              onBlur={handleIdentityBlur}
            />
          </div>
          <div className="form-group">
            <label htmlFor="reg-address">{t('pages.clientRegistration.addressLabel')}</label>
            <input
              id="reg-address"
              type="text"
              required
              autoComplete="street-address"
              value={address}
              onChange={(event) => setAddress(event.target.value)}
            />
          </div>
        </div>

        <div id="live-cross-program">
          <CrossProgramFlag flag={liveFlag} />
        </div>
        <div id="live-dedup">
          <DedupMatchList matches={inlineMatches} onOpen={openClientRecord} />
        </div>

        {screeningQuestions.length ? (
          <>
            <h2 className="form-section-title">{screeningConfig.screeningSectionTitle}</h2>
            <p className="text-muted">{t('pages.clientRegistration.screeningQuestionsHint')}</p>
            <div className="form-row form-row-2 form-intake-grid">
              {screeningQuestions.map((question) => (
                <div className="form-group" key={question.fieldId}>
                  <label htmlFor={question.fieldId}>{question.label}</label>
                  <textarea
                    id={question.fieldId}
                    rows={2}
                    value={answers[question.key] ?? ''}
                    onChange={(event) =>
                      setAnswers((current) => ({ ...current, [question.key]: event.target.value }))
                    }
                  />
                </div>
              ))}
            </div>
          </>
        ) : null}

        <h2 className="form-section-title">{t('pages.clientRegistration.screeningTitle')}</h2>
        <p className="text-muted">{t('pages.clientRegistration.screeningHint')}</p>
        <div className="form-group">
          <label htmlFor="reg-reason">{t('pages.clientRegistration.contactReasonLabel')}</label>
          <select
            id="reg-reason"
            required
            value={contactReason}
            onChange={(event) => setContactReason(event.target.value)}
          >
            {CONTACT_REASONS.map((reason) => (
              <option key={reason.value} value={reason.value}>
                {t(reason.labelKey)}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="reg-notes">{t('pages.clientRegistration.screeningNotesLabel')}</label>
          <textarea
            id="reg-notes"
            rows={3}
            placeholder={t('pages.clientRegistration.screeningNotesPlaceholder')}
            value={screeningNotes}
            onChange={(event) => setScreeningNotes(event.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="reg-emergency">{t('pages.clientRegistration.emergencyTriggerLabel')}</label>
          <input
            id="reg-emergency"
            type="text"
            placeholder={t('pages.clientRegistration.emergencyTriggerPlaceholder')}
            value={emergencyTrigger}
            onChange={(event) => setEmergencyTrigger(event.target.value)}
          />
          <p className="field-hint">{t('pages.clientRegistration.emergencyTriggerHint')}</p>
        </div>
        <div className="form-check-row">
          <label className="checkbox-label" htmlFor="reg-service-need">
            <input
              id="reg-service-need"
              type="checkbox"
              checked={serviceNeed}
              onChange={(event) => setServiceNeed(event.target.checked)}
            />
            <span>{t('pages.clientRegistration.serviceNeedLabel')}</span>
          </label>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary">
            {t('pages.clientRegistration.submit')}
          </button>
        </div>
      </form>

      {confirmMatches.length ? (
        <DedupDrawer
          matches={confirmMatches}
          showContinue
          onOpen={openClientRecord}
          onContinue={() => finishRegistration(true)}
          onClose={() => setConfirmMatches([])}
        />
      ) : (
        <DedupDrawer
          matches={drawerMatches}
          onOpen={openClientRecord}
          onClose={() => setDrawerMatches([])}
        />
      )}

      <SideDrawer
        title={drawerClient?.name ?? ''}
        open={Boolean(drawerClient) && !drawerCase}
        onClose={() => setDrawerClient(null)}
      >
        {drawerClient ? (
          <ClientCasesDrawerBody client={drawerClient} onOpenCase={setDrawerCase} />
        ) : null}
      </SideDrawer>

      <SideDrawer
        title={drawerCase?.name ?? ''}
        open={Boolean(drawerCase)}
        onClose={() => setDrawerCase(null)}
      >
        {drawerCase ? <CaseWorkflowDrawerBody client={drawerCase} /> : null}
      </SideDrawer>
    </AppLayout>
  );
}
