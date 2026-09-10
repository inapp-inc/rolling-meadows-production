/* global RM */
(function () {
	'use strict';

	function mergeDownloadHandlers(base, extra) {
		extra = extra || {};
		return {
			images: Object.assign({}, base.images || {}, extra.images || {}),
			csv: Object.assign({}, base.csv || {}, extra.csv || {})
		};
	}

	function t(key, params) {
		return RM.I18n.t(key, params);
	}

	var storeListenerBound = false;
	var pageFilterValues = null;

	var REPORT_TIERS = ['executive', 'operational', 'integrity', 'caseload'];

	function currentReportTier() {
		var params = new URLSearchParams(window.location.search);
		var tier = params.get('tier');
		if (REPORT_TIERS.indexOf(tier) !== -1) { return tier; }
		return 'caseload';
	}

	function activeNavIdForPage() {
		if (RM.Permissions.isAuditor()) { return 'reports-integrity'; }
		return 'reports-' + currentReportTier();
	}

	function applyPageFilters(existingValues) {
		if (RM.ReportRuntimeFilters) {
			var bar = document.getElementById('reports-filter-bar');
			pageFilterValues = bar
				? RM.ReportRuntimeFilters.readValues(bar)
				: RM.ReportRuntimeFilters.initValues(existingValues || pageFilterValues);
			RM.ReportEngine.setFilterContext(RM.ReportRuntimeFilters.toEngineContext(pageFilterValues));
			return;
		}
		RM.ReportEngine.setFilterContext(null);
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

	function riskDrilldownColumns() {
		return [
			{ key: 'clientName', label: t('pages.reports.client') },
			{ key: 'dob', label: t('pages.reports.dob') },
			{ key: 'phone', label: t('pages.reports.phone') },
			{ key: 'riskLevel', label: t('pages.reports.riskLevel') },
			{ key: 'compositeScore', label: t('pages.reports.compositeScore') },
			{ key: 'processStage', label: t('pages.reports.processStage') },
			{ key: 'caseManager', label: t('pages.reports.caseManager') },
			{ key: 'intakeStatus', label: t('pages.reports.intakeStatus') }
		];
	}

	function enrollmentColumns() {
		return [
			{ key: 'clientName', label: t('pages.reports.client') },
			{ key: 'dateEnrolled', label: t('pages.reports.dateEnrolled') },
			{ key: 'eventName', label: t('pages.reports.event') }
		];
	}

	function overdueColumns() {
		return [
			{ key: 'clientName', label: t('pages.reports.client') },
			{ key: 'riskLevel', label: t('pages.reports.risk') },
			{ key: 'cadence', label: t('pages.reports.cadence') },
			{ key: 'daysOverdue', label: t('pages.reports.daysOverdue') }
		];
	}

	function cboColumns() {
		return [
			{ key: 'clientName', label: t('pages.reports.client') },
			{ key: 'cboName', label: t('pages.reports.cbo') },
			{ key: 'status', label: t('pages.reports.status') },
			{ key: 'date', label: t('pages.reports.date') }
		];
	}

	function programColumns() {
		return [
			{ key: 'clientName', label: t('pages.reports.client') },
			{ key: 'dob', label: t('pages.reports.dob') },
			{ key: 'phone', label: t('pages.reports.phone') },
			{ key: 'program', label: t('pages.reports.program') },
			{ key: 'openCases', label: t('pages.reports.openCases') },
			{ key: 'registeredAt', label: t('pages.reports.registeredAt') }
		];
	}

	function reportCardTitle(titleText, catalogId) {
		if (catalogId && RM.ReportCatalog) {
			return '<a href="' + RM.Components.escapeHtml(RM.ReportCatalog.builderUrl(catalogId)) +
				'" class="report-card-title-link" title="' +
				RM.Components.escapeHtml(t('pages.reports.editInBuilderHint')) + '">' +
				RM.Components.escapeHtml(titleText) + '</a>';
		}
		return RM.Components.escapeHtml(titleText);
	}

	function programReportCard(chartId, csvId, catalogId) {
		return '<div class="card report-editable-card' + (catalogId ? ' is-editable' : '') +
			'" data-report-template="' + RM.Components.escapeHtml(catalogId || '') + '">' +
			'<div class="card-header"><h2>' + reportCardTitle(t('pages.reports.clientsByProgram'), catalogId) + '</h2>' +
			reportCardActions(catalogId, RM.Components.downloadBar({ imageTarget: chartId, csvId: csvId }),
				t('pages.reports.clientsByProgram')) +
			'</div><p class="text-muted report-card-lead">' + RM.Components.escapeHtml(t('pages.reports.clientsByProgramHint')) + '</p>' +
			'<div id="' + chartId + '" class="risk-chart program-chart"></div></div>';
	}

	function renderProgramDistributionChart(containerId, rows, groups) {
		var el = document.getElementById(containerId);
		if (!el) { return; }
		if (!rows.length) {
			el.innerHTML = RM.Components.emptyState(t('pages.reports.noProgramData'), t('pages.reports.noProgramDataHint'));
			return;
		}
		var total = rows.reduce(function (sum, row) { return sum + row.count; }, 0);
		el.innerHTML = rows.map(function (row) {
			var pct = total ? Math.round((row.count / total) * 100) : 0;
			var fillWidth = row.count > 0 ? Math.max(pct, 1) : 0;
			return '<div class="risk-chart-row program-chart-row" data-program-id="' + RM.Components.escapeHtml(row.programId) + '" role="button" tabindex="0" aria-label="' +
				RM.Components.escapeHtml(t('pages.reports.programDrilldownAria', { count: row.count, program: row.programLabel })) + '">' +
				'<div class="risk-chart-label">' + RM.Components.escapeHtml(row.programLabel) + '</div>' +
				'<div class="risk-chart-track"><div class="risk-chart-fill" style="width:' + fillWidth + '%;background:' +
				RM.Components.escapeHtml(row.color) + '"></div></div>' +
				'<div class="risk-chart-count">' + row.count + '</div></div>';
		}).join('');

		el.querySelectorAll('.program-chart-row').forEach(function (row) {
			function activate() {
				var programId = row.getAttribute('data-program-id');
				var programRow = rows.find(function (item) { return item.programId === programId; });
				openProgramDrawer(programRow, groups[programId] || [], el);
				el.querySelectorAll('.program-chart-row').forEach(function (item) { item.classList.remove('active'); });
				row.classList.add('active');
			}
			row.addEventListener('click', activate);
			row.addEventListener('keydown', function (e) {
				if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); }
			});
		});
	}

	function openProgramDrawer(programRow, clients, chartEl) {
		if (!programRow) { return; }
		var title = clients.length === 1
			? t('pages.reports.programDrawerTitle', { program: programRow.programLabel, count: clients.length })
			: t('pages.reports.programDrawerTitlePlural', { program: programRow.programLabel, count: clients.length });
		var table = chartEl;
		RM.Components.openSideDrawer(title, RM.Components.clientChipList(clients), function () {
			if (table) {
				table.querySelectorAll('.program-chart-row').forEach(function (row) { row.classList.remove('active'); });
			}
		});
	}

	function multiProgramColumns() {
		return [
			{ key: 'clientName', label: t('pages.reports.client') },
			{ key: 'dob', label: t('pages.reports.dob') },
			{ key: 'phone', label: t('pages.reports.phone') },
			{ key: 'programCount', label: t('pages.reports.programCount') },
			{ key: 'programs', label: t('pages.reports.programs') },
			{ key: 'openCases', label: t('pages.reports.openCases') }
		];
	}

	function multiProgramReportCard(prefix, catalogId) {
		return '<div class="card report-editable-card' + (catalogId ? ' is-editable' : '') +
			'" data-report-template="' + RM.Components.escapeHtml(catalogId || '') + '">' +
			'<div class="card-header"><h2>' + reportCardTitle(t('pages.reports.multiProgramEnrollment'), catalogId) + '</h2>' +
			reportCardActions(catalogId, RM.Components.downloadBar({
				imageTarget: prefix + '-multi-program-chart',
				csvId: prefix + '-multi-program'
			}), t('pages.reports.multiProgramEnrollment')) +
			'</div><p class="text-muted report-card-lead">' + RM.Components.escapeHtml(t('pages.reports.multiProgramEnrollmentHint')) + '</p>' +
			'<p id="' + prefix + '-multi-program-summary" class="liaison-results-summary"></p>' +
			'<div id="' + prefix + '-multi-program-chart" class="risk-chart program-chart"></div>' +
			'<div id="' + prefix + '-multi-program-table"></div></div>';
	}

	function reportCardActions(catalogId, downloadBarHtml, reportTitle) {
		var editBtn = catalogId && RM.ReportCatalog
			? '<a href="' + RM.Components.escapeHtml(RM.ReportCatalog.builderUrl(catalogId)) +
				'" class="btn btn-secondary btn-sm report-card-btn report-edit-btn" title="' +
				RM.Components.escapeHtml(t('pages.reports.editInBuilderHint')) + '">' +
				RM.Components.escapeHtml(t('pages.reports.editInBuilder')) + '</a>'
			: '';
		var subscribeBtn = catalogId && RM.ReportSubscribe
			? RM.ReportSubscribe.subscribeButtonHtml(catalogId, 'catalog', reportTitle || catalogId)
			: '';
		return '<div class="report-card-actions">' + editBtn + subscribeBtn + (downloadBarHtml || '') + '</div>';
	}

	function editableReportCard(titleKey, catalogId, bodyHtml, downloadBarHtml) {
		return '<div class="card report-editable-card' + (catalogId ? ' is-editable' : '') +
			'" data-report-template="' + RM.Components.escapeHtml(catalogId || '') + '">' +
			'<div class="card-header"><h2>' + reportCardTitle(t(titleKey), catalogId) + '</h2>' +
			reportCardActions(catalogId, downloadBarHtml, t(titleKey)) +
			'</div>' + bodyHtml + '</div>';
	}

	function renderMultiProgramSummary(summaryId, count) {
		var el = document.getElementById(summaryId);
		if (!el) { return; }
		el.innerHTML = count === 1
			? t('pages.reports.multiProgramSummary', { count: count })
			: t('pages.reports.multiProgramSummaryPlural', { count: count });
	}

	function renderBucketDistributionChart(containerId, rows, getClientsForBucket, ariaKey, options) {
		options = options || {};
		var el = document.getElementById(containerId);
		if (!el) { return; }
		var total = rows.reduce(function (sum, row) { return sum + row.count; }, 0);
		el.innerHTML = rows.map(function (row) {
			var pct = total ? Math.round((row.count / total) * 100) : 0;
			var fillWidth = row.count > 0 ? Math.max(pct, 1) : 0;
			return '<div class="risk-chart-row program-chart-row" data-bucket-id="' + RM.Components.escapeHtml(row.bucketId) + '" role="button" tabindex="0" aria-label="' +
				RM.Components.escapeHtml(t(ariaKey, { count: row.count, program: row.programLabel })) + '">' +
				'<div class="risk-chart-label">' + RM.Components.escapeHtml(row.programLabel) + '</div>' +
				'<div class="risk-chart-track"><div class="risk-chart-fill" style="width:' + fillWidth + '%;background:' +
				RM.Components.escapeHtml(row.color) + '"></div></div>' +
				'<div class="risk-chart-count">' + row.count + '</div></div>';
		}).join('');

		el.querySelectorAll('.program-chart-row').forEach(function (row) {
			function activate() {
				var bucketId = row.getAttribute('data-bucket-id');
				var bucketRow = rows.find(function (item) { return item.bucketId === bucketId; });
				if (options.onBucketSelect) {
					options.onBucketSelect(bucketId, bucketRow, row, el);
					return;
				}
				openProgramDrawer(bucketRow, getClientsForBucket(bucketId), el);
				el.querySelectorAll('.program-chart-row').forEach(function (item) { item.classList.remove('active'); });
				row.classList.add('active');
			}
			row.addEventListener('click', activate);
			row.addEventListener('keydown', function (e) {
				if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); }
			});
		});
	}

	function multiProgramTableTitleKey(bucketId) {
		if (bucketId === '1') { return 'pages.reports.singleProgramClientListTitle'; }
		if (bucketId === '2') { return 'pages.reports.twoProgramClientListTitle'; }
		if (bucketId === '3plus') { return 'pages.reports.threePlusProgramClientListTitle'; }
		return 'pages.reports.multiProgramClientListTitle';
	}

	function updateMultiProgramTable(prefix, caseManagerId, bucketId) {
		var rows = RM.ReportEngine.clientProgramDetailForBucket(caseManagerId, bucketId || 'multi');
		var tableContainerId = prefix + '-multi-program-table';
		document.getElementById(tableContainerId).innerHTML = renderMultiProgramTable(rows, multiProgramTableTitleKey(bucketId));
		wireMultiProgramDrilldown(rows, tableContainerId);
	}

	function renderMultiProgramTable(rows, titleKey) {
		titleKey = titleKey || 'pages.reports.multiProgramClientListTitle';
		if (!rows.length) {
			return RM.Components.emptyState(t('pages.reports.noClientsInBucket'), t('pages.reports.noClientsInBucketHint'));
		}
		return '<h3 class="form-section-title" style="font-size:0.9375rem;margin:1rem 0 0.75rem">' +
			RM.Components.escapeHtml(t(titleKey)) + '</h3>' +
			'<table class="data-table data-table-interactive"><thead><tr>' +
			'<th>' + RM.Components.escapeHtml(t('pages.reports.client')) + '</th>' +
			'<th>' + RM.Components.escapeHtml(t('pages.reports.programCount')) + '</th>' +
			'<th>' + RM.Components.escapeHtml(t('pages.reports.programs')) + '</th>' +
			'<th>' + RM.Components.escapeHtml(t('pages.reports.openCases')) + '</th>' +
			'</tr></thead><tbody>' +
			rows.map(function (row) {
				return '<tr class="multi-program-row" data-client-id="' + RM.Components.escapeHtml(row.clientId) + '" role="button" tabindex="0" aria-label="' +
					RM.Components.escapeHtml(t('pages.reports.multiProgramRowAria', { name: row.clientName, count: row.programCount })) + '">' +
					'<td>' + RM.Components.escapeHtml(row.clientName) + '</td>' +
					'<td><strong>' + RM.Components.escapeHtml(row.programCount) + '</strong></td>' +
					'<td>' + RM.Components.escapeHtml(row.programs) + '</td>' +
					'<td>' + RM.Components.escapeHtml(row.openCases) + '</td></tr>';
			}).join('') + '</tbody></table>';
	}

	function wireMultiProgramDrilldown(rows, tableContainerId) {
		var table = document.querySelector('#' + tableContainerId + ' .data-table-interactive');
		if (!table) { return; }
		var byClientId = {};
		rows.forEach(function (row) { byClientId[row.clientId] = row; });

		RM.Components.wireInteractiveTable(table, '.multi-program-row', function (row) {
			openMultiProgramDrawer(byClientId[row.getAttribute('data-client-id')], table);
		});
	}

	function openMultiProgramDrawer(row, table) {
		if (!row) { return; }
		var client = RM.ClientRepository.findById(row.clientId);
		if (!client) { return; }
		RM.Components.openClientCasesDrawer(client, table, '.multi-program-row');
	}

	function mountMultiProgramReport(prefix, caseManagerId) {
		var distribution = RM.ReportEngine.multiProgramDistribution(caseManagerId);
		var multiCount = RM.ReportEngine.multiProgramEnrollmentCount(caseManagerId);
		var distributionTotal = distribution.reduce(function (sum, row) { return sum + row.count; }, 0);
		var activeBucketId = null;

		renderMultiProgramSummary(prefix + '-multi-program-summary', multiCount);
		renderBucketDistributionChart(
			prefix + '-multi-program-chart',
			distribution,
			null,
			'pages.reports.multiProgramBucketAria',
			{
				onBucketSelect: function (bucketId, bucketRow, chartRow, chartEl) {
					if (activeBucketId === bucketId) {
						activeBucketId = null;
						chartEl.querySelectorAll('.program-chart-row').forEach(function (item) {
							item.classList.remove('active');
						});
						updateMultiProgramTable(prefix, caseManagerId, null);
						return;
					}
					activeBucketId = bucketId;
					chartEl.querySelectorAll('.program-chart-row').forEach(function (item) {
						item.classList.toggle('active', item === chartRow);
					});
					updateMultiProgramTable(prefix, caseManagerId, bucketId);
				}
			}
		);
		updateMultiProgramTable(prefix, caseManagerId, null);

		return {
			distribution: distribution,
			distributionTotal: distributionTotal,
			detail: RM.ReportEngine.multiProgramEnrollmentDetail(caseManagerId)
		};
	}

	document.addEventListener('DOMContentLoaded', function () {
		RM.Boot.init({
			activeModule: 'analytics',
			activeNav: activeNavIdForPage(),
			onReady: function () {
				if (RM.Permissions.isAuditor() && currentReportTier() !== 'integrity') {
					window.location.replace('reports.html?tier=integrity');
					return;
				}
				renderTierPage();
				if (!storeListenerBound) {
					document.addEventListener('rm:store-changed', renderTierPage);
					storeListenerBound = true;
				}
			}
		});
	});

	function renderAuditorSummaryHtml() {
		var snapshot = RM.ReportEngine.programSnapshot();
		return '<div class="card-grid report-auditor-summary">' +
			RM.Components.statCard(snapshot.totalActive, t('pages.reports.activeCaseload'), 'users', 'primary', null) +
			RM.Components.statCard(snapshot.highRisk, t('pages.reports.highRisk'), 'chart', 'warning', null) +
			RM.Components.statCard(snapshot.overdueFollowUps, t('pages.reports.overdueFollowUpsStat'), 'clock', 'accent', null) +
			RM.Components.statCard(snapshot.openCboReferrals, t('pages.reports.openCboStat'), 'link', 'success', null) +
			'</div>';
	}

	function renderCaseloadHtml(prefix) {
		return '<div class="report-tier-page">' +
			'<p class="text-muted report-tier-lead">' + RM.Components.escapeHtml(t('pages.reports.tierCaseloadLead')) + '</p>' +
			programReportCard(prefix + '-program', prefix + '-program', 'clients-by-program') +
			multiProgramReportCard(prefix, 'multi-program-enrollment') +
			editableReportCard('pages.reports.caseloadByRisk', 'caseload-by-risk',
				'<div id="' + prefix + '-risk"></div>',
				RM.Components.downloadBar({ imageTarget: prefix + '-risk', csvId: prefix + '-risk' })) +
			editableReportCard('pages.reports.clientsEnrolledInEvent', 'event-enrollment',
				'<p class="text-muted report-card-lead">' + RM.Components.escapeHtml(t('pages.reports.eventEnrollmentFilterHint')) + '</p>' +
				'<div id="' + prefix + '-event-data"></div>',
				RM.Components.downloadBar({ imageTarget: prefix + '-event-data', csvId: prefix + '-event' })) +
			editableReportCard('pages.reports.overdueFollowUps', 'overdue-follow-ups',
				'<div id="' + prefix + '-overdue"></div>',
				RM.Components.downloadBar({ imageTarget: prefix + '-overdue', csvId: prefix + '-overdue' })) +
			editableReportCard('pages.reports.openCboReferrals', 'open-cbo-referrals',
				'<div id="' + prefix + '-cbo"></div>',
				RM.Components.downloadBar({ imageTarget: prefix + '-cbo', csvId: prefix + '-cbo' })) +
			'</div>';
	}

	function renderTierPage() {
		RM.Components.closeSideDrawer();

		if (document.getElementById('reports-filter-bar') && RM.ReportRuntimeFilters) {
			pageFilterValues = RM.ReportRuntimeFilters.readValues();
		}
		applyPageFilters(pageFilterValues);

		var main = document.getElementById('page-content');
		var user = RM.Session.getCurrentUser();
		var tier = currentReportTier();
		var isAuditor = RM.Permissions.isAuditor();
		var prefix = isAuditor ? 'auditor' : 'report';
		var programManagerId = user && user.role === 'case_manager' ? user.id : null;

		var bodyHtml = '';
		if (tier === 'caseload') {
			bodyHtml = renderCaseloadHtml(prefix);
		} else if (RM.ReportSections) {
			bodyHtml = (isAuditor ? renderAuditorSummaryHtml() : '') +
				RM.ReportSections.buildTierHtml(prefix, tier);
		}

		main.innerHTML = RM.Components.modulePageHeader(activeNavIdForPage()) +
			renderPageFilterBar() + bodyHtml;

		if (tier === 'caseload') {
			mountCaseloadReports(prefix, programManagerId, user, main);
		} else if (RM.ReportSections) {
			var tierData = RM.ReportSections.mount(prefix, programManagerId, tier);
			RM.Components.wireDownloadActions(main, RM.ReportSections.getDownloadHandlers(prefix, programManagerId, tierData));
		}

		if (RM.ReportSubscribe) { RM.ReportSubscribe.wire(main); }

		wirePageFilterBar(function () {
			renderTierPage();
		});
	}

	function renderAuditorPage() {
		window.location.replace('reports.html?tier=integrity');
	}

	function mountCaseloadReports(prefix, programManagerId, user, main) {
		var programData = RM.ReportEngine.clientsByProgram(programManagerId);
		var programGroups = RM.ReportEngine.clientsByProgramGroups(programManagerId);
		var programTotal = programData.reduce(function (sum, row) { return sum + row.count; }, 0);
		var riskData = RM.ReportEngine.caseloadByRisk(programManagerId);

		renderProgramDistributionChart(prefix + '-program', programData, programGroups);
		var multiProgram = mountMultiProgramReport(prefix, programManagerId);
		document.getElementById(prefix + '-risk').innerHTML = renderRiskTable(riskData);
		wireRiskDrilldown(RM.ReportEngine.clientsGroupedByRisk(programManagerId), prefix + '-risk');

		function refreshEventReport() {
			var eventData = RM.ReportEngine.enrolledInEvent(null, programManagerId);
			document.getElementById(prefix + '-event-data').innerHTML = eventData.length
				? renderEnrollmentTable(eventData)
				: RM.Components.emptyState(t('pages.reports.noEnrollments'), t('pages.reports.noEnrollmentsHint'));
			wireEnrollmentDrilldown(eventData, prefix + '-event-data');
		}

		refreshEventReport();

		var overdueData = RM.ReportEngine.overdueFollowUps(user && user.role === 'case_manager' ? user.id : null);
		document.getElementById(prefix + '-overdue').innerHTML = overdueData.length
			? renderOverdueTable(overdueData)
			: RM.Components.emptyState(t('pages.reports.noOverdue'), t('pages.reports.noOverdueHint'));
		wireOverdueDrilldown(overdueData, prefix + '-overdue');

		var cboData = RM.ReportEngine.openCBOReferrals(programManagerId);
		document.getElementById(prefix + '-cbo').innerHTML = cboData.length
			? renderCboTable(cboData)
			: RM.Components.emptyState(t('pages.reports.noOpenCbo'), t('pages.reports.noOpenCboHint'));
		wireCboDrilldown(cboData, prefix + '-cbo');

		RM.Components.wireDownloadActions(main, {
			images: {
				[prefix + '-program']: function () {
					RM.Components.exportProgramDistributionBarChartPng(
						programData,
						programTotal,
						t('pages.reports.clientsByProgram'),
						prefix + '-people-by-program.png'
					);
				},
				[prefix + '-multi-program-chart']: function () {
					RM.Components.exportProgramDistributionBarChartPng(
						multiProgram.distribution,
						multiProgram.distributionTotal,
						t('pages.reports.multiProgramEnrollment'),
						prefix + '-multi-program-enrollment.png'
					);
				},
				[prefix + '-risk']: function () {
					var total = riskData.reduce(function (sum, row) { return sum + row.count; }, 0);
					RM.Components.exportRiskBarChartPng(riskData, total, prefix + '-caseload-by-risk.png');
				},
				[prefix + '-event-data']: function () {
					var eventData = RM.ReportEngine.enrolledInEvent(null, programManagerId);
					var subtitle = (RM.ReportEngine._filterContext && RM.ReportEngine._filterContext.eventId)
						? RM.ReportEngine.eventName(RM.ReportEngine._filterContext.eventId)
						: t('pages.reportBuilder.paramAllEvents');
					RM.Components.exportDataTablePng(
						t('pages.reports.exportEnrollmentTitle'),
						enrollmentColumns(),
						eventData,
						prefix + '-event-enrollment.png',
						{ subtitle: subtitle }
					);
				},
				[prefix + '-overdue']: function () {
					RM.Components.exportDataTablePng(
						t('pages.reports.exportOverdueTitle'),
						overdueColumns(),
						overdueData,
						prefix + '-overdue-followups.png'
					);
				},
				[prefix + '-cbo']: function () {
					RM.Components.exportDataTablePng(
						t('pages.reports.exportCboTitle'),
						cboColumns(),
						cboData,
						prefix + '-open-cbo-referrals.png'
					);
				}
			},
			csv: {
				[prefix + '-program']: function () {
					RM.Components.exportXlsx(
						prefix + '-people-by-program-detail.xlsx',
						RM.ReportEngine.clientsByProgramDetail(programManagerId),
						programColumns(),
						{ title: t('pages.reports.programDetail'), sheetName: t('pages.reports.sheetProgram') }
					);
				},
				[prefix + '-multi-program']: function () {
					RM.Components.exportXlsx(
						prefix + '-multi-program-enrollment-detail.xlsx',
						RM.ReportEngine.multiProgramEnrollmentDetail(programManagerId),
						multiProgramColumns(),
						{ title: t('pages.reports.multiProgramDetail'), sheetName: t('pages.reports.sheetMultiProgram') }
					);
				},
				[prefix + '-risk']: function () {
					RM.Components.exportXlsx(
						prefix + '-caseload-by-risk-detail.xlsx',
						RM.ReportEngine.caseloadRiskDrilldown(user.role === 'case_manager' ? user.id : null),
						riskDrilldownColumns(),
						{ title: t('pages.reports.caseloadRiskDetail'), sheetName: t('pages.reports.sheetRiskDetail') }
					);
				},
				[prefix + '-event']: function () {
					RM.Components.exportXlsx(
						prefix + '-event-enrollment-detail.xlsx',
						RM.ReportEngine.enrolledInEvent(null, programManagerId),
						enrollmentColumns(),
						{ title: t('pages.reports.eventEnrollmentDetail'), sheetName: t('pages.reports.sheetEnrollments') }
					);
				},
				[prefix + '-overdue']: function () {
					RM.Components.exportXlsx(
						prefix + '-overdue-followups-detail.xlsx',
						RM.ReportEngine.overdueFollowUps(user.role === 'case_manager' ? user.id : null),
						overdueColumns(),
						{ title: t('pages.reports.overdueDetail'), sheetName: t('pages.reports.sheetOverdue') }
					);
				},
				[prefix + '-cbo']: function () {
					RM.Components.exportXlsx(
						prefix + '-open-cbo-referrals-detail.xlsx',
						cboData,
						cboColumns(),
						{ title: t('pages.reports.cboDetail'), sheetName: t('pages.reports.sheetCbo') }
					);
				}
			}
		});
	}

	function renderRiskTable(rows) {
		if (!rows.length) {
			return RM.Components.emptyState(t('pages.reports.noRiskData'), t('pages.reports.noRiskDataHint'));
		}
		return '<table class="data-table data-table-interactive"><thead><tr>' +
			'<th>' + RM.Components.escapeHtml(t('pages.reports.riskLevel')) + '</th><th>' + RM.Components.escapeHtml(t('pages.reports.count')) + '</th>' +
			'</tr></thead><tbody>' +
			rows.map(function (row) {
				return '<tr class="risk-row" data-risk="' + RM.Components.escapeHtml(row.riskLevel) + '" role="button" tabindex="0" aria-label="' +
					RM.Components.escapeHtml(t('pages.reports.riskDrilldownAria', { count: row.count, level: RM.I18n.riskLabel(row.riskLevel) })) + '">' +
					'<td>' + RM.Components.riskBadge(row.riskLevel) + '</td>' +
					'<td>' + RM.Components.escapeHtml(row.count) + '</td></tr>';
			}).join('') + '</tbody></table>';
	}

	function wireRiskDrilldown(riskGroups, containerId) {
		containerId = containerId || 'report-risk';
		var table = document.querySelector('#' + containerId + ' .data-table-interactive');
		RM.Components.wireInteractiveTable(table, '.risk-row', function (row) {
			var level = row.getAttribute('data-risk');
			openRiskDrawer(level, riskGroups[level] || [], containerId);
		});
	}

	function openRiskDrawer(level, clients, containerId) {
		containerId = containerId || 'report-risk';
		var levelLabel = RM.I18n.riskLabel(level);
		var title = clients.length === 1
			? t('pages.reports.riskDrawerTitle', { level: levelLabel, count: clients.length })
			: t('pages.reports.riskDrawerTitlePlural', { level: levelLabel, count: clients.length });
		var table = document.querySelector('#' + containerId + ' .data-table-interactive');
		RM.Components.openSideDrawer(title, RM.Components.clientChipList(clients), function () {
			if (table) {
				table.querySelectorAll('.risk-row').forEach(function (r) { r.classList.remove('active'); });
			}
		});
	}

	function summaryCountRows(map, labelFormatter) {
		return Object.keys(map).map(function (key) {
			return { value: key, count: map[key], label: labelFormatter(key) };
		});
	}

	function renderInteractiveSummaryTable(titleKey, entries, ariaKey, labelFormatter) {
		if (!entries.length) { return ''; }
		return '<h3 class="form-section-title" style="font-size:0.9375rem;margin:0 0 0.75rem">' +
			RM.Components.escapeHtml(t(titleKey)) + '</h3>' +
			'<table class="data-table data-table-interactive report-summary-drilldown"><thead><tr>' +
			'<th>' + RM.Components.escapeHtml(t(titleKey)) + '</th>' +
			'<th>' + RM.Components.escapeHtml(t('pages.reports.count')) + '</th></tr></thead><tbody>' +
			entries.map(function (entry) {
				var label = labelFormatter(entry.value);
				return '<tr class="report-summary-row" data-summary-value="' + RM.Components.escapeHtml(entry.value) +
					'" role="button" tabindex="0" aria-label="' +
					RM.Components.escapeHtml(t(ariaKey, { label: label, count: entry.count })) +
					'"><td>' + RM.Components.escapeHtml(label) + '</td><td><strong>' + entry.count + '</strong></td></tr>';
			}).join('') + '</tbody></table>';
	}

	function wireSummaryDrilldown(containerEl, onSelect) {
		if (!containerEl) { return; }
		RM.Components.wireInteractiveTable(containerEl, '.report-summary-row', function (row) {
			onSelect(row.getAttribute('data-summary-value'), row, containerEl);
		});
	}

	function openOverdueListDrawer(title, overdueRows, tableEl, rowSelector) {
		var clients = overdueRows.map(function (row) {
			return RM.ClientRepository.findById(row.clientId);
		}).filter(function (client) { return !!client; });
		RM.Components.openSideDrawer(title, RM.Components.clientChipList(clients), function () {
			if (tableEl && rowSelector) {
				tableEl.querySelectorAll(rowSelector).forEach(function (row) { row.classList.remove('active'); });
			}
		});
	}

	function openCboListDrawer(title, cboRows, tableEl, rowSelector) {
		var clients = cboRows.map(function (row) {
			return RM.ClientRepository.findById(row.clientId);
		}).filter(function (client) { return !!client; });
		RM.Components.openSideDrawer(title, RM.Components.clientChipList(clients), function () {
			if (tableEl && rowSelector) {
				tableEl.querySelectorAll(rowSelector).forEach(function (row) { row.classList.remove('active'); });
			}
		});
	}

	function renderOverdueTable(rows) {
		return '<table class="data-table data-table-interactive"><thead><tr>' +
			'<th>' + RM.Components.escapeHtml(t('pages.reports.client')) + '</th><th>' + RM.Components.escapeHtml(t('pages.reports.risk')) + '</th><th>' + RM.Components.escapeHtml(t('pages.reports.cadence')) + '</th><th>' + RM.Components.escapeHtml(t('pages.reports.daysOverdue')) + '</th>' +
			'</tr></thead><tbody>' +
			rows.map(function (row) {
				return '<tr class="overdue-row" data-client-id="' + RM.Components.escapeHtml(row.clientId) + '" role="button" tabindex="0" aria-label="' +
					RM.Components.escapeHtml(t('pages.reports.overdueRowAria', { name: row.clientName, days: row.daysOverdue })) + '">' +
					'<td>' + RM.Components.escapeHtml(row.clientName) + '</td>' +
					'<td>' + RM.Components.riskBadge(row.riskLevel) + '</td>' +
					'<td>' + RM.Components.escapeHtml(row.cadence) + '</td>' +
					'<td><strong>' + RM.Components.escapeHtml(row.daysOverdue) + '</strong></td></tr>';
			}).join('') + '</tbody></table>';
	}

	function wireOverdueDrilldown(overdueData, containerId) {
		containerId = containerId || 'report-overdue';
		var table = document.querySelector('#' + containerId + ' .data-table-interactive');
		var byClientId = {};
		overdueData.forEach(function (row) { byClientId[row.clientId] = row; });

		RM.Components.wireInteractiveTable(table, '.overdue-row', function (row) {
			openOverdueDrawer(byClientId[row.getAttribute('data-client-id')], table);
		});
	}

	function openOverdueDrawer(row, table) {
		if (!row) { return; }
		var client = RM.ClientRepository.findById(row.clientId);
		if (!client) { return; }

		var notes = RM.CaseNoteRepository.findByClientId(client.id);
		var latestNote = notes.length
			? notes.slice().sort(function (a, b) { return b.date.localeCompare(a.date); })[0]
			: null;

		RM.Components.openClientDrawer(
			t('pages.reports.overdueDrawerTitle', { name: client.name }),
			client,
			{
				workspaceTab: 'followup',
				includeStandardMeta: false,
				includeStandardSections: false,
				badgeHtml: '<span class="incomplete-badge">' + RM.Components.escapeHtml(t('pages.reports.daysOverdueBadge', { count: row.daysOverdue })) + '</span>',
				alert: {
					type: 'warning',
					message: t('pages.reports.overdueAlert', { cadence: row.cadence })
				},
				metaRows: [
					{ label: t('pages.reports.daysOverdue'), value: row.daysOverdue },
					{ label: t('pages.reports.cadence'), value: row.cadence },
					{ label: t('pages.reports.riskLevel'), value: RM.I18n.riskLabel(row.riskLevel) },
					{ label: t('pages.reports.phone'), value: client.phone },
					{
						label: t('pages.reports.caseManager'),
						value: (function () {
							var cm = RM.UserRepository.findById(client.caseManagerId);
							return cm ? RM.Permissions.formatRoleLabel(cm.role) : '—';
						})()
					}
				],
				sections: [{
					title: t('pages.reports.lastFollowUp'),
					body: latestNote
						? '<div class="note-entry drawer-note">' +
							'<div class="note-meta">' + RM.Components.formatDate(latestNote.date) + ' · ' +
							RM.Components.escapeHtml(latestNote.type) + '</div>' +
							'<p>' + RM.Components.escapeHtml(latestNote.text) + '</p></div>'
						: '<p>' + RM.Components.escapeHtml(t('pages.reports.noNotesYet')) + '</p>'
				}]
			},
			table,
			'.overdue-row'
		);
	}

	function renderEnrollmentTable(rows) {
		return '<table class="data-table data-table-interactive"><thead><tr>' +
			'<th>' + RM.Components.escapeHtml(t('pages.reports.client')) + '</th><th>' + RM.Components.escapeHtml(t('pages.reports.dateEnrolled')) + '</th><th>' + RM.Components.escapeHtml(t('pages.reports.event')) + '</th>' +
			'</tr></thead><tbody>' +
			rows.map(function (row) {
				return '<tr class="enrollment-row" data-client-id="' + RM.Components.escapeHtml(row.clientId) + '" role="button" tabindex="0" aria-label="' +
					RM.Components.escapeHtml(t('pages.reports.enrollmentRowAria', { name: row.clientName, event: row.eventName })) + '">' +
					'<td>' + RM.Components.escapeHtml(row.clientName) + '</td>' +
					'<td>' + RM.Components.escapeHtml(row.dateEnrolled) + '</td>' +
					'<td>' + RM.Components.escapeHtml(row.eventName) + '</td></tr>';
			}).join('') + '</tbody></table>';
	}

	function wireEnrollmentDrilldown(enrollmentData, containerId) {
		containerId = containerId || 'report-event-data';
		var table = document.querySelector('#' + containerId + ' .data-table-interactive');
		var byClientId = {};
		enrollmentData.forEach(function (row) { byClientId[row.clientId] = row; });

		RM.Components.wireInteractiveTable(table, '.enrollment-row', function (row) {
			openEnrollmentDrawer(byClientId[row.getAttribute('data-client-id')], table);
		});
	}

	function openEnrollmentDrawer(row, table) {
		if (!row) { return; }
		var client = RM.ClientRepository.findById(row.clientId);
		if (!client) { return; }

		var enrollments = RM.ServiceEnrollmentRepository.findByClientId(client.id);
		var otherEnrollments = enrollments.filter(function (e) {
			return e.serviceOrEventId !== row.eventId;
		});

		RM.Components.openClientDrawer(
			t('pages.reports.enrollmentDrawerTitle', { name: client.name }),
			client,
			{
				workspaceTab: 'services',
				includeStandardMeta: false,
				includeStandardSections: false,
				alert: {
					type: 'info',
					message: t('pages.reports.enrolledMessage', {
						event: row.eventName,
						date: RM.Components.formatDate(row.dateEnrolled)
					})
				},
				metaRows: [
					{ label: t('pages.reports.programEventLabel'), value: row.eventName },
					{ label: t('pages.reports.dateEnrolledLabel'), value: RM.Components.formatDate(row.dateEnrolled) },
					{ label: t('pages.reports.phone'), value: client.phone },
					{ label: t('components.address'), value: client.address }
				],
				sections: otherEnrollments.length ? [{
					title: t('pages.reports.otherEnrollments'),
					body: '<ul class="drawer-list">' + otherEnrollments.map(function (e) {
						return '<li>' + RM.Components.escapeHtml(RM.ReportEngine.eventName(e.serviceOrEventId)) +
							' — ' + RM.Components.formatDate(e.dateEnrolled) + '</li>';
					}).join('') + '</ul>'
				}] : []
			},
			table,
			'.enrollment-row'
		);
	}

	function renderCboTable(rows) {
		return '<table class="data-table data-table-interactive"><thead><tr>' +
			'<th>' + RM.Components.escapeHtml(t('pages.reports.client')) + '</th><th>' + RM.Components.escapeHtml(t('pages.reports.cbo')) + '</th><th>' + RM.Components.escapeHtml(t('pages.reports.status')) + '</th><th>' + RM.Components.escapeHtml(t('pages.reports.date')) + '</th>' +
			'</tr></thead><tbody>' +
			rows.map(function (row, idx) {
				return '<tr class="cbo-row" data-row-index="' + idx + '" role="button" tabindex="0" aria-label="' +
					RM.Components.escapeHtml(t('pages.reports.cboRowAria', { name: row.clientName, cbo: row.cboName })) + '">' +
					'<td>' + RM.Components.escapeHtml(row.clientName) + '</td>' +
					'<td>' + RM.Components.escapeHtml(row.cboName) + '</td>' +
					'<td>' + RM.Components.escapeHtml(RM.I18n.enumLabel('cboStatus', row.status)) + '</td>' +
					'<td>' + RM.Components.escapeHtml(row.date) + '</td></tr>';
			}).join('') + '</tbody></table>';
	}

	function wireCboDrilldown(cboData, containerId) {
		containerId = containerId || 'report-cbo';
		var table = document.querySelector('#' + containerId + ' .data-table-interactive');

		RM.Components.wireInteractiveTable(table, '.cbo-row', function (row) {
			var idx = parseInt(row.getAttribute('data-row-index'), 10);
			openCboDrawer(cboData[idx], table);
		});
	}

	function openCboDrawer(row, table) {
		if (!row) { return; }
		var client = RM.ClientRepository.findById(row.clientId);
		if (!client) { return; }

		var openCbos = RM.CBOReferralRepository.findByClientId(client.id).filter(function (r) {
			return r.status === 'Pending' || r.status === 'Sent';
		});
		var otherCbos = openCbos.filter(function (r) {
			return r.cboName !== row.cboName || r.date !== row.date;
		});

		RM.Components.openClientDrawer(
			t('pages.reports.cboDrawerTitle', { name: client.name }),
			client,
			{
				workspaceTab: 'services',
				includeStandardMeta: false,
				includeStandardSections: false,
				hideStatusBadge: true,
				badgeHtml: '<span class="client-status-badge">' + RM.Components.escapeHtml(RM.I18n.enumLabel('cboStatus', row.status)) + '</span>',
				alert: {
					type: 'info',
					message: t('pages.reports.cboAlert', { cbo: row.cboName })
				},
				metaRows: [
					{ label: t('pages.reports.cboOrganization'), value: row.cboName },
					{ label: t('pages.reports.referralStatus'), value: RM.I18n.enumLabel('cboStatus', row.status) },
					{ label: t('pages.reports.dateReferred'), value: RM.Components.formatDate(row.date) },
					{ label: t('pages.reports.phone'), value: client.phone },
					{
						label: t('pages.reports.caseManager'),
						value: (function () {
							var cm = RM.UserRepository.findById(client.caseManagerId);
							return cm ? RM.Permissions.formatRoleLabel(cm.role) : '—';
						})()
					}
				],
				sections: otherCbos.length ? [{
					title: t('pages.reports.otherOpenCbos'),
					body: '<ul class="drawer-list">' + otherCbos.map(function (r) {
						return '<li>' + RM.Components.escapeHtml(r.cboName) + ' — ' +
							RM.Components.escapeHtml(RM.I18n.enumLabel('cboStatus', r.status)) + ' (' + RM.Components.formatDate(r.date) + ')</li>';
					}).join('') + '</ul>'
				}] : []
			},
			table,
			'.cbo-row'
		);
	}
})();
