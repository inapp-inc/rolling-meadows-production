const PERIOD_PRESETS = [
  { value: 'all', label: 'All time' },
  { value: 'last7', label: 'Last 7 days' },
  { value: 'last30', label: 'Last 30 days' },
  { value: 'last90', label: 'Last 90 days' },
  { value: 'mtd', label: 'Month to date' },
  { value: 'ytd', label: 'Year to date' },
  { value: 'custom', label: 'Custom range' },
] as const;

export type CaseloadFilterValues = {
  period: string;
  dateFrom: string;
  dateTo: string;
  programId: string;
  caseStatus: string;
  eventId: string;
};

export const DEFAULT_CASELOAD_FILTERS: CaseloadFilterValues = {
  period: 'all',
  dateFrom: '',
  dateTo: '',
  programId: '',
  caseStatus: 'active',
  eventId: '',
};

type FilterOption = { id: string; label: string };

type ReportFiltersBarProps = {
  values: CaseloadFilterValues;
  programs: FilterOption[];
  events: FilterOption[];
  onChange: (values: CaseloadFilterValues, immediate?: boolean) => void;
};

export function ReportFiltersBar({ values, programs, events, onChange }: ReportFiltersBarProps) {
  function updateField<K extends keyof CaseloadFilterValues>(field: K, value: CaseloadFilterValues[K], immediate = false) {
    onChange({ ...values, [field]: value }, immediate);
  }

  return (
    <div id="reports-filter-bar" className="rb-parameter-bar report-page-filters">
      <p className="rb-parameter-bar-title">Report filters</p>

      <div className="rb-parameter-control" data-param-id="param-page-period">
        <label className="rb-parameter-label" htmlFor="param-page-period-preset">
          Registration period
        </label>
        <select
          id="param-page-period-preset"
          className="rb-param-input"
          value={values.period}
          onChange={(event) => updateField('period', event.target.value, true)}
        >
          {PERIOD_PRESETS.map((preset) => (
            <option key={preset.value} value={preset.value}>
              {preset.label}
            </option>
          ))}
        </select>
        {values.period === 'custom' ? (
          <span className="rb-param-date-range">
            <input
              type="date"
              className="rb-param-input"
              value={values.dateFrom}
              onChange={(event) => updateField('dateFrom', event.target.value)}
            />
            <span className="rb-param-date-sep">–</span>
            <input
              type="date"
              className="rb-param-input"
              value={values.dateTo}
              onChange={(event) => updateField('dateTo', event.target.value)}
            />
          </span>
        ) : null}
      </div>

      <div className="rb-parameter-control" data-param-id="param-page-program">
        <label className="rb-parameter-label" htmlFor="param-page-program">
          Program
        </label>
        <select
          id="param-page-program"
          className="rb-param-input"
          value={values.programId}
          onChange={(event) => updateField('programId', event.target.value)}
        >
          <option value="">All programs</option>
          {programs.map((program) => (
            <option key={program.id} value={program.id}>
              {program.label}
            </option>
          ))}
        </select>
      </div>

      <div className="rb-parameter-control" data-param-id="param-page-status">
        <label className="rb-parameter-label" htmlFor="param-page-status">
          Case status
        </label>
        <select
          id="param-page-status"
          className="rb-param-input"
          value={values.caseStatus}
          onChange={(event) => updateField('caseStatus', event.target.value)}
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      <div className="rb-parameter-control" data-param-id="param-page-event">
        <label className="rb-parameter-label" htmlFor="param-page-event">
          Event / program
        </label>
        <select
          id="param-page-event"
          className="rb-param-input"
          value={values.eventId}
          onChange={(event) => updateField('eventId', event.target.value)}
        >
          <option value="">All events</option>
          {events.map((event) => (
            <option key={event.id} value={event.id}>
              {event.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export function caseloadFiltersQuery(values: CaseloadFilterValues): string {
  const params = new URLSearchParams();
  if (values.period) params.set('period', values.period);
  if (values.dateFrom) params.set('dateFrom', values.dateFrom);
  if (values.dateTo) params.set('dateTo', values.dateTo);
  if (values.programId) params.set('programId', values.programId);
  if (values.caseStatus) params.set('caseStatus', values.caseStatus);
  if (values.eventId) params.set('eventId', values.eventId);
  const query = params.toString();
  return query ? `?${query}` : '';
}
