import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clientApi, type ClientSummary } from '../../api/client';
import { USE_MOCK_AUTH, useAuth } from '../../auth/AuthContext';
import { canViewCaseDetail } from '../../auth/permissions';
import { AppLayout } from '../../components/AppLayout';
import { CaseWorkflowDrawerBody } from '../../components/CaseWorkflowDrawerBody';
import { ClientCasesDrawerBody } from '../../components/ClientCasesDrawerBody';
import { EmptyState } from '../../components/EmptyState';
import { SideDrawer } from '../../components/SideDrawer';
import { useI18n } from '../../i18n/I18nContext';
import { categoryLabel } from '../../mock/caseCategories';
import { casesForClient, findUser, registeredClients } from '../../mock/caseService';
import { dedupCheck } from '../../mock/clientService';
import { useMockData } from '../../mock/MockDataContext';
import type { CaseloadView, MockCase, MockClient, MockStore } from '../../mock/types';

const SEARCH_DEBOUNCE_MS = 200;

type MatchField = 'name' | 'phone' | 'address';

type DuplicatePair = { client: MockClient; other: MockClient };

function normalizeText(value?: string): string {
  return (value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function normalizePhone(value?: string): string {
  return (value ?? '').replace(/\D/g, '');
}

function levenshtein(a: string, b: string): number {
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i += 1) matrix[i] = [i];
  for (let j = 0; j <= a.length; j += 1) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i += 1) {
    for (let j = 1; j <= a.length; j += 1) {
      const cost = b.charAt(i - 1) === a.charAt(j - 1) ? 0 : 1;
      matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost);
    }
  }
  return matrix[b.length][a.length];
}

/** Name, phone, or address substring, plus a fuzzy name match — as `RM.ClientRepository.search`. */
function searchClients(store: MockStore, query: string): MockClient[] {
  const all = registeredClients(store);
  const q = normalizeText(query);
  if (!q) return all;
  return all.filter((client) => {
    const name = normalizeText(client.name);
    return (
      name.includes(q) ||
      normalizeText(client.phone).includes(q) ||
      normalizeText(client.address).includes(q) ||
      levenshtein(name, q) <= 2
    );
  });
}

function matchFields(client: MockClient, query: string): MatchField[] {
  if (!query) return [];
  const q = normalizeText(query);
  const phoneQuery = normalizePhone(query);
  const fields: MatchField[] = [];
  if (q && normalizeText(client.name).includes(q)) fields.push('name');
  if (phoneQuery && normalizePhone(client.phone).includes(phoneQuery)) fields.push('phone');
  if (q && normalizeText(client.address).includes(q)) fields.push('address');
  return fields;
}

function duplicatePairs(store: MockStore, clients: MockClient[]): DuplicatePair[] {
  const pairs: DuplicatePair[] = [];
  clients.forEach((client, index) => {
    const matches = dedupCheck(
      store,
      { name: client.name, phone: client.phone, dob: client.dob },
      client.id,
    );
    if (!matches.length) return;
    clients.slice(index + 1).forEach((other) => {
      if (matches.some((match) => match.client.id === other.id && match.score >= 25)) {
        pairs.push({ client, other });
      }
    });
  });
  return pairs;
}

function openCasesForClient(store: MockStore, clientId: string): MockCase[] {
  return store.cases.filter((c) => c.clientId === clientId && c.status !== 'closed');
}

