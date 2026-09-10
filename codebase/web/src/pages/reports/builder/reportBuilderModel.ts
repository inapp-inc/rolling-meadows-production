export type Translate = (key: string, params?: Record<string, string | number>) => string;

export type FieldType =
  | 'id'
  | 'text'
  | 'date'
  | 'number'
  | 'boolean'
  | 'program'
  | 'event'
  | 'risk'
  | 'role'
  | 'cboStatus';

export type FieldRole = 'dimension' | 'measure';

export type EntityFieldDef = {
  id: string;
  type: FieldType;
  labelKey: string;
};

export type RelationDef = {
  entity: string;
  type: 'hasMany' | 'belongsTo';
  localKey: string;
  foreignKey: string;
  labelKey: string;
};

export type EntityDef = {
  id: string;
  labelKey: string;
  fields: EntityFieldDef[];
  relations: Record<string, RelationDef>;
};

export type FieldRef = {
  entity: string;
  field: string;
};

export type BuilderFieldRef = FieldRef & {
  key: string;
  label: string;
  entityLabel: string;
  role: FieldRole;
  type: FieldType | 'count';
  isRelatedCount?: boolean;
};

export type ReportFilter = {
  entity: string;
  field: string;
  op: string;
  value: string;
};

export type ChartYAxis = {
  entity?: string;
  field?: string;
  aggregate: string;
  cumulative?: boolean;
};

export type ChartConfig = {
  xAxis: FieldRef | null;
  yAxis: ChartYAxis;
  xGrouping: string;
  chartType: string;
};

export type ReportBuilderConfig = {
  id: string | null;
  name: string;
  reportType: 'table' | 'chart';
  primaryEntity: string;
  joins: string[];
  columns: FieldRef[];
  filters: ReportFilter[];
  sortBy: { entity: string; field: string; dir: string };
  joinAggregates: Record<string, string>;
  chart: ChartConfig;
};

function field(id: string, type: FieldType, labelKey: string): EntityFieldDef {
  return { id, type, labelKey };
}

function belongsToClient(): RelationDef {
  return {
    entity: 'client',
    type: 'belongsTo',
    localKey: 'clientId',
    foreignKey: 'id',
    labelKey: 'pages.reportBuilder.relations.client',
  };
}

function belongsToCase(): RelationDef {
  return {
    entity: 'case',
    type: 'belongsTo',
    localKey: 'caseId',
    foreignKey: 'id',
    labelKey: 'pages.reportBuilder.relations.case',
  };
}

