import type { CustomReportConfig, CustomReportItem, CustomReportPreviewData, UserProfile } from '../api/client';
import {
  RELATED_COUNT_FIELD,
  builderEntityIds,
  columnKey,
  defaultColumnsForEntity,
  entityLabel,
  fieldDisplayLabel,
  fieldLabel,
  fieldMeta,
  fieldRole,
  getEntity,
  getRelation,
  normalizeChartConfig,
  resolveRelationKey,
  suggestAggregate,
  suggestChartType,
  syncJoinsFromReportConfig,
  aggregateNeedsMeasure,
  aggregateSupportsCumulative,
  type ReportBuilderConfig,
  type ReportFilter,
  type Translate,
} from '../pages/reports/builder/reportBuilderModel';
import { SERVICE_EVENTS } from './caseWorkflow';
import { saveStore } from './store';
import type { MockCustomReport, MockStore } from './types';

/** Subset of `useI18n()` the report engine needs to label values and axes. */
export type ReportI18n = {
  t: Translate;
  tOr: (key: string, fallback: string) => string;
  programLabel: (programId?: string) => string;
  eventLabel: (eventId?: string) => string;
  riskLabel: (level?: string) => string;
  enumLabel: (category: string, value?: string) => string;
};

/** Map `useI18n()` to the subset the report engine needs. */
export function toReportI18n(i18n: {
  t: Translate;
  tOr: (key: string, fallback: string) => string;
  programLabel: (programId?: string) => string;
  eventLabel: (eventId?: string) => string;
  riskLabel: (level?: string) => string;
  enumLabel: (category: string, value?: string) => string;
}): ReportI18n {
  return {
    t: i18n.t,
    tOr: i18n.tOr,
    programLabel: i18n.programLabel,
    eventLabel: i18n.eventLabel,
    riskLabel: i18n.riskLabel,
    enumLabel: i18n.enumLabel,
  };
}

export type RuntimeFilters = {
  period?: string;
  dateFrom?: string;
  dateTo?: string;
  programId?: string;
  caseStatus?: string;
  eventId?: string;
};

export type CustomReportPreview = CustomReportPreviewData & {
  aggregate?: string;
  cumulative?: boolean;
  xGrouping?: string;
  groupCount?: number;
};

export type FieldDataPreview = {
  label: string;
  entityLabel: string;
  role: string;
  type: string;
  totalRows: number;
  emptyCount: number;
  distinctCount: number;
  isRecordCount?: boolean;
  values: { value: string; count: number }[];
};

const PROGRAM_IDS = [
  'prog-senior-services',
  'prog-community-services',
  'prog-parenting-support',
  'prog-mental-health',
];

const CHART_COLORS = ['#2563eb', '#059669', '#7c3aed', '#db2777', '#d97706', '#0891b2', '#64748b', '#dc2626'];

const BLANK_BUCKET_LABEL = '(blank)';

type EntityRow = Record<string, unknown>;
type Context = Record<string, EntityRow | null>;

function normalizeText(value: unknown): string {
  return String(value ?? '').toLowerCase();
}

function compareValues(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b));
}

function parseDateOnly(value: unknown): Date | null {
  if (value == null || value === '') return null;
  const date = new Date(String(value).slice(0, 10));
  return Number.isNaN(date.getTime()) ? null : date;
}

