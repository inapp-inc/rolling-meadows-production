import { Link } from 'react-router-dom';
import type { CustomReportItem } from '../../../api/client';
import { DownloadComboButton } from '../../../components/UiIcon';
import { useI18n } from '../../../i18n/I18nContext';
import { downloadChartPreviewPng, downloadReportCsv } from '../../../utils/reportExport';
import { CustomReportPreview } from './CustomReportPreview';
import { ReportSubscribeButton } from './ReportSubscribeButton';

function domIdForReport(reportId: string) {
  return `cr-${String(reportId || 'report').replace(/[^a-zA-Z0-9_-]/g, '-')}`;
}

type CustomReportCardProps = {
  report: CustomReportItem;
  focused?: boolean;
};

export function CustomReportCard({ report, focused }: CustomReportCardProps) {
  const { t } = useI18n();
  const slug = domIdForReport(report.id);
  const builderUrl = `/reports/custom/builder?id=${encodeURIComponent(report.id)}`;
  const isChart = report.reportType === 'chart';
  const visualId = `${slug}-chart-visual`;
  const preview = report.preview;
  const editHint = t('pages.reports.editInBuilderHint');

  function handleCsvExport() {
    if (preview) downloadReportCsv(report.name, preview);
  }

  function handleImageExport() {
    if (preview) downloadChartPreviewPng(report.name, preview);
  }

  return (
    <div
      className={`card report-editable-card is-editable${focused ? ' custom-report-card-focus' : ''}`}
      id={slug}
      data-custom-report-id={report.id}
    >
      <div className="card-header">
        <h2>
          <Link to={builderUrl} className="report-card-title-link" title={editHint} aria-label={t('pages.reports.editInBuilderAria', { report: report.name })}>
            {report.name}
          </Link>
        </h2>
        <div className="report-card-actions">
          <Link to={builderUrl} className="btn btn-secondary btn-sm report-card-btn report-edit-btn" title={editHint}>
            {t('pages.reports.editInBuilder')}
          </Link>
          <ReportSubscribeButton reportKey={report.id} reportKind="custom" reportLabel={report.name} />
          <div className="download-actions">
            {isChart ? (
              <DownloadComboButton
                kind="image"
                label={t('export.downloadImage')}
                disabled={!preview?.points?.length}
                onClick={handleImageExport}
              />
            ) : null}
            <DownloadComboButton
              kind="spreadsheet"
              label={t('export.downloadXlsx')}
              disabled={!preview?.rows?.length}
              onClick={handleCsvExport}
            />
          </div>
        </div>
      </div>
      {report.preview?.meta ? <p className="text-muted report-card-lead">{report.preview.meta}</p> : null}
      <div className="rb-preview-body">{preview ? <CustomReportPreview preview={preview} visualId={visualId} /> : null}</div>
    </div>
  );
}
