import { EmptyState } from '../../../components/EmptyState';
import { RiskBadge } from '../../../components/RiskBadge';
import type { CustomReportPreviewData } from '../../../api/client';

type CustomReportPreviewProps = {
  preview: CustomReportPreviewData;
  visualId: string;
};

export function CustomReportPreview({ preview, visualId }: CustomReportPreviewProps) {
  if (preview.reportType === 'chart') {
    if (preview.error === 'missing_x') {
      return (
        <EmptyState
          title="No chart preview yet"
          hint="Assign a category field to the X axis to preview this chart."
        />
      );
    }
    if (!preview.points?.length) {
      return (
        <EmptyState
          title="No chart data"
          hint={`No groups matched the current filters (${preview.rowCount ?? 0} records scanned).`}
        />
      );
    }

    const max = Math.max(...preview.points.map((point) => point.value), 1);

    if (preview.chartType === 'donut') {
      const total = preview.points.reduce((sum, point) => sum + point.value, 0) || 1;
      let offset = 0;
      const segments = preview.points.map((point) => {
        const pct = (point.value / total) * 100;
        const color = point.color ?? '#2563eb';
        const seg = `${color} ${offset}% ${offset + pct}%`;
        offset += pct;
        return seg;
      });
      return (
        <div id={visualId}>
          <div className="rb-chart-preview-head">
            <strong>{preview.yLabel}</strong>
            <span className="text-muted">by {preview.xLabel}</span>
          </div>
          <div className="rb-radial-wrap is-donut">
            <div className="rb-donut" style={{ background: `conic-gradient(${segments.join(', ')})` }}>
              <div className="rb-donut-hole">
                <span className="rb-donut-total">{total}</span>
              </div>
            </div>
            <ul className="rb-radial-legend">
              {preview.points.map((point, index) => (
                <li key={`${point.label}-${index}`}>
                  <span className="rb-legend-swatch" style={{ background: point.color ?? '#2563eb' }} />
                  {point.label} — {point.value}
                </li>
              ))}
            </ul>
          </div>
        </div>
      );
    }

    return (
      <div id={visualId}>
        <div className="rb-chart-preview-head">
          <strong>{preview.yLabel}</strong>
          <span className="text-muted">
            by {preview.xLabel}
          </span>
        </div>
        <div className="rb-chart-bars">
          {preview.points.map((point, index) => {
            const pct = Math.round((point.value / max) * 100);
            return (
              <div key={`${point.label}-${index}`} className="rb-chart-bar-row">
                <div className="rb-chart-bar-label">{point.label}</div>
                <div className="rb-chart-bar-track">
                  <div
                    className="rb-chart-bar-fill"
                    style={{
                      width: `${Math.max(pct, 2)}%`,
                      background: point.color ?? '#2563eb',
                    }}
                  />
                </div>
                <div className="rb-chart-bar-value">{point.value}</div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (!preview.rows?.length) {
    return (
      <EmptyState
        title="No preview data"
        hint="Adjust filters or add records to populate this custom report."
      />
    );
  }

  return (
    <div className="rb-table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {preview.columns?.map((col) => (
              <th key={col.key}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {preview.rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {preview.columns?.map((col) => {
                const value = row[col.key];
                if (col.label === 'Risk Level' && value) {
                  return (
                    <td key={col.key}>
                      <RiskBadge level={String(value)} />
                    </td>
                  );
                }
                return <td key={col.key}>{value ?? ''}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