export function ClientSearchPage() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const { store } = useMockData();
  const i18n = useI18n();
  const { t } = i18n;
  const canDetail = canViewCaseDetail(user?.role);

  const [query, setQuery] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [apiResults, setApiResults] = useState<ClientSummary[]>([]);
  const [apiLoading, setApiLoading] = useState(false);
  const [drawerClient, setDrawerClient] = useState<MockClient | null>(null);
  const [drawerCase, setDrawerCase] = useState<CaseloadView | null>(null);

  useEffect(() => {
    if (USE_MOCK_AUTH || !token) return;
    setApiLoading(true);
    clientApi
      .list(token, activeQuery || undefined)
      .then((data) => setApiResults(data.items))
      .catch(() => setApiResults([]))
      .finally(() => setApiLoading(false));
  }, [token, activeQuery]);

  useEffect(() => {
    const timer = window.setTimeout(() => setActiveQuery(query.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [query]);

  const mockResults = useMemo(() => searchClients(store, activeQuery), [store, activeQuery]);
  const results: Array<ClientSummary | MockClient> = USE_MOCK_AUTH ? mockResults : apiResults;
  const pairs = useMemo(
    () => (USE_MOCK_AUTH && canDetail ? duplicatePairs(store, mockResults) : []),
    [canDetail, store, mockResults],
  );

  const matchLabels: Record<MatchField, string> = {
    name: t('pages.clientSearch.matchName'),
    phone: t('pages.clientSearch.matchPhone'),
    address: t('pages.clientSearch.matchAddress'),
  };

  function caseCountLabel(client: MockClient): string {
    const cases = casesForClient(store, client.id);
    if (!cases.length) return t('pages.clientSearch.noCases');
    const open = cases.filter((c) => c.status !== 'closed').length;
    return t('pages.clientSearch.caseCount', { total: cases.length, open });
  }

  function closeDrawers() {
    setDrawerClient(null);
    setDrawerCase(null);
  }

  return (
    <AppLayout navId="client-search">
      <div className="search-bar">
        <label htmlFor="search-input" className="sr-only">
          {t('pages.clientSearch.searchLabel')}
        </label>
        <input
          id="search-input"
          type="search"
          placeholder={t('pages.clientSearch.searchPlaceholder')}
          aria-label={t('pages.clientSearch.searchLabel')}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') setActiveQuery(query.trim());
          }}
        />
        <button
          type="button"
          id="btn-search"
          className="btn btn-primary"
          onClick={() => setActiveQuery(query.trim())}
        >
          {t('pages.clientSearch.searchButton')}
        </button>
      </div>

      <div id="cross-program-alert">
        {!results.length ? null : !canDetail ? (
          results.flatMap((client) =>
            openCasesForClient(store, client.id).map((caseRecord) => {
              const caseManager = findUser(store, caseRecord.caseManagerId);
              return (
                <div className="alert alert-warning" role="alert" key={`${client.id}-${caseRecord.id}`}>
                  <strong>{t('pages.clientSearch.crossProgramFlag')}</strong> —{' '}
                  {t('pages.clientSearch.crossProgramBody', {
                    program: caseRecord.caseCategoryId
                      ? categoryLabel(caseRecord.caseCategoryId)
                      : i18n.programLabel(caseRecord.programId),
                    name: client.name,
                    manager: caseManager?.name ?? t('pages.clientSearch.assignedCaseManager'),
                  })}
                </div>
              );
            }),
          )
        ) : pairs.length ? (
          <div className="alert alert-warning" role="alert">
            <strong>{t('pages.clientSearch.duplicatePairsTitle')}</strong>
            <p className="text-muted">{t('pages.clientSearch.duplicatePairsHint')}</p>
            <ul className="dedup-match-list">
              {pairs.map(({ client, other }) => (
                <li key={`${client.id}-${other.id}`}>
                  <strong>{client.name}</strong> · {other.name}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <div id="search-results">
        {apiLoading ? <p className="muted">{t('common.loading')}</p> : null}
        {!apiLoading && !results.length ? (
          <EmptyState
            title={t('pages.clientSearch.noClientsFound')}
            hint={t('pages.clientSearch.noClientsHint')}
          />
        ) : !canDetail ? null : (
          <div className="table-responsive">
            <table className="data-table data-table-interactive">
              <thead>
                <tr>
                  <th>{t('pages.clientSearch.tableName')}</th>
                  <th>{t('pages.clientSearch.tableMatch')}</th>
                  <th>{t('pages.clientSearch.tablePhone')}</th>
                  <th>{t('pages.clientSearch.tableAddress')}</th>
                  <th>{t('pages.clientSearch.tableRegistered')}</th>
                  <th>{USE_MOCK_AUTH ? t('pages.clientSearch.tableCases') : null}</th>
                </tr>
              </thead>
              <tbody>
                {results.map((client) => {
                  const fields = matchFields(client as MockClient, activeQuery);
                  const hasDuplicates = USE_MOCK_AUTH
                    ? dedupCheck(
                        store,
                        { name: client.name, phone: client.phone, dob: client.dob ?? undefined },
                        client.id,
                      ).length > 0
                    : false;
                  function openClient() {
                    if (USE_MOCK_AUTH) {
                      setDrawerClient(client as MockClient);
                    } else {
                      navigate(`/clients/${client.id}`);
                    }
                  }
                  return (
                    <tr
                      key={client.id}
                      className={`client-search-row${drawerClient?.id === client.id ? ' active' : ''}`}
                      data-client-id={client.id}
                      role="button"
                      tabIndex={0}
                      aria-label={t('pages.clientSearch.viewClientAria', { name: client.name })}
                      onClick={openClient}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          openClient();
                        }
                      }}
                    >
                      <td>
                        {client.name}
                        {hasDuplicates ? (
                          <> <span title={t('pages.clientSearch.hasDuplicates')}>⚠</span></>
                        ) : null}
                      </td>
                      <td>{fields.length ? fields.map((field) => matchLabels[field]).join(', ') : '—'}</td>
                      <td>{client.phone}</td>
                      <td>{client.address}</td>
                      <td>{i18n.formatDate(client.registeredAt)}</td>
                      {USE_MOCK_AUTH ? <td>{caseCountLabel(client as MockClient)}</td> : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {USE_MOCK_AUTH ? (
      <>
      <SideDrawer
        title={drawerClient?.name ?? ''}
        open={Boolean(drawerClient) && !drawerCase}
        onClose={closeDrawers}
      >
        {drawerClient ? (
          <ClientCasesDrawerBody client={drawerClient} onOpenCase={setDrawerCase} />
        ) : null}
      </SideDrawer>

      <SideDrawer
        title={drawerCase?.name ?? ''}
        open={Boolean(drawerCase)}
        onClose={() => setDrawerCase(null)}
      >
        {drawerCase ? <CaseWorkflowDrawerBody client={drawerCase} /> : null}
      </SideDrawer>
      </>
      ) : null}
    </AppLayout>
  );
}
