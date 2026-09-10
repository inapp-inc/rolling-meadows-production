import { ReactNode } from 'react';

export type StatIconName = 'link' | 'clipboard' | 'trendUp' | 'users' | 'clock';

const STAT_ICONS: Record<StatIconName, ReactNode> = {
  link: (
    <>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </>
  ),
  clipboard: (
    <>
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" />
    </>
  ),
  trendUp: (
    <>
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </>
  ),
  users: (
    <>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </>
  ),
};

type DashboardStatCardProps = {
  value: number;
  label: string;
  icon: StatIconName;
  tone: 'primary' | 'warning' | 'success' | 'accent';
  onActivate?: () => void;
  activateLabel?: string;
};

export function DashboardStatCard({
  value,
  label,
  icon,
  tone,
  onActivate,
  activateLabel,
}: DashboardStatCardProps) {
  const interactive = Boolean(onActivate);
  return (
    <div
      className={`stat-card stat-${tone}`}
      data-scroll={interactive ? '' : undefined}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={interactive ? activateLabel : undefined}
      onClick={onActivate}
      onKeyDown={(event) => {
        if (!onActivate) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onActivate();
        }
      }}
    >
      <div className="stat-card-inner">
        <div>
          <div className="stat-value">{value}</div>
          <div className="stat-label">{label}</div>
        </div>
        <div className="stat-icon">
          <svg
            className="ui-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            {STAT_ICONS[icon]}
          </svg>
        </div>
      </div>
    </div>
  );
}
