import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ApiError, reportsApi, type CustomReportPreviewData } from '../../../api/client';
import { USE_MOCK_AUTH, useAuth } from '../../../auth/AuthContext';
import { AppLayout } from '../../../components/AppLayout';
import { Modal } from '../../../components/Modal';
import { useToast } from '../../../components/ToastContext';
import { UiIcon } from '../../../components/UiIcon';
import {
  getCustomReport,
  reportFilterOptions,
  runCustomReportPreview,
  saveCustomReport,
  toBuilderConfig,
  toReportI18n,
} from '../../../mock/customReportService';
import { useMockData } from '../../../mock/MockDataContext';
import { useI18n } from '../../../i18n/I18nContext';
import { resolveActiveNav } from '../../../navigation/modules';
import { auditedDownloadChartPreviewPng, auditedDownloadReportCsv, downloadChartPreviewPng, downloadReportCsv } from '../../../utils/reportExport';
import { CustomReportPreview } from '../components/CustomReportPreview';
import {
  DEFAULT_CASELOAD_FILTERS,
  ReportFiltersBar,
  type CaseloadFilterValues,
} from '../components/ReportFiltersBar';
import { ReportBuilderChartConfig } from './ReportBuilderChartConfig';
import { ReportBuilderFieldPreviewModal } from './ReportBuilderFieldPreviewModal';
import { ReportBuilderTableConfig } from './ReportBuilderTableConfig';
import { PlayIcon } from './BuilderIcons';
import { ReportBuilderToolbar } from './ReportBuilderToolbar';
import { findCatalogItem } from './reportCatalog';
import {
  defaultChartConfig,
  defaultTableConfig,
  entityLabel,
  syncJoinsFromReportConfig,
  type ReportBuilderConfig,
} from './reportBuilderModel';

function syncJoins(config: ReportBuilderConfig): ReportBuilderConfig {
  const { joins, joinAggregates } = syncJoinsFromReportConfig(config);
  return { ...config, joins, joinAggregates };
}

