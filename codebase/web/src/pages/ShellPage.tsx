import { AppLayout } from '../components/AppLayout';

interface ShellPageProps {
  title: string;
  description: string;
}

export function ShellPage({ title, description }: ShellPageProps) {
  return (
    <AppLayout title={title}>
      <p>{description}</p>
      <p className="muted">
        Operational screens migrate from <code>Docs/ui/</code> in subsequent SEED units.
      </p>
    </AppLayout>
  );
}

export function LiaisonPlaceholder() {
  return (
    <ShellPage
      title="Cross-Program Lookup"
      description="Restricted liaison lookup (BR-LIA-01). Matches prototype liaison-lookup.html."
    />
  );
}

export function ReportsPlaceholder() {
  return (
    <ShellPage
      title="Reports"
      description="Integrity and audit tier entry for Auditor role. Matches prototype reports.html."
    />
  );
}

export function AdminPlaceholder() {
  return (
    <ShellPage
      title="Administration"
      description="Tenant administration console — BRD scope, not yet in prototype."
    />
  );
}

export function PlatformPlaceholder() {
  return (
    <ShellPage
      title="Platform Console"
      description="Platform tenant management — BRD scope, not yet in prototype."
    />
  );
}
