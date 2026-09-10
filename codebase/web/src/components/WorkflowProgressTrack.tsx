import type { StageStatus } from '../api/client';

type WorkflowProgressTrackProps = {
  steps: StageStatus[];
  clientName?: string;
};

function trackStatusClass(status: string): string {
  if (status === 'complete') return 'complete';
  if (status === 'in_progress') return 'in_progress';
  return 'not_started';
}

export function WorkflowProgressTrack({ steps, clientName }: WorkflowProgressTrackProps) {
  const staged = steps.filter((s) => s.stage != null);
  const completeCount = staged.filter((s) => s.status === 'complete').length;

  return (
    <div className="workflow-track-wrap">
      <div
        className="workflow-track"
        role="img"
        aria-label={clientName ? `Process progress for ${clientName}` : 'Process progress'}
      >
        {staged.map((step) => {
          const trackClass = trackStatusClass(step.status);
          const statusLabel =
            step.status === 'complete' ? 'Complete' : step.status === 'in_progress' ? 'In progress' : 'Not started';
          return (
            <span
              key={step.tabId}
              className={`workflow-track-seg workflow-track-${trackClass}`}
              title={`${step.label} — ${statusLabel}`}
              aria-label={`Stage ${step.stage}: ${step.label}, ${statusLabel}`}
            >
              <span className="workflow-track-seg-num">{step.status === 'complete' ? '✓' : step.stage}</span>
            </span>
          );
        })}
      </div>
      <span className="workflow-track-summary">
        {completeCount} of {staged.length} stages complete
      </span>
    </div>
  );
}
