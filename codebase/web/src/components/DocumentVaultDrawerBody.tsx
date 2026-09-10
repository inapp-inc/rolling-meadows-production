import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../i18n/I18nContext';
import { documentsForClient } from '../mock/caseService';
import { useMockData } from '../mock/MockDataContext';
import type { CaseloadView, MockDocument } from '../mock/types';
import { DocumentVaultList } from './DocumentVaultList';

type DocumentVaultDrawerBodyProps = {
  client: CaseloadView;
  onPreview: (doc: MockDocument) => void;
};

/** Mirrors the prototype's `RM.DocumentService.openVaultDrawer` body. */
export function DocumentVaultDrawerBody({ client, onPreview }: DocumentVaultDrawerBodyProps) {
  const { store, version } = useMockData();
  const { t } = useI18n();

  const docs = useMemo(
    () => documentsForClient(store, client.id),
    [store, client.id, version],
  );
  const lead = docs.length
    ? t(docs.length === 1 ? 'documents.documentsOnFile' : 'documents.documentsOnFilePlural', {
        count: docs.length,
      })
    : t('documents.noDocumentsOnFile');

  return (
    <>
      <p className="doc-vault-drawer-lead">{lead}</p>

      <DocumentVaultList
        documents={docs}
        emptyMessage={t('documents.emptyDrawerMessage')}
        readOnly
        onPreview={onPreview}
      />

      <div className="drawer-actions doc-vault-drawer-actions">
        <Link to={`/cases/${client.caseId}?tab=documents`} className="btn btn-secondary btn-sm">
          {t('documents.manageInWorkspace')}
        </Link>
      </div>
    </>
  );
}
