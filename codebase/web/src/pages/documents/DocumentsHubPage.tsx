import { useMemo, useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { AppLayout } from '../../components/AppLayout';
import { DocumentVaultDrawerBody } from '../../components/DocumentVaultDrawerBody';
import { EmptyState } from '../../components/EmptyState';
import { FilePreviewModal } from '../../components/FilePreviewModal';
import { SideDrawer } from '../../components/SideDrawer';
import { useI18n } from '../../i18n/I18nContext';
import { caseloadForUser, documentsForClient } from '../../mock/caseService';
import { getStatus } from '../../mock/caseWorkflow';
import { useMockData } from '../../mock/MockDataContext';
import type { CaseloadView, MockDocument } from '../../mock/types';

/** Mirrors the prototype's `RM.Components.processStageBadge`. */
function ProcessStageBadge({ client }: { client: CaseloadView }) {
  const i18n = useI18n();
  const status = getStatus(client, i18n);
  return (
    <span
      className="workflow-stage-badge"
      data-stage={status.stage}
      title={i18n.t('components.processStageTitle')}
    >
      {status.shortLabel}
    </span>
  );
}

export function DocumentsHubPage() {
  const { user } = useAuth();
  const { store, version } = useMockData();
  const { t } = useI18n();
  const [vaultClient, setVaultClient] = useState<CaseloadView | null>(null);
  const [previewDoc, setPreviewDoc] = useState<MockDocument | null>(null);

  const clients = useMemo(() => (user ? caseloadForUser(store, user) : []), [store, user, version]);

  function closeVault() {
    setVaultClient(null);
    setPreviewDoc(null);
  }

  return (
    <AppLayout navId="documents-hub">
      <div id="documents-client-list">
        {!clients.length ? (
          <EmptyState
            title={t('pages.documentsHub.noActiveCases')}
            hint={t('pages.documentsHub.noActiveCasesHint')}
          />
        ) : (
          <div className="table-responsive">
            <table className="data-table data-table-interactive">
              <thead>
                <tr>
                  <th>{t('pages.documentsHub.tableClient')}</th>
                  <th>{t('pages.documentsHub.tableProcessStage')}</th>
                  <th>{t('pages.documentsHub.tableDocuments')}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => {
                  const docs = documentsForClient(store, c.id);
                  return (
                    <tr
                      key={c.caseId}
                      className={`hub-row${vaultClient?.id === c.id ? ' active' : ''}`}
                      data-client-id={c.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setVaultClient(c)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setVaultClient(c);
                        }
                      }}
                    >
                      <td data-label={t('pages.documentsHub.tableClient')}>{c.name}</td>
                      <td data-label={t('pages.documentsHub.tableProcessStage')}>
                        <ProcessStageBadge client={c} />
                      </td>
                      <td data-label={t('pages.documentsHub.tableDocuments')}>{docs.length}</td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-sm btn-primary doc-vault-open-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setVaultClient(c);
                          }}
                        >
                          {t('pages.documentsHub.openVault')}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <SideDrawer
        title={vaultClient ? t('documents.vaultDrawerTitle', { name: vaultClient.name }) : ''}
        open={Boolean(vaultClient)}
        onClose={closeVault}
      >
        {vaultClient ? (
          <DocumentVaultDrawerBody client={vaultClient} onPreview={setPreviewDoc} />
        ) : null}
      </SideDrawer>

      {/* Kept outside the drawer: `.side-drawer` is transformed, which would trap the fixed overlay. */}
      <FilePreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} />
    </AppLayout>
  );
}
