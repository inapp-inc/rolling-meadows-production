import { ReactNode } from 'react';

type StatCardProps = {
  value: string | number;
  label: string;
  tone?: 'primary' | 'warning' | 'success' | 'accent';
};

export function StatCard({ value, label, tone = 'primary' }: StatCardProps) {
  return (
    <div className={`stat-card stat-${tone}`}>
      <div className="stat-card-inner">
        <div>
          <div className="stat-value">{value}</div>
          <div className="stat-label">{label}</div>
        </div>
      </div>
    </div>
  );
}

export function StatCardGrid({ children }: { children: ReactNode }) {
  return <div className="card-grid report-auditor-summary">{children}</div>;
}
