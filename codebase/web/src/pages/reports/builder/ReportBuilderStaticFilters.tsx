import { useMemo } from 'react';
import { useI18n } from '../../../i18n/I18nContext';
import { ReportBuilderHintBtn } from './ReportBuilderHintBtn';
import type { BuilderFieldRef, ReportBuilderConfig, ReportFilter } from './reportBuilderModel';
import {
  FILTER_OPERATORS,
  builderFieldRefs,
  entitiesInScope,
  entityLabel,
  filterOperatorLabel,
} from './reportBuilderModel';

type ReportBuilderStaticFiltersProps = {
  config: ReportBuilderConfig;
  onFiltersChange: (filters: ReportFilter[]) => void;
};

export function ReportBuilderStaticFilters({ config, onFiltersChange }: ReportBuilderStaticFiltersProps) {
  const { t } = useI18n();
  const refs = useMemo(() => builderFieldRefs(t, { reportableOnly: true }), [t]);
  const scopedEntityIds = useMemo(() => entitiesInScope(config), [config]);

  function addFilter() {
    const defaultField = refs.find((ref) => ref.entity === config.primaryEntity)?.field ?? 'status';
    onFiltersChange([...config.filters, { entity: config.primaryEntity, field: defaultField, op: 'eq', value: '' }]);
  }

  function fieldsForEntity(entityId: string): BuilderFieldRef[] {
    return refs.filter((ref) => ref.entity === entityId);
  }

  return (
    <section className="rb-advanced-block rb-advanced-block--full">
      <div className="rb-advanced-block-head">
        <h3 className="rb-advanced-block-title">{t('pages.reportBuilder.staticFilters')}</h3>
        <ReportBuilderHintBtn hintKey="pages.reportBuilder.staticFiltersHint" />
      </div>
      {config.filters.length ? (
        <div className="report-builder-filter-row report-builder-filter-row--head" aria-hidden="true">
          <span>{t('pages.reportBuilder.filterColEntity')}</span>
          <span>{t('pages.reportBuilder.filterColField')}</span>
          <span>{t('pages.reportBuilder.filterColOp')}</span>
          <span>{t('pages.reportBuilder.filterColValue')}</span>
          <span />
        </div>
      ) : null}
      <div id="rb-filters" className="rb-advanced-rows">
        {!config.filters.length ? <p className="rb-advanced-empty">{t('pages.reportBuilder.noFilters')}</p> : null}
        {config.filters.map((filter, index) => (
          <div key={index} className="report-builder-filter-row" data-filter-index={index}>
            <select
              value={filter.entity}
              onChange={(event) => {
                const next = [...config.filters];
                next[index] = { ...next[index], entity: event.target.value };
                onFiltersChange(next);
              }}
            >
              {scopedEntityIds.map((entityId) => (
                <option key={entityId} value={entityId}>
                  {entityLabel(t, entityId)}
                </option>
              ))}
            </select>
            <select
              value={filter.field}
              onChange={(event) => {
                const next = [...config.filters];
                next[index] = { ...next[index], field: event.target.value };
                onFiltersChange(next);
              }}
            >
              {fieldsForEntity(filter.entity).map((ref) => (
                <option key={ref.field} value={ref.field}>
                  {ref.label}
                </option>
              ))}
            </select>
            <select
              value={filter.op}
              onChange={(event) => {
                const next = [...config.filters];
                next[index] = { ...next[index], op: event.target.value };
                onFiltersChange(next);
              }}
            >
              {FILTER_OPERATORS.map((op) => (
                <option key={op} value={op}>
                  {filterOperatorLabel(t, op)}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={filter.value}
              placeholder={t('pages.reportBuilder.filterValue')}
              onChange={(event) => {
                const next = [...config.filters];
                next[index] = { ...next[index], value: event.target.value };
                onFiltersChange(next);
              }}
            />
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              aria-label={t('pages.reportBuilder.remove')}
              onClick={() => onFiltersChange(config.filters.filter((_, i) => i !== index))}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <div className="rb-advanced-add-row">
        <button type="button" className="btn btn-secondary btn-sm" id="rb-add-filter" onClick={addFilter}>
          {t('pages.reportBuilder.addFilter')}
        </button>
      </div>
    </section>
  );
}
