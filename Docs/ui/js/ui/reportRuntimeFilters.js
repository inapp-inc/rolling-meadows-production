/* global RM */
(function () {
	'use strict';

	var PAGE_PARAMETERS = [
		{
			id: 'param-page-period',
			labelKey: 'pages.reports.filterPeriod',
			type: 'relativePeriod',
			entity: 'client',
			field: 'registeredAt',
			defaultPreset: 'all'
		},
		{
			id: 'param-page-program',
			labelKey: 'pages.reports.filterProgram',
			type: 'program',
			entity: 'case',
			field: 'programId'
		},
		{
			id: 'param-page-status',
			labelKey: 'pages.reports.filterCaseStatus',
			type: 'caseStatus',
			entity: 'case',
			field: 'status',
			defaultValue: 'active'
		},
		{
			id: 'param-page-event',
			labelKey: 'pages.reports.filterEvent',
			type: 'event',
			entity: 'serviceEnrollment',
			field: 'serviceOrEventId'
		}
	];

	function t(key, params) {
		return RM.I18n ? RM.I18n.t(key, params) : key;
	}

	function paramLabel(param) {
		return param.label || (param.labelKey ? t(param.labelKey) : '');
	}

	function renderParameterControl(param, value) {
		if (!RM.ReportBuilderParams) { return ''; }

		if (param.type === 'relativePeriod') {
			value = value || { preset: 'all', from: '', to: '' };
			var presets = ['all', 'last7', 'last30', 'last90', 'mtd', 'ytd', 'custom'];
			var presetHtml = '<select class="rb-param-input" data-param-input="preset">' +
				presets.map(function (preset) {
					return '<option value="' + preset + '"' + (value.preset === preset ? ' selected' : '') + '>' +
						RM.Components.escapeHtml(t('pages.reportBuilder.periodPresets.' + preset)) + '</option>';
				}).join('') + '</select>';
			var customHtml = value.preset === 'custom'
				? '<span class="rb-param-date-range">' +
					'<input type="date" class="rb-param-input" data-param-input="from" value="' + RM.Components.escapeHtml(value.from || '') + '">' +
					'<span class="rb-param-date-sep">–</span>' +
					'<input type="date" class="rb-param-input" data-param-input="to" value="' + RM.Components.escapeHtml(value.to || '') + '">' +
					'</span>'
				: '';
			return presetHtml + customHtml;
		}

		if (param.type === 'program') {
			return '<select class="rb-param-input" data-param-input="value">' +
				'<option value="">' + RM.Components.escapeHtml(t('pages.reportBuilder.paramAllPrograms')) + '</option>' +
				RM.ReportBuilderParams.PROGRAM_IDS.map(function (programId) {
					return '<option value="' + programId + '"' + (value === programId ? ' selected' : '') + '>' +
						RM.Components.escapeHtml(RM.I18n.programLabel(programId)) + '</option>';
				}).join('') + '</select>';
		}

		if (param.type === 'caseStatus') {
			return '<select class="rb-param-input" data-param-input="value">' +
				'<option value="">' + RM.Components.escapeHtml(t('pages.reportBuilder.paramAllStatuses')) + '</option>' +
				RM.ReportBuilderParams.caseStatusOptions().map(function (status) {
					return '<option value="' + status + '"' + (value === status ? ' selected' : '') + '>' +
						RM.Components.escapeHtml(t('pages.reportBuilder.caseStatus.' + status)) + '</option>';
				}).join('') + '</select>';
		}

		if (param.type === 'event') {
			return '<select class="rb-param-input" data-param-input="value">' +
				'<option value="">' + RM.Components.escapeHtml(t('pages.reportBuilder.paramAllEvents')) + '</option>' +
				RM.ReportBuilderParams.eventOptions().map(function (event) {
					return '<option value="' + event.id + '"' + (value === event.id ? ' selected' : '') + '>' +
						RM.Components.escapeHtml(event.name) + '</option>';
				}).join('') + '</select>';
		}

		return '';
	}

	function readParameterValuesFromDom(container, parameters, existing) {
		var values = Object.assign({}, existing || {});
		(parameters || []).forEach(function (param) {
			var row = container.querySelector('.rb-parameter-control[data-param-id="' + param.id + '"]');
			if (!row) { return; }
			if (param.type === 'relativePeriod') {
				var presetEl = row.querySelector('[data-param-input="preset"]');
				values[param.id] = {
					preset: presetEl ? presetEl.value : 'all',
					from: (row.querySelector('[data-param-input="from"]') || {}).value || '',
					to: (row.querySelector('[data-param-input="to"]') || {}).value || ''
				};
				return;
			}
			var input = row.querySelector('[data-param-input="value"]');
			values[param.id] = input ? input.value : '';
		});
		return values;
	}

	RM.ReportRuntimeFilters = {
		PAGE_PARAMETERS: PAGE_PARAMETERS,

		pageParameters: function () {
			return PAGE_PARAMETERS.map(function (param) {
				return Object.assign({}, param, { label: paramLabel(param) });
			});
		},

		initValues: function (existing) {
			return RM.ReportBuilderParams
				? RM.ReportBuilderParams.initParameterValues(PAGE_PARAMETERS, existing)
				: {};
		},

		renderBar: function (values, options) {
			options = options || {};
			values = values || this.initValues();
			var barId = options.id || 'reports-filter-bar';
			var titleKey = options.titleKey || 'pages.reports.runtimeFilters';
			var extraClass = options.extraClass || 'report-page-filters';
			var controls = PAGE_PARAMETERS.map(function (param) {
				return '<div class="rb-parameter-control" data-param-id="' + RM.Components.escapeHtml(param.id) + '">' +
					'<label class="rb-parameter-label">' + RM.Components.escapeHtml(paramLabel(param)) + '</label>' +
					renderParameterControl(param, values[param.id]) + '</div>';
			}).join('');
			return '<div id="' + RM.Components.escapeHtml(barId) + '" class="rb-parameter-bar ' + extraClass + '">' +
				'<p class="rb-parameter-bar-title">' + RM.Components.escapeHtml(t(titleKey)) + '</p>' +
				controls + '</div>';
		},

		readValues: function (container) {
			container = container || document.getElementById('reports-filter-bar');
			if (!container) { return this.initValues(); }
			return readParameterValuesFromDom(container, PAGE_PARAMETERS, this.initValues());
		},

		toEngineContext: function (parameterValues) {
			if (!RM.ReportBuilderParams) { return {}; }
			return RM.ReportBuilderParams.pageContextFromValues(PAGE_PARAMETERS, parameterValues);
		},

		wire: function (container, onChange) {
			if (!container) { return; }
			container.addEventListener('change', function (e) {
				if (!e.target.closest('.rb-parameter-control')) { return; }
				if (e.target.matches('[data-param-input="preset"]')) {
					onChange(true);
					return;
				}
				onChange(false);
			});
			container.addEventListener('input', function (e) {
				if (e.target.closest('.rb-parameter-control')) {
					onChange(false);
				}
			});
		}
	};
})();