const ENTITIES: Record<string, EntityDef> = {
  client: {
    id: 'client',
    labelKey: 'pages.reportBuilder.entities.client',
    fields: [
      field('id', 'id', 'pages.reportBuilder.fields.id'),
      field('name', 'text', 'pages.reportBuilder.fields.name'),
      field('dob', 'date', 'pages.reportBuilder.fields.dob'),
      field('phone', 'text', 'pages.reportBuilder.fields.phone'),
      field('address', 'text', 'pages.reportBuilder.fields.address'),
      field('registeredAt', 'date', 'pages.reportBuilder.fields.registeredAt'),
      field('registrationSource', 'text', 'pages.reportBuilder.fields.registrationSource'),
    ],
    relations: {
      cases: { entity: 'case', type: 'hasMany', localKey: 'id', foreignKey: 'clientId', labelKey: 'pages.reportBuilder.relations.cases' },
      referrals: { entity: 'referral', type: 'hasMany', localKey: 'id', foreignKey: 'clientId', labelKey: 'pages.reportBuilder.relations.referrals' },
      intakes: { entity: 'intake', type: 'hasMany', localKey: 'id', foreignKey: 'clientId', labelKey: 'pages.reportBuilder.relations.intakes' },
      riskAssessments: {
        entity: 'riskAssessment',
        type: 'hasMany',
        localKey: 'id',
        foreignKey: 'clientId',
        labelKey: 'pages.reportBuilder.relations.riskAssessments',
      },
      serviceEnrollments: {
        entity: 'serviceEnrollment',
        type: 'hasMany',
        localKey: 'id',
        foreignKey: 'clientId',
        labelKey: 'pages.reportBuilder.relations.serviceEnrollments',
      },
      cboReferrals: {
        entity: 'cboReferral',
        type: 'hasMany',
        localKey: 'id',
        foreignKey: 'clientId',
        labelKey: 'pages.reportBuilder.relations.cboReferrals',
      },
      caseNotes: { entity: 'caseNote', type: 'hasMany', localKey: 'id', foreignKey: 'clientId', labelKey: 'pages.reportBuilder.relations.caseNotes' },
      carePlans: { entity: 'carePlan', type: 'hasMany', localKey: 'id', foreignKey: 'clientId', labelKey: 'pages.reportBuilder.relations.carePlans' },
      documents: { entity: 'document', type: 'hasMany', localKey: 'id', foreignKey: 'clientId', labelKey: 'pages.reportBuilder.relations.documents' },
    },
  },
  case: {
    id: 'case',
    labelKey: 'pages.reportBuilder.entities.case',
    fields: [
      field('id', 'id', 'pages.reportBuilder.fields.id'),
      field('caseNumber', 'text', 'pages.reportBuilder.fields.caseNumber'),
      field('clientId', 'id', 'pages.reportBuilder.fields.clientId'),
      field('programId', 'program', 'pages.reportBuilder.fields.programId'),
      field('caseManagerId', 'id', 'pages.reportBuilder.fields.caseManagerId'),
      field('status', 'text', 'pages.reportBuilder.fields.status'),
      field('currentStage', 'number', 'pages.reportBuilder.fields.currentStage'),
      field('incompleteIntake', 'boolean', 'pages.reportBuilder.fields.incompleteIntake'),
      field('openDate', 'date', 'pages.reportBuilder.fields.openDate'),
    ],
    relations: {
      client: belongsToClient(),
      caseManager: { entity: 'user', type: 'belongsTo', localKey: 'caseManagerId', foreignKey: 'id', labelKey: 'pages.reportBuilder.relations.caseManager' },
      referrals: { entity: 'referral', type: 'hasMany', localKey: 'id', foreignKey: 'caseId', labelKey: 'pages.reportBuilder.relations.referrals' },
      intakes: { entity: 'intake', type: 'hasMany', localKey: 'id', foreignKey: 'caseId', labelKey: 'pages.reportBuilder.relations.intakes' },
      serviceEnrollments: {
        entity: 'serviceEnrollment',
        type: 'hasMany',
        localKey: 'id',
        foreignKey: 'caseId',
        labelKey: 'pages.reportBuilder.relations.serviceEnrollments',
      },
      riskAssessments: {
        entity: 'riskAssessment',
        type: 'hasMany',
        localKey: 'clientId',
        foreignKey: 'clientId',
        labelKey: 'pages.reportBuilder.relations.riskAssessments',
      },
      cboReferrals: {
        entity: 'cboReferral',
        type: 'hasMany',
        localKey: 'clientId',
        foreignKey: 'clientId',
        labelKey: 'pages.reportBuilder.relations.cboReferrals',
      },
      caseNotes: { entity: 'caseNote', type: 'hasMany', localKey: 'clientId', foreignKey: 'clientId', labelKey: 'pages.reportBuilder.relations.caseNotes' },
      carePlans: { entity: 'carePlan', type: 'hasMany', localKey: 'clientId', foreignKey: 'clientId', labelKey: 'pages.reportBuilder.relations.carePlans' },
    },
  },
  referral: {
    id: 'referral',
    labelKey: 'pages.reportBuilder.entities.referral',
    fields: [
      field('id', 'id', 'pages.reportBuilder.fields.id'),
      field('clientId', 'id', 'pages.reportBuilder.fields.clientId'),
      field('caseId', 'id', 'pages.reportBuilder.fields.caseId'),
      field('source', 'text', 'pages.reportBuilder.fields.source'),
      field('reason', 'text', 'pages.reportBuilder.fields.reason'),
      field('dateReceived', 'date', 'pages.reportBuilder.fields.dateReceived'),
      field('referredBy', 'text', 'pages.reportBuilder.fields.referredBy'),
    ],
    relations: { client: belongsToClient(), case: belongsToCase() },
  },
  intake: {
    id: 'intake',
    labelKey: 'pages.reportBuilder.entities.intake',
    fields: [
      field('id', 'id', 'pages.reportBuilder.fields.id'),
      field('clientId', 'id', 'pages.reportBuilder.fields.clientId'),
      field('caseId', 'id', 'pages.reportBuilder.fields.caseId'),
      field('completeness', 'text', 'pages.reportBuilder.fields.completeness'),
      field('consentOnFile', 'boolean', 'pages.reportBuilder.fields.consentOnFile'),
      field('livingArrangement', 'text', 'pages.reportBuilder.fields.livingArrangement'),
    ],
    relations: { client: belongsToClient(), case: belongsToCase() },
  },
  riskAssessment: {
    id: 'riskAssessment',
    labelKey: 'pages.reportBuilder.entities.riskAssessment',
    fields: [
      field('id', 'id', 'pages.reportBuilder.fields.id'),
      field('clientId', 'id', 'pages.reportBuilder.fields.clientId'),
      field('date', 'date', 'pages.reportBuilder.fields.date'),
      field('overallRisk', 'risk', 'pages.reportBuilder.fields.overallRisk'),
      field('compositeScore', 'number', 'pages.reportBuilder.fields.compositeScore'),
    ],
    relations: { client: belongsToClient() },
  },
  serviceEnrollment: {
    id: 'serviceEnrollment',
    labelKey: 'pages.reportBuilder.entities.serviceEnrollment',
    fields: [
      field('id', 'id', 'pages.reportBuilder.fields.id'),
      field('clientId', 'id', 'pages.reportBuilder.fields.clientId'),
      field('caseId', 'id', 'pages.reportBuilder.fields.caseId'),
      field('serviceOrEventId', 'event', 'pages.reportBuilder.fields.serviceOrEventId'),
      field('dateEnrolled', 'date', 'pages.reportBuilder.fields.dateEnrolled'),
      field('voided', 'boolean', 'pages.reportBuilder.fields.voided'),
    ],
    relations: { client: belongsToClient(), case: belongsToCase() },
  },
  cboReferral: {
    id: 'cboReferral',
    labelKey: 'pages.reportBuilder.entities.cboReferral',
    fields: [
      field('id', 'id', 'pages.reportBuilder.fields.id'),
      field('clientId', 'id', 'pages.reportBuilder.fields.clientId'),
      field('cboName', 'text', 'pages.reportBuilder.fields.cboName'),
      field('status', 'cboStatus', 'pages.reportBuilder.fields.status'),
      field('date', 'date', 'pages.reportBuilder.fields.date'),
    ],
    relations: { client: belongsToClient() },
  },
  caseNote: {
    id: 'caseNote',
    labelKey: 'pages.reportBuilder.entities.caseNote',
    fields: [
      field('id', 'id', 'pages.reportBuilder.fields.id'),
      field('clientId', 'id', 'pages.reportBuilder.fields.clientId'),
      field('date', 'date', 'pages.reportBuilder.fields.date'),
      field('type', 'text', 'pages.reportBuilder.fields.noteType'),
      field('text', 'text', 'pages.reportBuilder.fields.noteText'),
    ],
    relations: { client: belongsToClient() },
  },
  carePlan: {
    id: 'carePlan',
    labelKey: 'pages.reportBuilder.entities.carePlan',
    fields: [
      field('id', 'id', 'pages.reportBuilder.fields.id'),
      field('clientId', 'id', 'pages.reportBuilder.fields.clientId'),
      field('issue', 'text', 'pages.reportBuilder.fields.issue'),
      field('goal', 'text', 'pages.reportBuilder.fields.goal'),
      field('service', 'text', 'pages.reportBuilder.fields.service'),
      field('status', 'text', 'pages.reportBuilder.fields.status'),
    ],
    relations: { client: belongsToClient() },
  },
  document: {
    id: 'document',
    labelKey: 'pages.reportBuilder.entities.document',
    fields: [
      field('id', 'id', 'pages.reportBuilder.fields.id'),
      field('clientId', 'id', 'pages.reportBuilder.fields.clientId'),
      field('type', 'text', 'pages.reportBuilder.fields.documentKind'),
      field('name', 'text', 'pages.reportBuilder.fields.title'),
      field('uploadedAt', 'date', 'pages.reportBuilder.fields.date'),
    ],
    relations: { client: belongsToClient() },
  },
  user: {
    id: 'user',
    labelKey: 'pages.reportBuilder.entities.user',
    fields: [
      field('id', 'id', 'pages.reportBuilder.fields.id'),
      field('name', 'text', 'pages.reportBuilder.fields.name'),
      field('role', 'role', 'pages.reportBuilder.fields.role'),
      field('programId', 'program', 'pages.reportBuilder.fields.programId'),
      field('status', 'text', 'pages.reportBuilder.fields.status'),
    ],
    relations: {},
  },
  initiative: {
    id: 'initiative',
    labelKey: 'pages.reportBuilder.entities.initiative',
    fields: [
      field('id', 'id', 'pages.reportBuilder.fields.id'),
      field('name', 'text', 'pages.reportBuilder.fields.name'),
      field('startDate', 'date', 'pages.reportBuilder.fields.startDate'),
      field('endDate', 'date', 'pages.reportBuilder.fields.endDate'),
      field('targetOutreach', 'number', 'pages.reportBuilder.fields.targetOutreach'),
      field('referralsGenerated', 'number', 'pages.reportBuilder.fields.referralsGenerated'),
      field('enrollments', 'number', 'pages.reportBuilder.fields.enrollments'),
      field('completions', 'number', 'pages.reportBuilder.fields.completions'),
    ],
    relations: {},
  },
};

