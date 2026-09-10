const PROGRAM_COLORS = ['#2d6a4f', '#40916c', '#52b788', '#74c69d', '#1a3560', '#3d5a80'];
const RISK_CLASS: Record<string, string> = {
  High: 'risk-high',
  Medium: 'risk-medium',
  Moderate: 'risk-moderate',
  Low: 'risk-low',
  Unknown: 'risk-unknown',
};

type ChartRow = { key?: string; label: string; value: number; color?: string };

type ReportBarChartProps = {
  data: ChartRow[];
  variant?: 'program' | 'risk';
  className?: string;
  activeKey?: string | null;
  onSelect?: (key: string, row: ChartRow) => void;
  ariaLabel?: (row: ChartRow) => string;
  emptyTitle?: string;
  emptyHint?: string;
};

export function ReportBarChart({
  data,
  variant = 'program',
  className = '',
  activeKey,
  onSelect,
  ariaLabel,
  emptyTitle = 'No data',
  emptyHint = 'Adjust filters or add caseload records to populate this report.',
}: ReportBarChartProps) {
  if (!data.length) {
    return (
      <div className="empty-state">
        <h3>{emptyTitle}</h3>
        <p>{emptyHint}</p>
      </div>
    );
  }

  const total = data.reduce((sum, row) => sum + row.value, 0);
  const chartClass = variant === 'program' ? 'risk-chart program-chart' : 'risk-chart';

  return (
    <div className={`${chartClass} ${className}`.trim()}>
      {data.map((row, index) => {
        const rowKey = row.key ?? row.label;
        const pct = total ? Math.round((row.value / total) * 100) : 0;
        const fillWidth = row.value > 0 ? Math.max(pct, 1) : 0;
        const fillClass = variant === 'risk' ? RISK_CLASS[row.label] ?? 'risk-unknown' : '';
        const fillStyle =
          variant === 'program'
            ? { width: `${fillWidth}%`, background: row.color ?? PROGRAM_COLORS[index % PROGRAM_COLORS.length] }
            : { width: `${fillWidth}%` };
        const isActive = activeKey != null && activeKey === rowKey;
        const interactive = Boolean(onSelect);

        return (
          <div
            key={rowKey}
            className={`risk-chart-row${variant === 'program' ? ' program-chart-row' : ''}${isActive ? ' active' : ''}`}
            role={interactive ? 'button' : undefined}
            tabIndex={interactive ? 0 : undefined}
            aria-label={interactive ? ariaLabel?.(row) ?? `${row.label}: ${row.value}` : undefined}
            onClick={interactive ? () => onSelect?.(rowKey, row) : undefined}
            onKeyDown={
              interactive
                ? (event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onSelect?.(rowKey, row);
                    }
                  }
                : undefined
            }
          >
            <div className="risk-chart-label">{row.label}</div>
            <div className="risk-chart-track">
              <div
                className={`risk-chart-fill${fillClass ? ` ${fillClass}` : ''}`}
                style={fillStyle}
              />
            </div>
            <div className="risk-chart-count">{row.value}</div>
          </div>
        );
      })}
    </div>
  );
}
