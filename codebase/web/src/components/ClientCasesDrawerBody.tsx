import { Link } from 'react-router-dom';
import { useI18n } from '../i18n/I18nContext';
import { casesForClient, mergeClientCase } from '../mock/caseService';
import { getStatus } from '../mock/caseWorkflow';
import { categoryLabel, subcategoryLabel } from '../mock/caseCategories';
import { useMockData } from '../mock/MockDataContext';
import type { CaseloadView, MockClient } from '../mock/types';

const REASON_KEYS: Record<string, string> = {
  information: 'pages.clientRegistration.reasonInformation',
  brochure: 'pages.clientRegistration.reasonBrochure',
  service_need: 'pages.clientRegistration.reasonServiceNeed',
  emergency: 'pages.clientRegistration.reasonEmergency',
};

/**
 * Client summary plus their cases, shown in the side drawer from client search
 * and from dedup matches. Mirrors `RM.Components.clientCasesDrawerBody`.
 */
export function ClientCasesDrawerBody({
  client,
  onOpenCase,
}: {
  client: MockClient;
  onOpenCase?: (view: CaseloadView) => void;
}) {
  const { store } = useMockData();
  const i18n = useI18n();
  const { t } = i18n;

  const cases = casesForClient(store, client.id);
  const screening = client.screening ?? {};
  const contactReason = screening.contactReason ?? client.contactReason;
  const reasonLabel = contactReason ? t(REASON_KEYS[contactReason] ?? contactReason) : '';
  const screeningSummary = contactReason
    ? t('pages.clientSearch.screeningSummary', {
        reason: reasonLabel,
        date: i18n.formatDate(screening.date ?? client.registeredAt),
      })
    : t('pages.clientSearch.noScreening');

  return (
    <div className="client-drawer-summary">
      <dl className="client-drawer-meta">
        <div className="drawer-meta-row">
          <dt>{t('components.phone')}</dt>
          <dd>{client.phone || '—'}</dd>
        </div>
        <div className="drawer-meta-row">
          <dt>{t('components.address')}</dt>
          <dd>{client.address || '—'}</dd>
        </div>
        <div className="drawer-meta-row">
          <dt>{t('pages.clientSearch.tableRegistered')}</dt>
          <dd>{i18n.formatDate(client.registeredAt)}</dd>
        </div>
        <div className="drawer-meta-row">
          <dt>{t('pages.clientRegistration.screeningTitle')}</dt>
          <dd>{screeningSummary}</dd>
        </div>
      </dl>

      <div className="drawer-section">
        <h4>{t('pages.clientSearch.casesTitle')}</h4>
        {cases.length ? (
          <table className="data-table data-table-interactive client-case-table">
            <thead>
              <tr>
                <th>{t('pages.clientSearch.tableCaseNumber')}</th>
                <th>{t('pages.clientSearch.tableCategory')}</th>
                <th>{t('pages.clientSearch.tableStatus')}</th>
                <th>{t('pages.clientSearch.tableProcessStage')}</th>
                <th>{t('pages.clientSearch.tableOpened')}</th>
              </tr>
            </thead>
            <tbody>
              {cases.map((caseRecord) => {
                const view = mergeClientCase(client, caseRecord);
                const stage = getStatus(view, i18n);
                const open = () => onOpenCase?.(view);
                return (
                  <tr
                    key={caseRecord.id}
                    className="client-case-row"
                    data-case-id={caseRecord.id}
                    role={onOpenCase ? 'button' : undefined}
                    tabIndex={onOpenCase ? 0 : undefined}
                    onClick={onOpenCase ? open : undefined}
                    onKeyDown={
                      onOpenCase
                        ? (event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              open();
                            }
                          }
                        : undefined
                    }
                  >
                    <td>{caseRecord.caseNumber || caseRecord.id}</td>
                    <td>
                      <span className="case-category-badge">
                        {categoryLabel(caseRecord.caseCategoryId)} ·{' '}
                        {subcategoryLabel(caseRecord.caseSubcategoryId)}
                      </span>
                    </td>
                    <td>{i18n.clientStatusLabel(caseRecord.status)}</td>
                    <td>
                      <span className="workflow-stage-badge" data-stage={stage.stage}>
                        {stage.shortLabel}
                      </span>
                    </td>
                    <td>{i18n.formatDate(caseRecord.openDate)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className="text-muted">{t('pages.clientSearch.noCasesHint')}</p>
        )}
      </div>

      <div className="drawer-actions">
        <Link to={`/cases/new?clientId=${client.id}`} className="btn btn-primary">
          {t('pages.clientSearch.createCase')}
        </Link>
        <Link to={`/clients/${client.id}`} className="btn btn-secondary">
          {t('components.view360')}
        </Link>
      </div>
    </div>
  );
}
