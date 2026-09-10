/* global RM */
(function () {
	'use strict';

	function t(key, params) {
		return RM.I18n.t(key, params);
	}

	document.addEventListener('DOMContentLoaded', function () {
		RM.Boot.init({
			activeModule: 'services',
			activeNav: 'bulk-enroll',
			onReady: function () {
				if (RM.Permissions.isLiaison() || RM.Permissions.isAuditor()) {
					window.location.href = RM.Links.page('dashboard');
					return;
				}
				if (!RM.Permissions.can('bulkEnroll')) {
					document.getElementById('page-content').innerHTML =
						RM.Components.alert('danger', t('pages.bulkEnrollment.accessDenied'));
					return;
				}
				renderPage();
			}
		});
	});

	function renderPage() {
		var user = RM.Session.getCurrentUser();
		var caseload = RM.Data.caseloadForUser(user);
		var riskGroups = RM.Data.groupByRisk(caseload);
		var main = document.getElementById('page-content');

		main.innerHTML =
			RM.Components.modulePageHeader('bulk-enroll') +
			'<div class="card bulk-enrollment-card">' +
			'<div class="bulk-enroll-panel">' +
			'<div class="form-row form-row-2">' +
			'<div class="form-group"><label for="bulk-event">' + RM.Components.escapeHtml(t('pages.bulkEnrollment.programEvent')) + '</label>' +
			'<select id="bulk-event">' + RM.ReportEngine.localizedEvents().map(function (e) {
				return '<option value="' + e.id + '">' + RM.Components.escapeHtml(e.name) + '</option>';
			}).join('') + '</select></div>' +
			'<div class="form-group"><label for="bulk-filter">' + RM.Components.escapeHtml(t('pages.bulkEnrollment.filterClients')) + '</label>' +
			'<select id="bulk-filter">' +
			'<option value="all">' + RM.Components.escapeHtml(t('pages.bulkEnrollment.filterAll')) + '</option>' +
			'<option value="high">' + RM.Components.escapeHtml(t('pages.bulkEnrollment.filterHigh')) + '</option>' +
			'<option value="incomplete">' + RM.Components.escapeHtml(t('pages.bulkEnrollment.filterIncomplete')) + '</option>' +
			'</select></div></div>' +
			'<fieldset class="bulk-client-fieldset"><legend>' + RM.Components.escapeHtml(t('pages.bulkEnrollment.selectClients')) + '</legend>' +
			'<label class="bulk-client-check bulk-select-all">' +
			'<input type="checkbox" id="bulk-select-all"> <span>' + RM.Components.escapeHtml(t('pages.bulkEnrollment.selectAllVisible')) + '</span></label>' +
			'<div id="bulk-client-list" class="bulk-client-list"></div></fieldset>' +
			'<div class="form-actions">' +
			'<button type="button" id="btn-bulk-enroll" class="btn btn-primary">' + RM.Components.escapeHtml(t('pages.bulkEnrollment.enrollSelected')) + '</button>' +
			'<a href="' + RM.Links.page('reports') + '" class="btn btn-secondary">' + RM.Components.escapeHtml(t('pages.bulkEnrollment.viewReports')) + '</a>' +
			'</div></div></div>';

		renderBulkEnrollPanel(caseload, riskGroups);
	}

	function filterCaseloadForBulk(caseload, riskGroups, filter) {
		if (filter === 'high') {
			return riskGroups.High || [];
		}
		if (filter === 'incomplete') {
			return caseload.filter(function (c) { return c.incompleteIntake; });
		}
		return caseload;
	}

	function updateBulkEnrollButtonLabel(count) {
		var btn = document.getElementById('btn-bulk-enroll');
		if (!btn) { return; }
		btn.textContent = count ? t('pages.bulkEnrollment.enrollCount', { count: count }) : t('pages.bulkEnrollment.enrollSelected');
	}

	function renderBulkEnrollPanel(caseload, riskGroups) {
		var listEl = document.getElementById('bulk-client-list');
		var filterEl = document.getElementById('bulk-filter');
		if (!listEl || !filterEl) { return; }

		function renderList() {
			var filtered = filterCaseloadForBulk(caseload, riskGroups, filterEl.value);
			if (!filtered.length) {
				listEl.innerHTML = RM.Components.emptyState(t('pages.bulkEnrollment.noClientsMatch'), t('pages.bulkEnrollment.noClientsHint'));
				updateBulkEnrollButtonLabel(0);
				return;
			}
			listEl.innerHTML = filtered.map(function (c) {
				var assessment = RM.RiskAssessmentRepository.findLatest(c.id);
				var meta = assessment
					? t('pages.bulkEnrollment.riskLevelMeta', { level: RM.I18n.riskLabel(assessment.overallRisk) })
					: t('pages.bulkEnrollment.riskUnknown');
				if (c.incompleteIntake) { meta += ' · ' + t('pages.bulkEnrollment.incompleteIntake'); }
				return '<label class="bulk-client-check">' +
					'<input type="checkbox" name="bulk-client" value="' + RM.Components.escapeHtml(c.id) + '">' +
					'<span>' + RM.Components.escapeHtml(c.name) + ' <span class="bulk-client-meta">(' + RM.Components.escapeHtml(meta) + ')</span></span></label>';
			}).join('');
			updateBulkSelectionState();
		}

		function updateBulkSelectionState() {
			var boxes = listEl.querySelectorAll('input[name="bulk-client"]');
			var checked = listEl.querySelectorAll('input[name="bulk-client"]:checked');
			var selectAll = document.getElementById('bulk-select-all');
			if (selectAll) {
				selectAll.checked = boxes.length > 0 && checked.length === boxes.length;
				selectAll.indeterminate = checked.length > 0 && checked.length < boxes.length;
			}
			updateBulkEnrollButtonLabel(checked.length);
		}

		renderList();

		filterEl.addEventListener('change', renderList);

		listEl.addEventListener('change', function (e) {
			if (e.target && e.target.name === 'bulk-client') {
				updateBulkSelectionState();
			}
		});

		var selectAll = document.getElementById('bulk-select-all');
		if (selectAll) {
			selectAll.addEventListener('change', function () {
				var checked = selectAll.checked;
				listEl.querySelectorAll('input[name="bulk-client"]').forEach(function (cb) {
					cb.checked = checked;
				});
				updateBulkSelectionState();
			});
		}

		document.getElementById('btn-bulk-enroll').addEventListener('click', function () {
			var eventId = document.getElementById('bulk-event').value;
			var selected = Array.prototype.slice.call(
				document.querySelectorAll('#bulk-client-list input[name="bulk-client"]:checked')
			).map(function (cb) { return cb.value; });
			if (!selected.length) {
				RM.Components.showToast(t('pages.bulkEnrollment.selectOneToast'), 'warning');
				return;
			}
			var results = RM.ServiceEnrollmentRepository.bulkEnroll(
				selected, eventId, RM.Session.getCurrentUser().id
			);
			var eventName = RM.ReportEngine.eventName(eventId);
			RM.Components.showToast(
				results.length ? t('pages.bulkEnrollment.enrolledToast', { count: results.length, program: eventName }) :
					t('pages.bulkEnrollment.alreadyEnrolledToast'),
				results.length ? 'success' : 'warning'
			);
		});
	}
})();
