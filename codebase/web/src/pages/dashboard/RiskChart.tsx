import { EmptyState } from '../../components/EmptyState';
import { RiskBadge } from '../../components/RiskBadge';
import { useI18n } from '../../i18n/I18nContext';
import type { RiskDonutSlice } from '../../components/RiskDonut';

const RISK_FILL_CLASS: Record<string, string> = {
  High: 'risk-high',
  Medium: 'risk-medium',
  Moderate: 'risk-moderate',
  Low: 'risk-low',
  Unknown: 'risk-unknown',
};

type RiskChartProps = {
  rows: RiskDonutSlice[];
  total: number;
  activeLevel: string | null;
  onSelect: (level: string) => void;
};

/** Horizontal caseload-by-risk bars, mirroring the prototype's `renderRiskChart`. */
export function RiskChart({ rows, total, activeLevel, onSelect }: RiskChartProps) {
  const { t, riskLabel } = useI18n();

  if (!rows.length) {
    return (
      <div className="risk-chart" id="risk-chart">
        <EmptyState title={t('dashboard.noRiskData')} hint={t('dashboard.noRiskDataHint')} />
      </div>
    );
  }

  return (
    <div className="risk-chart" id="risk-chart">
      {rows.map((row) => {
        const pct = total ? Math.round((row.count / total) * 100) : 0;
        return (
          <div
            key={row.riskLevel}
            className={`risk-chart-row${activeLevel === row.riskLevel ? ' active' : ''}`}
            data-risk={row.riskLevel}
            role="button"
            tabIndex={0}
            aria-label={t('pages.reports.riskDrilldownAria', {
              count: row.count,
              level: riskLabel(row.riskLevel),
            })}
            onClick={() => onSelect(row.riskLevel)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onSelect(row.riskLevel);
              }
            }}
          >
            <div className="risk-chart-label">
              <RiskBadge level={row.riskLevel} />
            </div>
            <div className="risk-chart-track">
              <div
                className={`risk-chart-fill ${RISK_FILL_CLASS[row.riskLevel] ?? 'risk-unknown'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="risk-chart-count">{row.count}</div>
          </div>
        );
      })}
    </div>
  );
}
