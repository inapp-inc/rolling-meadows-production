import { useI18n } from '../i18n/I18nContext';

export type CrossProgramFlagData = {
  clientName: string;
  programLabel: string;
  caseManagerName: string;
  caseManagerPhone?: string;
};

/**
 * Warning banner shown when the person being registered already has an open
 * case in another program. Mirrors `RM.Components.renderCrossProgramFlag`.
 */
export function CrossProgramFlag({ flag }: { flag: CrossProgramFlagData | null }) {
  const { t } = useI18n();
  if (!flag) return null;

  return (
    <div className="alert alert-warning" role="alert">
      <strong>{t('components.crossProgramFlag')}</strong> —{' '}
      {t('pages.clientSearch.crossProgramBody', {
        name: flag.clientName,
        program: flag.programLabel,
        manager: flag.caseManagerName,
      })}
    </div>
  );
}
