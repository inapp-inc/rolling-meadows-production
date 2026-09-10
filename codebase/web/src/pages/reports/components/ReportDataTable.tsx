import { ReactNode } from 'react';
import { EmptyState } from '../../../components/EmptyState';

type Column<T> = {
  key: keyof T & string;
  label: string;
  render?: (row: T) => ReactNode;
};

type ReportDataTableProps<T extends Record<string, unknown>> = {
  columns: Column<T>[];
  rows: T[];
  emptyTitle?: string;
  emptyHint?: string;
  onRowClick?: (row: T, index: number) => void;
  rowKey?: (row: T, index: number) => string;
  activeRowKey?: string | null;
  rowAriaLabel?: (row: T) => string;
};

export function ReportDataTable<T extends Record<string, unknown>>({
  columns,
  rows,
  emptyTitle = 'No data',
  emptyHint = 'Records will appear when caseload data is available.',
  onRowClick,
  rowKey,
  activeRowKey,
  rowAriaLabel,
}: ReportDataTableProps<T>) {
  if (!rows.length) {
    return <EmptyState title={emptyTitle} hint={emptyHint} />;
  }

  const interactive = Boolean(onRowClick);

  return (
    <div className="table-responsive">
      <table className={`data-table${interactive ? ' data-table-interactive' : ''}`}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const key = rowKey ? rowKey(row, i) : String(i);
            const isActive = activeRowKey != null && activeRowKey === key;
            return (
              <tr
                key={key}
                className={isActive ? 'active' : undefined}
                role={interactive ? 'button' : undefined}
                tabIndex={interactive ? 0 : undefined}
                aria-label={interactive ? rowAriaLabel?.(row) : undefined}
                onClick={interactive ? () => onRowClick?.(row, i) : undefined}
                onKeyDown={
                  interactive
                    ? (event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          onRowClick?.(row, i);
                        }
                      }
                    : undefined
                }
              >
                {columns.map((col) => (
                  <td key={col.key}>
                    {col.render ? col.render(row) : String(row[col.key] ?? '—')}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
