import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError, caseApi, catalogApi, type CaseCategory, type CaseSummary } from '../../api/client';
import { USE_MOCK_AUTH, useAuth } from '../../auth/AuthContext';
import { AppLayout } from '../../components/AppLayout';
import { CaseWorkflowDrawerBody } from '../../components/CaseWorkflowDrawerBody';
import { EmptyState } from '../../components/EmptyState';
import { SideDrawer } from '../../components/SideDrawer';
import { useI18n } from '../../i18n/I18nContext';
import { CASE_CATEGORIES, programLabel, subcategoryLabel } from '../../mock/caseCategories';
import { caseloadForUser, findUser } from '../../mock/caseService';
import { getStatus, workflowForClient } from '../../mock/caseWorkflow';
import { useMockData } from '../../mock/MockDataContext';
import type { CaseloadView } from '../../mock/types';

type SearchRow = CaseSummary & { workflowName?: string };

function toDrawerClient(row: SearchRow): CaseloadView {
  const openDate = row.openDate ?? '';
  return {
    id: row.clientId,
    caseId: row.id,
    name: row.clientName ?? '—',
    phone: '',
    address: '',
    dob: '',
    registeredAt: openDate,
    caseNumber: row.caseNumber,
    caseCategoryId: row.caseCategoryId,
    caseSubcategoryId: row.caseSubcategoryId,
    caseManagerId: row.caseManagerId,
    programId: row.programId,
    currentStage: row.currentStage,
    status: row.status,
    incompleteIntake: row.incompleteIntake,
    openDate,
    createdAt: openDate,
  };
}

function caseIdForRow(row: CaseloadView | SearchRow): string {
  return 'caseId' in row ? row.caseId : row.id;
}

function clientIdForRow(row: CaseloadView | SearchRow): string {
  return 'caseId' in row ? row.id : row.clientId;
}

