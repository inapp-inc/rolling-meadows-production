import { useI18n } from '../../i18n/I18nContext';

export function RiskScoringGuide() {
  const { t } = useI18n();

  return (
    <aside className="risk-scoring-guide">
      <h3 className="risk-scoring-guide-title">{t('forms.common.riskGuideTitle')}</h3>
      <p>{t('forms.common.riskGuideIntro')}</p>
      <ul className="risk-scoring-rules">
        <li>{t('forms.common.riskGuideRule1')}</li>
        <li>{t('forms.common.riskGuideRule2')}</li>
        <li>{t('forms.common.riskGuideRule3')}</li>
      </ul>
      <p className="risk-scoring-note">{t('forms.common.riskGuideNote')}</p>
    </aside>
  );
}
