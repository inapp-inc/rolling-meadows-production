import { useMemo, useState, type ReactNode } from 'react';
import { useToast } from '../../../components/ToastContext';
import { useI18n } from '../../../i18n/I18nContext';
import { ReportBuilderFieldChip } from './ReportBuilderFieldChip';
import { ReportBuilderStaticFilters } from './ReportBuilderStaticFilters';
import type { ReportBuilderConfig, ReportFilter } from './reportBuilderModel';
import {
  AGGREGATES,
  CHART_TYPES,
  aggregateNeedsMeasure,
  aggregateSupportsCumulative,
  builderEntityIds,
  builderFieldRefs,
  entityLabel,
  fieldDisplayLabel,
  fieldMeta,
  parseFieldRef,
  relatedCountRefs,
  suggestChartType,
} from './reportBuilderModel';

type ReportBuilderChartConfigProps = {
  config: ReportBuilderConfig;
  showAdvanced: boolean;
  onShowAdvancedChange: (open: boolean) => void;
  onConfigChange: (config: ReportBuilderConfig) => void;
  onFiltersChange: (filters: ReportFilter[]) => void;
  onPrimaryEntityChange: (entity: string) => void;
  onPreviewField: (fieldKey: string, role: string) => void;
};

export function ReportBuilderChartConfig({
  config,
  showAdvanced,
  onShowAdvancedChange,
  onConfigChange,
  onFiltersChange,
  onPreviewField,
}: ReportBuilderChartConfigProps) {
  const { t } = useI18n();
  const { showToast } = useToast();
  const [fieldSearch, setFieldSearch] = useState('');
  const refs = useMemo(() => builderFieldRefs(t, { reportableOnly: true }), [t]);
  const relatedCounts = useMemo(() => relatedCountRefs(t, config.primaryEntity), [t, config.primaryEntity]);
  const entityIds = builderEntityIds();
  const chart = config.chart;

  function updateChart(patch: Partial<ReportBuilderConfig['chart']>) {
    onConfigChange({ ...config, chart: { ...config.chart, ...patch } });
  }

  function assignAxis(axis: 'x' | 'y', key: string, role: string) {
    if (axis === 'y' && key !== '__count__' && role !== 'measure') {
      showToast(t('pages.reportBuilder.yMustBeMeasure'), 'warning');
      return;
    }
    if (axis === 'x' && (key === '__count__' || role === 'measure')) {
      showToast(t('pages.reportBuilder.xMustBeDimension'), 'warning');
      return;
    }
    if (axis === 'x') {
      const ref = parseFieldRef(key);
      updateChart({ xAxis: ref });
      return;
    }
    if (key === '__count__') {
      updateChart({ yAxis: { aggregate: 'count', cumulative: false } });
      return;
    }
    const ref = parseFieldRef(key);
    updateChart({
      yAxis: {
        entity: ref.entity,
        field: ref.field,
        aggregate: role === 'measure' ? 'sum' : 'count',
        cumulative: false,
      },
    });
  }

  function clearAxis(axis: 'x' | 'y') {
    if (axis === 'x') updateChart({ xAxis: null });
    else updateChart({ yAxis: { aggregate: 'count', cumulative: false } });
  }

  function renderAxisContent(axis: 'x' | 'y') {
    if (axis === 'x') {
      if (!chart.xAxis) return <span className="rb-drop-placeholder">{t('pages.reportBuilder.dropX')}</span>;
      return (
        <div className="rb-drop-chip">
          <span>{fieldDisplayLabel(t, chart.xAxis.entity, chart.xAxis.field)}</span>
          <button
            type="button"
            className="rb-drop-clear"
            aria-label={t('pages.reportBuilder.clearAxis')}
            onClick={() => clearAxis('x')}
          >
            ×
          </button>
        </div>
      );
    }
    if (chart.yAxis.field) {
      return (
        <div className="rb-drop-chip">
          <span>{fieldDisplayLabel(t, chart.yAxis.entity!, chart.yAxis.field!)}</span>
          <button
            type="button"
            className="rb-drop-clear"
            aria-label={t('pages.reportBuilder.clearAxis')}
            onClick={() => clearAxis('y')}
          >
            ×
          </button>
        </div>
      );
    }
    if (chart.yAxis.aggregate === 'count' && !chart.yAxis.field) {
      return (
        <div className="rb-drop-chip is-special">
          <span>{t('pages.reportBuilder.recordCount')}</span>
          <button
            type="button"
            className="rb-drop-clear"
            aria-label={t('pages.reportBuilder.clearAxis')}
            onClick={() => clearAxis('y')}
          >
            ×
          </button>
        </div>
      );
    }
    return <span className="rb-drop-placeholder">{t('pages.reportBuilder.dropY')}</span>;
  }

  function renderGuide() {
    if (!chart.xAxis) {
      return (
        <>
          <p className="rb-guide-title">{t('pages.reportBuilder.guideStartTitle')}</p>
          <p>{t('pages.reportBuilder.guideStartBody')}</p>
        </>
      );
    }
    if (!chart.yAxis.field && chart.yAxis.aggregate !== 'count') {
      return (
        <>
          <p className="rb-guide-title">{t('pages.reportBuilder.guideYTitle')}</p>
          <p>{t('pages.reportBuilder.guideYBody')}</p>
        </>
      );
    }
    const chartType = chart.chartType || suggestChartType(chart.xAxis, chart.yAxis);
    return (
      <>
        <p className="rb-guide-title">{t('pages.reportBuilder.guideReadyTitle')}</p>
        <p>
          {t('pages.reportBuilder.guideReadyBody', {
            type: t(`pages.reportBuilder.chartTypes.${chartType}`),
            y: chart.yAxis.field
              ? fieldDisplayLabel(t, chart.yAxis.entity!, chart.yAxis.field!)
              : t('pages.reportBuilder.recordCount'),
            x: fieldDisplayLabel(t, chart.xAxis.entity, chart.xAxis.field),
          })}
        </p>
      </>
    );
  }

  const dimensions = refs.filter((ref) => ref.role === 'dimension');
  const measures = refs.filter((ref) => ref.role === 'measure' && !ref.isRelatedCount);
  const normalizedSearch = fieldSearch.trim().toLowerCase();
  const filterRef = (ref: { entity: string; label: string }) => {
    if (!normalizedSearch) return true;
    return `${entityLabel(t, ref.entity)} ${ref.label}`.toLowerCase().includes(normalizedSearch);
  };

  const visibleDimensions = dimensions.filter(filterRef);
  const visibleMeasures = measures.filter(filterRef);
  const visibleRelatedCounts = relatedCounts.filter(filterRef);
  const dimensionSections = entityIds
    .map((entityId) => ({
      entityId,
      refs: visibleDimensions.filter((ref) => ref.entity === entityId),
    }))
    .filter((section) => section.refs.length);
  const measureSections = entityIds
    .map((entityId) => ({
      entityId,
      refs: visibleMeasures.filter((ref) => ref.entity === entityId),
    }))
    .filter((section) => section.refs.length);

  const hasMeasure = Boolean(chart.yAxis.field);
  const isDateX = chart.xAxis ? fieldMeta(chart.xAxis.entity, chart.xAxis.field)?.type === 'date' : false;
  const canCumulative = aggregateSupportsCumulative(chart.yAxis.aggregate);

  return (
    <section className="card rb-config-panel">
      <div className="rb-config-panel-head">
        <h2>{t('pages.reportBuilder.stepChartCanvas')}</h2>
        <p className="text-muted rb-config-panel-hint">{t('pages.reportBuilder.crossModelHint')}</p>
      </div>

      <div className="rb-chart-workspace rb-chart-workspace--compact">
        <div className="rb-field-palette-toolbar">
          <input
            type="search"
            id="rb-field-search"
            className="rb-field-search"
            placeholder={t('pages.reportBuilder.searchFields')}
            autoComplete="off"
            value={fieldSearch}
            onChange={(event) => setFieldSearch(event.target.value)}
          />
        </div>
        <div className="rb-field-palette rb-field-palette-grouped" id="rb-field-palette">
          {(dimensionSections.length > 0 || (dimensions.length === 0 && !normalizedSearch)) && (
            <div className="rb-palette-section" hidden={!dimensionSections.length && Boolean(normalizedSearch)}>
              <h3 className="rb-palette-section-title">{t('pages.reportBuilder.dimensions')}</h3>
              {dimensionSections.length ? (
                dimensionSections.map(({ entityId, refs: group }) => (
                  <div key={entityId} className="rb-palette-entity-group">
                    <h4 className="rb-palette-entity-label">{entityLabel(t, entityId)}</h4>
                    {group.map((ref) => (
                      <ReportBuilderFieldChip
                        key={ref.key}
                        refKey={ref.key}
                        role={ref.role}
                        label={ref.label}
                        searchText={`${entityLabel(t, ref.entity)} ${ref.label}`.toLowerCase()}
                        onAssignAxis={assignAxis}
                        onPreview={onPreviewField}
                      />
                    ))}
                  </div>
                ))
              ) : (
                <p className="text-muted">{t('pages.reportBuilder.noDimensions')}</p>
              )}
            </div>
          )}
          {(visibleRelatedCounts.length > 0 ||
            measureSections.length > 0 ||
            !normalizedSearch ||
            t('pages.reportBuilder.recordCount').toLowerCase().includes(normalizedSearch)) && (
            <div
              className="rb-palette-section"
              hidden={
                Boolean(normalizedSearch) &&
                !visibleRelatedCounts.length &&
                !measureSections.length &&
                !t('pages.reportBuilder.recordCount').toLowerCase().includes(normalizedSearch)
              }
            >
              <h3 className="rb-palette-section-title">{t('pages.reportBuilder.measures')}</h3>
              {!normalizedSearch || t('pages.reportBuilder.recordCount').toLowerCase().includes(normalizedSearch) ? (
                <ReportBuilderFieldChip
                  refKey="__count__"
                  role="measure"
                  label={t('pages.reportBuilder.recordCount')}
                  searchText={t('pages.reportBuilder.recordCount').toLowerCase()}
                  special
                  onAssignAxis={assignAxis}
                  onPreview={onPreviewField}
                />
              ) : null}
              {visibleRelatedCounts.length ? (
                <div className="rb-palette-entity-group rb-palette-related-counts">
                  <h4 className="rb-palette-entity-label">{t('pages.reportBuilder.relatedCounts')}</h4>
                  {visibleRelatedCounts.map((ref) => (
                    <ReportBuilderFieldChip
                      key={ref.key}
                      refKey={ref.key}
                      role={ref.role}
                      label={ref.label}
                      searchText={`${entityLabel(t, ref.entity)} ${ref.label}`.toLowerCase()}
                      onAssignAxis={assignAxis}
                      onPreview={onPreviewField}
                    />
                  ))}
                </div>
              ) : null}
              {measureSections.map(({ entityId, refs: group }) => (
                <div key={entityId} className="rb-palette-entity-group">
                  <h4 className="rb-palette-entity-label">{entityLabel(t, entityId)}</h4>
                  {group.map((ref) => (
                    <ReportBuilderFieldChip
                      key={ref.key}
                      refKey={ref.key}
                      role={ref.role}
                      label={ref.label}
                      searchText={`${entityLabel(t, ref.entity)} ${ref.label}`.toLowerCase()}
                      onAssignAxis={assignAxis}
                      onPreview={onPreviewField}
                    />
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rb-chart-canvas" id="rb-chart-canvas">
          <div className="rb-chart-y-rail">
            <AxisDrop
              axis="y"
              filled={Boolean(chart.yAxis.field || chart.yAxis.aggregate === 'count')}
              onDrop={(key, role) => assignAxis('y', key, role)}
            >
              {renderAxisContent('y')}
            </AxisDrop>
            <div className="rb-axis-label rb-axis-label-y">{t('pages.reportBuilder.axisY')}</div>
          </div>
          <div className="rb-chart-plot">
            <div className="rb-chart-plot-grid" aria-hidden="true" />
            <AxisDrop axis="x" filled={Boolean(chart.xAxis)} onDrop={(key, role) => assignAxis('x', key, role)}>
              {renderAxisContent('x')}
            </AxisDrop>
            <div className="rb-axis-label rb-axis-label-x">{t('pages.reportBuilder.axisX')}</div>
          </div>
        </div>
      </div>

      <div className="rb-chart-guide rb-chart-guide--compact" id="rb-chart-guide">
        {renderGuide()}
      </div>

      <div className="rb-chart-options-strip">
        <div className="form-group">
          <span className="form-label">{t('pages.reportBuilder.chartType')}</span>
          <div className="rb-segment-row">
            {CHART_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                className={`rb-segment-btn rb-chart-type-btn${chart.chartType === type ? ' is-active' : ''}`}
                onClick={() => updateChart({ chartType: type })}
              >
                {t(`pages.reportBuilder.chartTypes.${type}`)}
              </button>
            ))}
          </div>
        </div>
        <div className="form-group">
          <span className="form-label">{t('pages.reportBuilder.aggregate')}</span>
          {!hasMeasure ? (
            <p className="text-muted rb-aggregate-hint">{t('pages.reportBuilder.aggregateCountOnly')}</p>
          ) : null}
          <div className="rb-segment-row rb-segment-row-wrap">
            {AGGREGATES.map((aggregate) => {
              const disabled = aggregateNeedsMeasure(aggregate) && !hasMeasure;
              return (
                <button
                  key={aggregate}
                  type="button"
                  className={`rb-segment-btn rb-aggregate-btn${chart.yAxis.aggregate === aggregate ? ' is-active' : ''}${disabled ? ' is-disabled' : ''}`}
                  disabled={disabled}
                  onClick={() => updateChart({ yAxis: { ...chart.yAxis, aggregate } })}
                >
                  {t(`pages.reportBuilder.aggregates.${aggregate}`)}
                </button>
              );
            })}
          </div>
          <label className="rb-cumulative-toggle">
            <input
              type="checkbox"
              checked={Boolean(chart.yAxis.cumulative)}
              disabled={!canCumulative}
              onChange={(event) => updateChart({ yAxis: { ...chart.yAxis, cumulative: event.target.checked } })}
            />
            <span>{t('pages.reportBuilder.cumulativeToggle')}</span>
          </label>
          {!canCumulative ? <p className="text-muted rb-aggregate-hint">{t('pages.reportBuilder.cumulativeHint')}</p> : null}
        </div>
        {isDateX ? (
          <div className="form-group">
            <span className="form-label">{t('pages.reportBuilder.xGroupingLabel')}</span>
            <div className="rb-segment-row">
              {(['none', 'month', 'year'] as const).map((grouping) => (
                <button
                  key={grouping}
                  type="button"
                  className={`rb-segment-btn rb-x-grouping-btn${chart.xGrouping === grouping ? ' is-active' : ''}`}
                  onClick={() => updateChart({ xGrouping: grouping })}
                >
                  {t(`pages.reportBuilder.xGrouping.${grouping}`)}
                </button>
              ))}
            </div>
            <p className="text-muted rb-aggregate-hint">{t('pages.reportBuilder.xGroupingHint')}</p>
          </div>
        ) : null}
      </div>

      <details
        className="rb-advanced-details"
        open={showAdvanced}
        onToggle={(event) => onShowAdvancedChange((event.target as HTMLDetailsElement).open)}
      >
        <summary className="rb-advanced-toggle">{t('pages.reportBuilder.advancedOptionsChart')}</summary>
        <div className="rb-advanced-body">
          <div className="rb-advanced-grid">
            <ReportBuilderStaticFilters config={config} onFiltersChange={onFiltersChange} />
          </div>
        </div>
      </details>
    </section>
  );
}

function AxisDrop({
  axis,
  filled,
  children,
  onDrop,
}: {
  axis: 'x' | 'y';
  filled: boolean;
  children: ReactNode;
  onDrop: (key: string, role: string) => void;
}) {
  function handleDrop(event: React.DragEvent) {
    event.preventDefault();
    event.currentTarget.classList.remove('is-dragover');
    try {
      const payload = JSON.parse(event.dataTransfer.getData('text/plain'));
      onDrop(payload.key, payload.role);
    } catch {
      /* ignore */
    }
  }

  return (
    <div
      className={`rb-axis-drop rb-axis-drop-${axis}${filled ? ' is-filled' : ''}`}
      data-axis={axis}
      onDragOver={(event) => {
        event.preventDefault();
        event.currentTarget.classList.add('is-dragover');
      }}
      onDragLeave={(event) => {
        event.currentTarget.classList.remove('is-dragover');
      }}
      onDrop={handleDrop}
    >
      {children}
    </div>
  );
}
