import { useMemo, useState } from 'react';
import { useI18n } from '../../../i18n/I18nContext';
import { ReportBuilderHintBtn } from './ReportBuilderHintBtn';
import { ReportBuilderStaticFilters } from './ReportBuilderStaticFilters';
import type { FieldRef, ReportBuilderConfig, ReportFilter } from './reportBuilderModel';
import { builderEntityIds, builderFieldRefs, entityLabel, fieldDisplayLabel } from './reportBuilderModel';

type ReportBuilderTableConfigProps = {
  config: ReportBuilderConfig;
  showAdvanced: boolean;
  onShowAdvancedChange: (open: boolean) => void;
  onColumnsChange: (columns: FieldRef[]) => void;
  onPrimaryEntityChange: (entity: string) => void;
  onFiltersChange: (filters: ReportFilter[]) => void;
};

export function ReportBuilderTableConfig({
  config,
  showAdvanced,
  onShowAdvancedChange,
  onColumnsChange,
  onPrimaryEntityChange,
  onFiltersChange,
}: ReportBuilderTableConfigProps) {
  const { t } = useI18n();
  const [columnSearch, setColumnSearch] = useState('');
  const refs = useMemo(() => builderFieldRefs(t, { reportableOnly: true }), [t]);
  const entityIds = builderEntityIds();
  const normalizedSearch = columnSearch.trim().toLowerCase();

  function toggleColumn(ref: FieldRef, checked: boolean) {
    const exists = config.columns.some((col) => col.entity === ref.entity && col.field === ref.field);
    if (checked && !exists) {
      onColumnsChange([...config.columns, ref]);
      return;
    }
    if (!checked && exists) {
      onColumnsChange(config.columns.filter((col) => !(col.entity === ref.entity && col.field === ref.field)));
    }
  }

  return (
    <section className="card rb-config-panel">
      <div className="rb-config-panel-head">
        <h2>{t('pages.reportBuilder.columns')}</h2>
        <p className="text-muted rb-config-panel-hint">{t('pages.reportBuilder.crossModelHint')}</p>
      </div>

      <div id="rb-column-picker" className="rb-column-picker">
        {config.columns.length ? (
          <div className="rb-column-selected">
            {config.columns.map((col, index) => (
              <span key={`${col.entity}.${col.field}`} className="rb-column-selected-chip">
                <span className="rb-column-selected-label">{fieldDisplayLabel(t, col.entity, col.field)}</span>
                <button
                  type="button"
                  className="rb-column-remove"
                  data-column-index={index}
                  aria-label={t('pages.reportBuilder.removeColumn')}
                  onClick={() => onColumnsChange(config.columns.filter((_, i) => i !== index))}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-muted rb-column-selected-empty">{t('pages.reportBuilder.noColumnsSelected')}</p>
        )}

        <div className="rb-column-picker-toolbar">
          <input
            type="search"
            id="rb-column-search"
            className="rb-column-search"
            placeholder={t('pages.reportBuilder.searchColumns')}
            autoComplete="off"
            value={columnSearch}
            onChange={(event) => setColumnSearch(event.target.value)}
          />
          <span className="rb-column-picker-count">{t('pages.reportBuilder.columnCount', { count: config.columns.length })}</span>
        </div>

        <div className="rb-column-picker-list" id="rb-column-picker-list">
          {entityIds.map((entityId) => {
            const entityRefs = refs.filter((ref) => ref.entity === entityId);
            const visibleRefs = entityRefs.filter((ref) => {
              if (!normalizedSearch) return true;
              const haystack = `${entityLabel(t, ref.entity)} ${ref.label}`.toLowerCase();
              return haystack.includes(normalizedSearch);
            });
            if (!visibleRefs.length) return null;
            const selectedInEntity = visibleRefs.filter((ref) =>
              config.columns.some((col) => col.entity === ref.entity && col.field === ref.field),
            ).length;
            return (
              <details key={entityId} className="rb-column-entity" open={selectedInEntity > 0}>
                <summary className="rb-column-entity-summary">
                  {entityLabel(t, entityId)}{' '}
                  <span className="rb-column-entity-count">
                    {selectedInEntity}/{visibleRefs.length}
                  </span>
                </summary>
                <ul className="rb-column-options">
                  {visibleRefs.map((ref) => {
                    const checked = config.columns.some((col) => col.entity === ref.entity && col.field === ref.field);
                    const searchText = `${entityLabel(t, ref.entity)} ${ref.label}`.toLowerCase();
                    return (
                      <li
                        key={ref.key}
                        className={`rb-column-option${checked ? ' is-selected' : ''}`}
                        data-search={searchText}
                        hidden={Boolean(normalizedSearch) && !searchText.includes(normalizedSearch)}
                      >
                        <label className="rb-column-option-label">
                          <input
                            type="checkbox"
                            className="rb-column-checkbox"
                            data-column-entity={ref.entity}
                            data-column-field={ref.field}
                            checked={checked}
                            onChange={(event) => toggleColumn(ref, event.target.checked)}
                          />
                          <span>{ref.label}</span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </details>
            );
          })}
        </div>
      </div>

      <details
        className="rb-advanced-details"
        open={showAdvanced}
        onToggle={(event) => onShowAdvancedChange((event.target as HTMLDetailsElement).open)}
      >
        <summary className="rb-advanced-toggle">{t('pages.reportBuilder.advancedOptions')}</summary>
        <div className="rb-advanced-body">
          <div className="rb-advanced-grid">
            <section className="rb-advanced-block rb-advanced-block--full rb-advanced-block--inline">
              <div className="rb-advanced-block-head">
                <h3 className="rb-advanced-block-title">{t('pages.reportBuilder.rowGrain')}</h3>
                <ReportBuilderHintBtn hintKey="pages.reportBuilder.rowGrainHint" />
              </div>
              <select
                id="rb-row-grain"
                className="rb-advanced-control rb-advanced-control--inline"
                value={config.primaryEntity}
                onChange={(event) => onPrimaryEntityChange(event.target.value)}
              >
                {entityIds.map((entityId) => (
                  <option key={entityId} value={entityId}>
                    {entityLabel(t, entityId)}
                  </option>
                ))}
              </select>
            </section>

            <ReportBuilderStaticFilters config={config} onFiltersChange={onFiltersChange} />
          </div>
        </div>
      </details>
    </section>
  );
}
