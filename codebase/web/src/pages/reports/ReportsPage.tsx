import { useCallback, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AppLayout } from '../../components/AppLayout';
import { useI18n } from '../../i18n/I18nContext';
import { resolveActiveNav } from '../../navigation/modules';
import type { CaseloadFilterValues } from './components/ReportFiltersBar';
import { CaseloadTier, DEFAULT_CASELOAD_FILTERS } from './tiers/CaseloadTier';
import { ExecutiveTier } from './tiers/ExecutiveTier';
import { IntegrityTier } from './tiers/IntegrityTier';
import { OperationalTier } from './tiers/OperationalTier';

export function ReportsPage() {
  const location = useLocation();
  const { t } = useI18n();
  const activeNav = resolveActiveNav(location.pathname, location.search);
  const tier = new URLSearchParams(location.search).get('tier') ?? 'caseload';
  const [pageFilters, setPageFilters] = useState<CaseloadFilterValues>(DEFAULT_CASELOAD_FILTERS);

  const handleFiltersChange = useCallback((values: CaseloadFilterValues) => {
    setPageFilters(values);
  }, []);

  const isCaseload = tier === 'caseload' || !['executive', 'operational', 'integrity'].includes(tier);

  return (
    <AppLayout navId={activeNav}>
      {isCaseload ? (
        <CaseloadTier filters={pageFilters} onFiltersChange={handleFiltersChange} />
      ) : tier === 'executive' ? (
        <div className="report-tier-page">
          <p className="text-muted report-tier-lead">{t('pages.reports.tierExecutiveLead')}</p>
          <ExecutiveTier />
        </div>
      ) : tier === 'operational' ? (
        <OperationalTier filters={pageFilters} onFiltersChange={handleFiltersChange} />
      ) : tier === 'integrity' ? (
        <IntegrityTier filters={pageFilters} onFiltersChange={handleFiltersChange} />
      ) : null}
    </AppLayout>
  );
}
