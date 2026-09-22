import { ReactNode } from 'react';

export type StatIconName = 'users' | 'link';

/** Hub stat-card glyphs; `UiIcon` only carries the report/download set. */
const ICONS: Record<StatIconName, ReactNode> = {
  users: (
    <>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  link: (
    <>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </>
  ),
};

type StatCardProps = {
  value: string | number;
  label: string;
  icon: StatIconName;
  tone?: 'primary' | 'warning' | 'success' | 'accent';
};

/** Mirrors the prototype's `RM.Components.statCard`. */
export function StatCard({ value, label, icon, tone = 'primary' }: StatCardProps) {
  return (
    <div className={`stat-card stat-${tone}`}>
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
            {ICONS[icon]}
          </svg>
        </div>
      </div>
    </div>
  );
}
