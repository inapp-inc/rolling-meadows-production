import { RiskBadge } from '../../components/RiskBadge';
import { useI18n } from '../../i18n/I18nContext';

type Props = {
  /** Heading above the score; defaults to the generic "final risk score". */
  label?: string;
  compositeScore?: number;
  overallRisk?: string;
  assessedDate?: string;
  pending?: boolean;
};

export function RiskScoreSummary({ label, compositeScore, overallRisk, assessedDate, pending }: Props) {
  const i18n = useI18n();
  const { t } = i18n;
  const heading = label ?? t('forms.common.finalRiskScore');

  if (pending || compositeScore == null || !overallRisk) {
    return (
      <div className="risk-score-summary risk-score-summary-pending">
        <p className="risk-score-label">{heading}</p>
        <p className="risk-score-pending">{t('forms.common.riskScorePending')}</p>
      </div>
    );
  }

  return (
    <div className="risk-score-summary">
      <p className="risk-score-label">{heading}</p>
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
        <p className="risk-score-meta">
          {t('forms.common.assessed', { date: i18n.formatDate(assessedDate) })}
        </p>
      ) : null}
    </div>
  );
}
