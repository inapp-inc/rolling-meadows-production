import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { DownloadComboButton } from '../../../components/UiIcon';
import { ReportSubscribeButton } from './ReportSubscribeButton';

type ReportCardProps = {
  title: string;
  lead?: string;
  children: ReactNode;
  className?: string;
  subscribeKey?: string;
  subscribeKind?: string;
  /** Catalog template id — turns the title into a builder link and adds a Customize button. */
  catalogId?: string;
  onDownloadImage?: () => void;
  onDownloadTable?: () => void;
};

export function ReportCard({
  title,
  lead,
  children,
  className = '',
  subscribeKey,
  subscribeKind = 'standard',
  catalogId,
  onDownloadImage,
  onDownloadTable,
}: ReportCardProps) {
  const builderUrl = catalogId
    ? `/reports/custom/builder?template=${encodeURIComponent(catalogId)}`
    : null;
  const hasActions = Boolean(builderUrl || subscribeKey || onDownloadImage || onDownloadTable);

  return (
    <div className={`card report-editable-card${catalogId ? ' is-editable' : ''} ${className}`.trim()}>
      <div className="card-header">
        <h2>
          {builderUrl ? (
            <Link
              to={builderUrl}
              className="report-card-title-link"
              title="Open this report in the report builder"
            >
              {title}
            </Link>
          ) : (
            title
          )}
        </h2>
        {hasActions ? (
          <div className="report-card-actions">
            {builderUrl ? (
              <Link
                to={builderUrl}
                className="btn btn-secondary btn-sm report-card-btn report-edit-btn"
                title="Open in the report builder to change columns, filters, or chart settings."
              >
                Customize
              </Link>
            ) : null}
            {subscribeKey ? (
              <ReportSubscribeButton
                reportKey={subscribeKey}
                reportKind={subscribeKind}
                reportLabel={title}
              />
            ) : null}
            {onDownloadImage || onDownloadTable ? (
              <div className="download-actions">
                {onDownloadImage ? (
                  <DownloadComboButton kind="image" label="Download image" onClick={onDownloadImage} />
                ) : null}
                {onDownloadTable ? (
                  <DownloadComboButton
                    kind="spreadsheet"
                    label="Download spreadsheet"
                    onClick={onDownloadTable}
                  />
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
      {lead ? <p className="text-muted report-card-lead">{lead}</p> : null}
      {children}
    </div>
  );
}