export function ReportBuilderPage() {
  const { token, user } = useAuth();
  const { store, refresh, version } = useMockData();
  const i18n = useI18n();
  const { t } = i18n;
  const { showToast } = useToast();
  const reportI18n = useMemo(() => toReportI18n(i18n), [i18n]);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const activeNav = resolveActiveNav('/reports/custom');
  const reportId = searchParams.get('id');
  const templateId = searchParams.get('template');

  const [config, setConfig] = useState<ReportBuilderConfig>(defaultTableConfig());
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewFilters, setPreviewFilters] = useState<CaseloadFilterValues>(DEFAULT_CASELOAD_FILTERS);
  const [preview, setPreview] = useState<CustomReportPreviewData | null>(null);
  const [filterOptions, setFilterOptions] = useState<{ programs: { id: string; label: string }[]; events: { id: string; label: string }[] }>({
    programs: [],
    events: [],
  });
  const [loading, setLoading] = useState(Boolean(reportId));
  const [previewLoading, setPreviewLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldPreview, setFieldPreview] = useState<{ key: string; role: string } | null>(null);

  const updateConfig = useCallback((next: ReportBuilderConfig) => {
    setConfig(syncJoins(next));
  }, []);

  useEffect(() => {
    if (templateId) {
      const item = findCatalogItem(templateId);
      if (item) {
        const { catalogId: _catalogId, catalogLabel: _catalogLabel, ...rest } = item;
        updateConfig({ ...rest, id: null });
      }
      return;
    }
    if (!reportId) {
      if (!templateId) updateConfig(defaultTableConfig());
      setLoading(false);
      return;
    }
    if (USE_MOCK_AUTH) {
      setLoading(true);
      const loaded = getCustomReport(store, reportId);
      if (loaded) {
        updateConfig(syncJoins(toBuilderConfig(loaded, reportId)));
      } else {
        setError(t('pages.reportBuilder.loadFailed'));
      }
      setLoading(false);
      return;
    }
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    reportsApi
      .getCustom(token, reportId)
      .then((loaded) => {
        updateConfig({
          id: loaded.id ?? reportId,
          name: loaded.name,
          reportType: loaded.reportType,
          primaryEntity: loaded.primaryEntity ?? 'client',
          joins: loaded.joins ?? [],
          columns: loaded.columns ?? [],
          filters: loaded.filters ?? [],
          sortBy: loaded.sortBy ?? { entity: 'client', field: 'name', dir: 'asc' },
          joinAggregates: loaded.joinAggregates ?? { riskAssessment: 'latest' },
          chart: {
            xAxis: loaded.chart?.xAxis ?? null,
            yAxis: loaded.chart?.yAxis ?? { aggregate: 'count', cumulative: false },
            chartType: loaded.chart?.chartType ?? 'bar',
            xGrouping: loaded.chart?.xGrouping ?? 'none',
          },
        });
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : t('pages.reportBuilder.loadFailed')))
      .finally(() => setLoading(false));
  }, [reportId, templateId, token, store, version, updateConfig, t]);

  useEffect(() => {
    if (USE_MOCK_AUTH) {
      setFilterOptions(reportFilterOptions(reportI18n));
      return;
    }
    if (!token) return;
    reportsApi
      .custom(token, DEFAULT_CASELOAD_FILTERS)
      .then((payload) => setFilterOptions(payload.filterOptions))
      .catch(() => {
        /* optional */
      });
  }, [token, user, store, version, reportI18n]);

  useEffect(() => {
    if (reportId && !loading && config.id && !previewOpen) {
      setPreviewOpen(true);
    }
  }, [reportId, loading, config.id, previewOpen]);

  const runPreview = useCallback(async () => {
    setPreviewLoading(true);
    try {
      if (USE_MOCK_AUTH) {
        setPreview(runCustomReportPreview(store, config, user, previewFilters, reportI18n));
        return;
      }
      if (!token) return;
      const result = await reportsApi.previewCustom(token, {
        config,
        ...previewFilters,
      });
      setPreview(result);
    } catch (err) {
      setPreview({
        reportType: 'table',
        meta: err instanceof ApiError ? err.message : t('pages.reportBuilder.previewFailed'),
        rows: [],
        columns: [],
      });
    } finally {
      setPreviewLoading(false);
    }
  }, [token, user, store, config, previewFilters, reportI18n, t]);

  useEffect(() => {
    if (previewOpen) runPreview();
  }, [previewOpen, runPreview]);

  async function handleSave() {
    if (!config.name.trim()) {
      showToast(t('pages.reportBuilder.nameRequired'), 'warning');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: config.name.trim(),
        reportType: config.reportType,
        primaryEntity: config.primaryEntity,
        joins: config.joins,
        columns: config.columns,
        filters: config.filters,
        sortBy: config.sortBy,
        joinAggregates: config.joinAggregates,
        chart: config.chart,
      };
      if (USE_MOCK_AUTH) {
        const saved = saveCustomReport(store, { ...config, name: config.name.trim() }, user?.id ?? 'usr-supervisor');
        updateConfig({ ...config, id: saved.id ?? config.id });
        refresh();
        showToast(t('pages.reportBuilder.saved'), 'success');
        if (!config.id && saved.id) {
          navigate(`/reports/custom/builder?id=${encodeURIComponent(saved.id)}`, { replace: true });
        }
        return;
      }
      if (!token) return;
      const saved = config.id
        ? await reportsApi.saveCustom(token, config.id, payload)
        : await reportsApi.createCustom(token, payload);
      updateConfig({ ...config, id: saved.id ?? config.id });
      showToast(t('pages.reportBuilder.saved'), 'success');
      if (!config.id && saved.id) {
        navigate(`/reports/custom/builder?id=${encodeURIComponent(saved.id)}`, { replace: true });
      }
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : t('pages.reportBuilder.saveFailed'), 'error');
    } finally {
      setSaving(false);
    }
  }

  function handleReportTypeChange(reportType: 'table' | 'chart') {
    if (reportType === config.reportType) return;
    if (reportType === 'chart') updateConfig({ ...defaultChartConfig(), id: config.id, name: config.name });
    else updateConfig({ ...defaultTableConfig(), id: config.id, name: config.name });
  }

  function handleExport() {
    if (!preview) return;
    const name = config.name || 'report';
    const audit = { resourceType: 'custom_report' as const, resourceId: config.id ?? reportId ?? undefined };
    if (USE_MOCK_AUTH) {
      if (preview.reportType === 'chart') downloadChartPreviewPng(name, preview);
      else downloadReportCsv(name, preview);
      return;
    }
    if (preview.reportType === 'chart') void auditedDownloadChartPreviewPng(token, audit, name, preview);
    else void auditedDownloadReportCsv(token, audit, name, preview);
  }

  const grainLabel = entityLabel(t, config.primaryEntity);
  const previewMeta = previewLoading
    ? t('pages.reportBuilder.runningPreview')
    : preview?.meta ??
      (config.reportType === 'chart'
        ? t('pages.reportBuilder.chartMetaWithGrain', {
            groups: preview?.points?.length ?? 0,
            rows: preview?.rowCount ?? 0,
            grain: grainLabel,
          })
        : t('pages.reportBuilder.rowCountWithGrain', {
            count: preview?.rows?.length ?? 0,
            grain: grainLabel,
          }));

  const exportLabel = preview?.reportType === 'chart' ? t('pages.reportBuilder.exportChart') : t('pages.reportBuilder.export');
  const exportHint = preview?.reportType === 'chart' ? t('pages.reportBuilder.exportChartHint') : t('pages.reportBuilder.exportHint');
  const exportComboLabel = preview?.reportType === 'chart' ? 'PNG' : 'XLSX';

  return (
    <AppLayout title={t('pages.reportBuilder.title')} navId={activeNav}>
      <div className="rb-shell">
        <ReportBuilderToolbar
          name={config.name}
          reportType={config.reportType}
          onNameChange={(name) => updateConfig({ ...config, name })}
          onReportTypeChange={handleReportTypeChange}
          onSave={handleSave}
          saving={saving}
        />

        {error ? <div className="alert alert-danger">{error}</div> : null}
        {loading ? <p className="text-muted">{t('pages.reportBuilder.loading')}</p> : null}

        {!loading ? (
          <div className="rb-workspace rb-workspace--single">
            <div className="rb-config-column">
              {config.reportType === 'chart' ? (
                <ReportBuilderChartConfig
                  config={config}
                  showAdvanced={showAdvanced}
                  onShowAdvancedChange={setShowAdvanced}
                  onConfigChange={updateConfig}
                  onFiltersChange={(filters) => updateConfig({ ...config, filters })}
                  onPrimaryEntityChange={(primaryEntity) => updateConfig({ ...config, primaryEntity })}
                  onPreviewField={(key, role) => setFieldPreview({ key, role })}
                />
              ) : (
                <ReportBuilderTableConfig
                  config={config}
                  showAdvanced={showAdvanced}
                  onShowAdvancedChange={setShowAdvanced}
                  onColumnsChange={(columns) => updateConfig({ ...config, columns })}
                  onPrimaryEntityChange={(primaryEntity) => updateConfig({ ...config, primaryEntity })}
                  onFiltersChange={(filters) => updateConfig({ ...config, filters })}
                />
              )}
            </div>
          </div>
        ) : null}
      </div>

      <button
        type="button"
        id="rb-preview-fab"
        className="rb-preview-fab"
        aria-label={t('pages.reportBuilder.run')}
        title={t('pages.reportBuilder.runHint')}
        onClick={() => setPreviewOpen(true)}
      >
        <span className="rb-preview-fab-icon" aria-hidden="true">
          <PlayIcon />
        </span>
        <span className="rb-preview-fab-label">{t('pages.reportBuilder.preview')}</span>
      </button>

      <Modal
        open={previewOpen}
        title={t('pages.reportBuilder.preview')}
        wide
        modalClass="rb-preview-modal"
        onClose={() => setPreviewOpen(false)}
      >
        <ReportFiltersBar
          values={previewFilters}
          programs={filterOptions.programs}
          events={filterOptions.events}
          onChange={(values) => setPreviewFilters(values)}
        />
        <div className="rb-preview-modal-head">
          <span id="rb-preview-meta" className="report-builder-row-count">
            {previewMeta}
          </span>
          <button
            type="button"
            className="rb-toolbar-icon-btn rb-toolbar-icon-btn--combo"
            id="rb-export"
            aria-label={exportLabel}
            title={exportHint}
            disabled={!preview || previewLoading}
            onClick={handleExport}
          >
            <span className="download-icon-combo" aria-hidden="true">
              <span className="download-icon-combo-item">
                <UiIcon name="download" />
              </span>
              <span className="download-icon-combo-label">{exportComboLabel}</span>
            </span>
          </button>
        </div>
        <div id="rb-preview" className="rb-preview-body">
          {preview ? <CustomReportPreview preview={preview} visualId="rb-chart-preview-visual" /> : null}
        </div>
      </Modal>

      <ReportBuilderFieldPreviewModal
        open={Boolean(fieldPreview)}
        fieldKey={fieldPreview?.key ?? null}
        primaryEntity={config.primaryEntity}
        store={store}
        user={user}
        onClose={() => setFieldPreview(null)}
      />
    </AppLayout>
  );
}
