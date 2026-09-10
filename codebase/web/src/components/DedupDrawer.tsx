import { useNavigate } from 'react-router-dom';
import type { DedupMatch } from '../api/client';
import { useI18n } from '../i18n/I18nContext';
import { SideDrawer } from './SideDrawer';

/** Confidence chip driven by the dedup score, matching `matchConfidenceBadge`. */
export function MatchConfidenceBadge({ score }: { score: number }) {
  const { t } = useI18n();
  const level = score >= 80 ? 'strong' : score >= 50 ? 'likely' : 'possible';
  const strength =
    level === 'strong'
      ? t('components.matchStrong')
      : level === 'likely'
        ? t('components.matchLikely')
        : t('components.matchPossible');
  return (
    <span className={`match-badge match-${level}`} title={t('components.matchScoreTitle', { score })}>
      {strength} {t('components.matchSuffix')}
    </span>
  );
}

type DedupDrawerProps = {
  matches: DedupMatch[];
  /** Shows the "continue as new" action, turning this into the submit-time modal. */
  showContinue?: boolean;
  showOpenButtons?: boolean;
  onOpen?: (clientId: string) => void;
  onContinue?: () => void;
  onClose: () => void;
};

/**
 * Left-hand drawer listing possible duplicate clients. Doubles as the
 * submit-time confirmation, mirroring `showDedupDrawer` / `showDuplicateModal`.
 */
export function DedupDrawer({
  matches,
  showContinue,
  showOpenButtons = true,
  onOpen,
  onContinue,
  onClose,
}: DedupDrawerProps) {
  const { t } = useI18n();
  const navigate = useNavigate();

  const title =
    matches.length > 1 ? t('components.possibleDuplicates') : t('components.possibleDuplicate');

  function openRecord(clientId: string) {
    if (onOpen) onOpen(clientId);
    else navigate(`/clients/${clientId}`);
  }

  return (
    <SideDrawer title={title} open={matches.length > 0} onClose={onClose} side="left">
      <p className="dedup-drawer-lead">{t('components.dedupDrawerLead')}</p>
      <ul className="dedup-drawer-list">
        {matches.map((m) => (
          <li className="dedup-drawer-item" key={m.client.id}>
            <div className="dedup-drawer-match">
              <strong>{m.client.name}</strong> <MatchConfidenceBadge score={m.score} />
              <div className="dedup-drawer-meta">
                {t('components.matchedOn')} {m.matchedFields.join(', ')}
              </div>
              <div className="dedup-drawer-meta">
                {t('components.dob')}: {m.client.dob || '—'} · {t('components.phone')}:{' '}
                {m.client.phone || '—'}
              </div>
            </div>
            {showOpenButtons ? (
              <button
                type="button"
                className="btn btn-primary btn-sm dedup-open-btn"
                onClick={() => openRecord(m.client.id)}
              >
                {t('components.openRecord')}
              </button>
            ) : null}
          </li>
        ))}
      </ul>
      {showContinue && onContinue ? (
        <div className="dedup-drawer-actions">
          <button type="button" className="btn btn-secondary" id="dedup-continue" onClick={onContinue}>
            {t('components.continueAsNew')}
          </button>
        </div>
      ) : null}
    </SideDrawer>
  );
}
