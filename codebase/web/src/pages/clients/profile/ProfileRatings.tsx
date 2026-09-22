import { RiskBadge } from '../../../components/RiskBadge';
import { useI18n } from '../../../i18n/I18nContext';
import { ratingDomainKeys } from '../../../mock/caseWorkflow';
import type { CaseloadView } from '../../../mock/types';

const RATING_LEVELS = ['Low', 'Medium', 'High'];

type Ratings = Record<string, string> | null | undefined;

/** Older records store `Moderate`, which renders in the `Medium` column. */
function ratingMatches(stored: string | undefined, level: string): boolean {
  if (!stored) return false;
  return stored === level || (stored === 'Moderate' && level === 'Medium');
}

function ratedKeys(client: CaseloadView, ratings: Record<string, string>): string[] {
  return ratingDomainKeys(client, ratings).filter((key) => ratings[key]);
}

export function RatingsTable({ client, ratings }: { client: CaseloadView; ratings: Ratings }) {
  const { t, riskLabel, domainLabel } = useI18n();
  const keys = ratings ? ratedKeys(client, ratings) : [];
  if (!ratings || !keys.length) return <p className="profile-inline-meta">—</p>;

  return (
    <table className="data-table rating-table rating-table-readonly">
      <thead>
        <tr>
          <th>{t('forms.common.domain')}</th>
          {RATING_LEVELS.map((level) => (
            <th key={level}>{riskLabel(level)}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {keys.map((key) => (
          <tr key={key}>
            <td>{domainLabel(key)}</td>
            {RATING_LEVELS.map((level) => {
              const active = ratingMatches(ratings[key], level);
              return (
                <td key={level} className={active ? 'rating-cell rating-cell-active' : 'rating-cell'}>
                  {active ? <RiskBadge level={ratings[key]} /> : '—'}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function RatingsList({ client, ratings }: { client: CaseloadView; ratings: Ratings }) {
  const { domainLabel } = useI18n();
  const keys = ratings ? ratedKeys(client, ratings) : [];
  if (!ratings || !keys.length) return <p className="profile-inline-meta">—</p>;

  return (
    <ul>
      {keys.map((key) => (
        <li key={key}>
          {domainLabel(key)}: <RiskBadge level={ratings[key]} />
        </li>
      ))}
    </ul>
  );
}

export function RatingsCompare({
  client,
  previousRatings,
  newRatings,
}: {
  client: CaseloadView;
  previousRatings: Ratings;
  newRatings: Ratings;
}) {
  const { t, domainLabel } = useI18n();
  const domains = ratingDomainKeys(client, previousRatings ?? newRatings);

  return (
    <table className="data-table compare-table">
      <thead>
        <tr>
          <th>{t('components.domain')}</th>
          <th>{t('components.previous')}</th>
          <th>{t('components.current')}</th>
          <th />
        </tr>
      </thead>
      <tbody>
        {domains.map((domain) => {
          const previous = previousRatings?.[domain];
          const current = newRatings?.[domain];
          if (!previous && !current) return null;
          const changed = Boolean(previous && current && previous !== current);
          return (
            <tr key={domain} className={changed ? 'compare-changed' : undefined}>
              <td>{domainLabel(domain)}</td>
              <td>{previous ? <RiskBadge level={previous} /> : '—'}</td>
              <td>{current ? <RiskBadge level={current} /> : '—'}</td>
              <td>{changed ? <span className="compare-delta">{t('components.changed')}</span> : null}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export function RiskScoreSummary({
  compositeScore,
  overallRisk,
  assessedDate,
}: {
  compositeScore?: number;
  overallRisk?: string;
  assessedDate?: string;
}) {
  const { t, formatDate } = useI18n();

  if (compositeScore == null || !overallRisk) {
    return (
      <div className="risk-score-summary risk-score-summary-pending">
        <p className="risk-score-label">{t('forms.common.finalRiskScore')}</p>
        <p className="risk-score-pending">{t('forms.common.riskScorePending')}</p>
      </div>
    );
  }

  return (
    <div className="risk-score-summary">
      <p className="risk-score-label">{t('forms.common.finalRiskScore')}</p>
      <div className="risk-score-values">
        <div className="risk-score-metric">
          <span className="risk-score-metric-label">{t('forms.common.compositeScore')}</span>
          <strong className="risk-score-number">{compositeScore}</strong>
        </div>
        <div className="risk-score-metric">
          <span className="risk-score-metric-label">{t('forms.common.overallRiskLevel')}</span>
          <span className="risk-score-badge">
            <RiskBadge level={overallRisk} />
          </span>
        </div>
      </div>
      {assessedDate ? (
        <p className="risk-score-meta">{t('forms.common.assessed', { date: formatDate(assessedDate) })}</p>
      ) : null}
    </div>
  );
}