const BUILDER_ENTITY_ORDER = [
  'client',
  'case',
  'referral',
  'intake',
  'riskAssessment',
  'serviceEnrollment',
  'cboReferral',
  'caseNote',
  'carePlan',
  'document',
  'user',
  'initiative',
];

const GRAIN_INFERENCE_PRIORITY = [
  'case',
  'serviceEnrollment',
  'cboReferral',
  'referral',
  'client',
  'riskAssessment',
  'intake',
  'caseNote',
  'carePlan',
  'document',
  'user',
  'initiative',
];

/** Synthetic field id for "count of related records", mirroring the prototype palette. */
export const RELATED_COUNT_FIELD = '__count';
/** Synthetic palette key for "count of primary records". */
export const RECORD_COUNT_KEY = '__count__';

export function builderEntityIds(): string[] {
  return BUILDER_ENTITY_ORDER.filter((entityId) => Boolean(ENTITIES[entityId]));
}

export function getEntity(entityId: string): EntityDef | null {
  return ENTITIES[entityId] ?? null;
}

export function entityLabel(t: Translate, entityId: string): string {
  const entity = ENTITIES[entityId];
  return entity ? t(entity.labelKey) : entityId;
}

export function fieldMeta(entityId: string, fieldId: string): EntityFieldDef | null {
  const entity = ENTITIES[entityId];
  if (!entity) return null;
  return entity.fields.find((f) => f.id === fieldId) ?? null;
}

