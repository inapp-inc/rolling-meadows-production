import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError, caseApi, eventsApi, type CaseSummary, type ServiceEvent } from '../../api/client';
import { USE_MOCK_AUTH, useAuth } from '../../auth/AuthContext';
import { AppLayout } from '../../components/AppLayout';
import { EmptyState } from '../../components/EmptyState';
import { useToast } from '../../components/ToastContext';
import { useI18n } from '../../i18n/I18nContext';
import { caseloadForUser, latestAssessment } from '../../mock/caseService';
import { eventLabel, SERVICE_EVENTS } from '../../mock/caseWorkflow';
import { useMockData } from '../../mock/MockDataContext';
import { bulkEnroll } from '../../mock/workspaceService';

type BulkFilter = 'all' | 'high' | 'incomplete';

type BulkRow = {
  caseId: string;
  clientId: string;
  name: string;
  incompleteIntake: boolean;
  riskLevel?: string;
};

export function BulkEnrollmentPage() {
  const { user, token } = useAuth();
  const { store, refresh } = useMockData();
  const { t, eventLabel: i18nEventLabel } = useI18n();
  const { showToast } = useToast();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [eventId, setEventId] = useState('');
  const [filter, setFilter] = useState<BulkFilter>('all');
  const [apiCases, setApiCases] = useState<BulkRow[]>([]);
  const [serviceEvents, setServiceEvents] = useState<ServiceEvent[]>([]);
  const [loading, setLoading] = useState(!USE_MOCK_AUTH);
  const selectAllRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (USE_MOCK_AUTH) {
      setEventId(SERVICE_EVENTS[0]?.id ?? '');
      return;
    }
    if (!token) return;
    setLoading(true);
    Promise.all([caseApi.list(token), eventsApi.list(token)])
      .then(([casesRes, eventsRes]) => {
        setApiCases(
          casesRes.items.map((item: CaseSummary) => ({
            caseId: item.id,
            clientId: item.clientId,
            name: item.clientName ?? item.clientId,
            incompleteIntake: item.incompleteIntake,
          })),
        );
        setServiceEvents(eventsRes.items);
        setEventId(eventsRes.items[0]?.id ?? '');
      })
      .catch(() => {
        setApiCases([]);
        setServiceEvents([]);
      })
      .finally(() => setLoading(false));
  }, [token]);

  const mockCaseload = useMemo(() => (user ? caseloadForUser(store, user) : []), [store, user]);

  const rows: BulkRow[] = useMemo(() => {
    if (USE_MOCK_AUTH) {
      return mockCaseload.map((c) => ({
        caseId: c.caseId,
        clientId: c.id,
        name: c.name,
        incompleteIntake: Boolean(c.incompleteIntake),
        riskLevel: latestAssessment(store, c.id)?.overallRisk,
      }));
    }
    return apiCases;
  }, [mockCaseload, apiCases, store]);

  const visibleClients = useMemo(() => {
    if (filter === 'incomplete') return rows.filter((c) => c.incompleteIntake);
    if (filter === 'high') {
      return rows.filter((c) => c.riskLevel === 'High');
    }
    return rows;
  }, [rows, filter]);

  const selectionKey = (row: BulkRow) => (USE_MOCK_AUTH ? row.clientId : row.caseId);

  const selectedVisible = visibleClients.filter((c) => selected.has(selectionKey(c)));
  const allVisibleSelected = visibleClients.length > 0 && selectedVisible.length === visibleClients.length;

  if (selectAllRef.current) {
    selectAllRef.current.indeterminate =
      selectedVisible.length > 0 && selectedVisible.length < visibleClients.length;
  }

  function toggle(key: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleAll() {
    setSelected((current) => {
      const next = new Set(current);
      if (allVisibleSelected) visibleClients.forEach((c) => next.delete(selectionKey(c)));
      else visibleClients.forEach((c) => next.add(selectionKey(c)));
      return next;
    });
  }

  function labelForEvent(id: string): string {
    if (USE_MOCK_AUTH) return eventLabel(id);
    const match = serviceEvents.find((e) => e.id === id);
    return i18nEventLabel(id) || match?.label || id;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!eventId) return;
    if (selected.size === 0) {
      showToast(t('pages.bulkEnrollment.selectOneToast'), 'warning');
      return;
    }

    if (USE_MOCK_AUTH) {
      const result = bulkEnroll(store, [...selected], eventId);
      refresh();
      if (result.enrolled) {
        showToast(
          t('pages.bulkEnrollment.enrolledToast', {
            count: result.enrolled,
            program: labelForEvent(eventId),
          }),
          'success',
        );
        setSelected(new Set());
      } else {
        showToast(t('pages.bulkEnrollment.alreadyEnrolledToast'), 'warning');
      }
      return;
    }

    if (!token) return;
    const caseIds = [...selected];
    try {
      const result = await eventsApi.bulkEnroll(token, caseIds, eventId);
      if (result.created) {
        showToast(
          t('pages.bulkEnrollment.enrolledToast', {
            count: result.created,
            program: labelForEvent(eventId),
          }),
          'success',
        );
        setSelected(new Set());
      } else {
        showToast(t('pages.bulkEnrollment.alreadyEnrolledToast'), 'warning');
      }
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : t('pages.bulkEnrollment.alreadyEnrolledToast'), 'error');
    }
  }

  const eventOptions = USE_MOCK_AUTH ? SERVICE_EVENTS : serviceEvents;

  return (
    <AppLayout navId="bulk-enroll">
      <div className="card bulk-enrollment-card">
        {loading ? <p className="muted">{t('common.loading')}</p> : null}
        <form className="bulk-enroll-panel" onSubmit={onSubmit}>
          <div className="form-row form-row-2">
            <div className="form-group">
              <label htmlFor="bulk-event">{t('pages.bulkEnrollment.programEvent')}</label>
              <select id="bulk-event" value={eventId} onChange={(e) => setEventId(e.target.value)}>
                {eventOptions.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {labelForEvent(ev.id)}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="bulk-filter">{t('pages.bulkEnrollment.filterClients')}</label>
              <select
                id="bulk-filter"
                value={filter}
                onChange={(e) => setFilter(e.target.value as BulkFilter)}
              >
                <option value="all">{t('pages.bulkEnrollment.filterAll')}</option>
                <option value="high">{t('pages.bulkEnrollment.filterHigh')}</option>
                <option value="incomplete">{t('pages.bulkEnrollment.filterIncomplete')}</option>
              </select>
            </div>
          </div>

          <fieldset className="bulk-client-fieldset">
            <legend>{t('pages.bulkEnrollment.selectClients')}</legend>
            {!visibleClients.length ? (
              <EmptyState
                title={t('pages.bulkEnrollment.noClientsMatch')}
                hint={t('pages.bulkEnrollment.noClientsHint')}
              />
            ) : (
              <>
                <label className="bulk-client-check bulk-select-all">
                  <input
                    ref={selectAllRef}
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleAll}
                  />
                  <span>{t('pages.bulkEnrollment.selectAllVisible')}</span>
                </label>
                <div id="bulk-client-list" className="bulk-client-list">
                  {visibleClients.map((c) => {
                    const key = selectionKey(c);
                    const meta = [
                      c.riskLevel
                        ? t('pages.bulkEnrollment.riskLevelMeta', { level: c.riskLevel })
                        : t('pages.bulkEnrollment.riskUnknown'),
                      c.incompleteIntake ? t('pages.bulkEnrollment.incompleteIntake') : null,
                    ].filter(Boolean);
                    return (
                      <label key={key} className="bulk-client-check">
                        <input type="checkbox" checked={selected.has(key)} onChange={() => toggle(key)} />
                        <span>
                          {c.name}
                          <span className="bulk-client-meta">({meta.join(' · ')})</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </>
            )}
          </fieldset>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {selected.size
                ? t('pages.bulkEnrollment.enrollCount', { count: selected.size })
                : t('pages.bulkEnrollment.enrollSelected')}
            </button>
            <Link to="/reports" className="btn btn-secondary">
              {t('pages.bulkEnrollment.viewReports')}
            </Link>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
