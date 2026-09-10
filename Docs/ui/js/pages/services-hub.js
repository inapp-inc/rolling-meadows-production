/* global RM */
(function () {
	'use strict';

	function t(key, params) {
		return RM.I18n.t(key, params);
	}

	document.addEventListener('DOMContentLoaded', function () {
		RM.Boot.init({
			activeModule: 'services',
			activeNav: 'services-hub',
			onReady: function () {
				if (RM.Permissions.isAuditor() || RM.Permissions.isLiaison()) {
					window.location.href = RM.Links.page('dashboard');
					return;
				}
				renderPage();
			}
		});
	});

	function renderPage() {
		var user = RM.Session.getCurrentUser();
		var clients = RM.Data.caseloadForUser(user);
		var openCbo = RM.CBOReferralRepository.findAll().filter(function (r) {
			return r.status === 'Pending' || r.status === 'Sent';
		});
		var main = document.getElementById('page-content');

		main.innerHTML =
			RM.Components.modulePageHeader('services-hub') +
			'<div class="card-grid">' +
			RM.Components.statCard(clients.length, t('pages.servicesHub.activeCaseload'), 'users', 'primary', null) +
			RM.Components.statCard(openCbo.length, t('pages.servicesHub.openCboReferrals'), 'link', 'warning', null) +
			'</div>' +
			'<div class="card"><div class="card-header"><h2>' + RM.Components.escapeHtml(t('pages.servicesHub.quickActions')) + '</h2></div>' +
			'<div class="quick-actions">' +
			'<a href="' + RM.Links.page('bulk-enroll') + '" class="btn btn-primary btn-sm">' + RM.Components.escapeHtml(t('pages.servicesHub.bulkAllocation')) + '</a>' +
			'<a href="' + RM.Links.page('reports') + '" class="btn btn-secondary btn-sm">' + RM.Components.escapeHtml(t('pages.servicesHub.enrollmentReports')) + '</a>' +
			'</div></div>' +
			'<div class="card"><h2>' + RM.Components.escapeHtml(t('pages.servicesHub.enrollByClient')) + '</h2>' +
			'<div id="services-client-list"></div></div>' +
			(openCbo.length ? '<div class="card"><h2>' + RM.Components.escapeHtml(t('pages.servicesHub.openCboTitle')) + '</h2><div id="cbo-open-list"></div></div>' : '');

		var listEl = document.getElementById('services-client-list');
		if (!clients.length) {
			listEl.innerHTML = RM.Components.emptyState(t('pages.servicesHub.noActiveCases'), t('pages.servicesHub.noActiveCasesHint'));
		} else {
			var rows = clients.map(function (c) {
				var enr = RM.ServiceEnrollmentRepository.findByClientId(c.id).length;
				var stageStatus = RM.Workflow.getStatus(c);
				var program = RM.CaseCategories.subcategoryLabel(c.caseSubcategoryId) ||
					RM.CaseCategories.categoryLabel(c.caseCategoryId);
				return '<tr class="services-client-row" data-client-id="' + RM.Components.escapeHtml(c.id) + '">' +
					'<td class="col-client"><strong title="' + RM.Components.escapeHtml(c.name) + '">' +
					RM.Components.escapeHtml(c.name) + '</strong></td>' +
					'<td class="col-program"><span class="case-type-chip" title="' + RM.Components.escapeHtml(program) + '">' +
					RM.Components.escapeHtml(program) + '</span></td>' +
					'<td class="col-enrollments">' + enr + '</td>' +
					'<td class="col-stage"><span class="case-stage-chip" title="' + RM.Components.escapeHtml(stageStatus.label) + '">' +
					RM.Components.escapeHtml(t('pages.servicesHub.stageChip', { stage: stageStatus.stage })) + '</span></td>' +
					'<td class="col-action">' +
					'<a href="' + RM.Links.page('case-workspace', { clientId: c.id, tab: 'services' }) +
					'" class="btn btn-sm btn-secondary">' + RM.Components.escapeHtml(t('pages.servicesHub.openServices')) + '</a></td></tr>';
			}).join('');

			listEl.innerHTML =
				'<div class="table-responsive">' +
				'<table class="data-table services-client-table">' +
				'<thead><tr><th>' + RM.Components.escapeHtml(t('pages.servicesHub.tableClient')) + '</th>' +
				'<th>' + RM.Components.escapeHtml(t('pages.servicesHub.tableProgram')) + '</th>' +
				'<th>' + RM.Components.escapeHtml(t('pages.servicesHub.tableEnrollments')) + '</th>' +
				'<th>' + RM.Components.escapeHtml(t('pages.servicesHub.tableStage')) + '</th><th></th></tr></thead>' +
				'<tbody>' + rows + '</tbody></table></div>';
		}

		if (openCbo.length) {
			var cboRows = openCbo.map(function (r) {
				var client = RM.ClientRepository.findById(r.clientId);
				return '<tr>' +
					'<td class="col-client"><strong>' + RM.Components.escapeHtml(client ? client.name : t('pages.servicesHub.unknownClient')) + '</strong></td>' +
					'<td class="col-cbo">' + RM.Components.escapeHtml(r.cboName) + '</td>' +
					'<td class="col-status">' + RM.Components.escapeHtml(RM.I18n.enumLabel('cboStatus', r.status)) + '</td>' +
					'<td class="col-action">' +
					'<a href="' + RM.Links.page('case-workspace', { clientId: r.clientId, tab: 'services' }) +
					'" class="btn btn-sm btn-secondary">' + RM.Components.escapeHtml(t('pages.servicesHub.open')) + '</a></td></tr>';
			}).join('');

			document.getElementById('cbo-open-list').innerHTML =
				'<div class="table-responsive">' +
				'<table class="data-table services-cbo-table">' +
				'<thead><tr><th>' + RM.Components.escapeHtml(t('pages.servicesHub.tableClient')) + '</th>' +
				'<th>' + RM.Components.escapeHtml(t('pages.servicesHub.tableCbo')) + '</th>' +
				'<th>' + RM.Components.escapeHtml(t('pages.servicesHub.tableStatus')) + '</th><th></th></tr></thead>' +
				'<tbody>' + cboRows + '</tbody></table></div>';
		}
	}
})();