export function fieldLabel(t: Translate, entityId: string, fieldId: string): string {
  const meta = fieldMeta(entityId, fieldId);
  return meta ? t(meta.labelKey) : fieldId;
}

export function fieldDisplayLabel(t: Translate, entityId: string, fieldId: string): string {
  if (fieldId === RELATED_COUNT_FIELD) {
    return t('pages.reportBuilder.relatedCount', { entity: entityLabel(t, entityId) });
  }
  return fieldLabel(t, entityId, fieldId);
}

export function fieldRole(entityId: string, fieldId: string): FieldRole {
  if (fieldId === RELATED_COUNT_FIELD) return 'measure';
  const meta = fieldMeta(entityId, fieldId);
  if (!meta) return 'dimension';
  return meta.type === 'number' ? 'measure' : 'dimension';
}

export function isReportableField(entityId: string, fieldId: string): boolean {
  if (fieldId === RELATED_COUNT_FIELD) return false;
  const meta = fieldMeta(entityId, fieldId);
  if (!meta) return false;
  return meta.type !== 'id';
}

export function fieldRefKey(entityId: string, fieldId: string): string {
  return `${entityId}.${fieldId}`;
}

export const columnKey = fieldRefKey;

export function parseFieldRef(key: string): FieldRef {
  const parts = String(key).split('.');
  return { entity: parts[0], field: parts.slice(1).join('.') };
}

