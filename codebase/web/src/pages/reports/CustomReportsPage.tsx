import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ApiError, reportsApi, type CustomReportItem } from '../../api/client';
import { USE_MOCK_AUTH, useAuth } from '../../auth/AuthContext';
import { AppLayout } from '../../components/AppLayout';
import { EmptyState } from '../../components/EmptyState';
import { useI18n } from '../../i18n/I18nContext';
import { listCustomReports, reportFilterOptions, toReportI18n } from '../../mock/customReportService';
import { useMockData } from '../../mock/MockDataContext';
import { resolveActiveNav } from '../../navigation/modules';
import { CustomReportCard } from './components/CustomReportCard';
import {
  DEFAULT_CASELOAD_FILTERS,
  ReportFiltersBar,
  type CaseloadFilterValues,
} from './components/ReportFiltersBar';

export function CustomReportsPage() {
  const { token, user } = useAuth();
  const { store, version } = useMockData();
  const i18n = useI18n();
  const { t } = i18n;
  const reportI18n = useMemo(() => toReportI18n(i18n), [i18n]);
  const [searchParams] = useSearchParams();
  const activeNav = resolveActiveNav('/reports/custom');
  const [filters, setFilters] = useState<CaseloadFilterValues>(DEFAULT_CASELOAD_FILTERS);
  const [reports, setReports] = useState<CustomReportItem[]>([]);
  const [filterOptions, setFilterOptions] = useState<{ programs: { id: string; label: string }[]; events: { id: string; label: string }[] }>({
    programs: [],
    events: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const focusedId = searchParams.get('id');
  const focusHandled = useRef(false);
  const [focusHighlightId, setFocusHighlightId] = useState<string | null>(null);

  const handleFiltersChange = useCallback((values: CaseloadFilterValues) => {
    setFilters(values);
  }, []);

  useEffect(() => {
    if (USE_MOCK_AUTH) {
      setLoading(true);
      setError('');
      try {
        setReports(listCustomReports(store, user, filters, reportI18n));
        setFilterOptions(reportFilterOptions(reportI18n));
      } catch (err) {
        setError(err instanceof Error ? err.message : t('pages.customReports.loadFailed'));
      } finally {
        setLoading(false);
      }
      return;
    }
    if (!token) return;
    setLoading(true);
    setError('');
    reportsApi
      .custom(token, {
        period: filters.period,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        programId: filters.programId,
        caseStatus: filters.caseStatus,
        eventId: filters.eventId,
      })
      .then((payload) => {
        setReports(payload.items);
        setFilterOptions(payload.filterOptions);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : t('pages.customReports.loadFailed')))
      .finally(() => setLoading(false));
  }, [token, user, store, version, filters, reportI18n, t]);

  useEffect(() => {
    if (!focusedId || focusHandled.current || !reports.length) return;
    const card = document.querySelector(`[data-custom-report-id="${focusedId}"]`);
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setFocusHighlightId(focusedId);
      focusHandled.current = true;
      const timer = window.setTimeout(() => setFocusHighlightId(null), 2000);
      return () => window.clearTimeout(timer);
    }
  }, [focusedId, reports]);

  const focusedReportMissing = useMemo(
    () => Boolean(focusedId && !loading && reports.length > 0 && !reports.some((report) => report.id === focusedId)),
    [focusedId, loading, reports],
  );

  return (
    <AppLayout navId={activeNav}>
      <ReportFiltersBar
        values={filters}
        programs={filterOptions.programs}
        events={filterOptions.events}
        onChange={handleFiltersChange}
      />

      <div className="report-tier-page">
        <p className="text-muted report-tier-lead">{t('pages.customReports.lead')}</p>

        <div className="custom-reports-toolbar">
          <Link to="/reports/custom/builder" className="btn btn-primary custom-reports-create">
            <span aria-hidden="true">+</span> {t('pages.customReports.createNew')}
          </Link>
        </div>

        {error ? <div className="alert alert-danger">{error}</div> : null}
        {focusedReportMissing ? <div className="alert alert-warning">{t('pages.customReports.notFound')}</div> : null}
        {loading && !reports.length ? <p className="text-muted">{t('pages.customReports.loading')}</p> : null}

        {!loading && !reports.length ? (
          <EmptyState title={t('pages.customReports.empty')} hint={t('pages.customReports.emptyHint')} />
        ) : null}

        {reports.map((report) => (
          <CustomReportCard key={report.id} report={report} focused={focusHighlightId === report.id} />
        ))}
      </div>
    </AppLayout>
  );
}
