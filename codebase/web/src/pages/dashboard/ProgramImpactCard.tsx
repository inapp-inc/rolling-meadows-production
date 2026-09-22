import type { CSSProperties } from 'react';
import { DownloadComboButton, UiIcon } from '../../components/UiIcon';
import { useI18n } from '../../i18n/I18nContext';
import { ReportSubscribeButton } from '../reports/components/ReportSubscribeButton';
import type { DashboardMetrics } from './dashboardExport';

type ProgramImpactCardProps = {
  metrics: DashboardMetrics;
  onDownloadImage: () => void;
};

/** Hero "Program impact" card, mirroring the prototype's `renderSuccessBanner`. */
export function ProgramImpactCard({ metrics, onDownloadImage }: ProgramImpactCardProps) {
  const { t } = useI18n();

  const highlights = [
    t('dashboard.activeEnrollments', { count: metrics.serviceEnrollments }),
    t('dashboard.activeGoals', { count: metrics.activeGoals }),
    metrics.riskImprovements === 1
      ? t('dashboard.riskImprovementCount', { count: metrics.riskImprovements })
      : t('dashboard.riskImprovementCountPlural', { count: metrics.riskImprovements }),
  ];

  const progressRows = [
    { label: t('dashboard.intakesComplete'), pct: metrics.intakeCompletePct },
    { label: t('dashboard.followUpsOnTrack'), pct: metrics.followUpOnTrackPct },
    { label: t('dashboard.clientsReceivingServices'), pct: metrics.servicesConnectedPct },
  ];

  return (
    <section
      className="card dashboard-success-card"
      id="dashboard-success-card"
      aria-label={t('dashboard.programImpactAria')}
    >
      <div className="card-header dashboard-success-card-header">
        <h2>{t('dashboard.programImpact')}</h2>
        <div className="report-card-actions">
          <ReportSubscribeButton
            reportKey="dashboard-program-impact"
            reportKind="dashboard"
            reportLabel={t('dashboard.programImpact')}
          />
          <div className="download-actions">
            <DownloadComboButton
              kind="image"
              label={t('export.downloadImage')}
              onClick={onDownloadImage}
            />
          </div>
        </div>
      </div>

      <div className="dashboard-success-layout">
        <div className="success-ring-wrap" aria-hidden="true">
          <div
            className="success-ring"
            style={{ '--success-pct': metrics.intakeCompletePct } as CSSProperties}
          >
            <div className="success-ring-inner">
              <span className="success-ring-value">{metrics.intakeCompletePct}%</span>
              <span className="success-ring-label">{t('dashboard.intakesComplete')}</span>
            </div>
          </div>
        </div>
        <div className="dashboard-success-copy">
          <h2 className="dashboard-success-title">{t('dashboard.successTitle')}</h2>
          <p className="dashboard-success-lead">{t('dashboard.successLead')}</p>
          <ul className="dashboard-success-highlights">
            {highlights.map((highlight) => (
              <li key={highlight}>
                <span className="success-highlight-icon" aria-hidden="true">
                  <UiIcon name="check" />
                </span>
                {highlight}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="success-progress-list">
        {progressRows.map((row) => (
          <div className="success-progress-row" key={row.label}>
            <span className="success-progress-label">{row.label}</span>
            <div className="success-progress-track" role="presentation">
              <div className="success-progress-fill" style={{ width: `${row.pct}%` }} />
            </div>
            <span className="success-progress-value">{row.pct}%</span>
          </div>
        ))}
      </div>
    </section>
  );
}
