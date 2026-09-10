import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { caseApi, documentsApi, type CaseWorkspace, type DocumentSummary } from '../api/client';
import { USE_MOCK_AUTH, useAuth } from '../auth/AuthContext';
import { useI18n } from '../i18n/I18nContext';
import { documentsForClient } from '../mock/caseService';
import {
  ACCEPTED_FILE_TYPES,
  buildSampleDocument,
  linkDisplayName,
  MAX_UPLOAD_BYTES,
  normalizeUrl,
  readFileAsDataUrl,
} from '../mock/documentService';
import { useMockData } from '../mock/MockDataContext';
import type { MockDocument } from '../mock/types';
import {
  addDocumentLink,
  addDocumentUpload,
  addSampleDocument,
  deleteDocument,
} from '../mock/workspaceService';
import { DocumentVaultList } from './DocumentVaultList';
import { FilePreviewModal } from './FilePreviewModal';
import { useToast } from './ToastContext';

type DocumentVaultPanelProps = {
  clientId: string;
  caseId: string;
  stageContext: string;
  readOnly?: boolean;
  showDelete?: boolean;
  emptyMessage?: string;
  workspaceDocuments?: DocumentSummary[];
  onWorkspaceUpdate?: (ws: CaseWorkspace) => void;
};

function apiDocToMock(
  doc: DocumentSummary & { clientId?: string; caseId?: string },
  clientId: string,
  caseId: string,
): MockDocument {
  return {
    id: doc.id,
    clientId: doc.clientId ?? clientId,
    caseId: doc.caseId ?? caseId,
    name: doc.filename ?? 'Document',
    type: doc.sourceType === 'url' ? 'link' : 'upload',
    uploadedAt: doc.uploadedAt ?? new Date().toISOString(),
    uploadedBy: doc.uploadedBy,
    externalUrl: doc.externalUrl,
    mimeType: doc.mimeType,
    dataUrl: doc.dataUrl,
    size: doc.size,
    stageContext: doc.stageContext,
  };
}