export function getRelation(fromEntityId: string, relationKey: string): RelationDef | null {
  const entity = ENTITIES[fromEntityId];
  if (!entity) return null;
  return entity.relations[relationKey] ?? null;
}

export function resolveRelationKey(fromEntityId: string, toEntityId: string): string | null {
  const entity = ENTITIES[fromEntityId];
  if (!entity) return null;
  const match = Object.keys(entity.relations).find((key) => entity.relations[key].entity === toEntityId);
  return match ?? null;
}

export function availableJoins(primaryEntityId: string): (RelationDef & { key: string })[] {
  const entity = ENTITIES[primaryEntityId];
  if (!entity) return [];
  return Object.keys(entity.relations).map((key) => ({ key, ...entity.relations[key] }));
}

export function reachableEntityIds(primaryEntityId: string): string[] {
  const ordered = [primaryEntityId];
  availableJoins(primaryEntityId).forEach((join) => {
    if (!ordered.includes(join.entity)) ordered.push(join.entity);
  });
  return ordered;
}

export function builderFieldRefs(t: Translate, options: { reportableOnly?: boolean } = {}): BuilderFieldRef[] {
  const refs: BuilderFieldRef[] = [];
  builderEntityIds().forEach((entityId) => {
    const entity = ENTITIES[entityId];
    entity.fields.forEach((entityField) => {
      if (options.reportableOnly && !isReportableField(entityId, entityField.id)) return;
      refs.push({
        entity: entityId,
        field: entityField.id,
        key: fieldRefKey(entityId, entityField.id),
        label: fieldLabel(t, entityId, entityField.id),
        entityLabel: entityLabel(t, entityId),
        role: fieldRole(entityId, entityField.id),
        type: entityField.type,
      });
    });
  });
  return refs;
}

export function relatedCountRefs(t: Translate, primaryEntityId: string): BuilderFieldRef[] {
  return availableJoins(primaryEntityId)
    .filter((join) => join.type === 'hasMany')
    .map((join) => ({
      entity: join.entity,
      field: RELATED_COUNT_FIELD,
      key: fieldRefKey(join.entity, RELATED_COUNT_FIELD),
      label: t('pages.reportBuilder.relatedCount', { entity: entityLabel(t, join.entity) }),
      entityLabel: entityLabel(t, join.entity),
      role: 'measure' as FieldRole,
      type: 'count' as const,
      isRelatedCount: true,
    }));
}

