import { useI18n } from '../../../i18n/I18nContext';

type ReportBuilderHintBtnProps = {
  hintKey: string;
};

export function ReportBuilderHintBtn({ hintKey }: ReportBuilderHintBtnProps) {
  const { t } = useI18n();
  const hint = t(hintKey);

  return (
    <span className="rb-hint-wrap">
      <button type="button" className="rb-hint-btn" aria-label={hint}>
        i
      </button>
      <span className="rb-hint-tooltip" role="tooltip">
        {hint}
      </span>
    </span>
  );
}
