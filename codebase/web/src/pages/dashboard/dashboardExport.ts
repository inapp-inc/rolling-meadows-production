import type { I18nApi } from '../../i18n/I18nContext';
import { RISK_DONUT_COLORS, type RiskDonutSlice } from '../../components/RiskDonut';
import type { caseloadSuccessMetrics } from '../../mock/caseService';

export type DashboardMetrics = ReturnType<typeof caseloadSuccessMetrics> & {
  servicesConnectedPct: number;
};

export type OverviewCounts = { highCount: number; overdueCount: number; incompleteCount: number };

type Painter = (ctx: CanvasRenderingContext2D) => void;

/** Renders at 2× and downloads as PNG, matching the prototype's canvas exporters. */
function paintAndDownload(width: number, height: number, filename: string, paint: Painter): void {
  const canvas = document.createElement('canvas');
  canvas.width = width * 2;
  canvas.height = height * 2;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.scale(2, 2);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  paint(ctx);
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }, 'image/png');
}

function riskImprovementLabel(t: I18nApi['t'], count: number): string {
  return count === 1
    ? t('dashboard.riskImprovementCount', { count })
    : t('dashboard.riskImprovementCountPlural', { count });
}

function progressRows(i18n: I18nApi, metrics: DashboardMetrics) {
  return [
    { label: i18n.t('dashboard.intakesComplete'), pct: metrics.intakeCompletePct },
    { label: i18n.t('dashboard.followUpsOnTrack'), pct: metrics.followUpOnTrackPct },
    { label: i18n.t('dashboard.clientsReceivingServices'), pct: metrics.servicesConnectedPct },
  ];
}

export function exportProgramImpactPng(i18n: I18nApi, metrics: DashboardMetrics, filename: string): void {
  paintAndDownload(760, 360, filename, (ctx) => {
    ctx.fillStyle = '#1a3a5c';
    ctx.font = '700 20px Arial';
    ctx.fillText(i18n.t('dashboard.programImpact'), 24, 32);

    const cx = 92;
    const cy = 132;
    const radius = 58;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 12;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (metrics.intakeCompletePct / 100));
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 12;
    ctx.stroke();

    ctx.fillStyle = '#1a3a5c';
    ctx.font = '700 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${metrics.intakeCompletePct}%`, cx, cy + 4);
    ctx.font = '600 11px Arial';
    ctx.fillStyle = '#64748b';
    ctx.fillText(i18n.t('dashboard.intakesComplete'), cx, cy + 22);
    ctx.textAlign = 'left';

    ctx.fillStyle = '#1a3a5c';
    ctx.font = '700 18px Arial';
    ctx.fillText(i18n.t('dashboard.successTitle'), 180, 88);
    ctx.font = '600 13px Arial';

    const highlights = [
      i18n.t('dashboard.activeEnrollments', { count: metrics.serviceEnrollments }),
      i18n.t('dashboard.activeGoals', { count: metrics.activeGoals }),
      riskImprovementLabel(i18n.t, metrics.riskImprovements),
    ];
    highlights.forEach((line, index) => {
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(188, 118 + index * 28, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#334155';
      ctx.fillText(line, 204, 122 + index * 28);
    });

    let barY = 228;
    progressRows(i18n, metrics).forEach((row) => {
      ctx.fillStyle = '#334155';
      ctx.font = '600 13px Arial';
      ctx.fillText(row.label, 24, barY);
      ctx.fillStyle = '#e5e7eb';
      ctx.fillRect(260, barY - 12, 420, 16);
      ctx.fillStyle = '#10b981';
      ctx.fillRect(260, barY - 12, Math.max(420 * (row.pct / 100), 4), 16);
      ctx.fillStyle = '#1a3a5c';
      ctx.font = '700 13px Arial';
      ctx.fillText(`${row.pct}%`, 696, barY);
      barY += 36;
    });
  });
}

