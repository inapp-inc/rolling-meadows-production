import type { ReportBuilderConfig } from './reportBuilderModel';

export type ReportCatalogItem = ReportBuilderConfig & {
  catalogId: string;
  catalogLabel: string;
};

export const REPORT_CATALOG: ReportCatalogItem[] = [
  {
    catalogId: 'clients-by-program',
    catalogLabel: 'People by Program',
    id: null,
    name: 'People by Program',
    reportType: 'chart',
    primaryEntity: 'case',
    joins: [],
    columns: [],
    filters: [],
    sortBy: { entity: 'case', field: 'programId', dir: 'asc' },
    joinAggregates: { riskAssessment: 'latest' },
    chart: {
      xAxis: { entity: 'case', field: 'programId' },
      yAxis: { aggregate: 'count', cumulative: false },
      xGrouping: 'none',
      chartType: 'bar',
    },
  },
  {
    catalogId: 'caseload-by-risk',
    catalogLabel: 'Caseload by Risk Level',
    id: null,
    name: 'Caseload by Risk Level',
    reportType: 'chart',
    primaryEntity: 'client',
    joins: ['riskAssessment'],
    columns: [],
    filters: [],
    sortBy: { entity: 'client', field: 'name', dir: 'asc' },
    joinAggregates: { riskAssessment: 'latest' },
    chart: {
      xAxis: { entity: 'riskAssessment', field: 'overallRisk' },
      yAxis: { aggregate: 'count', cumulative: false },
      xGrouping: 'none',
      chartType: 'donut',
    },
  },
  {
    catalogId: 'multi-program-enrollment',
    catalogLabel: 'Multi-Program Enrollment',
    id: null,
    name: 'Multi-Program Enrollment',
    reportType: 'table',
    primaryEntity: 'client',
    joins: ['case'],
    columns: [
      { entity: 'client', field: 'name' },
      { entity: 'client', field: 'phone' },
      { entity: 'case', field: 'programId' },
      { entity: 'case', field: 'status' },
    ],
    filters: [{ entity: 'case', field: 'status', op: 'eq', value: 'active' }],
    sortBy: { entity: 'client', field: 'name', dir: 'asc' },
    joinAggregates: { riskAssessment: 'latest' },
    chart: {
      xAxis: null,
      yAxis: { aggregate: 'count', cumulative: false },
      xGrouping: 'none',
      chartType: 'bar',
    },
  },
  {
    catalogId: 'overdue-follow-ups',
    catalogLabel: 'Overdue Follow-ups',
    id: null,
    name: 'Overdue Follow-ups',
    reportType: 'table',
    primaryEntity: 'client',
    joins: ['case', 'riskAssessment'],
    columns: [
      { entity: 'client', field: 'name' },
      { entity: 'riskAssessment', field: 'overallRisk' },
      { entity: 'case', field: 'currentStage' },
      { entity: 'case', field: 'openDate' },
    ],
    filters: [{ entity: 'case', field: 'status', op: 'eq', value: 'active' }],
    sortBy: { entity: 'client', field: 'name', dir: 'asc' },
    joinAggregates: { riskAssessment: 'latest' },
    chart: {
      xAxis: null,
      yAxis: { aggregate: 'count', cumulative: false },
      xGrouping: 'none',
      chartType: 'bar',
    },
  },
  {
    catalogId: 'event-enrollment',
    catalogLabel: 'Clients Enrolled in Event',
    id: null,
    name: 'Clients Enrolled in Event',
    reportType: 'table',
    primaryEntity: 'serviceEnrollment',
    joins: ['client'],
    columns: [
      { entity: 'client', field: 'name' },
      { entity: 'serviceEnrollment', field: 'dateEnrolled' },
      { entity: 'serviceEnrollment', field: 'serviceOrEventId' },
    ],
    filters: [{ entity: 'serviceEnrollment', field: 'voided', op: 'false', value: '' }],
    sortBy: { entity: 'serviceEnrollment', field: 'dateEnrolled', dir: 'desc' },
    joinAggregates: { riskAssessment: 'latest' },
    chart: {
      xAxis: null,
      yAxis: { aggregate: 'count', cumulative: false },
      xGrouping: 'none',
      chartType: 'bar',
    },
  },
  {
    catalogId: 'open-cbo-referrals',
    catalogLabel: 'Open CBO Referrals',
    id: null,
    name: 'Open CBO Referrals',
    reportType: 'table',
    primaryEntity: 'cboReferral',
    joins: ['client'],
    columns: [
      { entity: 'client', field: 'name' },
      { entity: 'cboReferral', field: 'cboName' },
      { entity: 'cboReferral', field: 'status' },
      { entity: 'cboReferral', field: 'date' },
    ],
    filters: [{ entity: 'cboReferral', field: 'status', op: 'eq', value: 'Pending' }],
    sortBy: { entity: 'cboReferral', field: 'date', dir: 'desc' },
    joinAggregates: { riskAssessment: 'latest' },
    chart: {
      xAxis: null,
      yAxis: { aggregate: 'count', cumulative: false },
      xGrouping: 'none',
      chartType: 'bar',
    },
  },
];

export function findCatalogItem(templateId: string) {
  return REPORT_CATALOG.find((item) => item.catalogId === templateId) ?? null;
}
