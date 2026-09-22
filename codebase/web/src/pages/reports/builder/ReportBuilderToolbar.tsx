import { Link } from 'react-router-dom';
import { UiIcon } from '../../../components/UiIcon';
import { useI18n } from '../../../i18n/I18nContext';

type ReportBuilderToolbarProps = {
  name: string;
  reportType: 'table' | 'chart';
  onNameChange: (value: string) => void;
  onReportTypeChange: (value: 'table' | 'chart') => void;
  onSave: () => void;
  saving?: boolean;
};

export function ReportBuilderToolbar({
  name,
  reportType,
  onNameChange,
  onReportTypeChange,
  onSave,
  saving,
}: ReportBuilderToolbarProps) {
  const { t } = useI18n();

  return (
    <div className="report-builder-toolbar card">
      <div className="report-builder-toolbar-fields">
        <div className="form-group report-builder-name-group">
          <label htmlFor="rb-name">{t('pages.reportBuilder.reportName')}</label>
          <input
            id="rb-name"
            type="text"
            value={name}
            placeholder={t('pages.reportBuilder.reportNamePlaceholder')}
            onChange={(event) => onNameChange(event.target.value)}
          />
          <div className="rb-type-toggle" role="tablist" aria-label={t('pages.reportBuilder.reportType')}>
            <button
              type="button"
              className={`rb-type-btn${reportType === 'table' ? ' is-active' : ''}`}
              role="tab"
              aria-selected={reportType === 'table'}
              title={t('pages.reportBuilder.typeTable')}
              onClick={() => onReportTypeChange('table')}
            >
              <UiIcon name="spreadsheet" />
              <span>{t('pages.reportBuilder.typeTable')}</span>
            </button>
            <button
              type="button"
              className={`rb-type-btn${reportType === 'chart' ? ' is-active' : ''}`}
              role="tab"
              aria-selected={reportType === 'chart'}
              title={t('pages.reportBuilder.typeChart')}
              onClick={() => onReportTypeChange('chart')}
            >
              <UiIcon name="chart" />
              <span>{t('pages.reportBuilder.typeChart')}</span>
            </button>
          </div>
        </div>
      </div>
      <div className="report-builder-toolbar-actions">
        <Link to="/reports/custom" className="btn btn-secondary btn-sm rb-back-link">
          {t('pages.reportBuilder.backToList')}
        </Link>
        <button
          type="button"
          className="rb-toolbar-icon-btn"
          id="rb-save"
          aria-label={t('pages.reportBuilder.save')}
          title={t('pages.reportBuilder.saveHint')}
          disabled={saving}
          onClick={onSave}
        >
          <span className="ui-icon ui-icon-save" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
