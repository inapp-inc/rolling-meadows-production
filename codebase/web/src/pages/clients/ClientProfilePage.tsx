import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ApiError, caseApi, clientApi, type CaseSummary, type ClientDetail } from '../../api/client';
import { USE_MOCK_AUTH, useAuth } from '../../auth/AuthContext';
import { AppLayout } from '../../components/AppLayout';
import { DocumentVaultPanel } from '../../components/DocumentVaultPanel';
import { casesForClient } from '../../mock/caseService';
import { getClient } from '../../mock/clientService';
import { useMockData } from '../../mock/MockDataContext';
import { useI18n } from '../../i18n/I18nContext';
import { ProfileSection } from './profile/ProfileSection';

export function ClientProfilePage() {
  const { clientId } = useParams();
  const { token } = useAuth();
  const { store, version } = useMockData();
  const i18n = useI18n();
  const { t } = i18n;
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!clientId) return;
    if (USE_MOCK_AUTH) {
      const detail = getClient(store, clientId);
      if (!detail) {
        setError('Client not found');
        setClient(null);
        return;
      }
      setClient({
        id: detail.id,
        name: detail.name,
        phone: detail.phone,
        address: detail.address,
        dob: detail.dob,
        status: detail.status ?? 'registered',
        registeredAt: detail.registeredAt,
        registrationSource: detail.registrationSource,
        contactReason: detail.contactReason ?? null,
        screeningNotes: detail.screeningNotes ?? null,
        crossProgramActive: detail.crossProgramActive,
      });
      setCases(
        casesForClient(store, clientId).map((c) => ({
          id: c.id,
          caseNumber: c.caseNumber,
          clientId: c.clientId,
          programId: c.programId,
          caseCategoryId: c.caseCategoryId,
          caseSubcategoryId: c.caseSubcategoryId,
          caseManagerId: c.caseManagerId,
          status: c.status,
          incompleteIntake: Boolean(c.incompleteIntake),
          currentStage: c.currentStage,
          openDate: c.openDate,
        })),
      );
      setError('');
      return;
    }
    if (!token) return;
    Promise.all([
      clientApi.get(token, clientId),
      caseApi.list(token).catch(() => ({ items: [] as CaseSummary[] })),
    ])
      .then(([detail, caseList]) => {
        setClient(detail);
        setCases(caseList.items.filter((c) => c.clientId === clientId));
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : 'Failed to load client');
      });
  }, [token, clientId, store, version]);

  if (error) {
    return (
      <AppLayout title="Client 360° Profile" navId="client-search">
        <div className="alert alert-danger">{error}</div>
        <Link to="/clients/search" className="btn btn-secondary btn-sm">
          Back to search
        </Link>
      </AppLayout>
    );
  }

  if (!client) {
    return (
      <AppLayout title="Client 360° Profile" navId="client-search">
        <p className="text-muted">Loading…</p>
      </AppLayout>
    );
  }

  const openCases = cases.filter((c) => c.status !== 'closed');
  const activeCase = openCases[0] ?? cases[0];
  const documentsSection = {
    tabId: 'documents',
    title: t('forms.common.documentsTitle'),
    deliverable: t('forms.common.documentsDeliverable'),
    stageNum: null as number | null,
  };

  return (
    <AppLayout title="Client 360° Profile" navId="client-search">
      <p className="profile-view-note">
        <Link to="/clients/search">← Client search</Link>
      </p>

      <div className="card profile-360">
        <div className="card-header">
          <h2>{client.name}</h2>
          <Link to={`/cases/new?clientId=${client.id}`} className="btn btn-primary btn-sm">
            Open new case
          </Link>
        </div>

        <section className="profile-360-section">
          <div className="profile-360-section-header">
            <div className="profile-360-section-heading">
              <span className="profile-360-section-num">1</span>
              <span className="profile-360-section-title">Identity & registration</span>
            </div>
          </div>
          <div className="profile-360-section-body">
            <dl className="profile-list">
              <div>
                <dt>Phone</dt>
                <dd>{client.phone}</dd>
              </div>
              <div>
                <dt>Address</dt>
                <dd>{client.address}</dd>
              </div>
              <div>
                <dt>Date of birth</dt>
                <dd>{client.dob || '—'}</dd>
              </div>
              <div>
                <dt>Registered</dt>
                <dd>{client.registeredAt || '—'}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{client.status}</dd>
              </div>
              <div>
                <dt>Cross-program flag</dt>
                <dd>{client.crossProgramActive ? 'Active in another program' : 'None'}</dd>
              </div>
            </dl>
          </div>
        </section>

        <section className="profile-360-section">
          <div className="profile-360-section-header">
            <div className="profile-360-section-heading">
              <span className="profile-360-section-num">2</span>
              <span className="profile-360-section-title">Screening history</span>
            </div>
          </div>
          <div className="profile-360-section-body">
            <dl className="profile-list">
              <div>
                <dt>Contact reason</dt>
                <dd>{client.contactReason || '—'}</dd>
              </div>
              <div>
                <dt>Screening notes</dt>
                <dd>{client.screeningNotes || '—'}</dd>
              </div>
            </dl>
          </div>
        </section>

        <section className="profile-360-section">
          <div className="profile-360-section-header">
            <div className="profile-360-section-heading">
              <span className="profile-360-section-num">3</span>
              <span className="profile-360-section-title">Case history</span>
            </div>
          </div>
          <div className="profile-360-section-body">
            {cases.length === 0 ? (
              <p className="text-muted">No cases on record.</p>
            ) : (
              <>
                <p className="profile-inline-meta">
                  {cases.length} total · {openCases.length} open
                </p>
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Case #</th>
                        <th>Stage</th>
                        <th>Status</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {cases.map((c) => (
                        <tr key={c.id}>
                          <td>{c.caseNumber}</td>
                          <td>Stage {c.currentStage}</td>
                          <td>{c.status}</td>
                          <td>
                            <Link to={`/cases/${c.id}`} className="btn btn-sm btn-secondary">
                              Open workspace
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </section>

        {activeCase && clientId ? (
          <ProfileSection
            section={documentsSection}
            caseId={activeCase.id}
            workspaceLinkLabel={t('documents.manageInWorkspaceProfile')}
          >
            <DocumentVaultPanel
              clientId={clientId}
              caseId={activeCase.id}
              stageContext="client-profile"
              readOnly={activeCase.status === 'closed'}
            />
          </ProfileSection>
        ) : null}
      </div>
    </AppLayout>
  );
}
