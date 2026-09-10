/* global RM */
(function () {
	'use strict';

	function t(key, params) {
		return RM.I18n.t(key, params);
	}

	document.addEventListener('DOMContentLoaded', function () {
		RM.Boot.init({
			activeModule: null,
			activeNav: 'dashboard',
			onReady: function () {
				var user = RM.Session.getCurrentUser();
				var main = document.getElementById('page-content');

				if (RM.Permissions.isLiaison()) {
					window.location.href = 'liaison-lookup.html';
					return;
				}

				if (RM.Permissions.isAuditor()) {
					window.location.href = 'reports.html';
					return;
				}

				var caseload = RM.Data.caseloadForUser(user);

				var overdue = RM.FollowUpCadenceService.getDueFollowUps(
					user.role === 'case_manager' ? user.id : null
				);
				var incomplete = caseload.filter(function (c) { return c.incompleteIntake; });
				var overdueByClientId = {};
				overdue.forEach(function (d) {
					overdueByClientId[d.client.id] = d;
				});
				var riskGroups = RM.Data.groupByRisk(caseload);
				var riskReport = buildRiskReport(riskGroups);
				var total = caseload.length;
				var highCount = (riskGroups.High || []).length;
				var success = RM.ReportEngine.caseloadSuccessMetrics(caseload, overdue.length);

				main.innerHTML =
					RM.Components.pageHeader(t('nav.dashboard')) +
					renderSuccessBanner(success) +
					'<div class="card-grid dashboard-stat-grid">' +
					RM.Components.statCard(success.serviceEnrollments, t('dashboard.servicesConnected'), 'link', 'success', null) +
					RM.Components.statCard(success.activeGoals, t('dashboard.careGoalsActive'), 'clipboard', 'success', null) +
					RM.Components.statCard(success.riskImprovements, t('dashboard.riskImprovements'), 'trendUp', 'success', null) +
					RM.Components.statCard(caseload.length, t('dashboard.activeCaseload'), 'users', 'primary', null) +
					RM.Components.statCard(overdue.length, t('dashboard.overdueFollowUps'), 'clock', 'warning', null) +
					RM.Components.statCard(incomplete.length, t('dashboard.incompleteIntakes'), 'clipboard', 'accent', null) +
					'</div>' +
					'<div class="dashboard-stack">' +
					'<div class="card">' +
					'<div class="card-header"><h2>' + RM.Components.escapeHtml(t('dashboard.programOverview')) + '</h2>' +
					dashboardCardActions('dashboard-program-overview', 'dashboard.programOverview',
						RM.Components.downloadBar({ imageTarget: 'dashboard-program-visual', csvId: 'dashboard-risk-drilldown' })) +
					'</div>' +
					'<div id="dashboard-program-visual">' +
					'<div class="snapshot-bar snapshot-bar-success">' +
					'<div class="snapshot-item snap-success"><span class="snap-value">' + success.intakeCompletePct + '%</span><span class="snap-label">' + RM.Components.escapeHtml(t('dashboard.intakesComplete')) + '</span></div>' +
					'<div class="snapshot-item snap-success"><span class="snap-value">' + success.followUpOnTrackPct + '%</span><span class="snap-label">' + RM.Components.escapeHtml(t('dashboard.followUpsOnTrack')) + '</span></div>' +
					'<div class="snapshot-item snap-success"><span class="snap-value">' + success.clientsWithServices + '</span><span class="snap-label">' + RM.Components.escapeHtml(t('dashboard.receivingServices')) + '</span></div>' +
					'<div class="snapshot-item snap-success"><span class="snap-value">' + success.cboConfirmed + '</span><span class="snap-label">' + RM.Components.escapeHtml(t('dashboard.cboPartnersConfirmed')) + '</span></div>' +
					'</div>' +
					'<div class="snapshot-bar">' +
					'<div class="snapshot-item"><span class="snap-value">' + total + '</span><span class="snap-label">' + RM.Components.escapeHtml(t('dashboard.totalActive')) + '</span></div>' +
					'<div class="snapshot-item snap-alert"><span class="snap-value">' + highCount + '</span><span class="snap-label">' + RM.Components.escapeHtml(t('dashboard.highRisk')) + '</span></div>' +
					'<div class="snapshot-item"><span class="snap-value">' + overdue.length + '</span><span class="snap-label">' + RM.Components.escapeHtml(t('dashboard.needFollowUp')) + '</span></div>' +
					'<div class="snapshot-item"><span class="snap-value">' + incomplete.length + '</span><span class="snap-label">' + RM.Components.escapeHtml(t('dashboard.incompleteIntake')) + '</span></div>' +
					'</div>' +
					'<h3 class="dashboard-subheading">' + RM.Components.escapeHtml(t('dashboard.caseloadByRisk')) + '</h3>' +
					'<div class="risk-chart" id="risk-chart"></div></div>' +
					'</div>' +
					'<div class="card">' +
					'<div class="card-header"><h2>' + RM.Components.escapeHtml(t('dashboard.riskMix')) + '</h2>' +
					dashboardCardActions('dashboard-risk-mix', 'dashboard.riskMix',
						RM.Components.downloadBar({ imageTarget: 'donut-chart-visual' })) +
					'</div>' +
					'<div id="donut-chart-visual"><div id="donut-chart"></div></div></div>' +
					'<div class="card" id="caseload-section">' +
					'<div class="card-header caseload-card-header">' +
					'<h2>' + RM.Components.escapeHtml(t('dashboard.fullCaseload')) + '</h2>' +
					'<div class="caseload-card-actions report-card-actions">' +
					(RM.ReportSubscribe
						? RM.ReportSubscribe.subscribeButtonHtml('dashboard-full-caseload', 'dashboard', t('dashboard.fullCaseload'))
						: '') +
					RM.Components.downloadBar({ csvId: 'dashboard-caseload-drilldown' }) +
					'<a href="' + RM.Links.page('client-search') + '" class="btn btn-sm btn-secondary report-card-btn">' + RM.Components.escapeHtml(t('dashboard.searchAll')) + '</a></div></div>' +
					'<div class="caseload-filter-bar" role="toolbar" aria-label="' + RM.Components.escapeHtml(t('dashboard.filterCaseload')) + '">' +
					'<button type="button" class="caseload-filter-btn is-active" data-filter="all" aria-pressed="true">' + RM.Components.escapeHtml(t('dashboard.filterAll', { count: caseload.length })) + '</button>' +
					'<button type="button" class="caseload-filter-btn" data-filter="overdue" aria-pressed="false"' +
					(overdue.length ? '' : ' disabled') + '>' + RM.Components.escapeHtml(t('dashboard.filterOverdue', { count: overdue.length })) + '</button>' +
					'<button type="button" class="caseload-filter-btn" data-filter="incomplete" aria-pressed="false"' +
					(incomplete.length ? '' : ' disabled') + '>' + RM.Components.escapeHtml(t('dashboard.filterIncomplete', { count: incomplete.length })) + '</button>' +
					'</div>' +
					'<div id="caseload-table"></div></div>' +
					'</div>';

				renderRiskChart(riskReport, riskGroups, total);
				renderDonut(riskReport, total, riskGroups);
				wireCaseloadFilters(caseload, overdueByClientId);
				setCaseloadFilter('all');
				wireStatScroll(main);
				wireDashboardDownloads(main, user, caseload, overdueByClientId, riskReport, total, success, highCount, overdue.length, incomplete.length);
				if (RM.ReportSubscribe) { RM.ReportSubscribe.wire(main); }
			}
		});
	});

	var RISK_ORDER = ['High', 'Medium', 'Moderate', 'Low', 'Unknown'];
	var RISK_CLASS = {
		High: 'risk-high',
		Medium: 'risk-medium',
		Moderate: 'risk-moderate',
		Low: 'risk-low',
		Unknown: 'risk-unknown'
	};
	var RISK_DRILLDOWN_COLUMNS = [
		{ key: 'clientName', labelKey: 'common.client' },
		{ key: 'dob', labelKey: 'dashboard.tableDob' },
		{ key: 'phone', labelKey: 'common.phone' },
		{ key: 'riskLevel', labelKey: 'common.riskLevel' },
		{ key: 'compositeScore', labelKey: 'common.compositeScore' },
		{ key: 'processStage', labelKey: 'common.processStage' },
		{ key: 'caseManager', labelKey: 'common.caseManager' },
		{ key: 'intakeStatus', labelKey: 'common.intakeStatus' }
	];
	var CASELOAD_DRILLDOWN_COLUMNS = [
		{ key: 'clientName', labelKey: 'common.client' },
		{ key: 'dob', labelKey: 'dashboard.tableDob' },
		{ key: 'phone', labelKey: 'common.phone' },
		{ key: 'processStage', labelKey: 'common.processStage' },
		{ key: 'riskLevel', labelKey: 'common.riskLevel' },
		{ key: 'followUpStatus', labelKey: 'common.followUpStatus' },
		{ key: 'intakeStatus', labelKey: 'common.intakeStatus' }
	];

	function localizedColumns(columns) {
		return columns.map(function (col) {
			return {
				key: col.key,
				label: col.labelKey && RM.I18n ? RM.I18n.t(col.labelKey) : col.label
			};
		});
	}

	function wireStatScroll(main) {
		var cards = main.querySelectorAll('.stat-card');
		var filters = [null, null, null, 'all', 'overdue', 'incomplete'];
		cards.forEach(function (card, i) {
			var filter = filters[i];
			if (!filter) { return; }
			card.style.cursor = 'pointer';
			card.setAttribute('role', 'button');
			card.setAttribute('tabindex', '0');
			card.setAttribute('aria-label', t('dashboard.showStatInCaseloadTable', {
				label: (card.querySelector('.stat-label') || {}).textContent || ''
			}));
			function activate() {
				setCaseloadFilter(filter);
				document.getElementById('caseload-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
			}
			card.addEventListener('click', activate);
			card.addEventListener('keydown', function (e) {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault();
					activate();
				}
			});
		});
	}

	var caseloadState = {
		clients: [],
		overdueByClientId: {},
		activeFilter: 'all'
	};

	function setCaseloadFilter(filter) {
		caseloadState.activeFilter = filter;
		document.querySelectorAll('.caseload-filter-btn').forEach(function (btn) {
			var isActive = btn.getAttribute('data-filter') === filter;
			btn.classList.toggle('is-active', isActive);
			btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
		});
		renderCaseload(filter);
	}

	function wireCaseloadFilters(caseload, overdueByClientId) {
		caseloadState.clients = caseload;
		caseloadState.overdueByClientId = overdueByClientId;
		document.querySelectorAll('.caseload-filter-btn').forEach(function (btn) {
			btn.addEventListener('click', function () {
				if (btn.disabled) { return; }
				setCaseloadFilter(btn.getAttribute('data-filter'));
			});
		});
	}

	function filterCaseloadClients(filter) {
		if (filter === 'overdue') {
			return caseloadState.clients.filter(function (c) {
				return caseloadState.overdueByClientId[c.id];
			});
		}
		if (filter === 'incomplete') {
			return caseloadState.clients.filter(function (c) { return c.incompleteIntake; });
		}
		return caseloadState.clients;
	}

	function caseloadAttentionCell(client, filter) {
		var overdue = caseloadState.overdueByClientId[client.id];
		if (filter === 'overdue' && overdue) {
			return RM.Components.escapeHtml(t('pages.reports.daysOverdueBadge', { count: overdue.daysOverdue }) + ' · ' + overdue.cadence);
		}
		if (filter === 'incomplete' && client.incompleteIntake) {
			return '<span class="incomplete-badge">' + RM.Components.escapeHtml(t('components.incompleteIntake')) + '</span>';
		}
		return '—';
	}

	function buildRiskReport(groups) {
		return RISK_ORDER.map(function (level) {
			return { riskLevel: level, count: (groups[level] || []).length };
		}).filter(function (r) { return r.count > 0; });
	}

	function dashboardCardActions(reportKey, titleKey, downloadBarHtml) {
		var subscribeBtn = RM.ReportSubscribe
			? RM.ReportSubscribe.subscribeButtonHtml(reportKey, 'dashboard', t(titleKey))
			: '';
		return '<div class="report-card-actions">' + subscribeBtn + (downloadBarHtml || '') + '</div>';
	}

	function renderSuccessBanner(metrics) {
		var progressRows = [
			{ label: t('dashboard.intakesComplete'), pct: metrics.intakeCompletePct },
			{ label: t('dashboard.followUpsOnTrack'), pct: metrics.followUpOnTrackPct },
			{ label: t('dashboard.clientsReceivingServices'), pct: metrics.servicesConnectedPct }
		];
		var improvementLabel = metrics.riskImprovements === 1
			? t('dashboard.riskImprovementCount', { count: metrics.riskImprovements })
			: t('dashboard.riskImprovementCountPlural', { count: metrics.riskImprovements });

		return '<section class="card dashboard-success-card" id="dashboard-success-card" aria-label="' + RM.Components.escapeHtml(t('dashboard.programImpactAria')) + '">' +
			'<div class="card-header dashboard-success-card-header">' +
			'<h2>' + RM.Components.escapeHtml(t('dashboard.programImpact')) + '</h2>' +
			dashboardCardActions('dashboard-program-impact', 'dashboard.programImpact',
				RM.Components.downloadBar({ imageTarget: 'dashboard-success-card' })) +
			'</div>' +
			'<div class="dashboard-success-layout">' +
			'<div class="success-ring-wrap" aria-hidden="true">' +
			'<div class="success-ring" style="--success-pct:' + metrics.intakeCompletePct + '">' +
			'<div class="success-ring-inner">' +
			'<span class="success-ring-value">' + metrics.intakeCompletePct + '%</span>' +
			'<span class="success-ring-label">' + RM.Components.escapeHtml(t('dashboard.intakesComplete')) + '</span></div></div></div>' +
			'<div class="dashboard-success-copy">' +
			'<h2 class="dashboard-success-title">' + RM.Components.escapeHtml(t('dashboard.successTitle')) + '</h2>' +
			'<p class="dashboard-success-lead">' + RM.Components.escapeHtml(t('dashboard.successLead')) + '</p>' +
			'<ul class="dashboard-success-highlights">' +
			'<li><span class="success-highlight-icon" aria-hidden="true">' + RM.Components.icon('check') + '</span>' +
			t('dashboard.activeEnrollments', { count: metrics.serviceEnrollments }) + '</li>' +
			'<li><span class="success-highlight-icon" aria-hidden="true">' + RM.Components.icon('check') + '</span>' +
			t('dashboard.activeGoals', { count: metrics.activeGoals }) + '</li>' +
			'<li><span class="success-highlight-icon" aria-hidden="true">' + RM.Components.icon('check') + '</span>' +
			improvementLabel + '</li>' +
			'</ul></div></div>' +
			'<div class="success-progress-list">' +
			progressRows.map(function (row) {
				return '<div class="success-progress-row">' +
					'<span class="success-progress-label">' + RM.Components.escapeHtml(row.label) + '</span>' +
					'<div class="success-progress-track" role="presentation">' +
					'<div class="success-progress-fill" style="width:' + row.pct + '%"></div></div>' +
					'<span class="success-progress-value">' + row.pct + '%</span></div>';
			}).join('') +
			'</div></section>';
	}

	function wireDashboardDownloads(main, user, caseload, overdueByClientId, riskReport, total, success, highCount, overdueLen, incompleteLen) {
		RM.Components.wireDownloadActions(main, {
			images: {
				'dashboard-success-card': function () {
					RM.Components.exportProgramImpactPng(success, 'program-impact.png');
				},
				'dashboard-program-visual': function () {
					RM.Components.exportProgramOverviewPng(
						success,
						riskReport,
						total,
						{ highCount: highCount, overdueLen: overdueLen, incompleteLen: incompleteLen },
						'program-overview.png'
					);
				},
				'donut-chart-visual': function () {
					RM.Components.exportDonutChartPng(riskReport, total, 'risk-mix-chart.png');
				}
			},
			csv: {
				'dashboard-risk-drilldown': function () {
					RM.Components.exportXlsx(
						'caseload-by-risk-detail.xlsx',
						RM.ReportEngine.caseloadRiskDrilldown(
							user.role === 'case_manager' ? user.id : null
						),
						localizedColumns(RISK_DRILLDOWN_COLUMNS),
						{ title: t('export.caseloadRiskDetailTitle'), sheetName: t('export.caseloadRiskDetailSheet') }
					);
				},
				'dashboard-caseload-drilldown': function () {
					RM.Components.exportXlsx(
						'caseload-detail.xlsx',
						RM.ReportEngine.dashboardCaseloadDrilldown(
							caseload,
							caseloadState.activeFilter,
							overdueByClientId
						),
						localizedColumns(CASELOAD_DRILLDOWN_COLUMNS),
						{ title: t('export.fullCaseloadDetailTitle'), sheetName: t('export.fullCaseloadDetailSheet') }
					);
				}
			}
		});
	}

	function renderRiskChart(report, groups, total) {
		var el = document.getElementById('risk-chart');
		if (!report.length) {
			el.innerHTML = RM.Components.emptyState(t('dashboard.noRiskData'), t('dashboard.noRiskDataHint'));
			return;
		}
		el.innerHTML = report.map(function (r) {
			var pct = total ? Math.round((r.count / total) * 100) : 0;
			var cls = RISK_CLASS[r.riskLevel] || 'risk-unknown';
			return '<div class="risk-chart-row" data-risk="' + RM.Components.escapeHtml(r.riskLevel) + '" role="button" tabindex="0" aria-label="' +
				RM.Components.escapeHtml(t('pages.reports.riskDrilldownAria', { count: r.count, level: RM.I18n.riskLabel(r.riskLevel) })) + '">' +
				'<div class="risk-chart-label">' + RM.Components.riskBadge(r.riskLevel) + '</div>' +
				'<div class="risk-chart-track"><div class="risk-chart-fill ' + cls + '" style="width:' + pct + '%"></div></div>' +
				'<div class="risk-chart-count">' + r.count + '</div></div>';
		}).join('');

		el.querySelectorAll('.risk-chart-row').forEach(function (row) {
			function activate() {
				showDrilldown(row.getAttribute('data-risk'), groups);
				el.querySelectorAll('.risk-chart-row').forEach(function (r) { r.classList.remove('active'); });
				row.classList.add('active');
				document.querySelectorAll('.donut-legend-item').forEach(function (item) {
					item.classList.toggle('active', item.getAttribute('data-risk') === row.getAttribute('data-risk'));
				});
			}
			row.addEventListener('click', activate);
			row.addEventListener('keydown', function (e) {
				if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); }
			});
		});
	}

	function showDrilldown(level, groups) {
		var clients = groups[level] || [];
		var levelLabel = RM.I18n.riskLabel(level);
		var title = clients.length === 1
			? t('pages.reports.riskDrawerTitle', { level: levelLabel, count: clients.length })
			: t('pages.reports.riskDrawerTitlePlural', { level: levelLabel, count: clients.length });
		var body = !clients.length
			? RM.Components.emptyState(t('components.noClientsTitle'), t('components.noClientsAtRisk'))
			: '<div class="client-chip-list">' + clients.map(function (c) {
				var phone = c.phone || '—';
				return '<div class="client-chip">' +
					'<div><a href="' + RM.Links.page('client-profile', { clientId: c.id }) + '">' +
					RM.Components.escapeHtml(c.name) + '</a>' +
					'<span class="client-chip-meta">' + RM.Components.escapeHtml(phone) +
					' · ' + RM.Components.workflowStageBadge(c) +
					(c.incompleteIntake ? ' · <span class="incomplete-badge">' + RM.Components.escapeHtml(t('components.incompleteIntake')) + '</span>' : '') +
					'</span></div>' +
					'<a href="' + RM.Links.page('case-workspace', { clientId: c.id }) + '" class="btn btn-sm btn-secondary">' + RM.Components.escapeHtml(t('components.openCase')) + '</a></div>';
			}).join('') + '</div>';

		RM.Components.openSideDrawer(title, body, clearDrilldownHighlight);
	}

	function clearDrilldownHighlight() {
		document.querySelectorAll('.risk-chart-row').forEach(function (r) { r.classList.remove('active'); });
		document.querySelectorAll('.donut-legend-item').forEach(function (r) { r.classList.remove('active'); });
	}

	function renderDonut(report, total, groups) {
		var el = document.getElementById('donut-chart');
		if (!total) {
			el.innerHTML = RM.Components.emptyState(t('dashboard.noData'), t('dashboard.noActiveClients'));
			return;
		}

		var segments = [];
		var cursor = 0;
		var colors = { High: '#ef4444', Medium: '#f59e0b', Moderate: '#d97706', Low: '#10b981', Unknown: '#94a3b8' };
		report.forEach(function (r) {
			var pct = (r.count / total) * 100;
			segments.push(colors[r.riskLevel] + ' ' + cursor + '% ' + (cursor + pct) + '%');
			cursor += pct;
		});

		el.innerHTML =
			'<div class="donut-wrap donut-wrap-stack">' +
			'<div class="donut-chart" style="background:conic-gradient(' + segments.join(', ') + ')">' +
			'<div class="donut-hole"><span class="donut-total">' + total + '</span><span class="donut-label">' + RM.Components.escapeHtml(t('dashboard.donutActive')) + '</span></div></div>' +
			'<div class="donut-legend">' +
			report.map(function (r) {
				return '<div class="donut-legend-item" data-risk="' + RM.Components.escapeHtml(r.riskLevel) + '" role="button" tabindex="0">' +
					'<span class="legend-dot ' + r.riskLevel.toLowerCase() + '"></span>' +
					RM.Components.escapeHtml(RM.I18n.riskLabel(r.riskLevel)) + ' <strong>(' + r.count + ')</strong></div>';
			}).join('') +
			'</div></div>';

		el.querySelectorAll('.donut-legend-item').forEach(function (item) {
			function activate() {
				var level = item.getAttribute('data-risk');
				showDrilldown(level, groups);
				document.querySelectorAll('.risk-chart-row').forEach(function (r) {
					r.classList.toggle('active', r.getAttribute('data-risk') === level);
				});
				el.querySelectorAll('.donut-legend-item').forEach(function (i) { i.classList.remove('active'); });
				item.classList.add('active');
			}
			item.addEventListener('click', activate);
			item.addEventListener('keydown', function (e) {
				if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); }
			});
		});
	}

	function renderCaseload(filter) {
		filter = filter || caseloadState.activeFilter || 'all';
		var el = document.getElementById('caseload-table');
		var clients = filterCaseloadClients(filter);

		if (!clients.length) {
			var emptyTitle = filter === 'overdue'
				? t('dashboard.noOverdue')
				: filter === 'incomplete'
					? t('dashboard.noIncomplete')
					: t('dashboard.noActiveCases');
			var emptyMessage = filter === 'overdue'
				? t('dashboard.noOverdueHint')
				: filter === 'incomplete'
					? t('dashboard.noIncompleteHint')
					: t('dashboard.noActiveCasesHint');
			el.innerHTML = RM.Components.emptyState(emptyTitle, emptyMessage);
			return;
		}

		var showAttention = filter !== 'all';
		var rows = clients.map(function (c) {
			var a = RM.RiskAssessmentRepository.findLatest(c.id);
			var attention = caseloadAttentionCell(c, filter);
			return '<tr class="caseload-row" data-client-id="' + RM.Components.escapeHtml(c.id) + '" role="button" tabindex="0" aria-label="' +
				RM.Components.escapeHtml(t('dashboard.viewCaseAria', { name: c.name })) + '">' +
				'<td>' + RM.Components.escapeHtml(c.name) + '</td>' +
				'<td>' + RM.Components.formatDate(c.dob) + '</td>' +
				'<td>' + RM.Components.workflowStageBadge(c) + '</td>' +
				'<td>' + (a ? RM.Components.riskBadge(a.overallRisk) : '—') + '</td>' +
				(showAttention ? '<td>' + attention + '</td>' : '') +
				'</tr>';
		}).join('');

		var attentionHeader = showAttention
			? '<th>' + RM.Components.escapeHtml(filter === 'overdue' ? t('dashboard.tableFollowUp') : t('dashboard.tableIntakeStatus')) + '</th>'
			: '';

		el.innerHTML = RM.Components.tableResponsive(
			'<table class="data-table data-table-interactive"><thead><tr>' +
			'<th>' + RM.Components.escapeHtml(t('dashboard.tableName')) + '</th>' +
			'<th>' + RM.Components.escapeHtml(t('dashboard.tableDob')) + '</th>' +
			'<th>' + RM.Components.escapeHtml(t('dashboard.tableProcessStage')) + '</th>' +
			'<th>' + RM.Components.escapeHtml(t('dashboard.tableRisk')) + '</th>' + attentionHeader +
			'</tr></thead><tbody>' + rows + '</tbody></table>'
		);

		var table = el.querySelector('.data-table-interactive');
		RM.Components.wireInteractiveTable(table, '.caseload-row', function (row) {
			var client = RM.ClientRepository.findById(row.getAttribute('data-client-id'));
			if (client) {
				RM.Components.openClientDrawer(client.name, client, {}, table, '.caseload-row');
			}
		});
	}
})();
