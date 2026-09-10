import { useI18n } from '../i18n/I18nContext';
import { EmptyState } from './EmptyState';

export type RiskDonutSlice = { riskLevel: string; count: number };

export const RISK_DONUT_COLORS: Record<string, string> = {
  High: '#ef4444',
  Medium: '#f59e0b',
  Moderate: '#d97706',
  Low: '#10b981',
  Unknown: '#94a3b8',
};

type RiskDonutProps = {
  slices: RiskDonutSlice[];
  total: number;
  centerLabel: string;
  emptyTitle: string;
  emptyHint: string;
  activeLevel?: string | null;
  onSelect?: (level: string) => void;
};

/** Conic-gradient donut with a clickable legend, mirroring the prototype's `renderDonut`. */
export function RiskDonut({
  slices,
  total,
  centerLabel,
  emptyTitle,
  emptyHint,
  activeLevel,
  onSelect,
}: RiskDonutProps) {
  const { riskLabel } = useI18n();

  if (!total) {
    return <EmptyState title={emptyTitle} hint={emptyHint} />;
  }

  let cursor = 0;
  const stops = slices.map((slice) => {
    const pct = (slice.count / total) * 100;
    const color = RISK_DONUT_COLORS[slice.riskLevel] ?? RISK_DONUT_COLORS.Unknown;
    const stop = `${color} ${cursor}% ${cursor + pct}%`;
    cursor += pct;
    return stop;
  });

  return (
    <div className="donut-wrap donut-wrap-stack">
      <div className="donut-chart" style={{ background: `conic-gradient(${stops.join(', ')})` }}>
        <div className="donut-hole">
          <span className="donut-total">{total}</span>
          <span className="donut-label">{centerLabel}</span>
        </div>
      </div>
      <div className="donut-legend">
        {slices.map((slice) => (
          <div
            key={slice.riskLevel}
            className={`donut-legend-item${activeLevel === slice.riskLevel ? ' active' : ''}`}
            data-risk={slice.riskLevel}
            role="button"
            tabIndex={0}
            onClick={() => onSelect?.(slice.riskLevel)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onSelect?.(slice.riskLevel);
              }
            }}
          >
            <span className={`legend-dot ${slice.riskLevel.toLowerCase()}`} />
            {riskLabel(slice.riskLevel)} <strong>({slice.count})</strong>
          </div>
        ))}
      </div>
    </div>
  );
}
