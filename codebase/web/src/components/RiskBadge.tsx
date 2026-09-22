const RISK_CLASS: Record<string, string> = {
  High: 'risk-high',
  Medium: 'risk-medium',
  Moderate: 'risk-moderate',
  Low: 'risk-low',
  Unknown: 'risk-unknown',
};

type RiskBadgeProps = {
  level: string;
};

export function RiskBadge({ level }: RiskBadgeProps) {
  const cssClass = RISK_CLASS[level] ?? 'risk-unknown';
  return <span className={`risk-badge ${cssClass}`}>{level}</span>;
}
