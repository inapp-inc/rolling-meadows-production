/* global RM */
(function () {
	'use strict';

	var CATALOG = [
		{
			id: 'clients-by-program',
			labelKey: 'pages.reports.clientsByProgram',
			reportType: 'chart',
			primaryEntity: 'case',
			joins: [],
			columns: [],
			filters: [],
			parameters: [
				{ id: 'param-cbp-period', label: 'Client registered', type: 'relativePeriod', entity: 'client', field: 'registeredAt', defaultPreset: 'all' },
				{ id: 'param-cbp-program', label: 'Program', type: 'program', entity: 'case', field: 'programId' },
				{ id: 'param-cbp-status', label: 'Case status', type: 'caseStatus', entity: 'case', field: 'status', defaultValue: 'active' }
			],
			chart: {
				xAxis: { entity: 'case', field: 'programId' },
				yAxis: { aggregate: 'count' },
				chartType: 'bar'
			}
		},
		{
			id: 'multi-program-enrollment',
			labelKey: 'pages.reports.multiProgramEnrollment',
			reportType: 'chart',
			primaryEntity: 'client',
			joins: ['case'],
			columns: [],
			filters: [],
			parameters: [
				{ id: 'param-mpe-period', label: 'Client registered', type: 'relativePeriod', entity: 'client', field: 'registeredAt', defaultPreset: 'all' },
				{ id: 'param-mpe-status', label: 'Case status', type: 'caseStatus', entity: 'case', field: 'status', defaultValue: 'active' }
			],
			chart: {
				xAxis: { entity: 'case', field: 'programId' },
				yAxis: { aggregate: 'count' },
				chartType: 'bar'
			}
		},
		{
			id: 'caseload-by-risk',
			labelKey: 'pages.reports.caseloadByRisk',
			reportType: 'chart',
			primaryEntity: 'client',
			joins: ['riskAssessment'],
			columns: [],
			filters: [],
			parameters: [
				{ id: 'param-cbr-period', label: 'Client registered', type: 'relativePeriod', entity: 'client', field: 'registeredAt', defaultPreset: 'all' },
				{ id: 'param-cbr-program', label: 'Program', type: 'program', entity: 'case', field: 'programId' },
				{ id: 'param-cbr-status', label: 'Case status', type: 'caseStatus', entity: 'case', field: 'status', defaultValue: 'active' }
			],
			joinAggregates: { riskAssessment: 'latest' },
			chart: {
				xAxis: { entity: 'riskAssessment', field: 'overallRisk' },
				yAxis: { aggregate: 'count' },
				chartType: 'donut'
			}
		},
		{
			id: 'event-enrollment',
			labelKey: 'pages.reports.clientsEnrolledInEvent',
			reportType: 'table',
			primaryEntity: 'serviceEnrollment',
			joins: ['client'],
			columns: [
				{ entity: 'client', field: 'name' },
				{ entity: 'serviceEnrollment', field: 'dateEnrolled' },
				{ entity: 'serviceEnrollment', field: 'serviceOrEventId' }
			],
			filters: [{ entity: 'serviceEnrollment', field: 'voided', op: 'false', value: '' }],
			parameters: [
				{ id: 'param-ee-period', label: 'Enrollment date', type: 'relativePeriod', entity: 'serviceEnrollment', field: 'dateEnrolled', defaultPreset: 'all' },
				{ id: 'param-ee-event', label: 'Event', type: 'event', entity: 'serviceEnrollment', field: 'serviceOrEventId' }
			]
		},
		{
			id: 'overdue-follow-ups',
			labelKey: 'pages.reports.overdueFollowUps',
			reportType: 'table',
			primaryEntity: 'client',
			joins: ['case', 'riskAssessment'],
			columns: [
				{ entity: 'client', field: 'name' },
				{ entity: 'riskAssessment', field: 'overallRisk' },
				{ entity: 'case', field: 'status' },
				{ entity: 'case', field: 'programId' }
			],
			filters: [],
			parameters: [
				{ id: 'param-ofu-period', label: 'Client registered', type: 'relativePeriod', entity: 'client', field: 'registeredAt', defaultPreset: 'all' },
				{ id: 'param-ofu-program', label: 'Program', type: 'program', entity: 'case', field: 'programId' }
			],
			joinAggregates: { riskAssessment: 'latest' }
		},
		{
			id: 'open-cbo-referrals',
			labelKey: 'pages.reports.openCboReferrals',
			reportType: 'table',
			primaryEntity: 'cboReferral',
			joins: ['client'],
			columns: [
				{ entity: 'client', field: 'name' },
				{ entity: 'cboReferral', field: 'cboName' },
				{ entity: 'cboReferral', field: 'status' },
				{ entity: 'cboReferral', field: 'date' }
			],
			filters: [{ entity: 'cboReferral', field: 'status', op: 'eq', value: 'Pending' }],
			parameters: [
				{ id: 'param-cbo-period', label: 'Referral date', type: 'relativePeriod', entity: 'cboReferral', field: 'date', defaultPreset: 'all' }
			]
		}
	];

	RM.ReportCatalog = {
		all: function () {
			return CATALOG.slice();
		},

		findById: function (id) {
			return CATALOG.find(function (item) { return item.id === id; }) || null;
		},

		builderUrl: function (catalogId) {
			return RM.Links.page('report-builder', { template: catalogId });
		}
	};
})();