export function CaseSearchPage() {
  const { user, token } = useAuth();
  const { store } = useMockData();
  const i18n = useI18n();
  const { t } = i18n;
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [drawerClient, setDrawerClient] = useState<CaseloadView | null>(null);
  const [apiCases, setApiCases] = useState<SearchRow[]>([]);
  const [apiCategories, setApiCategories] = useState<CaseCategory[]>([]);
  const [loading, setLoading] = useState(!USE_MOCK_AUTH);
  const [error, setError] = useState('');

  useEffect(() => {
    if (USE_MOCK_AUTH || !token) return;
    setLoading(true);
    setError('');
    Promise.all([caseApi.list(token), catalogApi.categories(token)])
      .then(([casesRes, catRes]) => {
        setApiCases(
          casesRes.items.map((item) => ({
            ...item,
            workflowName: subcategoryLabel(item.caseSubcategoryId),
          })),
        );
        setApiCategories(catRes.categories);
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : 'Failed to load cases');
        setApiCases([]);
      })
      .finally(() => setLoading(false));
  }, [token]);

  const categories = USE_MOCK_AUTH ? CASE_CATEGORIES : apiCategories;
  const subcategories = useMemo(() => {
    const cat = categories.find((c) => c.id === categoryId);
    return cat?.subcategories ?? [];
  }, [categories, categoryId]);

  const items = useMemo(() => {
    if (!user) return [] as (CaseloadView | SearchRow)[];
    if (USE_MOCK_AUTH) {
      const q = query.trim().toLowerCase();
      return caseloadForUser(store, user).filter((c) => {
        if (q) {
          const haystack = [c.name, c.phone, c.address, c.caseNumber].join(' ').toLowerCase();
          if (!haystack.includes(q)) return false;
        }
        if (categoryId && c.caseCategoryId !== categoryId) return false;
        if (subcategoryId && c.caseSubcategoryId !== subcategoryId) return false;
        return true;
      });
    }

    const q = query.trim().toLowerCase();
    return apiCases.filter((c) => {
      if (q) {
        const haystack = [c.clientName, c.caseNumber].join(' ').toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (categoryId && c.caseCategoryId !== categoryId) return false;
      if (subcategoryId && c.caseSubcategoryId !== subcategoryId) return false;
      return true;
    });
  }, [store, user, query, categoryId, subcategoryId, apiCases]);

  return (
    <AppLayout navId="case-search">
      <div className="case-search-filters card">
        <div className="form-row form-row-3">
          <div className="form-group form-group-grow">
            <label htmlFor="case-search-input">{t('nav.caseSearch')}</label>
            <input
              id="case-search-input"
              type="search"
              placeholder={t('pages.caseSearch.searchPlaceholder')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="case-filter-category">{t('case.caseCategory')}</label>
            <select
              id="case-filter-category"
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                setSubcategoryId('');
              }}
            >
              <option value="">{t('case.allCategories')}</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="case-filter-subcategory">{t('case.subcategory')}</label>
            <select
              id="case-filter-subcategory"
              value={subcategoryId}
              onChange={(e) => setSubcategoryId(e.target.value)}
            >
              <option value="">{t('case.allSubcategories')}</option>
              {subcategories.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error ? <p className="error">{error}</p> : null}

      <div id="case-search-results" className="case-search-results">
        {loading ? (
          <p className="muted">{i18n.tOr('common.loading', 'Loading…')}</p>
        ) : !items.length ? (
          <EmptyState
            title={t('pages.caseSearch.noCasesFound')}
            hint={t('pages.caseSearch.noCasesHint')}
          />
        ) : (
          <div className="card case-search-results-card">
            <div className="table-responsive">
              <table className="data-table data-table-interactive case-search-table">
                <thead>
                  <tr>
                    <th>{t('pages.caseSearch.tableClient')}</th>
                    <th>{t('pages.caseSearch.tableProgram')}</th>
                    <th>{t('pages.caseSearch.tableWorkflow')}</th>
                    <th>{t('pages.caseSearch.tableStage')}</th>
                    <th>{t('pages.caseSearch.tableCaseManager')}</th>
                    <th>{t('pages.caseSearch.tableOpened')}</th>
                    <th>{t('pages.caseSearch.tableStatus')}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((c) => {
                    const caseId = caseIdForRow(c);
                    const clientName = 'name' in c ? c.name : (c.clientName ?? '—');
                    const cm = USE_MOCK_AUTH ? findUser(store, c.caseManagerId) : null;
                    const workflow = USE_MOCK_AUTH
                      ? workflowForClient(c as CaseloadView, i18n)
                      : { name: (c as SearchRow).workflowName ?? subcategoryLabel(c.caseSubcategoryId) };
                    const stageStatus = USE_MOCK_AUTH
                      ? getStatus(c as CaseloadView, i18n)
                      : {
                          stage: c.currentStage,
                          label: `Stage ${c.currentStage}`,
                        };
                    const program = programLabel(c);
                    const caseManagerName = cm?.name ?? c.caseManagerId ?? '—';
                    const opened = 'createdAt' in c ? c.createdAt : (c.openDate ?? '');
                    return (
                      <tr
                        key={caseId}
                        className={`case-search-row${drawerClient?.caseId === caseId ? ' active' : ''}`}
                        data-client-id={clientIdForRow(c)}
                        data-case-id={caseId}
                        role="button"
                        tabIndex={0}
                        onClick={() =>
                          setDrawerClient(
                            USE_MOCK_AUTH ? (c as CaseloadView) : toDrawerClient(c as SearchRow),
                          )
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setDrawerClient(
                              USE_MOCK_AUTH ? (c as CaseloadView) : toDrawerClient(c as SearchRow),
                            );
                          }
                        }}
                      >
                        <td className="col-client">
                          <strong title={clientName}>{clientName}</strong>
                        </td>
                        <td className="col-type">
                          <span className="case-type-chip" title={program}>
                            {program}
                          </span>
                        </td>
                        <td className="col-workflow">
                          <span className="case-workflow-name" title={workflow.name}>
                            {workflow.name}
                          </span>
                        </td>
                        <td className="col-stage">
                          <span className="case-stage-chip" title={stageStatus.label}>
                            {t('workspace.stageChip', { stage: stageStatus.stage })}
                          </span>
                        </td>
                        <td className="col-manager" title={caseManagerName}>
                          {caseManagerName}
                        </td>
                        <td className="col-opened">{i18n.formatDate(opened)}</td>
                        <td className="col-status">{i18n.clientStatusLabel(c.status)}</td>
                        <td className="col-action">
                          <Link
                            to={`/cases/${caseId}`}
                            className="btn btn-sm btn-primary"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {t('pages.caseSearch.open')}
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <SideDrawer
        title={drawerClient?.name ?? ''}
        open={Boolean(drawerClient)}
        onClose={() => setDrawerClient(null)}
      >
        {drawerClient ? <CaseWorkflowDrawerBody client={drawerClient} /> : null}
      </SideDrawer>
    </AppLayout>
  );
}
