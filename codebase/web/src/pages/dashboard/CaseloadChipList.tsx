import { Link } from 'react-router-dom';
import { EmptyState } from '../../components/EmptyState';
import { useI18n } from '../../i18n/I18nContext';
import { getStatus } from '../../mock/workflow';
import type { CaseloadView } from '../../mock/types';

/** Risk drilldown list shown in the side drawer, mirroring the prototype's `showDrilldown` body. */
export function CaseloadChipList({ clients }: { clients: CaseloadView[] }) {
  const i18n = useI18n();
  const { t } = i18n;

  if (!clients.length) {
    return <EmptyState title={t('components.noClientsTitle')} hint={t('components.noClientsAtRisk')} />;
  }

  return (
    <div className="client-chip-list">
      {clients.map((client) => {
        const status = getStatus(client, i18n);
        return (
          <div className="client-chip" key={client.caseId || client.id}>
            <div>
              <Link to={`/clients/${client.id}`}>{client.name}</Link>
              <span className="client-chip-meta">
                {client.phone || '—'} ·{' '}
                <span
                  className="workflow-stage-badge"
                  data-stage={status.stage}
                  title={t('components.processStageTitle')}
                >
                  {status.shortLabel}
                </span>
                {client.incompleteIntake ? (
                  <>
                    {' · '}
                    <span className="incomplete-badge">{t('components.incompleteIntake')}</span>
                  </>
                ) : null}
              </span>
            </div>
            {client.caseId ? (
              <Link to={`/cases/${client.caseId}`} className="btn btn-sm btn-secondary">
                {t('components.openCase')}
              </Link>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