/** Full document vault — upload, link, sample, list, preview. Mirrors prototype `mountVault`. */
export function DocumentVaultPanel({
  clientId,
  caseId,
  stageContext,
  readOnly = false,
  showDelete = false,
  emptyMessage,
  workspaceDocuments,
  onWorkspaceUpdate,
}: DocumentVaultPanelProps) {
  const { user, token } = useAuth();
  const { store, refresh, version } = useMockData();
  const i18n = useI18n();
  const { t } = i18n;
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [linkTitle, setLinkTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [previewDoc, setPreviewDoc] = useState<MockDocument | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [apiDocuments, setApiDocuments] = useState<MockDocument[]>([]);

  const loadApiDocuments = useCallback(async () => {
    if (USE_MOCK_AUTH || !token) return;
    const payload = await documentsApi.list(token, caseId);
    setApiDocuments(payload.items.map((doc) => apiDocToMock(doc, clientId, caseId)));
  }, [token, caseId, clientId]);

  useEffect(() => {
    if (USE_MOCK_AUTH) return;
    if (workspaceDocuments) {
      setApiDocuments(workspaceDocuments.map((doc) => apiDocToMock(doc, clientId, caseId)));
      return;
    }
    void loadApiDocuments().catch((err: unknown) => {
      setError(err instanceof Error ? err.message : 'Failed to load documents');
    });
  }, [workspaceDocuments, loadApiDocuments, clientId, caseId]);

  const mockDocuments = useMemo(
    () => documentsForClient(store, clientId),
    [store, clientId, version],
  );
  const documents = USE_MOCK_AUTH ? mockDocuments : apiDocuments;

  const uploadedBy = user?.role ? t(`role.${user.role}`) : t('documents.demoUser');

  function applyWorkspace(updated: CaseWorkspace) {
    onWorkspaceUpdate?.(updated);
    if (USE_MOCK_AUTH) {
      refresh();
    } else if (updated.documents) {
      setApiDocuments(updated.documents.map((doc) => apiDocToMock(doc, clientId, caseId)));
    } else {
      void loadApiDocuments();
    }
  }

  function handleError(err: unknown) {
    if (err instanceof Error && err.message === 'invalid_url') {
      setError(t('documents.invalidUrl'));
      return;
    }
    setError(err instanceof Error ? err.message : 'Save failed');
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || readOnly) return;

    setError('');
    if (file.size > MAX_UPLOAD_BYTES) {
      setError(t('documents.fileTooLarge'));
      return;
    }

    setBusy(true);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      if (USE_MOCK_AUTH) {
        const updated = addDocumentUpload(
          store,
          caseId,
          { name: file.name, mimeType: file.type || 'application/octet-stream', size: file.size, dataUrl },
          stageContext,
          uploadedBy,
        );
        applyWorkspace(updated);
      } else if (token) {
        const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
        await documentsApi.upload(token, {
          clientId,
          caseId,
          filename: file.name,
          mimeType: file.type || 'application/octet-stream',
          dataBase64: base64,
        });
        const updated = await caseApi.workspace(token, caseId);
        applyWorkspace(updated);
      }
      showToast(t('documents.documentUploaded'), 'success');
    } catch (err) {
      if (err instanceof Error && err.message === 'read_failed') {
        setError(t('documents.readFailed'));
      } else {
        handleError(err);
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleAddLink() {
    if (readOnly) return;
    setError('');
    const normalized = normalizeUrl(linkUrl);
    if (!normalized) {
      setError(t('documents.invalidUrl'));
      return;
    }
    const name = linkDisplayName(t, linkTitle, normalized);
    setBusy(true);
    try {
      if (USE_MOCK_AUTH) {
        const updated = addDocumentLink(store, caseId, name, normalized, stageContext, uploadedBy);
        setLinkTitle('');
        setLinkUrl('');
        applyWorkspace(updated);
      } else if (token) {
        await documentsApi.addLink(token, {
          clientId,
          caseId,
          filename: name,
          externalUrl: normalized,
        });
        const updated = await caseApi.workspace(token, caseId);
        setLinkTitle('');
        setLinkUrl('');
        applyWorkspace(updated);
      }
      showToast(t('documents.linkAdded'), 'success');
    } catch (err) {
      handleError(err);
    } finally {
      setBusy(false);
    }
  }

  function handleAddSample() {
    if (readOnly) return;
    setError('');
    const client = store.clients.find((c) => c.id === clientId);
    const kind = documents.length ? 'assessment' : 'consent';
    const sample = buildSampleDocument(t, client?.name ?? t('risk.Unknown'), client?.registeredAt, kind);
    setBusy(true);
    try {
      const updated = addSampleDocument(store, caseId, sample, uploadedBy);
      applyWorkspace(updated);
      showToast(t('documents.sampleAdded'), 'success');
    } catch (err) {
      handleError(err);
    } finally {
      setBusy(false);
    }
  }

  function handleDelete(documentId: string) {
    if (readOnly || !USE_MOCK_AUTH) return;
    setBusy(true);
    try {
      const updated = deleteDocument(store, caseId, documentId);
      applyWorkspace(updated);
    } catch (err) {
      handleError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="doc-vault-panel">
      {!readOnly ? (
        <div className="doc-vault-actions">
          <div className="form-group">
            <label htmlFor={`doc-upload-${caseId}`}>{t('documents.uploadLabel')}</label>
            <input
              ref={fileInputRef}
              id={`doc-upload-${caseId}`}
              type="file"
              accept={ACCEPTED_FILE_TYPES}
              disabled={busy}
              onChange={handleFileChange}
            />
          </div>

          <fieldset className="doc-link-form">
            <legend>{t('documents.addLinkLegend')}</legend>
            <div className="doc-link-form-grid">
              <div className="form-group">
                <label htmlFor={`doc-link-title-${caseId}`}>{t('documents.displayNameLabel')}</label>
                <input
                  id={`doc-link-title-${caseId}`}
                  type="text"
                  value={linkTitle}
                  placeholder={t('documents.displayNamePlaceholder')}
                  disabled={busy}
                  onChange={(e) => setLinkTitle(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label htmlFor={`doc-link-url-${caseId}`}>{t('documents.urlLabel')}</label>
                <input
                  id={`doc-link-url-${caseId}`}
                  type="url"
                  value={linkUrl}
                  placeholder={t('documents.urlPlaceholder')}
                  disabled={busy}
                  onChange={(e) => setLinkUrl(e.target.value)}
                />
              </div>
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={busy || !linkUrl.trim()}
              onClick={() => void handleAddLink()}
            >
              {t('documents.addLink')}
            </button>
          </fieldset>

          {USE_MOCK_AUTH ? (
            <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={handleAddSample}>
              {t('documents.addSample')}
            </button>
          ) : null}

          <p className="form-hint">{t('documents.uploadHint')}</p>
        </div>
      ) : null}

      {error ? <div className="alert alert-danger">{error}</div> : null}

      <DocumentVaultList
        documents={documents}
        emptyMessage={emptyMessage}
        readOnly={readOnly}
        showDelete={showDelete && !readOnly && USE_MOCK_AUTH}
        onPreview={setPreviewDoc}
        onDelete={handleDelete}
      />

      <FilePreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} />
    </div>
  );
}