export function collectFieldRefsFromConfig(config: Partial<ReportBuilderConfig>): FieldRef[] {
  const refs: FieldRef[] = [];
  (config.columns ?? []).forEach((column) => refs.push({ entity: column.entity, field: column.field }));
  if (config.chart?.xAxis) refs.push(config.chart.xAxis);
  if (config.chart?.yAxis?.field && config.chart.yAxis.entity) {
    refs.push({ entity: config.chart.yAxis.entity, field: config.chart.yAxis.field });
  }
  (config.filters ?? []).forEach((filter) => refs.push({ entity: filter.entity, field: filter.field }));
  return refs;
}

export function inferPrimaryEntity(refs: FieldRef[], fallback = 'client'): string {
  if (!refs.length) return fallback;
  const counts: Record<string, number> = {};
  refs.forEach((ref) => {
    if (!ref?.entity || ref.field === RELATED_COUNT_FIELD) return;
    counts[ref.entity] = (counts[ref.entity] ?? 0) + 1;
  });
  const keys = Object.keys(counts);
  if (!keys.length) return fallback;
  keys.sort((a, b) => {
    if (counts[b] !== counts[a]) return counts[b] - counts[a];
    const pa = GRAIN_INFERENCE_PRIORITY.indexOf(a);
    const pb = GRAIN_INFERENCE_PRIORITY.indexOf(b);
    return (pa === -1 ? 999 : pa) - (pb === -1 ? 999 : pb);
  });
  return keys[0];
}

export function syncJoinsFromReportConfig(
  config: Partial<ReportBuilderConfig>,
): { joins: string[]; joinAggregates: Record<string, string> } {
  const primaryEntityId = config.primaryEntity ?? 'client';
  const joins = (config.joins ?? []).slice();
  const joinAggregates: Record<string, string> = { ...(config.joinAggregates ?? {}) };

  collectFieldRefsFromConfig(config).forEach((ref) => {
    if (!ref?.entity) return;
    if (ref.field === RELATED_COUNT_FIELD && ref.entity !== primaryEntityId) {
      joinAggregates[ref.entity] = 'count';
    }
    if (ref.entity !== primaryEntityId && !joins.includes(ref.entity) && resolveRelationKey(primaryEntityId, ref.entity)) {
      joins.push(ref.entity);
    }
  });

  return { joins, joinAggregates };
}

export function entitiesInScope(config: Pick<ReportBuilderConfig, 'primaryEntity' | 'columns' | 'chart' | 'filters'>): string[] {
  const scoped = new Set<string>(builderEntityIds());
  reachableEntityIds(config.primaryEntity).forEach((entityId) => scoped.add(entityId));
  collectFieldRefsFromConfig(config).forEach((ref) => {
    if (ref?.entity) scoped.add(ref.entity);
  });
  return builderEntityIds().filter((entityId) => scoped.has(entityId));
}

export function defaultColumnsForEntity(entityId: string): FieldRef[] {
  const entity = ENTITIES[entityId];
  if (!entity) return [];
  return entity.fields
    .filter((entityField) => isReportableField(entityId, entityField.id))
    .slice(0, 4)
    .map((entityField) => ({ entity: entityId, field: entityField.id }));
}

export function emptyChartConfig(): ChartConfig {
  return {
    xAxis: null,
    yAxis: { aggregate: 'count', cumulative: false },
    xGrouping: 'none',
    chartType: 'bar',
  };
}

export function defaultTableConfig(): ReportBuilderConfig {
  return {
    id: null,
    name: '',
    reportType: 'table',
    primaryEntity: 'client',
    joins: [],
    columns: defaultColumnsForEntity('client'),
    filters: [],
    sortBy: { entity: 'client', field: 'name', dir: 'asc' },
    joinAggregates: { riskAssessment: 'latest' },
    chart: emptyChartConfig(),
  };
}

