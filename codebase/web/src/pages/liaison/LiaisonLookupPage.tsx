import { useMemo, useState } from 'react';
import { ApiError, liaisonApi, type LiaisonRow } from '../../api/client';
import { USE_MOCK_AUTH, useAuth } from '../../auth/AuthContext';
import { AppLayout } from '../../components/AppLayout';
import { EmptyState } from '../../components/EmptyState';
import { useI18n } from '../../i18n/I18nContext';
import { lookupContacts } from '../../mock/liaison';
import { useMockData } from '../../mock/MockDataContext';

export function LiaisonLookupPage() {
  const { store } = useMockData();
  const { token } = useAuth();
  const i18n = useI18n();
  const { t } = i18n;
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [apiResults, setApiResults] = useState<LiaisonRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const mockResults = useMemo(
    () => (submitted ? lookupContacts(store, submitted) : []),
    [store, submitted],
  );
  const results = USE_MOCK_AUTH ? mockResults : apiResults;

  async function runSearch() {
    setSubmitted(query);
    if (USE_MOCK_AUTH || !token) return;
    setLoading(true);
    setError('');
    try {
      const payload = await liaisonApi.lookup(token, query);
      setApiResults(payload.items);
    } catch (err) {
      setApiResults([]);
      setError(err instanceof ApiError ? err.message : t('pages.liaisonLookup.loadFailed'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppLayout navId="liaison-lookup">
      <div className="card liaison-lookup-card">
        <h2>{t('pages.liaisonLookup.lookupCaller')}</h2>
        <div className="search-bar">
          <label htmlFor="liaison-search" className="sr-only">
            {t('pages.liaisonLookup.searchLabel')}
          </label>
          <input
            type="search"
            id="liaison-search"
            placeholder={t('pages.liaisonLookup.searchPlaceholder')}
            aria-label={t('pages.liaisonLookup.searchLabel')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void runSearch();
            }}
          />
          <button
            type="button"
            id="liaison-search-btn"
            className="btn btn-primary"
            onClick={() => void runSearch()}
            disabled={loading}
          >
            {t('pages.liaisonLookup.searchButton')}
          </button>
        </div>

        <div id="liaison-results">
          {error ? <div className="alert alert-danger">{error}</div> : null}
          {loading ? (
            <p className="text-muted">{t('common.loading')}</p>
          ) : !submitted ? (
            <EmptyState
              title={t('pages.liaisonLookup.enterNameOrPhone')}
              hint={t('pages.liaisonLookup.enterHint')}
            />
          ) : !results.length ? (
            <EmptyState
              title={t('pages.liaisonLookup.noActiveCase')}
              hint={t('pages.liaisonLookup.noActiveCaseHint')}
            />
          ) : (
            <>
              <p className="liaison-results-summary">
                {t(
                  results.length === 1
                    ? 'pages.liaisonLookup.resultsSummary'
                    : 'pages.liaisonLookup.resultsSummaryPlural',
                  { count: results.length },
                )}
              </p>
              <table
                className="data-table liaison-results-table"
                aria-label={t('pages.liaisonLookup.resultsAria')}
              >
                <thead>
                  <tr>
                    <th>{t('pages.liaisonLookup.tableClient')}</th>
                    <th>{t('pages.liaisonLookup.tableProgram')}</th>
                    <th>{t('pages.liaisonLookup.tableCaseManager')}</th>
                    <th>{t('pages.liaisonLookup.tableStatus')}</th>
                    <th>{t('pages.liaisonLookup.tableContact')}</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((row, i) => {
                    const digits = row.contactPhone.replace(/\D/g, '');
                    return (
                      <tr key={`${row.clientName}-${i}`}>
                        <td>{row.clientName}</td>
                        <td>{row.programLabel}</td>
                        <td>{row.caseManagerName}</td>
                        <td>
                          <span className="client-status-badge">
                            {i18n.clientStatusLabel(row.caseManagerStatus)}
                          </span>
                        </td>
                        <td>
                          {digits ? (
                            <a href={`tel:${digits}`}>{row.contactPhone}</a>
                          ) : (
                            row.contactPhone
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
