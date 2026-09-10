/* global RM */
(function () {
	'use strict';

	function t(key, params) {
		return RM.I18n.t(key, params);
	}

	function tierHeading(tierKey) {
		return '<h2 class="report-tier-heading">' + RM.Components.escapeHtml(t('pages.reports.tier.' + tierKey)) + '</h2>';
	}

	function sectionSubheading(key) {
		return '<p class="text-muted report-tier-lead">' + RM.Components.escapeHtml(t(key)) + '</p>';
	}

	function openClientListDrawer(title, clients, chartEl, rowSelector) {
		var body = clients.length
			? RM.Components.clientChipList(clients)
			: RM.Components.emptyState(t('pages.reports.noDrilldownData'), t('pages.reports.noDrilldownDataHint'));
		RM.Components.openSideDrawer(title, body, function () {
			if (chartEl && rowSelector) {
				chartEl.querySelectorAll(rowSelector).forEach(function (row) { row.classList.remove('active'); });
			}
		});
	}

	function wireChartDrilldown(containerEl, rowSelector, onActivate) {
		if (!containerEl) { return; }
		containerEl.querySelectorAll(rowSelector).forEach(function (row) {
			function activate() {
				onActivate(row, containerEl);
				containerEl.querySelectorAll(rowSelector).forEach(function (item) { item.classList.remove('active'); });
				row.classList.add('active');
			}
			row.addEventListener('click', activate);
			row.addEventListener('keydown', function (e) {
				if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); }
			});
		});
	}

	function openUtilizationDrawer(category, categoryLabel, chartEl) {
		var detail = RM.ReportEngine.utilizationSeriesDetail(category);
		var body = detail.length
			? '<table class="data-table"><thead><tr>' +
				'<th>' + RM.Components.escapeHtml(t('pages.reports.month')) + '</th>' +
				'<th>' + RM.Components.escapeHtml(t('pages.reports.serviceDeliveries')) + '</th>' +
				'</tr></thead><tbody>' +
				detail.map(function (row) {
					return '<tr><td>' + RM.Components.escapeHtml(row.month) + '</td><td><strong>' + row.units + '</strong></td></tr>';
				}).join('') +
				'</tbody></table>'
			: RM.Components.emptyState(t('pages.reports.noDrilldownData'), t('pages.reports.noDrilldownDataHint'));
		RM.Components.openSideDrawer(
			t('pages.reports.utilizationDrawerTitle', { category: categoryLabel }),
			body,
			function () {
				if (chartEl) {
					chartEl.querySelectorAll('.program-chart-row').forEach(function (row) { row.classList.remove('active'); });
				}
			}
		);
	}

	function renderDistributionChart(containerId, rows, labelKey, countKey, colorKey, drilldown) {
		var el = document.getElementById(containerId);
		if (!el) { return; }
		if (!rows.length) {
			el.innerHTML = RM.Components.emptyState(t('pages.reports.noProgramData'), t('pages.reports.noProgramDataHint'));
			return;
		}
		var total = rows.reduce(function (sum, row) { return sum + row[countKey]; }, 0);
		el.innerHTML = rows.map(function (row) {
			var pct = total ? Math.round((row[countKey] / total) * 100) : 0;
			var fillWidth = row[countKey] > 0 ? Math.max(pct, 1) : 0;
			var bucketValue = drilldown && drilldown.bucketValue ? drilldown.bucketValue(row) : '';
			var ariaLabel = drilldown && drilldown.ariaLabel
				? drilldown.ariaLabel(row)
				: RM.Components.escapeHtml(row[labelKey]) + ': ' + row[countKey];
			return '<div class="risk-chart-row program-chart-row"' +
				(drilldown ? ' role="button" tabindex="0"' : '') +
				(drilldown && bucketValue ? ' ' + drilldown.bucketAttr + '="' + RM.Components.escapeHtml(String(bucketValue)) + '"' : '') +
				(drilldown ? ' aria-label="' + RM.Components.escapeHtml(ariaLabel) + '"' : '') + '>' +
				'<div class="risk-chart-label">' + RM.Components.escapeHtml(row[labelKey]) + '</div>' +
				'<div class="risk-chart-track"><div class="risk-chart-fill" style="width:' + fillWidth + '%;background:' +
				RM.Components.escapeHtml(row[colorKey] || '#2563eb') + '"></div></div>' +
				'<div class="risk-chart-count">' + row[countKey] + '</div></div>';
		}).join('');

		if (drilldown && drilldown.onSelect) {
			wireChartDrilldown(el, '.program-chart-row', function (row, chartEl) {
				drilldown.onSelect(row.getAttribute(drilldown.bucketAttr), row, chartEl);
			});
		}
	}

	function renderUtilizationTrendChart(containerId, trend, drilldown) {
		var el = document.getElementById(containerId);
		if (!el || !trend.months.length) {
			if (el) {
				el.innerHTML = RM.Components.emptyState(t('pages.reports.noUtilizationData'), t('pages.reports.noUtilizationDataHint'));
			}
			return;
		}
		var maxUnits = 0;
		trend.series.forEach(function (series) {
			series.points.forEach(function (point) {
				if (point.units > maxUnits) { maxUnits = point.units; }
			});
		});
		el.innerHTML = trend.series.map(function (series) {
			var latest = series.points[series.points.length - 1];
			var width = maxUnits ? Math.round((latest.units / maxUnits) * 100) : 0;
			var ariaLabel = drilldown
				? t('pages.reports.utilizationDrilldownAria', { count: latest.units, category: series.categoryLabel })
				: series.categoryLabel + ': ' + latest.units;
			return '<div class="risk-chart-row program-chart-row"' +
				(drilldown ? ' role="button" tabindex="0" data-util-category="' + RM.Components.escapeHtml(series.category) + '"' : '') +
				(drilldown ? ' aria-label="' + RM.Components.escapeHtml(ariaLabel) + '"' : '') + '>' +
				'<div class="risk-chart-label">' + RM.Components.escapeHtml(series.categoryLabel) + '</div>' +
				'<div class="risk-chart-track"><div class="risk-chart-fill" style="width:' + Math.max(width, 1) + '%;background:#0891b2"></div></div>' +
				'<div class="risk-chart-count">' + latest.units + '</div></div>';
		}).join('') +
			'<p class="text-muted" style="margin:0.75rem 0 0;font-size:0.8125rem">' +
			RM.Components.escapeHtml(t('pages.reports.utilizationTrendFootnote', { month: trend.months[trend.months.length - 1] })) +
			'</p>';

		if (drilldown && drilldown.onSelect) {
			wireChartDrilldown(el, '.program-chart-row', function (row, chartEl) {
				drilldown.onSelect(row.getAttribute('data-util-category'), row, chartEl);
			});
		}
	}

	function renderStaffActivityTable(staff) {
		if (!staff.length) {
			return RM.Components.emptyState(t('pages.reports.noStaffActivity'), t('pages.reports.noStaffActivityHint'));
		}
		var columns = staffActivityColumns();
		return '<table class="data-table data-table-interactive"><thead><tr>' +
			columns.map(function (col) {
				return '<th>' + RM.Components.escapeHtml(col.label) + '</th>';
			}).join('') +
			'</tr></thead><tbody>' +
			staff.map(function (row) {
				return '<tr class="staff-activity-row" data-staff-id="' + RM.Components.escapeHtml(row.staffId) +
					'" role="button" tabindex="0" aria-label="' +
					RM.Components.escapeHtml(t('pages.reports.staffDrilldownAria', { name: row.staffName, count: row.caseload })) +
					'">' + columns.map(function (col) {
						var value = row[col.key];
						if (col.format) { value = col.format(value, row); }
						return '<td>' + RM.Components.escapeHtml(value == null ? '' : String(value)) + '</td>';
					}).join('') + '</tr>';
			}).join('') +
			'</tbody></table>';
	}

	function wireStaffActivityDrilldown(containerEl) {
		if (!containerEl) { return; }
		RM.Components.wireInteractiveTable(containerEl, '.staff-activity-row', function (row) {
			var staffId = row.getAttribute('data-staff-id');
			var staffName = row.cells[0] ? row.cells[0].textContent : '';
			var clients = RM.ReportEngine.staffCaseloadClients(staffId);
			openClientListDrawer(
				t('pages.reports.staffDrawerTitle', { name: staffName, count: clients.length }),
				clients,
				containerEl,
				'.staff-activity-row'
			);
		});
	}

	function renderIntegrityIssuesTable(issues) {
		if (!issues.length) {
			return RM.Components.emptyState(t('pages.reports.noIntegrityIssues'), t('pages.reports.noIntegrityIssuesHint'));
		}
		var columns = integrityIssueColumns();
		return '<table class="data-table data-table-interactive"><thead><tr>' +
			columns.map(function (col) {
				return '<th>' + RM.Components.escapeHtml(col.label) + '</th>';
			}).join('') +
			'</tr></thead><tbody>' +
			issues.map(function (row) {
				return '<tr class="integrity-issue-row" data-client-id="' + RM.Components.escapeHtml(row.clientId) +
					'" role="button" tabindex="0" aria-label="' +
					RM.Components.escapeHtml(t('pages.reports.integrityRowAria', { name: row.clientName })) +
					'">' + columns.map(function (col) {
						var value = row[col.key];
						if (col.format) { value = col.format(value, row); }
						return '<td>' + RM.Components.escapeHtml(value == null ? '' : String(value)) + '</td>';
					}).join('') + '</tr>';
			}).join('') +
			'</tbody></table>';
	}

	function wireIntegrityDrilldown(containerEl) {
		if (!containerEl) { return; }
		RM.Components.wireInteractiveTable(containerEl, '.integrity-issue-row', function (row) {
			var client = RM.ClientRepository.findById(row.getAttribute('data-client-id'));
			if (!client) { return; }
			RM.Components.openClientDrawer(
				t('pages.reports.integrityDrawerTitle', { name: client.name }),
				client,
				{},
				containerEl,
				'.integrity-issue-row'
			);
		});
	}

	function renderSimpleTable(columns, rows, emptyKey, emptyHintKey) {
		if (!rows.length) {
			return RM.Components.emptyState(t(emptyKey), t(emptyHintKey));
		}
		return '<table class="data-table"><thead><tr>' +
			columns.map(function (col) {
				return '<th>' + RM.Components.escapeHtml(col.label) + '</th>';
			}).join('') +
			'</tr></thead><tbody>' +
			rows.map(function (row) {
				return '<tr>' + columns.map(function (col) {
					var value = row[col.key];
					if (col.format) { value = col.format(value, row); }
					return '<td>' + RM.Components.escapeHtml(value == null ? '' : String(value)) + '</td>';
				}).join('') + '</tr>';
			}).join('') +
			'</tbody></table>';
	}

	function initiativeColumns() {
		return [
			{ key: 'name', label: t('pages.reports.initiativeName') },
			{ key: 'startDate', label: t('pages.reports.startDate') },
			{ key: 'endDate', label: t('pages.reports.endDate') },
			{ key: 'targetOutreach', label: t('pages.reports.targetOutreach') },
			{ key: 'referralsGenerated', label: t('pages.reports.referralsGenerated') },
			{ key: 'enrollments', label: t('pages.reports.enrollments') },
			{ key: 'completions', label: t('pages.reports.completions') },
			{ key: 'outreachPct', label: t('pages.reports.outreachPct'), format: function (v) { return v + '%'; } },
			{ key: 'completionPct', label: t('pages.reports.completionPct'), format: function (v) { return v + '%'; } }
		];
	}

	function subdivisionColumns() {
		return [
			{ key: 'subdivisionLabel', label: t('pages.reports.subdivisionLabel') },
			{ key: 'openCases', label: t('pages.reports.openCases') },
			{ key: 'uniqueClients', label: t('pages.reports.uniqueClients') },
			{ key: 'highRisk', label: t('pages.reports.highRisk') },
			{ key: 'incompleteIntake', label: t('pages.reports.incompleteIntakeCount') }
		];
	}

	function staffActivityColumns() {
		return [
			{ key: 'staffName', label: t('pages.reports.staffName') },
			{ key: 'role', label: t('pages.reports.role') },
			{ key: 'caseload', label: t('pages.reports.caseload') },
			{ key: 'notesLogged', label: t('pages.reports.notesLogged') },
			{ key: 'enrollments', label: t('pages.reports.enrollments') },
			{ key: 'closures', label: t('pages.reports.closures') },
			{ key: 'estimatedDirectHours', label: t('pages.reports.estimatedHours') }
		];
	}

	function integrityIssueColumns() {
		return [
			{ key: 'issueType', label: t('pages.reports.issueType') },
			{ key: 'clientName', label: t('pages.reports.client') },
			{ key: 'detail', label: t('pages.reports.detail') },
			{ key: 'severity', label: t('pages.reports.severity') }
		];
	}

	function auditLogColumns() {
		return [
			{ key: 'timestamp', label: t('pages.reports.timestamp') },
			{ key: 'actor', label: t('pages.reports.actor') },
			{ key: 'action', label: t('pages.reports.action') },
			{ key: 'entityRef', label: t('pages.reports.entityRef') },
			{ key: 'reason', label: t('pages.reports.reason') }
		];
	}

	function utilizationDetailColumns() {
		return [
			{ key: 'month', label: t('pages.reports.month') },
			{ key: 'category', label: t('pages.reports.category') },
			{ key: 'units', label: t('pages.reports.units') }
		];
	}

	function zipColumns() {
		return [
			{ key: 'zip', label: t('pages.reports.zipCode') },
			{ key: 'count', label: t('pages.reports.count') }
		];
	}

	function ageColumns() {
		return [
			{ key: 'ageBandLabel', label: t('pages.reports.ageBandLabel') },
			{ key: 'count', label: t('pages.reports.count') }
		];
	}

	function tierBlock(tierKey, leadKey, bodyHtml, open) {
		return '<details class="report-tier-block"' + (open ? ' open' : '') + '>' +
			'<summary class="report-tier-summary">' +
			'<span class="report-tier-heading">' + RM.Components.escapeHtml(t('pages.reports.tier.' + tierKey)) + '</span>' +
			'<span class="report-tier-summary-lead">' + RM.Components.escapeHtml(t(leadKey)) + '</span>' +
			'</summary>' +
			'<div class="report-tier-body">' + bodyHtml + '</div></details>';
	}

	function cardHeader(titleKey, reportKey, downloadBarHtml) {
		var title = t(titleKey);
		var subscribe = RM.ReportSubscribe
			? RM.ReportSubscribe.subscribeButtonHtml(reportKey, 'standard', title)
			: '';
		return '<div class="card-header"><h2>' + RM.Components.escapeHtml(title) + '</h2>' +
			'<div class="report-card-actions">' + subscribe + (downloadBarHtml || '') + '</div></div>';
	}

	function integrityBodyHtml(prefix) {
		return '<div class="card">' + cardHeader('pages.reports.clientDataIntegrity', 'integrity-client-data-integrity',
			RM.Components.downloadBar({ csvId: prefix + '-integrity' })) +
			'<div id="' + prefix + '-integrity-summary"></div><div id="' + prefix + '-integrity-issues"></div></div>' +
			'<div class="card">' + cardHeader('pages.reports.systemAuditLog', 'integrity-system-audit-log',
			RM.Components.downloadBar({ csvId: prefix + '-audit-log' })) +
			'<div id="' + prefix + '-audit-log"></div></div>';
	}

	function executiveBodyHtml(prefix) {
		return '<div class="card-grid" id="' + prefix + '-impact-stats"></div>' +
			'<div class="card">' + cardHeader('pages.reports.communityImpact', 'executive-community-impact',
			RM.Components.downloadBar({ csvId: prefix + '-impact-detail' })) +
			'<div class="auditor-summary-grid">' +
			'<div><h3>' + RM.Components.escapeHtml(t('pages.reports.zipDistribution')) + '</h3><div id="' + prefix + '-zip-chart"></div></div>' +
			'<div><h3>' + RM.Components.escapeHtml(t('pages.reports.ageDistribution')) + '</h3><div id="' + prefix + '-age-chart"></div></div>' +
			'</div></div>' +
			'<div class="card">' + cardHeader('pages.reports.initiativePerformance', 'executive-initiative-performance',
			RM.Components.downloadBar({ csvId: prefix + '-initiatives' })) +
			'<div id="' + prefix + '-initiatives"></div></div>' +
			'<div class="card">' + cardHeader('pages.reports.outcomeKpis', 'executive-outcome-kpis',
			RM.Components.downloadBar({ csvId: prefix + '-outcome-kpis' })) +
			'<div id="' + prefix + '-outcome-kpis"></div></div>';
	}

	function operationalBodyHtml(prefix) {
		return '<div class="card">' + cardHeader('pages.reports.subdivisionCaseload', 'operational-subdivision-caseload',
			RM.Components.downloadBar({ imageTarget: prefix + '-subdivision-chart', csvId: prefix + '-subdivision' })) +
			'<div id="' + prefix + '-subdivision-chart" class="risk-chart program-chart"></div>' +
			'<div id="' + prefix + '-subdivision-table"></div></div>' +
			'<div class="card">' + cardHeader('pages.reports.serviceUtilizationTrend', 'operational-service-utilization',
			RM.Components.downloadBar({ imageTarget: prefix + '-utilization-chart', csvId: prefix + '-utilization' })) +
			'<div id="' + prefix + '-utilization-chart" class="risk-chart program-chart"></div></div>' +
			'<div class="card">' + cardHeader('pages.reports.staffActivity', 'operational-staff-activity',
			RM.Components.downloadBar({ csvId: prefix + '-staff-activity' })) +
			'<div id="' + prefix + '-staff-activity"></div></div>';
	}

	var TIER_LEAD_KEYS = {
		executive: 'pages.reports.tierExecutiveLead',
		operational: 'pages.reports.tierOperationalLead',
		integrity: 'pages.reports.tierIntegrityLead',
		caseload: 'pages.reports.tierCaseloadLead'
	};

	function setHtml(elementId, html) {
		var el = document.getElementById(elementId);
		if (el) { el.innerHTML = html; }
		return el;
	}

	function mountExecutive(prefix, caseManagerId) {
		var impact = RM.ReportEngine.communityImpactDashboard(caseManagerId);
		var kpis = RM.ReportEngine.performanceOutcomeKpis(caseManagerId);
		var initiatives = RM.ReportEngine.initiativePerformance();

		var statsEl = document.getElementById(prefix + '-impact-stats');
		if (statsEl) {
			statsEl.innerHTML =
				RM.Components.statCard(impact.totalClients, t('pages.reports.totalClients'), 'users', 'primary', null) +
				RM.Components.statCard(impact.activeCases, t('pages.reports.activeCases'), 'briefcase', 'success', null) +
				RM.Components.statCard(impact.registrationOnly, t('pages.reports.registrationOnlyStat'), 'user-plus', 'accent', null) +
				RM.Components.statCard(impact.servicesDelivered, t('pages.reports.servicesDelivered'), 'check-circle', 'warning', null);
		}

		renderDistributionChart(prefix + '-zip-chart', impact.zipDistribution.slice(0, 8), 'zip', 'count', 'color', {
			bucketAttr: 'data-zip',
			bucketValue: function (row) { return row.zip; },
			ariaLabel: function (row) {
				return t('pages.reports.zipDrilldownAria', { zip: row.zip, count: row.count });
			},
			onSelect: function (zip, row, chartEl) {
				var clients = RM.ReportEngine.clientsForZip(zip, caseManagerId);
				openClientListDrawer(
					t('pages.reports.zipDrawerTitle', { zip: zip, count: clients.length }),
					clients,
					chartEl,
					'.program-chart-row'
				);
			}
		});
		renderDistributionChart(prefix + '-age-chart', impact.ageDistribution, 'ageBandLabel', 'count', 'color', {
			bucketAttr: 'data-age-band',
			bucketValue: function (row) { return row.ageBand; },
			ariaLabel: function (row) {
				return t('pages.reports.ageDrilldownAria', { band: row.ageBandLabel, count: row.count });
			},
			onSelect: function (ageBand, row, chartEl) {
				var clients = RM.ReportEngine.clientsForAgeBand(ageBand, caseManagerId);
				openClientListDrawer(
					t('pages.reports.ageDrawerTitle', { band: RM.I18n.t('pages.reports.ageBand.' + ageBand), count: clients.length }),
					clients,
					chartEl,
					'.program-chart-row'
				);
			}
		});

		setHtml(prefix + '-initiatives', renderSimpleTable(
			initiativeColumns(),
			initiatives,
			'pages.reports.noInitiatives',
			'pages.reports.noInitiativesHint'
		));

		setHtml(prefix + '-outcome-kpis',
			'<div class="card-grid">' +
			RM.Components.statCard(kpis.referralCompletionRate != null ? kpis.referralCompletionRate + '%' : '—', t('pages.reports.referralCompletionRate'), 'link', 'primary', null) +
			RM.Components.statCard(kpis.avgTimeToServiceDays != null ? kpis.avgTimeToServiceDays : '—', t('pages.reports.avgTimeToService'), 'clock', 'success', null) +
			RM.Components.statCard(kpis.intakeWithin7DayPct != null ? kpis.intakeWithin7DayPct + '%' : '—', t('pages.reports.intakeWithin7Day'), 'clipboard', 'accent', null) +
			RM.Components.statCard((kpis.enrollmentTrendPct > 0 ? '+' : '') + kpis.enrollmentTrendPct + '%', t('pages.reports.enrollmentTrend'), 'trending-up', 'warning', null) +
			'</div>');

		return { impact: impact, kpis: kpis, initiatives: initiatives };
	}

	function mountOperational(prefix, caseManagerId) {
		var subdivision = RM.ReportEngine.subdivisionCaseloadSummary(caseManagerId);
		var utilization = RM.ReportEngine.serviceUtilizationTrend();
		var staff = RM.ReportEngine.staffActivityUtilization(caseManagerId);

		renderDistributionChart(prefix + '-subdivision-chart', subdivision, 'subdivisionLabel', 'openCases', 'color', {
			bucketAttr: 'data-subdivision-id',
			bucketValue: function (row) { return row.subdivisionId; },
			ariaLabel: function (row) {
				return t('pages.reports.subdivisionDrilldownAria', { subdivision: row.subdivisionLabel, count: row.openCases });
			},
			onSelect: function (subdivisionId, row, chartEl) {
				var clients = RM.ReportEngine.clientsForSubdivision(subdivisionId, caseManagerId);
				var label = RM.ReportEngine.subdivisionLabel(subdivisionId);
				openClientListDrawer(
					t('pages.reports.subdivisionDrawerTitle', { subdivision: label, count: clients.length }),
					clients,
					chartEl,
					'.program-chart-row'
				);
			}
		});
		setHtml(prefix + '-subdivision-table', renderSimpleTable(
			subdivisionColumns(),
			subdivision,
			'pages.reports.noSubdivisionData',
			'pages.reports.noSubdivisionDataHint'
		));

		renderUtilizationTrendChart(prefix + '-utilization-chart', utilization, {
			onSelect: function (category, row, chartEl) {
				var match = utilization.series.find(function (series) { return series.category === category; });
				var label = match ? match.categoryLabel : category;
				openUtilizationDrawer(category, label, chartEl);
			}
		});

		var staffEl = setHtml(prefix + '-staff-activity', renderStaffActivityTable(staff));
		if (staffEl) { wireStaffActivityDrilldown(staffEl); }

		return { subdivision: subdivision, utilization: utilization, staff: staff };
	}

	function mountIntegrity(prefix, caseManagerId) {
		var integrity = RM.ReportEngine.clientDataIntegrityAudit(caseManagerId);
		var auditLog = RM.ReportEngine.systemAuditLogExport();

		setHtml(prefix + '-integrity-summary',
			'<div class="card-grid" style="margin-bottom:1rem">' +
			RM.Components.statCard(integrity.summary.duplicatePairs, t('pages.reports.duplicatePairs'), 'copy', 'warning', null) +
			RM.Components.statCard(integrity.summary.incompleteIntakes, t('pages.reports.incompleteIntakes'), 'alert-circle', 'accent', null) +
			RM.Components.statCard(integrity.summary.registrationOnly, t('pages.reports.registrationOnlyStat'), 'user', 'primary', null) +
			RM.Components.statCard(integrity.summary.missingCaseManager, t('pages.reports.missingCaseManager'), 'user-x', 'success', null) +
			'</div>');

		var integrityEl = setHtml(prefix + '-integrity-issues', renderIntegrityIssuesTable(integrity.issues));
		if (integrityEl) { wireIntegrityDrilldown(integrityEl); }

		setHtml(prefix + '-audit-log', renderSimpleTable(
			auditLogColumns(),
			auditLog.slice(0, 25),
			'pages.reports.noAuditEntries',
			'pages.reports.noAuditEntriesHint'
		));

		return { integrity: integrity, auditLog: auditLog };
	}

	RM.ReportSections = {
		tierHeading: tierHeading,

		buildTierHtml: function (prefix, tierKey) {
			var bodyHtml = '';
			if (tierKey === 'executive') { bodyHtml = executiveBodyHtml(prefix); }
			else if (tierKey === 'operational') { bodyHtml = operationalBodyHtml(prefix); }
			else if (tierKey === 'integrity') { bodyHtml = integrityBodyHtml(prefix); }
			else { return ''; }
			return '<div class="report-tier-page">' +
				sectionSubheading(TIER_LEAD_KEYS[tierKey] || TIER_LEAD_KEYS.executive) +
				bodyHtml + '</div>';
		},

		buildExtendedHtml: function (prefix) {
			return tierBlock('executive', TIER_LEAD_KEYS.executive, executiveBodyHtml(prefix), true) +
				tierBlock('operational', TIER_LEAD_KEYS.operational, operationalBodyHtml(prefix), false) +
				tierBlock('integrity', TIER_LEAD_KEYS.integrity, integrityBodyHtml(prefix), false) +
				'<div class="report-tier-static">' +
				tierHeading('caseload') +
				sectionSubheading(TIER_LEAD_KEYS.caseload) +
				'</div>';
		},

		mount: function (prefix, caseManagerId, tierKey) {
			var data = {};
			if (tierKey === 'executive') {
				Object.assign(data, mountExecutive(prefix, caseManagerId));
			} else if (tierKey === 'operational') {
				Object.assign(data, mountOperational(prefix, caseManagerId));
			} else if (tierKey === 'integrity') {
				Object.assign(data, mountIntegrity(prefix, caseManagerId));
			}
			return data;
		},

		getDownloadHandlers: function (prefix, caseManagerId, data) {
			data = data || {};
			var impact = data.impact || RM.ReportEngine.communityImpactDashboard(caseManagerId);
			var kpis = data.kpis || RM.ReportEngine.performanceOutcomeKpis(caseManagerId);

			return {
				images: {
					[prefix + '-subdivision-chart']: function () {
						var rows = data.subdivision || RM.ReportEngine.subdivisionCaseloadSummary(caseManagerId);
						var total = rows.reduce(function (sum, row) { return sum + row.openCases; }, 0);
						RM.Components.exportProgramDistributionBarChartPng(
							rows.map(function (row) {
								return { programLabel: row.subdivisionLabel, count: row.openCases, color: row.color };
							}),
							total,
							t('pages.reports.subdivisionCaseload'),
							prefix + '-subdivision-caseload.png'
						);
					},
					[prefix + '-utilization-chart']: function () {
						RM.Components.exportElementAsPng(
							document.getElementById(prefix + '-utilization-chart'),
							prefix + '-service-utilization.png'
						);
					}
				},
				csv: {
					[prefix + '-impact-detail']: function () {
						RM.Components.exportXlsx(
							prefix + '-community-impact.xlsx',
							impact.zipDistribution.concat(impact.ageDistribution.map(function (row) {
								return { zip: row.ageBandLabel, count: row.count };
							})),
							zipColumns(),
							{ title: t('pages.reports.communityImpact'), sheetName: t('pages.reports.sheetImpact') }
						);
					},
					[prefix + '-initiatives']: function () {
						RM.Components.exportXlsx(
							prefix + '-initiatives.xlsx',
							data.initiatives,
							initiativeColumns(),
							{ title: t('pages.reports.initiativePerformance'), sheetName: t('pages.reports.sheetInitiatives') }
						);
					},
					[prefix + '-outcome-kpis']: function () {
						RM.Components.exportXlsx(
							prefix + '-outcome-kpis.xlsx',
							[{
								referralCompletionRate: kpis.referralCompletionRate,
								referralTotal: kpis.referralTotal,
								referralComplete: kpis.referralComplete,
								avgTimeToServiceDays: kpis.avgTimeToServiceDays,
								intakeWithin7DayPct: kpis.intakeWithin7DayPct,
								enrollmentTrendPct: kpis.enrollmentTrendPct,
								recentEnrollments: kpis.recentEnrollments,
								priorEnrollments: kpis.priorEnrollments
							}],
							[
								{ key: 'referralCompletionRate', label: t('pages.reports.referralCompletionRate') },
								{ key: 'avgTimeToServiceDays', label: t('pages.reports.avgTimeToService') },
								{ key: 'intakeWithin7DayPct', label: t('pages.reports.intakeWithin7Day') },
								{ key: 'enrollmentTrendPct', label: t('pages.reports.enrollmentTrend') },
								{ key: 'recentEnrollments', label: t('pages.reports.recentEnrollments') },
								{ key: 'priorEnrollments', label: t('pages.reports.priorEnrollments') }
							],
							{ title: t('pages.reports.outcomeKpis'), sheetName: t('pages.reports.sheetOutcomes') }
						);
					},
					[prefix + '-subdivision']: function () {
						RM.Components.exportXlsx(
							prefix + '-subdivision-caseload.xlsx',
							data.subdivision,
							subdivisionColumns(),
							{ title: t('pages.reports.subdivisionCaseload'), sheetName: t('pages.reports.sheetSubdivision') }
						);
					},
					[prefix + '-utilization']: function () {
						RM.Components.exportXlsx(
							prefix + '-service-utilization.xlsx',
							RM.ReportEngine.serviceUtilizationDetail(),
							utilizationDetailColumns(),
							{ title: t('pages.reports.serviceUtilizationTrend'), sheetName: t('pages.reports.sheetUtilization') }
						);
					},
					[prefix + '-staff-activity']: function () {
						RM.Components.exportXlsx(
							prefix + '-staff-activity.xlsx',
							data.staff,
							staffActivityColumns(),
							{ title: t('pages.reports.staffActivity'), sheetName: t('pages.reports.sheetStaff') }
						);
					},
					[prefix + '-integrity']: function () {
						RM.Components.exportXlsx(
							prefix + '-data-integrity.xlsx',
							data.integrity.issues,
							integrityIssueColumns(),
							{ title: t('pages.reports.clientDataIntegrity'), sheetName: t('pages.reports.sheetIntegrity') }
						);
					},
					[prefix + '-audit-log']: function () {
						RM.Components.exportXlsx(
							prefix + '-audit-log.xlsx',
							data.auditLog,
							auditLogColumns(),
							{ title: t('pages.reports.systemAuditLog'), sheetName: t('pages.reports.sheetAuditLog') }
						);
					}
				}
			};
		}
	};
})();
