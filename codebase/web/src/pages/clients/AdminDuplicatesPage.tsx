import { useCallback, useEffect, useMemo, useState } from 'react';
import { clientApi, type ClientSummary, type DuplicatePair } from '../../api/client';
import { USE_MOCK_AUTH, useAuth } from '../../auth/AuthContext';
import { AppLayout } from '../../components/AppLayout';
import { MatchConfidenceBadge } from '../../components/DedupDrawer';
import { EmptyState } from '../../components/EmptyState';
import { Modal } from '../../components/Modal';
import { useToast } from '../../components/ToastContext';
import { useI18n } from '../../i18n/I18nContext';
import { categoryLabel, subcategoryLabel } from '../../mock/caseCategories';
import { latestAssessment, resolveView } from '../../mock/caseService';
import { getStatus } from '../../mock/caseWorkflow';
import {
  dismissPair,
  listDuplicatePairs,
  mergeClients,
  type DuplicatePair as MockDuplicatePair,
} from '../../mock/duplicateService';
import { useMockData } from '../../mock/MockDataContext';

type DisplayPair = {
  key: string;
  a: ClientSummary;
  b: ClientSummary;
  score: number;
  matchedFields: string[];
};

function toDisplayPair(pair: DuplicatePair): DisplayPair {
  return {
    key: `${pair.clientA.id}-${pair.clientB.id}`,
    a: pair.clientA,
    b: pair.clientB,
    score: pair.score,
    matchedFields: pair.matchedFields,
  };
}

function mockToDisplayPair(pair: MockDuplicatePair): DisplayPair {
  return {
    key: pair.key,
    a: {
      id: pair.a.id,
      name: pair.a.name,
      phone: pair.a.phone,
      address: pair.a.address,
      dob: pair.a.dob ?? undefined,
      status: pair.a.status ?? 'active',
      crossProgramActive: pair.a.crossProgramActive,
    },
    b: {
      id: pair.b.id,
      name: pair.b.name,
      phone: pair.b.phone,
      address: pair.b.address,
      dob: pair.b.dob ?? undefined,
      status: pair.b.status ?? 'active',
      crossProgramActive: pair.b.crossProgramActive,
    },
    score: pair.score,
    matchedFields: pair.matchedFields,
  };
}

export function AdminDuplicatesPage() {
  const { store, refresh } = useMockData();
  const { user, token } = useAuth();
  const { t } = useI18n();
  const { showToast } = useToast();
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [keepSide, setKeepSide] = useState<'a' | 'b'>('a');
  const [apiPairs, setApiPairs] = useState<DisplayPair[]>([]);

  const loadApiPairs = useCallback(async () => {
    if (!token) return;
    const data = await clientApi.listDuplicates(token);
    setApiPairs(data.pairs.map(toDisplayPair));
  }, [token]);

  useEffect(() => {
    if (USE_MOCK_AUTH || !token) return;
    loadApiPairs().catch(() => setApiPairs([]));
  }, [token, loadApiPairs]);

  const mockPairs = useMemo(() => listDuplicatePairs(store).map(mockToDisplayPair), [store]);
  const pairs = USE_MOCK_AUTH ? mockPairs : apiPairs;
  const activePair = pairs.find((p) => p.key === activeKey) ?? null;
  const actor = user?.name ?? '';

  function formatMatchedFields(fields: string[]): string {
    if (!fields.length) return t('pages.adminDuplicates.similarDetails');
    return fields.map((f) => (f === 'dob' ? t('pages.adminDuplicates.dateOfBirth') : f)).join(', ');
  }

  function openCompare(pair: DisplayPair) {
    setKeepSide('a');
    setActiveKey(pair.key);
  }

  function onDismiss(pair: DisplayPair) {
    if (!USE_MOCK_AUTH) return;
    dismissPair(store, pair.a.id, pair.b.id, actor);
    showToast(t('pages.adminDuplicates.dismissSuccess'), 'success');
    setActiveKey(null);
    refresh();
  }

  async function onMerge(pair: DisplayPair) {
    const keep = keepSide === 'a' ? pair.a : pair.b;
    const remove = keepSide === 'a' ? pair.b : pair.a;
    if (!window.confirm(t('pages.adminDuplicates.mergeConfirm', { remove: remove.name, keep: keep.name }))) {
      return;
    }
    try {
      if (USE_MOCK_AUTH) {
        mergeClients(store, keep.id, remove.id, actor);
        refresh();
      } else if (token) {
        await clientApi.merge(token, keep.id, remove.id);
        await loadApiPairs();
      }
      showToast(t('pages.adminDuplicates.mergeSuccess', { name: keep.name }), 'success');
      setActiveKey(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('pages.adminDuplicates.mergeError'), 'error');
    }
  }

  return (
    <AppLayout navId="admin-duplicates">
      <div id="queue-list" className="dup-queue">
        {!pairs.length ? (
          <EmptyState
            title={t('pages.adminDuplicates.noDuplicates')}
            hint={t('pages.adminDuplicates.noDuplicatesHint')}
          />
        ) : (
          pairs.map((pair) => (
            <article key={pair.key} className="card dup-pair-card">
              <div className="dup-pair-header">
                <div>
                  <h2 className="dup-pair-title">
                    {pair.a.name} / {pair.b.name}
                  </h2>
                  <p className="dup-pair-meta">
                    {t('pages.adminDuplicates.matchedOn')} {formatMatchedFields(pair.matchedFields)}{' '}
                    <MatchConfidenceBadge score={pair.score} />
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => openCompare(pair)}
                >
                  {t('pages.adminDuplicates.compareRecords')}
                </button>
              </div>
            </article>
          ))
        )}
      </div>

      {activePair ? (
        <Modal
          open
          wide
          title={`${activePair.a.name} / ${activePair.b.name}`}
          onClose={() => setActiveKey(null)}
        >
          <p className="dup-pair-meta">
            {t('pages.adminDuplicates.matchedOn')} {formatMatchedFields(activePair.matchedFields)}{' '}
            <MatchConfidenceBadge score={activePair.score} />
          </p>
          <div className="dup-compare-columns dup-compare-modal">
            {(['a', 'b'] as const).map((side) => (
              <CompareColumn
                key={side}
                client={side === 'a' ? activePair.a : activePair.b}
                side={side}
                matchedFields={activePair.matchedFields}
                radioName={`dup-keep-${activePair.key}`}
                selected={keepSide === side}
                onSelect={() => setKeepSide(side)}
                apiMode={!USE_MOCK_AUTH}
              />
            ))}
          </div>
          <div className="dup-modal-actions">
            <button
              type="button"
              className="btn btn-primary"
              id="dup-modal-merge"
              onClick={() => onMerge(activePair)}
            >
              {t('pages.adminDuplicates.mergeRecords')}
            </button>
            {USE_MOCK_AUTH ? (
              <button
                type="button"
                className="btn btn-secondary"
                id="dup-modal-dismiss"
                onClick={() => onDismiss(activePair)}
              >
                {t('pages.adminDuplicates.dismissMatch')}
              </button>
            ) : null}
          </div>
        </Modal>
      ) : null}
    </AppLayout>
  );
}