export function exportProgramOverviewPng(
  i18n: I18nApi,
  metrics: DashboardMetrics,
  riskReport: RiskDonutSlice[],
  total: number,
  counts: OverviewCounts,
  filename: string,
): void {
  const rowHeight = 44;
  const height = 250 + (riskReport.length ? riskReport.length * rowHeight + 40 : 80);

  paintAndDownload(760, height, filename, (ctx) => {
    ctx.fillStyle = '#1a3a5c';
    ctx.font = '700 18px Arial';
    ctx.fillText(i18n.t('dashboard.programOverview'), 24, 30);

    const snapshots = [
      { value: `${metrics.intakeCompletePct}%`, label: i18n.t('dashboard.intakesComplete') },
      { value: `${metrics.followUpOnTrackPct}%`, label: i18n.t('dashboard.followUpsOnTrack') },
      { value: String(metrics.clientsWithServices), label: i18n.t('dashboard.receivingServices') },
      { value: String(metrics.cboConfirmed), label: i18n.t('dashboard.cboPartnersConfirmed') },
      { value: String(total), label: i18n.t('dashboard.totalActive') },
      { value: String(counts.highCount), label: i18n.t('dashboard.highRisk') },
      { value: String(counts.overdueCount), label: i18n.t('dashboard.needFollowUp') },
      { value: String(counts.incompleteCount), label: i18n.t('dashboard.incompleteIntake') },
    ];

    let snapX = 24;
    let snapY = 48;
    snapshots.forEach((snap, index) => {
      if (index === 4) {
        snapX = 24;
        snapY += 58;
      }
      ctx.fillStyle = index < 4 ? '#ecfdf5' : '#f8fafc';
      ctx.fillRect(snapX, snapY, 168, 48);
      ctx.fillStyle = '#1a3a5c';
      ctx.font = '700 18px Arial';
      ctx.fillText(snap.value, snapX + 12, snapY + 22);
      ctx.font = '600 11px Arial';
      ctx.fillStyle = '#64748b';
      ctx.fillText(snap.label, snapX + 12, snapY + 38);
      snapX += 180;
    });

    const chartY = snapY + 72;
    ctx.fillStyle = '#1a3a5c';
    ctx.font = '700 15px Arial';
    ctx.fillText(i18n.t('dashboard.caseloadByRisk'), 24, chartY);

    if (!riskReport.length) {
      ctx.fillStyle = '#64748b';
      ctx.font = '600 13px Arial';
      ctx.fillText(i18n.t('dashboard.noRiskData'), 24, chartY + 28);
      return;
    }

    riskReport.forEach((row, index) => {
      const y = chartY + 16 + index * rowHeight;
      ctx.fillStyle = '#1a3a5c';
      ctx.font = '600 13px Arial';
      ctx.fillText(i18n.riskLabel(row.riskLevel), 24, y + 18);
      ctx.fillStyle = '#e5e7eb';
      ctx.fillRect(120, y, 560, 22);
      ctx.fillStyle = RISK_DONUT_COLORS[row.riskLevel] ?? RISK_DONUT_COLORS.Unknown;
      ctx.fillRect(120, y, Math.max(560 * (total ? row.count / total : 0), 4), 22);
      ctx.fillStyle = '#374151';
      ctx.font = '700 14px Arial';
      ctx.fillText(String(row.count), 700, y + 18);
    });
  });
}

export function exportDonutChartPng(
  i18n: I18nApi,
  riskReport: RiskDonutSlice[],
  total: number,
  filename: string,
): void {
  paintAndDownload(520, 280, filename, (ctx) => {
    const cx = 110;
    const cy = 140;
    const outer = 88;
    const inner = 56;
    let start = -Math.PI / 2;

    riskReport.forEach((row) => {
      const slice = total ? (row.count / total) * Math.PI * 2 : 0;
      if (slice <= 0) return;
      ctx.beginPath();
      ctx.arc(cx, cy, outer, start, start + slice);
      ctx.arc(cx, cy, inner, start + slice, start, true);
      ctx.closePath();
      ctx.fillStyle = RISK_DONUT_COLORS[row.riskLevel] ?? RISK_DONUT_COLORS.Unknown;
      ctx.fill();
      start += slice;
    });

    ctx.beginPath();
    ctx.arc(cx, cy, inner, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#1a3a5c';
    ctx.font = '700 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(String(total), cx, cy + 4);
    ctx.font = '600 11px Arial';
    ctx.fillStyle = '#64748b';
    ctx.fillText(i18n.t('dashboard.donutActive'), cx, cy + 20);
    ctx.textAlign = 'left';

    let legendY = 48;
    riskReport.forEach((row) => {
      ctx.fillStyle = RISK_DONUT_COLORS[row.riskLevel] ?? RISK_DONUT_COLORS.Unknown;
      ctx.beginPath();
      ctx.arc(240, legendY, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#334155';
      ctx.font = '600 13px Arial';
      ctx.fillText(`${i18n.riskLabel(row.riskLevel)} (${row.count})`, 256, legendY + 4);
      legendY += 28;
    });
  });
}
