/* global RM */
(function () {
	'use strict';

	var CHART_COLORS = ['#2563eb', '#059669', '#7c3aed', '#db2777', '#d97706', '#0891b2', '#64748b', '#dc2626'];

	function t(key, params) {
		return RM.I18n ? RM.I18n.t(key, params) : key;
	}

	function truncateLabel(label, maxLen) {
		label = String(label == null ? '' : label);
		return label.length > maxLen ? label.slice(0, maxLen - 1) + '…' : label;
	}

	function defaultColumnsForEntity(entityId) {
		return RM.ReportDataModel.builderFieldRefs({ reportableOnly: true })
			.filter(function (ref) { return ref.entity === entityId; })
			.slice(0, 4)
			.map(function (ref) {
				return { entity: ref.entity, field: ref.field };
			});
	}

	function prepareConfig(reportConfig, pageFilterValues) {
		var config = Object.assign({}, reportConfig);
		config.parameters = RM.ReportRuntimeFilters ? RM.ReportRuntimeFilters.PAGE_PARAMETERS : [];
		if (RM.ReportBuilderParams) {
			config = RM.ReportBuilderParams.applyToConfig(config, pageFilterValues);
		}
		if (RM.ReportDataModel && RM.ReportDataModel.syncJoinsFromReportConfig) {
			var synced = RM.ReportDataModel.syncJoinsFromReportConfig(config);
			config = Object.assign({}, config, synced);
		}
		return config;
	}

	function renderTablePreview(container, result) {
		if (!container) { return; }
		if (!result || !result.rows.length) {
			container.innerHTML = RM.Components.emptyState(t('pages.reportBuilder.noPreview'), t('pages.reportBuilder.noPreviewHint'));
			return;
		}
		container.innerHTML = '<div class="rb-table-wrap"><table class="data-table"><thead><tr>' +
			result.columns.map(function (col) {
				return '<th>' + RM.Components.escapeHtml(col.label) + '</th>';
			}).join('') + '</tr></thead><tbody>' +
			result.rows.map(function (row) {
				return '<tr>' + result.columns.map(function (col) {
					return '<td>' + RM.Components.escapeHtml(row[col.key] == null ? '' : String(row[col.key])) + '</td>';
				}).join('') + '</tr>';
			}).join('') + '</tbody></table></div>';
	}

	function renderRadialChartPreview(result) {
		var total = result.points.reduce(function (sum, p) { return sum + p.value; }, 0) || 1;
		var offset = 0;
		var segments = result.points.map(function (point, index) {
			var pct = (point.value / total) * 100;
			var color = point.color || CHART_COLORS[index % CHART_COLORS.length];
			var seg = color + ' ' + offset + '% ' + (offset + pct) + '%';
			offset += pct;
			return seg;
		}).join(', ');

		var legend = result.points.map(function (point, index) {
			var pct = Math.round((point.value / total) * 100);
			return '<li><span class="rb-legend-swatch" style="background:' +
				(point.color || CHART_COLORS[index % CHART_COLORS.length]) + '"></span>' +
				RM.Components.escapeHtml(point.label) + ' — ' + point.value +
				' <span class="rb-legend-pct">(' + pct + '%)</span></li>';
		}).join('');

		return '<div class="rb-chart-preview-head">' +
			'<strong>' + RM.Components.escapeHtml(result.yLabel) + '</strong>' +
			'<span class="text-muted">' + RM.Components.escapeHtml(t('pages.reportBuilder.by')) + ' ' +
			RM.Components.escapeHtml(result.xLabel) + '</span></div>' +
			'<div class="rb-radial-wrap is-donut">' +
			'<div class="rb-donut" style="background:conic-gradient(' + segments + ')">' +
			'<div class="rb-donut-hole"><span class="rb-donut-total">' + total + '</span></div></div>' +
			'<ul class="rb-radial-legend">' + legend + '</ul></div>';
	}

	function renderLineChartPreview(result) {
		var points = result.points || [];
		var width = 520;
		var height = 240;
		var pad = { top: 18, right: 20, bottom: 52, left: 52 };
		var plotW = width - pad.left - pad.right;
		var plotH = height - pad.top - pad.bottom;
		var max = Math.max.apply(null, points.map(function (p) { return p.value; }).concat([1]));
		var color = '#2563eb';

		function xAt(index) {
			if (points.length === 1) { return pad.left + plotW / 2; }
			return pad.left + (index / (points.length - 1)) * plotW;
		}

		function yAt(value) {
			return pad.top + plotH - (value / max) * plotH;
		}

		var coords = points.map(function (point, index) {
			return { x: xAt(index), y: yAt(point.value), point: point };
		});

		var polyline = coords.map(function (coord) {
			return coord.x.toFixed(1) + ',' + coord.y.toFixed(1);
		}).join(' ');

		var gridLines = [0, 0.25, 0.5, 0.75, 1].map(function (tick) {
			var y = pad.top + plotH * (1 - tick);
			var value = Math.round(max * tick);
			return '<line class="rb-line-grid" x1="' + pad.left + '" y1="' + y.toFixed(1) +
				'" x2="' + (width - pad.right) + '" y2="' + y.toFixed(1) + '"></line>' +
				'<text class="rb-line-axis-label" x="' + (pad.left - 8) + '" y="' + (y + 4).toFixed(1) +
				'" text-anchor="end">' + value + '</text>';
		}).join('');

		var dots = coords.map(function (coord) {
			return '<circle class="rb-line-dot" cx="' + coord.x.toFixed(1) + '" cy="' + coord.y.toFixed(1) +
				'" r="4.5" fill="' + color + '" stroke="#fff" stroke-width="2">' +
				'<title>' + RM.Components.escapeHtml(coord.point.label + ': ' + coord.point.value) + '</title></circle>' +
				'<text class="rb-line-x-label" x="' + coord.x.toFixed(1) + '" y="' + (height - 18) +
				'" text-anchor="middle">' + RM.Components.escapeHtml(truncateLabel(coord.point.label, 12)) + '</text>' +
				'<text class="rb-line-value-label" x="' + coord.x.toFixed(1) + '" y="' + (coord.y - 10).toFixed(1) +
				'" text-anchor="middle">' + coord.point.value + '</text>';
		}).join('');

		return '<div class="rb-chart-preview-head">' +
			'<strong>' + RM.Components.escapeHtml(result.yLabel) + '</strong>' +
			'<span class="text-muted">' + RM.Components.escapeHtml(t('pages.reportBuilder.by')) + ' ' +
			RM.Components.escapeHtml(result.xLabel) + '</span></div>' +
			'<div class="rb-line-chart-wrap">' +
			'<svg class="rb-line-chart" viewBox="0 0 ' + width + ' ' + height + '" role="img" aria-label="' +
			RM.Components.escapeHtml(result.yLabel + ' by ' + result.xLabel) + '">' +
			gridLines +
			'<polyline class="rb-line-path" fill="none" stroke="' + color + '" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" points="' +
			polyline + '"></polyline>' +
			dots +
			'</svg></div>';
	}

	function renderChartPreview(container, result, visualId) {
		visualId = visualId || 'rb-chart-preview-visual';
		if (!container) { return; }
		if (!result || result.error === 'missing_x') {
			container.innerHTML = RM.Components.emptyState(
				t('pages.reportBuilder.noChartPreview'),
				t('pages.reportBuilder.noChartPreviewHint')
			);
			return;
		}

		var rowCount = result.meta ? result.meta.rowCount : 0;
		if (!result.points || !result.points.length) {
			container.innerHTML = RM.Components.emptyState(
				t('pages.reportBuilder.noChartData'),
				t('pages.reportBuilder.noChartDataHint', { rows: rowCount })
			);
			return;
		}

		var valueTotal = result.points.reduce(function (sum, point) { return sum + point.value; }, 0);
		if (valueTotal === 0) {
			container.innerHTML = RM.Components.emptyState(
				t('pages.reportBuilder.noChartValues'),
				t('pages.reportBuilder.noChartValuesHint', { groups: result.points.length })
			);
			return;
		}

		var max = Math.max.apply(null, result.points.map(function (p) { return p.value; }).concat([1]));

		if (result.chartType === 'donut') {
			container.innerHTML = '<div id="' + RM.Components.escapeHtml(visualId) + '">' + renderRadialChartPreview(result) + '</div>';
			return;
		}

		if (result.chartType === 'line') {
			container.innerHTML = '<div id="' + RM.Components.escapeHtml(visualId) + '">' + renderLineChartPreview(result) + '</div>';
			return;
		}

		var bars = result.points.map(function (point, index) {
			var pct = Math.round((point.value / max) * 100);
			var color = point.color || CHART_COLORS[index % CHART_COLORS.length];
			return '<div class="rb-chart-bar-row">' +
				'<div class="rb-chart-bar-label">' + RM.Components.escapeHtml(point.label) + '</div>' +
				'<div class="rb-chart-bar-track"><div class="rb-chart-bar-fill" style="width:' + Math.max(pct, 2) +
				'%;background:' + color + '"></div></div>' +
				'<div class="rb-chart-bar-value">' + point.value + '</div></div>';
		}).join('');

		container.innerHTML = '<div id="' + RM.Components.escapeHtml(visualId) + '"><div class="rb-chart-preview-head">' +
			'<strong>' + RM.Components.escapeHtml(result.yLabel) + '</strong>' +
			'<span class="text-muted">' + RM.Components.escapeHtml(t('pages.reportBuilder.by')) + ' ' +
			RM.Components.escapeHtml(result.xLabel) + '</span></div>' +
			'<div class="rb-chart-bars">' +
			bars + '</div></div>';
	}

	function updateMeta(config, result, metaEl) {
		if (!metaEl || !result) { return; }
		var grainLabel = RM.ReportDataModel.label(config.primaryEntity || 'client');
		if (config.reportType === 'chart') {
			metaEl.textContent = t('pages.reportBuilder.chartMetaWithGrain', {
				groups: result.points ? result.points.length : 0,
				rows: result.meta ? result.meta.rowCount : 0,
				grain: grainLabel
			});
			return;
		}
		metaEl.textContent = t('pages.reportBuilder.rowCountWithGrain', {
			count: result.rows ? result.rows.length : 0,
			grain: grainLabel
		});
	}

	function runPreview(reportConfig, pageFilterValues, root, options) {
		options = options || {};
		var user = RM.Session.getCurrentUser();
		var config = prepareConfig(reportConfig, pageFilterValues);
		var container = options.container || (root && root.querySelector('#rb-preview'));
		var metaEl = options.metaEl || (root && root.querySelector('#rb-preview-meta'));
		var visualId = options.visualId || 'rb-chart-preview-visual';
		var result;

		if (config.reportType === 'chart') {
			result = RM.ReportBuilderEngine.runChart(config, user, pageFilterValues);
			renderChartPreview(container, result, visualId);
		} else {
			if (!config.columns || !config.columns.length) {
				config.columns = defaultColumnsForEntity(config.primaryEntity || 'client');
			}
			result = RM.ReportBuilderEngine.run(config, user, pageFilterValues);
			renderTablePreview(container, result);
		}
		updateMeta(config, result, metaEl);
		return result;
	}

	function exportResult(reportConfig, result, visualId) {
		if (!reportConfig) { return; }
		var name = reportConfig.name || 'custom-report';
		if (reportConfig.reportType === 'chart') {
			if (!result || !result.points || !result.points.length) {
				RM.Components.showToast(t('pages.reportBuilder.noDataExport'), 'warning');
				return;
			}
			var chartRows = result.points.map(function (point) {
				return { label: point.label, value: point.value };
			});
			RM.Components.exportXlsx(
				name + '.xlsx',
				chartRows,
				[
					{ key: 'label', label: result.xLabel },
					{ key: 'value', label: result.yLabel }
				],
				{ title: name, sheetName: t('pages.reportBuilder.sheetName') }
			);
			if (visualId) {
				var visualEl = document.getElementById(visualId);
				if (visualEl) {
					RM.Components.exportElementAsPng(visualEl, name + '.png');
				}
			}
			return;
		}
		if (!result || !result.rows || !result.rows.length) {
			RM.Components.showToast(t('pages.reportBuilder.noDataExport'), 'warning');
			return;
		}
		RM.Components.exportXlsx(
			name + '.xlsx',
			result.rows,
			result.columns.map(function (col) { return { key: col.key, label: col.label }; }),
			{ title: name, sheetName: t('pages.reportBuilder.sheetName') }
		);
	}

	function domIdForReport(reportId) {
		return 'cr-' + String(reportId || 'report').replace(/[^a-zA-Z0-9_-]/g, '-');
	}

	function renderFilterBar(pageFilterValues) {
		if (!RM.ReportRuntimeFilters) { return ''; }
		return RM.ReportRuntimeFilters.renderBar(pageFilterValues, {
			id: 'rb-preview-filter-bar',
			titleKey: 'pages.reports.runtimeFilters',
			extraClass: 'rb-preview-filters'
		});
	}

	function renderModalBody(pageFilterValues, editUrl) {
		var editBtn = editUrl
			? '<a href="' + RM.Components.escapeHtml(editUrl) + '" class="btn btn-secondary btn-sm rb-preview-edit-link">' +
				RM.Components.escapeHtml(t('pages.customReports.edit')) + '</a>'
			: '';
		return renderFilterBar(pageFilterValues) +
			'<div class="rb-preview-modal-head">' +
			'<span id="rb-preview-meta" class="report-builder-row-count"></span>' +
			editBtn +
			'</div>' +
			'<div id="rb-preview" class="rb-preview-body"></div>';
	}

	function wireFilterBar(root, reportConfig, pageFilterValues, editUrl) {
		if (!RM.ReportRuntimeFilters) { return pageFilterValues; }
		var previewBar = root.querySelector('#rb-preview-filter-bar');
		if (!previewBar) { return pageFilterValues; }
		RM.ReportRuntimeFilters.wire(previewBar, function (needsRebuild) {
			pageFilterValues = RM.ReportRuntimeFilters.readValues(previewBar);
			if (needsRebuild) {
				var body = root.querySelector('.modal-body') || root;
				body.innerHTML = renderModalBody(pageFilterValues, editUrl);
				wireFilterBar(root, reportConfig, pageFilterValues, editUrl);
				runPreview(reportConfig, pageFilterValues, root);
				return;
			}
			runPreview(reportConfig, pageFilterValues, root);
		});
		return pageFilterValues;
	}

	RM.ReportBuilderPreview = {
		openModal: function (reportConfig, options) {
			options = options || {};
			if (!reportConfig) { return; }

			var pageFilterValues = RM.ReportRuntimeFilters
				? RM.ReportRuntimeFilters.initValues(options.filterValues)
				: {};
			var title = options.title || reportConfig.name || t('pages.reportBuilder.preview');
			var editUrl = options.editUrl || ('report-builder.html?id=' + encodeURIComponent(reportConfig.id || ''));

			RM.Components.openModal(
				title,
				renderModalBody(pageFilterValues, options.showEditLink === false ? '' : editUrl),
				options.onClose || null,
				{ wide: true, modalClass: 'rb-preview-modal' }
			);

			var modal = RM.Components._activeModal;
			if (!modal || !modal.overlay) { return; }
			var root = modal.overlay;
			pageFilterValues = wireFilterBar(root, reportConfig, pageFilterValues, options.showEditLink === false ? '' : editUrl);
			runPreview(reportConfig, pageFilterValues, root);
		},

		runPreview: runPreview,
		exportResult: exportResult,
		domIdForReport: domIdForReport,
		renderTablePreview: renderTablePreview,
		renderChartPreview: renderChartPreview
	};
})();
