/* global RM */
(function () {
	'use strict';

	var PROGRAM_IDS = [
		'prog-senior-services',
		'prog-community-services',
		'prog-parenting-support',
		'prog-mental-health'
	];

	var PARAM_TYPES = [
		'relativePeriod',
		'dateRange',
		'text',
		'program',
		'caseStatus',
		'risk',
		'event',
		'booleanField'
	];

	function t(key, params) {
		return RM.I18n ? RM.I18n.t(key, params) : key;
	}

	function pad(n) {
		return n < 10 ? '0' + n : String(n);
	}

	function isoDate(d) {
		return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
	}

	function startOfDay(dateStr) {
		var d = new Date(dateStr);
		if (isNaN(d.getTime())) { return null; }
		d.setHours(0, 0, 0, 0);
		return d;
	}

	function endOfDay(dateStr) {
		var d = new Date(dateStr);
		if (isNaN(d.getTime())) { return null; }
		d.setHours(23, 59, 59, 999);
		return d;
	}

	function computeRelativeRange(preset) {
		var today = new Date();
		today.setHours(23, 59, 59, 999);
		var start = new Date(today);
		start.setHours(0, 0, 0, 0);

		if (preset === 'last7') {
			start.setDate(start.getDate() - 6);
		} else if (preset === 'last30') {
			start.setDate(start.getDate() - 29);
		} else if (preset === 'last90') {
			start.setDate(start.getDate() - 89);
		} else if (preset === 'mtd') {
			start.setDate(1);
		} else if (preset === 'ytd') {
			start.setMonth(0, 1);
		} else {
			return { from: '', to: '' };
		}

		return { from: isoDate(start), to: isoDate(today) };
	}

	function dateRangeFilters(entity, field, from, to) {
		var filters = [];
		if (from) {
			filters.push({ entity: entity, field: field, op: 'gte', value: from });
		}
		if (to) {
			filters.push({ entity: entity, field: field, op: 'lte', value: to });
		}
		return filters;
	}

	RM.ReportBuilderParams = {
		PARAM_TYPES: PARAM_TYPES,
		PROGRAM_IDS: PROGRAM_IDS,

		paramTypeLabel: function (type) {
			return t('pages.reportBuilder.paramTypes.' + type);
		},

		suggestDateField: function (entityId) {
			var entity = RM.ReportDataModel.getEntity(entityId);
			if (!entity) { return 'openDate'; }
			var dateField = entity.fields.find(function (field) {
				return field.type === 'date';
			});
			if (dateField) { return dateField.id; }
			var named = entity.fields.find(function (field) {
				return /date/i.test(field.id);
			});
			return named ? named.id : entity.fields[0].id;
		},

		defaultParam: function (type, entityId) {
			entityId = entityId || 'case';
			var id = 'param-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
			var base = {
				id: id,
				label: t('pages.reportBuilder.paramDefaults.' + type),
				type: type,
				entity: entityId,
				field: type === 'relativePeriod' || type === 'dateRange'
					? this.suggestDateField(entityId)
					: (type === 'program' ? 'programId' : type === 'caseStatus' ? 'status' : type === 'risk' ? 'overallRisk' : type === 'event' ? 'serviceOrEventId' : 'name')
			};

			if (type === 'relativePeriod') {
				base.defaultPreset = 'last30';
			}
			if (type === 'booleanField') {
				base.field = 'incompleteIntake';
				base.defaultValue = 'any';
			}
			if (type === 'caseStatus') {
				base.defaultValue = 'active';
			}
			return base;
		},

		defaultValueForParam: function (param) {
			if (!param) { return null; }
			if (param.type === 'relativePeriod') {
				return { preset: param.defaultPreset || 'last30', from: '', to: '' };
			}
			if (param.type === 'dateRange') {
				return { from: param.defaultFrom || '', to: param.defaultTo || '' };
			}
			if (param.type === 'booleanField') {
				return param.defaultValue || 'any';
			}
			return param.defaultValue != null ? param.defaultValue : '';
		},

		initParameterValues: function (parameters, existing) {
			existing = existing || {};
			var values = {};
			(parameters || []).forEach(function (param) {
				values[param.id] = existing[param.id] != null
					? existing[param.id]
					: RM.ReportBuilderParams.defaultValueForParam(param);
			});
			return values;
		},

		filtersFromParameter: function (param, value) {
			if (!param) { return []; }
			var entity = param.entity;
			var field = param.field;

			if (param.type === 'relativePeriod') {
				value = value || { preset: 'all' };
				if (!value.preset || value.preset === 'all') { return []; }
				if (value.preset === 'custom') {
					return dateRangeFilters(entity, field, value.from, value.to);
				}
				var range = computeRelativeRange(value.preset);
				return dateRangeFilters(entity, field, range.from, range.to);
			}

			if (param.type === 'dateRange') {
				value = value || {};
				return dateRangeFilters(entity, field, value.from, value.to);
			}

			if (param.type === 'text') {
				if (!value) { return []; }
				return [{ entity: entity, field: field, op: 'contains', value: value }];
			}

			if (param.type === 'program' || param.type === 'caseStatus' || param.type === 'risk' || param.type === 'event') {
				if (!value) { return []; }
				return [{ entity: entity, field: field, op: 'eq', value: value }];
			}

			if (param.type === 'booleanField') {
				if (!value || value === 'any') { return []; }
				return [{ entity: entity, field: field, op: value === 'true' ? 'true' : 'false', value: '' }];
			}

			return [];
		},

		resolvedFilters: function (parameters, parameterValues) {
			var filters = [];
			(parameters || []).forEach(function (param) {
				var value = parameterValues ? parameterValues[param.id] : null;
				if (value === undefined) {
					value = RM.ReportBuilderParams.defaultValueForParam(param);
				}
				filters = filters.concat(RM.ReportBuilderParams.filtersFromParameter(param, value));
			});
			return filters;
		},

		applyToConfig: function (config, parameterValues) {
			config = Object.assign({}, config || {});
			var staticFilters = (config.filters || []).slice();
			var dynamicFilters = RM.ReportBuilderParams.resolvedFilters(config.parameters, parameterValues);
			config.filters = staticFilters.concat(dynamicFilters);
			return config;
		},

		pageContextFromValues: function (parameters, parameterValues) {
			var filters = RM.ReportBuilderParams.resolvedFilters(parameters, parameterValues);
			var ctx = {
				filters: filters,
				dateFrom: '',
				dateTo: '',
				programId: '',
				caseStatus: 'active',
				eventId: ''
			};

			filters.forEach(function (filter) {
				if (filter.entity === 'case' && filter.field === 'programId' && filter.op === 'eq') {
					ctx.programId = filter.value;
				}
				if (filter.entity === 'case' && filter.field === 'status' && filter.op === 'eq') {
					ctx.caseStatus = filter.value;
				}
				if (filter.entity === 'serviceEnrollment' && filter.field === 'serviceOrEventId' && filter.op === 'eq') {
					ctx.eventId = filter.value;
				}
				if (filter.op === 'gte' && !ctx.dateFrom) {
					ctx.dateFrom = filter.value;
				}
				if (filter.op === 'lte' && !ctx.dateTo) {
					ctx.dateTo = filter.value;
				}
			});

			if (!filters.some(function (filter) {
				return filter.entity === 'case' && filter.field === 'status';
			})) {
				ctx.caseStatus = '';
			}

			return ctx;
		},

		eventOptions: function () {
			if (!RM.ReportEngine || !RM.ReportEngine.localizedEvents) { return []; }
			return RM.ReportEngine.localizedEvents();
		},

		riskOptions: function () {
			return ['High', 'Medium', 'Moderate', 'Low', 'Unknown'];
		},

		caseStatusOptions: function () {
			return ['active', 'closed'];
		}
	};
})();
