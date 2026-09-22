import { useI18n } from '../../../i18n/I18nContext';

/** Mirrors `RM.Components.voidedLabel` — an inline reason tag on a voided record. */
export function VoidedLabel({ voided, voidReason }: { voided?: boolean; voidReason?: string }) {
  const { t } = useI18n();
  if (!voided) return null;
  return (
    <span className="voided-label">
      {' '}
      {t('components.voidedPrefix')} {voidReason || t('components.noReason')}
    </span>
  );
}
