/* global RM */
(function () {
	'use strict';

	var storeListenerBound = false;
	var pageFilterValues = null;
	var reportResults = {};

	function t(key, params) {
		return RM.I18n.t(key, params);
	}

	function domIdForReport(reportId) {
		return RM.ReportBuilderPreview
			? RM.ReportBuilderPreview.domIdForReport(reportId)
			: 'cr-' + String(reportId || 'report').replace(/[^a-zA-Z0-9_-]/g, '-');
	}

	function renderPageFilterBar() {
		if (!RM.ReportRuntimeFilters) { return ''; }
		pageFilterValues = RM.ReportRuntimeFilters.initValues(pageFilterValues);
		return RM.ReportRuntimeFilters.renderBar(pageFilterValues);
	}

	function wirePageFilterBar(onChange) {
		var bar = document.getElementById('reports-filter-bar');
		if (!bar || !RM.ReportRuntimeFilters) { return; }
		RM.ReportRuntimeFilters.wire(bar, function (needsRebuild) {
			pageFilterValues = RM.ReportRuntimeFilters.readValues(bar);
			onChange(needsRebuild);
		});
	}

	function reportCardTitle(report) {
		var editUrl = 'report-builder.html?id=' + encodeURIComponent(report.id);
		return '<a href="' + RM.Components.escapeHtml(editUrl) + '" class="report-card-title-link" title="' +
			RM.Components.escapeHtml(t('pages.reports.editInBuilderHint')) + '">' +
			RM.Components.escapeHtml(report.name) + '</a>';
	}

	function reportCardActions(report) {
		var slug = domIdForReport(report.id);
		var editUrl = 'report-builder.html?id=' + encodeURIComponent(report.id);
		var isChart = report.reportType === 'chart';
		var editBtn = '<a href="' + RM.Components.escapeHtml(editUrl) +
			'" class="btn btn-secondary btn-sm report-card-btn report-edit-btn" title="' +
			RM.Components.escapeHtml(t('pages.reports.editInBuilderHint')) + '">' +
			RM.Components.escapeHtml(t('pages.reports.editInBuilder')) + '</a>';
		var subscribeBtn = RM.ReportSubscribe
			? RM.ReportSubscribe.subscribeButtonHtml(report.id, 'custom', report.name)
			: '';
		var downloadBar = RM.Components.downloadBar({
			imageTarget: isChart ? slug + '-chart-visual' : null,
			csvId: slug + '-export'
		});
		return '<div class="report-card-actions">' + editBtn + subscribeBtn + (downloadBar || '') + '</div>';
	}

	function customReportCard(report) {
		var slug = domIdForReport(report.id);
		return '<div class="card report-editable-card is-editable" id="' + RM.Components.escapeHtml(slug) +
			'" data-custom-report-id="' + RM.Components.escapeHtml(report.id) + '">' +
			'<div class="card-header"><h2>' + reportCardTitle(report) + '</h2>' +
			reportCardActions(report) +
			'</div>' +
			'<p id="' + RM.Components.escapeHtml(slug) + '-meta" class="text-muted report-card-lead"></p>' +
			'<div id="' + RM.Components.escapeHtml(slug) + '-body" class="rb-preview-body"></div></div>';
	}

	function mountReport(report) {
		if (!RM.ReportBuilderPreview) { return null; }
		var slug = domIdForReport(report.id);
		var body = document.getElementById(slug + '-body');
		var meta = document.getElementById(slug + '-meta');
		if (!body) { return null; }
		var result = RM.ReportBuilderPreview.runPreview(report, pageFilterValues, null, {
			container: body,
			metaEl: meta,
			visualId: slug + '-chart-visual'
		});
		reportResults[report.id] = result;
		return result;
	}

	function mountAllReports(reports) {
		reportResults = {};
		reports.forEach(mountReport);
	}

	function buildDownloadHandlers(reports) {
		var handlers = { images: {}, csv: {} };
		reports.forEach(function (report) {
			var slug = domIdForReport(report.id);
			if (report.reportType === 'chart') {
				handlers.images[slug + '-chart-visual'] = (function (reportId, visualId, reportName) {
					return function () {
						var visualEl = document.getElementById(visualId);
						if (visualEl) {
							RM.Components.exportElementAsPng(visualEl, reportName + '.png');
						}
					};
				})(report.id, slug + '-chart-visual', report.name);
			}
			handlers.csv[slug + '-export'] = (function (reportRef) {
				return function () {
					RM.ReportBuilderPreview.exportResult(
						reportRef,
						reportResults[reportRef.id]
					);
				};
			})(report);
		});
		return handlers;
	}

	function focusReportFromUrl() {
		var params = new URLSearchParams(window.location.search);
		var reportId = params.get('id');
		if (!reportId) { return; }
		var card = document.querySelector('[data-custom-report-id="' + reportId + '"]');
		if (card) {
			card.scrollIntoView({ behavior: 'smooth', block: 'start' });
			card.classList.add('custom-report-card-focus');
			setTimeout(function () { card.classList.remove('custom-report-card-focus'); }, 2000);
			return;
		}
		RM.Components.showToast(t('pages.customReports.notFound'), 'warning');
	}

	function renderPage() {
		if (document.getElementById('reports-filter-bar') && RM.ReportRuntimeFilters) {
			pageFilterValues = RM.ReportRuntimeFilters.readValues();
		}

		var user = RM.Session.getCurrentUser();
		var reports = RM.CustomReportRepository.findByOwner(user ? user.id : null);
		var main = document.getElementById('page-content');

		var cardsHtml = reports.map(customReportCard).join('');
		var bodyHtml = '<div class="report-tier-page">' +
			'<p class="text-muted report-tier-lead">' + RM.Components.escapeHtml(t('pages.customReports.lead')) + '</p>' +
			'<div class="custom-reports-toolbar">' +
			'<a href="report-builder.html" class="btn btn-primary custom-reports-create">' +
			RM.Components.icon('plus') + ' ' + RM.Components.escapeHtml(t('pages.customReports.createNew')) +
			'</a></div>' +
			(reports.length
				? cardsHtml
				: RM.Components.emptyState(t('pages.customReports.empty'), t('pages.customReports.emptyHint'))) +
			'</div>';

		main.innerHTML = RM.Components.modulePageHeader('custom-reports') +
			renderPageFilterBar() + bodyHtml;

		if (reports.length) {
			mountAllReports(reports);
			RM.Components.wireDownloadActions(main, buildDownloadHandlers(reports));
		}

		if (RM.ReportSubscribe) { RM.ReportSubscribe.wire(main); }

		wirePageFilterBar(function () {
			renderPage();
		});

		focusReportFromUrl();
	}

	document.addEventListener('DOMContentLoaded', function () {
		RM.Boot.init({
			activeModule: 'analytics',
			activeNav: 'custom-reports',
			onReady: function () {
				if (RM.Permissions.isAuditor() || RM.Permissions.isLiaison()) {
					window.location.href = 'reports.html';
					return;
				}
				renderPage();
				if (!storeListenerBound) {
					document.addEventListener('rm:store-changed', renderPage);
					storeListenerBound = true;
				}
			}
		});
	});
})();
