import { Link } from 'react-router-dom';
import type { DrilldownClient } from '../../../api/client';
import { EmptyState } from '../../../components/EmptyState';

type ClientChipListProps = {
  clients: DrilldownClient[];
  emptyTitle?: string;
  emptyHint?: string;
};

export function ClientChipList({
  clients,
  emptyTitle = 'No clients to show',
  emptyHint = 'No records match this selection.',
}: ClientChipListProps) {
  if (!clients.length) {
    return <EmptyState title={emptyTitle} hint={emptyHint} />;
  }

  return (
    <div className="client-chip-list">
      {clients.map((client) => (
        <div className="client-chip" key={`${client.id}-${client.caseId ?? 'none'}`}>
          <div>
            <Link to={`/clients/${client.id}`}>{client.name}</Link>
            <span className="client-chip-meta">
              {client.phone || 'No phone on file'}
              {client.stageLabel ? ` · ${client.stageLabel}` : ''}
              {client.incompleteIntake ? ' · ' : ''}
              {client.incompleteIntake ? <span className="incomplete-badge">Incomplete intake</span> : null}
            </span>
          </div>
          {client.caseId ? (
            <Link to={`/cases/${client.caseId}`} className="btn btn-sm btn-secondary">
              Open case
            </Link>
          ) : (
            <Link to={`/clients/${client.id}`} className="btn btn-sm btn-secondary">
              360° View
            </Link>
          )}
        </div>
      ))}
    </div>
  );
}
