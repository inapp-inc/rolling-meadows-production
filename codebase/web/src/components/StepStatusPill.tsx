import { useI18n } from '../i18n/I18nContext';

export function StepStatusPill({ status, label }: { status?: string; label?: string }) {
  const { stepStatusLabel } = useI18n();
  const resolved = status || 'not_started';
  return (
    <span className={`step-status-pill step-status-${resolved}`}>
      {label || stepStatusLabel(resolved)}
    </span>
  );
}
