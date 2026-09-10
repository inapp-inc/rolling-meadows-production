import { useI18n } from '../i18n/I18nContext';
import { isLink, linkHostname, openDocumentLink, sizeInKb } from '../mock/documentService';
import type { MockDocument } from '../mock/types';
import { EmptyState } from './EmptyState';

type DocumentVaultListProps = {
  documents: MockDocument[];
  emptyMessage?: string;
  readOnly?: boolean;
  showDelete?: boolean;
  onPreview: (doc: MockDocument) => void;
  onDelete?: (docId: string) => void;
};

/** Shared stacked document list — mirrors prototype `renderListHtml`. */
export function DocumentVaultList({
  documents,
  emptyMessage,
  readOnly = false,
  showDelete = false,
  onPreview,
  onDelete,
}: DocumentVaultListProps) {
  const i18n = useI18n();
  const { t } = i18n;

  function metaFor(doc: MockDocument): string {
    const detail = isLink(doc)
      ? linkHostname(doc.externalUrl, t('documents.externalLinkHost'))
      : `${sizeInKb(doc)} KB`;
    return [doc.uploadedBy, i18n.formatDate(doc.uploadedAt), detail].filter(Boolean).join(' · ');
  }

  if (!documents.length) {
    return (
      <EmptyState
        title={t('documents.noDocumentsTitle')}
        message={emptyMessage ?? t('documents.emptyVaultMessage')}
      />
    );
  }

  return (
    <div className="doc-vault-list">
      {documents.map((doc) => (
        <div key={doc.id} className="doc-list-item doc-list-item-stacked">
          <div className="doc-list-item-title">
            <strong>{doc.name}</strong>
            {isLink(doc) ? (
              <span className="doc-link-badge">{t('documents.externalLink')}</span>
            ) : null}
          </div>
          <span className="note-meta">{metaFor(doc)}</span>
          <div className="doc-list-actions doc-list-actions-row">
            {isLink(doc) ? (
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={() => openDocumentLink(doc)}
              >
                {t('documents.openLink')}
              </button>
            ) : (
              <button type="button" className="btn btn-sm btn-primary" onClick={() => onPreview(doc)}>
                {t('documents.preview')}
              </button>
            )}
            {!readOnly && showDelete && onDelete ? (
              <button
                type="button"
                className="btn btn-sm btn-danger"
                onClick={() => onDelete(doc.id)}
              >
                {t('pages.reportBuilder.remove')}
              </button>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