function pad(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

function isoDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function computeRelativeRange(preset: string): { from: string; to: string } {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const start = new Date(today);
  start.setHours(0, 0, 0, 0);

  if (preset === 'last7') start.setDate(start.getDate() - 6);
  else if (preset === 'last30') start.setDate(start.getDate() - 29);
  else if (preset === 'last90') start.setDate(start.getDate() - 89);
  else if (preset === 'mtd') start.setDate(1);
  else if (preset === 'ytd') start.setMonth(0, 1);
  else return { from: '', to: '' };

  return { from: isoDate(start), to: isoDate(today) };
}

function dateRangeFilters(entity: string, field: string, from?: string, to?: string): ReportFilter[] {
  const filters: ReportFilter[] = [];
  if (from) filters.push({ entity, field, op: 'gte', value: from });
  if (to) filters.push({ entity, field, op: 'lte', value: to });
  return filters;
}

/**
 * The shared report filter bar behaves like the prototype's page parameters: each control
 * resolves to entity-scoped filters that are appended to the saved report definition.
 */
export function runtimeFilterList(runtime: RuntimeFilters): ReportFilter[] {
  const filters: ReportFilter[] = [];
  const preset = runtime.period ?? 'all';
  if (preset === 'custom') {
    filters.push(...dateRangeFilters('client', 'registeredAt', runtime.dateFrom, runtime.dateTo));
  } else if (preset && preset !== 'all') {
    const range = computeRelativeRange(preset);
    filters.push(...dateRangeFilters('client', 'registeredAt', range.from, range.to));
  }
  if (runtime.programId) filters.push({ entity: 'case', field: 'programId', op: 'eq', value: runtime.programId });
  if (runtime.caseStatus) filters.push({ entity: 'case', field: 'status', op: 'eq', value: runtime.caseStatus });
  if (runtime.eventId) {
    filters.push({ entity: 'serviceEnrollment', field: 'serviceOrEventId', op: 'eq', value: runtime.eventId });
  }
  return filters;
}

function getEntityRows(store: MockStore, entityId: string): EntityRow[] {
  switch (entityId) {
    case 'client':
      return store.clients as EntityRow[];
    case 'case':
      return store.cases as EntityRow[];
    case 'riskAssessment':
      return store.assessments as EntityRow[];
    case 'serviceEnrollment':
      return store.enrollments as EntityRow[];
    case 'cboReferral':
      return store.cboReferrals as EntityRow[];
    case 'referral':
      return store.referrals as EntityRow[];
    case 'intake':
      return store.intakes as EntityRow[];
    case 'caseNote':
      return store.notes as EntityRow[];
    case 'carePlan':
      return store.carePlans as EntityRow[];
    case 'user':
      return store.users as EntityRow[];
    case 'document':
      return store.documents as EntityRow[];
    case 'initiative':
      return store.initiatives as EntityRow[];
    default:
      return [];
  }
}

function caseloadClientIds(store: MockStore, user: UserProfile | null): Set<string> {
  if (!user || user.role !== 'case_manager') return new Set();
  return new Set(store.cases.filter((c) => c.caseManagerId === user.id).map((c) => c.clientId));
}

function scopePrimaryRows(store: MockStore, entityId: string, rows: EntityRow[], user: UserProfile | null): EntityRow[] {
  if (!user || user.role !== 'case_manager') return rows;
  if (entityId === 'case') return rows.filter((row) => row.caseManagerId === user.id);
  if (entityId === 'client') {
    const clientIds = caseloadClientIds(store, user);
    return rows.filter((row) => clientIds.has(String(row.id)));
  }
  if (rows[0]?.clientId != null) {
    const clientIds = caseloadClientIds(store, user);
    return rows.filter((row) => clientIds.has(String(row.clientId)));
  }
  if (entityId === 'user') return rows.filter((row) => row.id === user.id);
  return rows;
}

function matchesFilter(raw: unknown, filter: ReportFilter): boolean {
  const value = normalizeText(filter.value);
  const current = normalizeText(raw);

  if (filter.op === 'empty') return raw == null || raw === '';
  if (filter.op === 'notEmpty') return raw != null && raw !== '';
  if (filter.op === 'eq') return current === value;
  if (filter.op === 'neq') return current !== value;
  if (filter.op === 'contains') return current.includes(value);
  if (filter.op === 'gt') return Number(raw) > Number(filter.value);
  if (filter.op === 'lt') return Number(raw) < Number(filter.value);
  if (filter.op === 'gte' || filter.op === 'lte') {
    const rawDate = parseDateOnly(raw);
    const filterDate = parseDateOnly(filter.value);
    if (!rawDate || !filterDate) return false;
    if (filter.op === 'gte') return rawDate >= filterDate;
    filterDate.setHours(23, 59, 59, 999);
    return rawDate <= filterDate;
  }
  if (filter.op === 'true') return Boolean(raw);
  if (filter.op === 'false') return !raw;
  return true;
}

function relatedRowDate(row: EntityRow): number {
  const raw = row.date ?? row.dateEnrolled ?? row.openDate ?? row.uploadedAt ?? row.dateReceived ?? 0;
  const parsed = new Date(String(raw));
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

function resolveRelated(
  store: MockStore,
  primaryEntityId: string,
  primaryRow: EntityRow,
  joinEntityId: string,
  relationKey: string,
  aggregate: string,
): EntityRow | EntityRow[] | null {
  const relation = getRelation(primaryEntityId, relationKey);
  if (!relation) return null;
  const rows = getEntityRows(store, joinEntityId);

  if (relation.type === 'belongsTo') {
    const localValue = primaryRow[relation.localKey];
    return rows.find((row) => row[relation.foreignKey] === localValue) ?? null;
  }

  const localValue = primaryRow[relation.localKey ?? 'id'];
  const matches = rows.filter((row) => row[relation.foreignKey] === localValue);

  if (joinEntityId === 'riskAssessment' && primaryRow.clientId != null) {
    const latest = (store.assessments as EntityRow[])
      .filter((row) => row.clientId === primaryRow.clientId)
      .sort((a, b) => relatedRowDate(b) - relatedRowDate(a))[0];
    return latest ?? matches[0] ?? null;
  }

  if (!matches.length) return aggregate === 'count' ? [] : null;
  if (aggregate === 'count') return matches;
  if (aggregate === 'latest') return matches.slice().sort((a, b) => relatedRowDate(b) - relatedRowDate(a))[0];
  return matches[0];
}

function filterEntityRows(rows: EntityRow[], filters: ReportFilter[], entityId: string): EntityRow[] {
  const entityFilters = filters.filter((filter) => filter.entity === entityId);
  if (!entityFilters.length) return rows;
  return rows.filter((row) => entityFilters.every((filter) => matchesFilter(row[filter.field], filter)));
}

function buildContext(
  store: MockStore,
  primaryEntityId: string,
  primaryRow: EntityRow,
  joins: string[],
  joinAggregates: Record<string, string>,
  filters: ReportFilter[],
): Context {
  const context: Context = { [primaryEntityId]: primaryRow };

  joins.forEach((joinEntityId) => {
    const relationKey = resolveRelationKey(primaryEntityId, joinEntityId);
    if (!relationKey) return;
    const aggregate = joinAggregates[joinEntityId] ?? 'latest';
    const relation = getRelation(primaryEntityId, relationKey);
    if (relation?.type === 'hasMany' && aggregate === 'count') {
      const matches = resolveRelated(store, primaryEntityId, primaryRow, joinEntityId, relationKey, 'count');
      const rows = filterEntityRows(Array.isArray(matches) ? matches : [], filters, joinEntityId);
      context[joinEntityId] = { [RELATED_COUNT_FIELD]: rows.length };
      return;
    }
    const resolved = resolveRelated(store, primaryEntityId, primaryRow, joinEntityId, relationKey, aggregate);
    context[joinEntityId] = Array.isArray(resolved) ? (resolved[0] ?? null) : resolved;
  });

  return context;
}

function readColumnValue(context: Context, entity: string, field: string, primaryEntityId: string): unknown {
  const bucket = context[entity];
  if (field === RELATED_COUNT_FIELD) {
    if (bucket && bucket[RELATED_COUNT_FIELD] != null) return bucket[RELATED_COUNT_FIELD];
    if (entity === primaryEntityId && bucket?.id != null) return 1;
    return '';
  }
  if (!bucket) return '';
  return bucket[field];
}

function formatValue(i18n: ReportI18n, entityId: string, fieldId: string, raw: unknown): string {
  if (raw == null || raw === '') return '';
  const type = fieldMeta(entityId, fieldId)?.type ?? 'text';
  if (type === 'boolean') {
    return i18n.t(raw ? 'pages.reportBuilder.booleanParam.true' : 'pages.reportBuilder.booleanParam.false');
  }
  if (type === 'program') return i18n.programLabel(String(raw));
  if (type === 'event') return i18n.eventLabel(String(raw));
  if (type === 'risk') return i18n.riskLabel(String(raw));
  if (type === 'role') return i18n.tOr(`role.${String(raw)}`, String(raw));
  if (type === 'cboStatus') return i18n.enumLabel('cboStatus', String(raw));
  return String(raw);
}

function effectiveConfig(config: ReportBuilderConfig, runtime: RuntimeFilters): ReportBuilderConfig {
  const filters = [...(config.filters ?? []), ...runtimeFilterList(runtime)];
  const withFilters = { ...config, filters, chart: normalizeChartConfig(config.chart) };
  return { ...withFilters, ...syncJoinsFromReportConfig(withFilters) };
}

export function collectContexts(
  store: MockStore,
  config: ReportBuilderConfig,
  user: UserProfile | null,
): Context[] {
  const primaryEntityId = config.primaryEntity || 'client';
  const filters = config.filters ?? [];
  const joinAggregates = config.joinAggregates ?? {};
  const contexts: Context[] = [];

  let primaryRows = scopePrimaryRows(store, primaryEntityId, getEntityRows(store, primaryEntityId), user);
  primaryRows = filterEntityRows(primaryRows, filters, primaryEntityId);

  const joinedFilters = filters.filter(
    (filter) => filter.entity !== primaryEntityId && joinAggregates[filter.entity] !== 'count',
  );

  primaryRows.forEach((primaryRow) => {
    const context = buildContext(store, primaryEntityId, primaryRow, config.joins ?? [], joinAggregates, filters);
    const passes = joinedFilters.every((filter) => {
      const source = context[filter.entity];
      if (!source) return false;
      return matchesFilter(source[filter.field], filter);
    });
    if (passes) contexts.push(context);
  });

  return contexts;
}

type ChartBucket = {
  label: string;
  sortKey: unknown;
  n: number;
  sum: number;
  count: number;
  min: number | null;
  max: number | null;
  distinctKeys: Set<string>;
};

function resolveXBucket(
  i18n: ReportI18n,
  raw: unknown,
  xAxis: { entity: string; field: string },
  xGrouping: string,
): { label: string; sortKey: unknown } {
  const formatted = formatValue(i18n, xAxis.entity, xAxis.field, raw) || BLANK_BUCKET_LABEL;
  const isDate = fieldMeta(xAxis.entity, xAxis.field)?.type === 'date';
  if (!xGrouping || xGrouping === 'none' || !isDate || raw == null || raw === '') {
    return { label: formatted, sortKey: raw };
  }
  const parsed = new Date(String(raw));
  if (Number.isNaN(parsed.getTime())) return { label: formatted, sortKey: raw };
  if (xGrouping === 'month') {
    const monthKey = `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}`;
    return { label: monthKey, sortKey: monthKey };
  }
  if (xGrouping === 'year') return { label: String(parsed.getFullYear()), sortKey: parsed.getFullYear() };
  return { label: formatted, sortKey: raw };
}

function addBucketRow(
  bucket: ChartBucket,
  aggregate: string,
  yAxis: ReportBuilderConfig['chart']['yAxis'],
  context: Context,
  primaryEntityId: string,
): void {
  bucket.n += 1;
  if (aggregate === 'count') return;

  if (aggregate === 'distinct') {
    const distinctKey = yAxis.field
      ? readColumnValue(context, yAxis.entity ?? primaryEntityId, yAxis.field, primaryEntityId)
      : (context[primaryEntityId]?.id ?? bucket.n);
    bucket.distinctKeys.add(String(distinctKey));
    return;
  }

  if (!yAxis.field) return;
  const num = Number(readColumnValue(context, yAxis.entity ?? primaryEntityId, yAxis.field, primaryEntityId));
  if (Number.isNaN(num)) return;

  bucket.sum += num;
  bucket.count += 1;
  if (bucket.min === null || num < bucket.min) bucket.min = num;
  if (bucket.max === null || num > bucket.max) bucket.max = num;
}

function finalizeBucket(bucket: ChartBucket, aggregate: string): number {
  if (aggregate === 'distinct') return bucket.distinctKeys.size;
  if (aggregate === 'sum') return bucket.sum;
  if (aggregate === 'avg') return bucket.count ? Math.round((bucket.sum / bucket.count) * 10) / 10 : 0;
  if (aggregate === 'min') return bucket.min ?? 0;
  if (aggregate === 'max') return bucket.max ?? 0;
  return bucket.n;
}

function chartYLabel(
  i18n: ReportI18n,
  aggregate: string,
  cumulative: boolean,
  yAxis: ReportBuilderConfig['chart']['yAxis'],
  primaryEntityId: string,
): string {
  const countLabel = i18n.t('pages.reportBuilder.recordCount');
  const grainLabel = entityLabel(i18n.t, primaryEntityId);
  const measureLabel = yAxis.field ? fieldDisplayLabel(i18n.t, yAxis.entity ?? primaryEntityId, yAxis.field) : countLabel;

  if (aggregate === 'count' || (!yAxis.field && aggregate !== 'distinct')) {
    return cumulative ? i18n.t('pages.reportBuilder.cumulativeCountLabel', { entity: grainLabel }) : countLabel;
  }

  if (aggregate === 'distinct') {
    return yAxis.field
      ? i18n.t('pages.reportBuilder.distinctFieldLabel', { field: measureLabel })
      : i18n.t('pages.reportBuilder.distinctRecordsLabel', { entity: grainLabel });
  }

  if (cumulative && aggregate === 'sum') {
    return i18n.t('pages.reportBuilder.cumulativeSumLabel', { field: measureLabel });
  }

  return `${measureLabel} (${i18n.t(`pages.reportBuilder.aggregateSuffix.${aggregate}`)})`;
}

function runChart(
  store: MockStore,
  config: ReportBuilderConfig,
  user: UserProfile | null,
  i18n: ReportI18n,
): CustomReportPreview {
  const chart = config.chart;
  const primaryEntityId = config.primaryEntity || 'client';
  const grainLabel = entityLabel(i18n.t, primaryEntityId);
  const xAxis = chart.xAxis;

  if (!xAxis?.entity || !xAxis.field) {
    return { reportType: 'chart', error: 'missing_x', points: [], chartType: chart.chartType || 'bar', rowCount: 0 };
  }

  const yAxis = chart.yAxis;
  let aggregate = yAxis.aggregate || suggestAggregate(yAxis);
  let cumulative = Boolean(yAxis.cumulative && aggregateSupportsCumulative(aggregate));
  if (aggregateNeedsMeasure(aggregate) && !yAxis.field) {
    aggregate = 'count';
    cumulative = false;
  }

  const xGrouping = chart.xGrouping || 'none';
  const contexts = collectContexts(store, config, user);
  const buckets = new Map<string, ChartBucket>();

  contexts.forEach((context) => {
    const raw = readColumnValue(context, xAxis.entity, xAxis.field, primaryEntityId);
    const info = resolveXBucket(i18n, raw, xAxis, xGrouping);
    let bucket = buckets.get(info.label);
    if (!bucket) {
      bucket = {
        label: info.label,
        sortKey: info.sortKey,
        n: 0,
        sum: 0,
        count: 0,
        min: null,
        max: null,
        distinctKeys: new Set<string>(),
      };
      buckets.set(info.label, bucket);
    }
    addBucketRow(bucket, aggregate, yAxis, context, primaryEntityId);
  });

  const ordered = Array.from(buckets.values()).map((bucket) => ({
    label: bucket.label,
    value: finalizeBucket(bucket, aggregate),
    sortKey: bucket.sortKey,
  }));

  let chartType = chart.chartType || suggestChartType(xAxis, yAxis);
  if (chartType === 'pie') chartType = 'donut';

  if (cumulative || chartType === 'line') ordered.sort((a, b) => compareValues(a.sortKey, b.sortKey));
  else ordered.sort((a, b) => b.value - a.value);

  if (cumulative) {
    let running = 0;
    ordered.forEach((point) => {
      running += point.value;
      point.value = running;
    });
  }

  const points = ordered.map((point, index) => ({
    label: point.label,
    value: point.value,
    color: CHART_COLORS[index % CHART_COLORS.length],
  }));

  let xLabel = fieldLabel(i18n.t, xAxis.entity, xAxis.field);
  if (xGrouping !== 'none') {
    xLabel += ` (${i18n.t(`pages.reportBuilder.xGrouping.${xGrouping}`)})`;
  }

  return {
    reportType: 'chart',
    chartType,
    xLabel,
    yLabel: chartYLabel(i18n, aggregate, cumulative, yAxis, primaryEntityId),
    aggregate,
    cumulative,
    xGrouping,
    points,
    rowCount: contexts.length,
    groupCount: points.length,
    meta: i18n.t('pages.reportBuilder.chartMetaWithGrain', {
      groups: points.length,
      rows: contexts.length,
      grain: grainLabel,
    }),
  };
}

function runTable(
  store: MockStore,
  config: ReportBuilderConfig,
  user: UserProfile | null,
  i18n: ReportI18n,
): CustomReportPreview {
  const primaryEntityId = config.primaryEntity || 'client';
  const grainLabel = entityLabel(i18n.t, primaryEntityId);
  const selected = config.columns?.length ? config.columns : defaultColumnsForEntity(primaryEntityId);

  const columns = selected.map((column) => ({
    key: columnKey(column.entity, column.field),
    label: fieldDisplayLabel(i18n.t, column.entity, column.field),
  }));

  const rows = collectContexts(store, config, user).map((context) => {
    const row: Record<string, string> = {};
    selected.forEach((column, index) => {
      const raw = readColumnValue(context, column.entity, column.field, primaryEntityId);
      row[columns[index].key] = formatValue(i18n, column.entity, column.field, raw);
    });
    return row;
  });

  if (config.sortBy?.field) {
    const sortKey = config.sortBy.entity
      ? columnKey(config.sortBy.entity, config.sortBy.field)
      : config.sortBy.field;
    rows.sort((a, b) => {
      const cmp = compareValues(a[sortKey], b[sortKey]);
      return config.sortBy.dir === 'desc' ? -cmp : cmp;
    });
  }

  return {
    reportType: 'table',
    columns,
    rows,
    rowCount: rows.length,
    meta: i18n.t('pages.reportBuilder.rowCountWithGrain', { count: rows.length, grain: grainLabel }),
  };
}

export function runCustomReportPreview(
  store: MockStore,
  config: ReportBuilderConfig,
  user: UserProfile | null,
  runtime: RuntimeFilters,
  i18n: ReportI18n,
): CustomReportPreview {
  const resolved = effectiveConfig(config, runtime);
  return resolved.reportType === 'chart'
    ? runChart(store, resolved, user, i18n)
    : runTable(store, resolved, user, i18n);
}

export function previewFieldData(
  store: MockStore,
  entityId: string,
  fieldId: string,
  user: UserProfile | null,
  options: { primaryEntityId?: string; limit?: number },
  i18n: ReportI18n,
): FieldDataPreview {
  const limit = options.limit ?? 25;
  const primaryEntityId = options.primaryEntityId ?? entityId;

  if (fieldId === '__count__') {
    const rows = scopePrimaryRows(store, primaryEntityId, getEntityRows(store, primaryEntityId), user);
    return {
      label: i18n.t('pages.reportBuilder.recordCount'),
      entityLabel: entityLabel(i18n.t, primaryEntityId),
      role: 'measure',
      type: 'count',
      totalRows: rows.length,
      emptyCount: 0,
      distinctCount: 1,
      isRecordCount: true,
      values: [{ value: String(rows.length), count: rows.length }],
    };
  }

  if (fieldId === RELATED_COUNT_FIELD) {
    const rows = scopePrimaryRows(store, primaryEntityId, getEntityRows(store, primaryEntityId), user);
    const counts = new Map<string, number>();
    rows.forEach((row) => {
      const context = buildContext(store, primaryEntityId, row, [entityId], { [entityId]: 'count' }, []);
      const bucket = context[entityId];
      const key = String(bucket?.[RELATED_COUNT_FIELD] ?? 0);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    const values = Array.from(counts.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count);
    return {
      label: fieldDisplayLabel(i18n.t, entityId, fieldId),
      entityLabel: entityLabel(i18n.t, entityId),
      role: 'measure',
      type: 'count',
      totalRows: rows.length,
      emptyCount: 0,
      distinctCount: values.length,
      values: values.slice(0, limit),
    };
  }

  const rows = scopePrimaryRows(store, entityId, getEntityRows(store, entityId), user);
  const valueCounts = new Map<string, { value: string; count: number }>();
  let emptyCount = 0;

  rows.forEach((row) => {
    const raw = row[fieldId];
    if (raw == null || raw === '') {
      emptyCount += 1;
      return;
    }
    const formatted = formatValue(i18n, entityId, fieldId, raw);
    const existing = valueCounts.get(formatted);
    if (existing) existing.count += 1;
    else valueCounts.set(formatted, { value: formatted, count: 1 });
  });

  const values = Array.from(valueCounts.values()).sort(
    (a, b) => b.count - a.count || compareValues(a.value, b.value),
  );

  return {
    label: fieldDisplayLabel(i18n.t, entityId, fieldId),
    entityLabel: entityLabel(i18n.t, entityId),
    role: fieldRole(entityId, fieldId),
    type: fieldMeta(entityId, fieldId)?.type ?? 'text',
    totalRows: rows.length,
    emptyCount,
    distinctCount: values.length,
    values: values.slice(0, limit),
  };
}

export function reportFilterOptions(i18n: ReportI18n): {
  programs: { id: string; label: string }[];
  events: { id: string; label: string }[];
} {
  return {
    programs: PROGRAM_IDS.map((id) => ({ id, label: i18n.programLabel(id) })),
    events: SERVICE_EVENTS.map((event) => ({ id: event.id, label: i18n.eventLabel(event.id) })),
  };
}

export function toBuilderConfig(report: MockCustomReport | CustomReportConfig, fallbackId?: string): ReportBuilderConfig {
  return {
    id: report.id ?? fallbackId ?? null,
    name: report.name,
    reportType: report.reportType,
    primaryEntity: report.primaryEntity ?? 'client',
    joins: report.joins ?? [],
    columns: report.columns ?? [],
    filters: report.filters ?? [],
    sortBy: report.sortBy ?? { entity: 'client', field: 'name', dir: 'asc' },
    joinAggregates: { riskAssessment: 'latest', ...(report.joinAggregates ?? {}) },
    chart: normalizeChartConfig(report.chart),
  };
}

export function listCustomReports(
  store: MockStore,
  user: UserProfile | null,
  runtime: RuntimeFilters,
  i18n: ReportI18n,
): CustomReportItem[] {
  return store.customReports
    .filter((report) => report.shared || report.ownerId === user?.id)
    .map((report) => ({
      id: report.id,
      name: report.name,
      reportType: report.reportType,
      updatedAt: report.updatedAt,
      primaryEntity: report.primaryEntity,
      preview: runCustomReportPreview(store, toBuilderConfig(report), user, runtime, i18n),
    }));
}

export function getCustomReport(store: MockStore, id: string): MockCustomReport | null {
  return store.customReports.find((report) => report.id === id) ?? null;
}

export function saveCustomReport(
  store: MockStore,
  config: ReportBuilderConfig,
  ownerId: string,
): MockCustomReport {
  const existing = config.id ? getCustomReport(store, config.id) : null;
  const report: MockCustomReport = {
    id: config.id ?? `cr-${Date.now()}`,
    name: config.name.trim(),
    reportType: config.reportType,
    ownerId: existing?.ownerId ?? ownerId,
    shared: existing?.shared ?? true,
    primaryEntity: config.primaryEntity,
    joins: config.joins,
    columns: config.columns,
    filters: config.filters,
    sortBy: config.sortBy,
    joinAggregates: config.joinAggregates,
    chart: config.chart,
    updatedAt: new Date().toISOString(),
  };
  const index = store.customReports.findIndex((item) => item.id === report.id);
  if (index >= 0) store.customReports[index] = report;
  else store.customReports.push(report);
  saveStore(store);
  return report;
}

export function deleteCustomReport(store: MockStore, id: string): void {
  const index = store.customReports.findIndex((report) => report.id === id);
  if (index < 0) return;
  store.customReports.splice(index, 1);
  saveStore(store);
}

/** Entity ids offered as the report row grain, in palette order. */
export function reportEntityIds(): string[] {
  return builderEntityIds().filter((entityId) => Boolean(getEntity(entityId)));
}

export function seedCustomReports(): MockCustomReport[] {
  return [
    {
      id: 'cr-seed-caseload',
      name: 'Active client caseload',
      reportType: 'table',
      ownerId: 'usr-supervisor',
      shared: true,
      primaryEntity: 'client',
      joins: ['case', 'riskAssessment'],
      columns: [
        { entity: 'client', field: 'name' },
        { entity: 'client', field: 'phone' },
        { entity: 'case', field: 'programId' },
        { entity: 'case', field: 'status' },
        { entity: 'riskAssessment', field: 'overallRisk' },
      ],
      filters: [{ entity: 'case', field: 'status', op: 'eq', value: 'active' }],
      sortBy: { entity: 'client', field: 'name', dir: 'asc' },
      joinAggregates: { riskAssessment: 'latest' },
      updatedAt: '2026-08-01T12:00:00.000Z',
    },
    {
      id: 'cr-seed-by-program',
      name: 'Cases by program (chart)',
      reportType: 'chart',
      ownerId: 'usr-supervisor',
      shared: true,
      primaryEntity: 'case',
      joins: [],
      columns: [],
      filters: [{ entity: 'case', field: 'status', op: 'eq', value: 'active' }],
      sortBy: { entity: 'case', field: 'programId', dir: 'asc' },
      joinAggregates: { riskAssessment: 'latest' },
      chart: {
        xAxis: { entity: 'case', field: 'programId' },
        yAxis: { aggregate: 'count', cumulative: false },
        chartType: 'bar',
        xGrouping: 'none',
      },
      updatedAt: '2026-08-01T12:00:00.000Z',
    },
  ];
}
