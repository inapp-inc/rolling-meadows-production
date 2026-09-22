import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { DrilldownClient } from '../../../api/client';
import { RiskBadge } from '../../../components/RiskBadge';
import { formatDate } from '../../../mock/workflow';

export type DrawerMetaRow = { label: string; value?: ReactNode };
export type DrawerSection = { title: string; body: ReactNode };

type ClientDrawerBodyProps = {
  client: DrilldownClient;
  workspaceTab?: string;
  badge?: ReactNode;
  alert?: { type: 'info' | 'warning' | 'success'; message: string };
  metaRows?: DrawerMetaRow[];
  sections?: DrawerSection[];
};

function initials(name: string): string {
  return (name || 'C')
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function ClientDrawerBody({
  client,
  workspaceTab,
  badge,
  alert,
  metaRows,
  sections,
}: ClientDrawerBodyProps) {
  const workspaceUrl = client.caseId
    ? `/cases/${client.caseId}${workspaceTab ? `?tab=${workspaceTab}` : ''}`
    : null;

  const rows: DrawerMetaRow[] = metaRows ?? [
    { label: 'Date of birth', value: formatDate(client.dob) },
    { label: 'Phone', value: client.phone },
    { label: 'Address', value: client.address },
    { label: 'Program', value: client.programLabel },
    { label: 'Process stage', value: client.stageLabel },
    { label: 'Case manager', value: client.caseManagerName },
  ];

  return (
    <div className="client-drawer-summary">
      <div className="client-drawer-header">
        <div className="profile-avatar client-drawer-avatar" aria-hidden="true">
          {initials(client.name)}
        </div>
        <div className="client-drawer-title">
          <h3>{client.name}</h3>
          {client.programLabel ? <p className="client-drawer-workflow">{client.programLabel}</p> : null}
          <div className="client-drawer-badges">
            {client.riskLevel ? <RiskBadge level={client.riskLevel} /> : null}
            {client.stageLabel ? <span className="client-status-badge">{client.stageLabel}</span> : null}
            {client.incompleteIntake ? <span className="incomplete-badge">Incomplete intake</span> : null}
            {badge}
          </div>
        </div>
      </div>

      {alert ? (
        <div className={`alert alert-${alert.type}`} role="alert">
          {alert.message}
        </div>
      ) : null}

      <dl className="client-drawer-meta">
        {rows.map((row) => (
          <div className="client-drawer-meta-row" key={row.label}>
            <dt>{row.label}</dt>
            <dd>{row.value == null || row.value === '' ? '—' : row.value}</dd>
          </div>
        ))}
      </dl>

      {(sections ?? []).map((section) => (
        <div className="client-drawer-section" key={section.title}>
          <h4>{section.title}</h4>
          {section.body}
        </div>
      ))}

      <div className="drawer-actions">
        {workspaceUrl ? (
          <Link to={workspaceUrl} className="btn btn-primary btn-sm">
            Open case workspace
          </Link>
        ) : null}
        <Link to={`/clients/${client.id}`} className="btn btn-secondary btn-sm">
          360° View
        </Link>
      </div>
    </div>
  );
}
