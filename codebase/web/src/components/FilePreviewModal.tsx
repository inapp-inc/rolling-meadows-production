import { useEffect } from 'react';
import { useI18n } from '../i18n/I18nContext';
import { downloadDocument, isImage, isLink, isPdf, openDocumentLink } from '../mock/documentService';
import { UiIcon } from './UiIcon';
import type { MockDocument } from '../mock/types';

type FilePreviewModalProps = {
  doc: MockDocument | null;
  onClose: () => void;
};

/** Mirrors the prototype's `RM.DocumentService.preview` modal. */
export function FilePreviewModal({ doc, onClose }: FilePreviewModalProps) {
  const { t } = useI18n();

  useEffect(() => {
    if (!doc) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.body.classList.add('modal-open');
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.classList.remove('modal-open');
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [doc, onClose]);

  if (!doc) return null;

  const link = isLink(doc);

  return (
    <div className="modal-overlay" role="presentation" onClick={onClose}>
      <div
        className={`modal${link ? '' : ' modal-wide'} doc-preview-modal`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="doc-preview-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <h2 id="doc-preview-title">{doc.name}</h2>
          <div className="modal-header-controls">
            {!link ? (
              <button
                type="button"
                className="modal-icon-btn"
                aria-label={t('documents.downloadAria', { filename: doc.name })}
                onClick={() => downloadDocument(doc)}
              >
                <UiIcon name="download" />
              </button>
            ) : null}
            <button type="button" className="modal-close" aria-label="Close" onClick={onClose}>
              ×
            </button>
          </div>
        </div>
        <div className="modal-body">
          <PreviewBody doc={doc} />
        </div>
      </div>
    </div>
  );
}

function PreviewBody({ doc }: { doc: MockDocument }) {
  const { t } = useI18n();

  if (isLink(doc)) {
    return (
      <div className="doc-link-preview">
        <p>{t('documents.linkPreviewLead')}</p>
        <p className="doc-link-preview-url">
          <strong>{t('documents.locationLabel')}</strong> {doc.externalUrl}
        </p>
        <div className="modal-actions">
          <button type="button" className="btn btn-primary" onClick={() => openDocumentLink(doc)}>
            {t('documents.openLink')}
          </button>
        </div>
      </div>
    );
  }

  if (doc.dataUrl && isPdf(doc)) {
    return (
      <div className="doc-preview-wrap">
        <iframe className="doc-preview-frame" src={doc.dataUrl} title={doc.name} />
      </div>
    );
  }

  if (doc.dataUrl && isImage(doc)) {
    return (
      <div className="doc-preview-wrap">
        <img className="doc-preview-image" src={doc.dataUrl} alt={doc.name} />
      </div>
    );
  }

  return (
    <div className="doc-preview-wrap doc-preview-wrap-empty">
      <p className="text-muted">{t('documents.previewUnavailable')}</p>
    </div>
  );
}
