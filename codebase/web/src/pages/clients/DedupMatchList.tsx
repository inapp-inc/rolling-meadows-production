import type { DedupMatch } from '../../api/client';
import { useI18n } from '../../i18n/I18nContext';

function ConfidenceBadge({ score }: { score: number }) {
  const { t } = useI18n();
  const label =
    score >= 50
      ? t('components.matchStrong')
      : score >= 35
        ? t('components.matchLikely')
        : t('components.matchPossible');
  const level = score >= 50 ? 'confidence-high' : score >= 35 ? 'confidence-medium' : 'confidence-low';
  return (
    <span className={`match-confidence ${level}`} title={t('components.matchScoreTitle', { score })}>
      {label} {t('components.matchSuffix')}
    </span>
  );
}

/**
 * Inline duplicate warning shown next to the identity fields, mirroring
 * `RM.Components.renderDedupMatches` with `linkClient` enabled.
 */
export function DedupMatchList({
  matches,
  onOpen,
}: {
  matches: DedupMatch[];
  onOpen: (clientId: string) => void;
}) {
  const { t } = useI18n();
  if (!matches.length) return null;

  return (
    <div className="alert alert-warning" role="alert">
      <strong>
        {matches.length > 1 ? t('components.possibleDuplicates') : t('components.possibleDuplicate')}
      </strong>
      <ul className="dedup-match-list">
        {matches.map((match) => (
          <li key={match.client.id}>
            <strong>{match.client.name}</strong> <ConfidenceBadge score={match.score} /> ·{' '}
            {t('components.matchedOn')} {match.matchedFields.join(', ')} ·{' '}
            <a
              href="#"
              className="dedup-open-link"
              data-client-id={match.client.id}
              onClick={(event) => {
                event.preventDefault();
                onOpen(match.client.id);
              }}
            >
              {t('components.openRecord')}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