type CompareColumnProps = {
  client: ClientSummary;
  side: 'a' | 'b';
  matchedFields: string[];
  radioName: string;
  selected: boolean;
  onSelect: () => void;
  apiMode: boolean;
};

function CompareColumn({
  client,
  side,
  matchedFields,
  radioName,
  selected,
  onSelect,
  apiMode,
}: CompareColumnProps) {
  const { store } = useMockData();
  const i18n = useI18n();
  const { t } = i18n;

  const view = apiMode ? null : resolveView(store, client.id);
  const stage = view?.caseId ? getStatus(view, i18n) : null;
  const referral = apiMode ? null : store.referrals.find((r) => r.clientId === client.id);
  const intake = apiMode ? null : store.intakes.find((i) => i.clientId === client.id);
  const assessment = apiMode ? null : latestAssessment(store, client.id);
  const noteCount = apiMode ? 0 : store.notes.filter((n) => n.clientId === client.id).length;

  const category = view?.caseCategoryId
    ? `${categoryLabel(view.caseCategoryId)} · ${subcategoryLabel(view.caseSubcategoryId)}`
    : '';
  const referralSummary = referral
    ? `${i18n.referralSourceLabel(referral.source)} · ${i18n.formatDate(referral.dateReceived)}`
    : t('pages.adminDuplicates.noReferral');
  const intakeSummary = intake
    ? `${i18n.intakeCompletenessLabel(intake.completeness || 'unknown')} · ${
        intake.consentOnFile
          ? t('pages.adminDuplicates.consentOnFile')
          : t('pages.adminDuplicates.consentMissing')
      }`
    : t('pages.adminDuplicates.noIntake');
  const riskSummary = assessment
    ? `${i18n.riskLabel(assessment.overallRisk)} (${i18n.formatDate(assessment.date)})`
    : t('pages.adminDuplicates.notAssessed');

  return (
    <div
      className={`dup-column dup-column-selectable${selected ? ' dup-column-keep' : ''}`}
      data-side={side}
      onClick={onSelect}
      role="presentation"
    >
      <label className="dup-keep-choice">
        <input type="radio" name={radioName} value={side} checked={selected} onChange={onSelect} />
        <span>{t('pages.adminDuplicates.keepThisRecord')}</span>
      </label>
      <div className="dup-column-head">
        <span className="dup-column-label">
          {t('pages.adminDuplicates.recordLabel', { side: side.toUpperCase() })}
        </span>
        {stage ? (
          <span
            className="workflow-stage-badge"
            data-stage={stage.stage}
            title={t('components.processStageTitle')}
          >
            {stage.shortLabel}
          </span>
        ) : null}
        {view?.incompleteIntake ? (
          <span className="incomplete-badge">{t('components.incompleteIntake')}</span>
        ) : null}
      </div>
      <DupField
        label={t('pages.adminDuplicates.fieldName')}
        value={client.name}
        match={matchedFields.includes('name')}
      />
      <DupField
        label={t('pages.adminDuplicates.fieldDob')}
        value={i18n.formatDate(client.dob ?? undefined)}
        match={matchedFields.includes('dob')}
      />
      <DupField
        label={t('pages.adminDuplicates.fieldPhone')}
        value={client.phone}
        match={matchedFields.includes('phone')}
      />
      <DupField label={t('pages.adminDuplicates.fieldAddress')} value={client.address} />
      {!apiMode ? (
        <>
          <DupField label={t('pages.adminDuplicates.fieldCategory')} value={category} />
          <DupField label={t('pages.adminDuplicates.fieldReferral')} value={referralSummary} />
          <DupField label={t('pages.adminDuplicates.fieldIntake')} value={intakeSummary} />
          <DupField label={t('pages.adminDuplicates.fieldRisk')} value={riskSummary} />
          <DupField
            label={t('pages.adminDuplicates.fieldNotes')}
            value={t('pages.adminDuplicates.notesLogged', { count: noteCount })}
          />
        </>
      ) : null}
    </div>
  );
}

function DupField({ label, value, match }: { label: string; value?: string; match?: boolean }) {
  return (
    <div className={`dup-field${match ? ' dup-field-match' : ''}`}>
      <span className="dup-field-label">{label}</span>
      <span className="dup-field-value">{value || '—'}</span>
    </div>
  );
}