export function defaultChartConfig(): ReportBuilderConfig {
  return {
    id: null,
    name: '',
    reportType: 'chart',
    primaryEntity: 'client',
    joins: [],
    columns: [],
    filters: [],
    sortBy: { entity: 'client', field: 'name', dir: 'asc' },
    joinAggregates: { riskAssessment: 'latest' },
    chart: emptyChartConfig(),
  };
}

export const FILTER_OPERATORS = ['eq', 'neq', 'contains', 'notEmpty', 'empty', 'true', 'false'];

export function filterOperatorLabel(t: Translate, op: string): string {
  return t(`pages.reportBuilder.ops.${op}`);
}

export const CHART_TYPES = ['bar', 'line', 'donut'];

export const X_GROUPINGS = ['none', 'month', 'year'];

type AggregateDef = { id: string; needsMeasure: boolean; supportsCumulative: boolean };

const AGGREGATE_DEFS: AggregateDef[] = [
  { id: 'count', needsMeasure: false, supportsCumulative: true },
  { id: 'distinct', needsMeasure: false, supportsCumulative: false },
  { id: 'sum', needsMeasure: true, supportsCumulative: true },
  { id: 'avg', needsMeasure: true, supportsCumulative: false },
  { id: 'min', needsMeasure: true, supportsCumulative: false },
  { id: 'max', needsMeasure: true, supportsCumulative: false },
];

export function aggregateDefinitions(): AggregateDef[] {
  return AGGREGATE_DEFS;
}

export const AGGREGATES = AGGREGATE_DEFS.map((item) => item.id);

export function aggregateNeedsMeasure(aggregate: string): boolean {
  return AGGREGATE_DEFS.find((item) => item.id === aggregate)?.needsMeasure ?? false;
}

export function aggregateSupportsCumulative(aggregate: string): boolean {
  return AGGREGATE_DEFS.find((item) => item.id === aggregate)?.supportsCumulative ?? false;
}

export function suggestAggregate(yAxis: ChartYAxis | null): string {
  if (!yAxis?.field) return 'count';
  if (yAxis.field === RELATED_COUNT_FIELD) return 'sum';
  return fieldRole(yAxis.entity ?? '', yAxis.field) === 'measure' ? 'sum' : 'count';
}

export function suggestChartType(xAxis: FieldRef | null, yAxis: ChartYAxis | null): string {
  if (!xAxis) return 'bar';
  if (yAxis?.cumulative) return 'line';
  return fieldMeta(xAxis.entity, xAxis.field)?.type === 'date' ? 'line' : 'bar';
}

export function normalizeChartConfig(chart: Partial<ChartConfig> | undefined): ChartConfig {
  const next = { ...emptyChartConfig(), ...(chart ?? {}) };
  next.yAxis = { aggregate: 'count', cumulative: false, ...(chart?.yAxis ?? {}) };
  if (next.yAxis.cumulative == null) next.yAxis.cumulative = false;
  if (!next.xGrouping) next.xGrouping = 'none';
  if (next.chartType === 'pie') next.chartType = 'donut';
  return next;
}

export function normalizeChartOptions(config: ReportBuilderConfig): ChartConfig {
  const chart = normalizeChartConfig(config.chart);
  const hasMeasure = Boolean(chart.yAxis.field);
  if (aggregateNeedsMeasure(chart.yAxis.aggregate) && !hasMeasure) {
    chart.yAxis = { ...chart.yAxis, aggregate: 'count' };
  }
  if (chart.yAxis.cumulative && !aggregateSupportsCumulative(chart.yAxis.aggregate)) {
    chart.yAxis = { ...chart.yAxis, cumulative: false };
  }
  if (!chart.xAxis || fieldMeta(chart.xAxis.entity, chart.xAxis.field)?.type !== 'date') {
    chart.xGrouping = 'none';
  }
  return chart;
}

export function isXAxisDateField(chart: ChartConfig): boolean {
  if (!chart.xAxis) return false;
  return fieldMeta(chart.xAxis.entity, chart.xAxis.field)?.type === 'date';
}
