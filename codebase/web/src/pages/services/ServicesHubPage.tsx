import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { AppLayout } from '../../components/AppLayout';
import { EmptyState } from '../../components/EmptyState';
import { StatCard } from '../../components/StatCard';
import { useI18n } from '../../i18n/I18nContext';
import { programLabel } from '../../mock/caseCategories';
import { caseloadForUser, enrollmentsForClient, openCboReferrals } from '../../mock/caseService';
import { getStatus } from '../../mock/caseWorkflow';
import { useMockData } from '../../mock/MockDataContext';

export function ServicesHubPage() {
  const { user } = useAuth();
  const { store } = useMockData();
  const i18n = useI18n();
  const { t } = i18n;

  const clients = useMemo(() => (user ? caseloadForUser(store, user) : []), [store, user]);
  const openCbo = useMemo(() => openCboReferrals(store), [store]);

  return (
    <AppLayout navId="services-hub">
      <div className="card-grid">
        <StatCard
          value={clients.length}
          label={t('pages.servicesHub.activeCaseload')}
          icon="users"
          tone="primary"
        />
        <StatCard
          value={openCbo.length}
          label={t('pages.servicesHub.openCboReferrals')}
          icon="link"
          tone="warning"
        />
      </div>

      <div className="card">
        <div className="card-header">
          <h2>{t('pages.servicesHub.quickActions')}</h2>
        </div>
        <div className="quick-actions">
          <Link to="/services/bulk-enroll" className="btn btn-primary btn-sm">
            {t('pages.servicesHub.bulkAllocation')}
          </Link>
          <Link to="/reports?tier=caseload" className="btn btn-secondary btn-sm">
            {t('pages.servicesHub.enrollmentReports')}
          </Link>
        </div>
      </div>

      <div className="card">
        <h2>{t('pages.servicesHub.enrollByClient')}</h2>
        <div id="services-client-list">
          {!clients.length ? (
            <EmptyState
              title={t('pages.servicesHub.noActiveCases')}
              hint={t('pages.servicesHub.noActiveCasesHint')}
            />
          ) : (
            <div className="table-responsive">
              <table className="data-table services-client-table">
                <thead>
                  <tr>
                    <th>{t('pages.servicesHub.tableClient')}</th>
                    <th>{t('pages.servicesHub.tableProgram')}</th>
                    <th>{t('pages.servicesHub.tableEnrollments')}</th>
                    <th>{t('pages.servicesHub.tableStage')}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((c) => {
                    const enrollments = enrollmentsForClient(store, c.id).length;
                    const stageStatus = getStatus(c, i18n);
                    const program = programLabel(c);
                    return (
                      <tr key={c.caseId} className="services-client-row" data-client-id={c.id}>
                        <td className="col-client">
                          <strong title={c.name}>{c.name}</strong>
                        </td>
                        <td className="col-program">
                          <span className="case-type-chip" title={program}>
                            {program}
                          </span>
                        </td>
                        <td className="col-enrollments">{enrollments}</td>
                        <td className="col-stage">
                          <span className="case-stage-chip" title={stageStatus.label}>
                            {t('pages.servicesHub.stageChip', { stage: stageStatus.stage })}
                          </span>
                        </td>
                        <td className="col-action">
                          <Link
                            to={`/cases/${c.caseId}?tab=services`}
                            className="btn btn-sm btn-secondary"
                          >
                            {t('pages.servicesHub.openServices')}
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {openCbo.length ? (
        <div className="card">
          <h2>{t('pages.servicesHub.openCboTitle')}</h2>
          <div id="cbo-open-list">
            <div className="table-responsive">
              <table className="data-table services-cbo-table">
                <thead>
                  <tr>
                    <th>{t('pages.servicesHub.tableClient')}</th>
                    <th>{t('pages.servicesHub.tableCbo')}</th>
                    <th>{t('pages.servicesHub.tableStatus')}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {openCbo.map((r) => {
                    const client = store.clients.find((c) => c.id === r.clientId);
                    return (
                      <tr key={r.id}>
                        <td className="col-client">
                          <strong>{client?.name ?? t('pages.servicesHub.unknownClient')}</strong>
                        </td>
                        <td className="col-cbo">{r.cboName}</td>
                        <td className="col-status">{i18n.enumLabel('cboStatus', r.status)}</td>
                        <td className="col-action">
                          <Link
                            to={`/cases/${r.caseId}?tab=services`}
                            className="btn btn-sm btn-secondary"
                          >
                            {t('pages.servicesHub.open')}
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </AppLayout>
  );
}
