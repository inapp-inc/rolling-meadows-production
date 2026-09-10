import { ReactNode } from 'react';

const PATHS: Record<string, ReactNode> = {
  download: (
    <>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </>
  ),
  image: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </>
  ),
  chart: <path d="M18 20V10M12 20V4M6 20v-6" />,
  check: <path d="M20 6L9 17l-5-5" />,
  spreadsheet: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="3" y1="15" x2="21" y2="15" />
      <line x1="9" y1="3" x2="9" y2="21" />
      <line x1="15" y1="3" x2="15" y2="21" />
    </>
  ),
  edit: (
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </>
  ),
  trash: (
    <>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </>
  ),
};

export function UiIcon({ name }: { name: keyof typeof PATHS | string }) {
  return (
    <svg
      className="ui-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      {PATHS[name] ?? PATHS.download}
    </svg>
  );
}

type DownloadComboButtonProps = {
  kind: 'image' | 'spreadsheet';
  label: string;
  disabled?: boolean;
  onClick: () => void;
};

export function DownloadComboButton({ kind, label, disabled, onClick }: DownloadComboButtonProps) {
  return (
    <button
      type="button"
      className="download-icon-btn download-icon-btn--combo"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
    >
      <span className="download-icon-combo" aria-hidden="true">
        <span className="download-icon-combo-item">
          <UiIcon name="download" />
        </span>
        {kind === 'image' ? (
          <span className="download-icon-combo-item">
            <UiIcon name="image" />
          </span>
        ) : (
          <span className="download-icon-combo-label">XLSX</span>
        )}
      </span>
    </button>
  );
}
