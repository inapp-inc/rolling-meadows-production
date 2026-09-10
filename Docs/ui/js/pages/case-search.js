/* global RM */
(function () {
	'use strict';

	function t(key, params) {
		return RM.I18n.t(key, params);
	}

	document.addEventListener('DOMContentLoaded', function () {
		RM.Boot.init({
			activeModule: 'cases',
			activeNav: 'case-search',
			onReady: function () {
				if (RM.Permissions.isAuditor()) {
					window.location.href = 'reports.html';
					return;
				}
				if (!RM.Permissions.canViewCaseDetail()) {
					window.location.href = RM.Links.page('client-search');
					return;
				}
				renderPage(RM.Session.getCurrentUser());
			}
		});
	});

	function caseloadClients(user) {
		return RM.Data.caseloadForUser(user).filter(function (c) {
			return c.status === 'active' || c.status === 'open' || c.status === 'closed';
		});
	}

	function matchesQuery(view, q) {
		if (!q) { return true; }
		var haystack = [
			view.name,
			view.phone,
			view.address,
			view.caseNumber
		].join(' ').toLowerCase();
		return haystack.indexOf(q) !== -1;
	}

	function renderPage(user) {
		var main = document.getElementById('page-content');
		var categories = RM.CaseCategories.localizedCategories();

		main.innerHTML =
			RM.Components.modulePageHeader('case-search') +
			'<div class="case-search-filters card">' +
			'<div class="form-row form-row-3">' +
			'<div class="form-group form-group-grow"><label for="case-search-input">' + RM.Components.escapeHtml(t('nav.caseSearch')) + '</label>' +
			'<input type="search" id="case-search-input" placeholder="' + RM.Components.escapeHtml(t('pages.caseSearch.searchPlaceholder')) + '"></div>' +
			'<div class="form-group"><label for="case-filter-category">' + RM.Components.escapeHtml(t('case.caseCategory')) + '</label>' +
			'<select id="case-filter-category"><option value="">' + RM.Components.escapeHtml(t('case.allCategories')) + '</option>' +
			categories.map(function (cat) {
				return '<option value="' + cat.id + '">' + RM.Components.escapeHtml(cat.label) + '</option>';
			}).join('') +
			'</select></div>' +
			'<div class="form-group"><label for="case-filter-subcategory">' + RM.Components.escapeHtml(t('case.subcategory')) + '</label>' +
			'<select id="case-filter-subcategory"><option value="">' + RM.Components.escapeHtml(t('case.allSubcategories')) + '</option></select></div>' +
			'</div></div>' +
			'<div id="case-search-results" class="case-search-results"></div>';

		var categoryEl = document.getElementById('case-filter-category');
		var subcategoryEl = document.getElementById('case-filter-subcategory');
		var searchInput = document.getElementById('case-search-input');
		var searchTimer = null;

		function refreshSubcategories() {
			var catId = categoryEl.value;
			var cat = categories.find(function (item) { return item.id === catId; });
			var subs = cat ? cat.subcategories : [];
			subcategoryEl.innerHTML = '<option value="">' + RM.Components.escapeHtml(t('case.allSubcategories')) + '</option>' +
				subs.map(function (sub) {
					return '<option value="' + sub.id + '">' + RM.Components.escapeHtml(sub.label) + '</option>';
				}).join('');
		}

		function filterCases() {
			var q = searchInput.value.trim().toLowerCase();
			var catFilter = categoryEl.value;
			var subFilter = subcategoryEl.value;
			var clients = caseloadClients(user).filter(function (c) {
				return matchesQuery(c, q);
			});

			if (catFilter) {
				clients = clients.filter(function (c) { return c.caseCategoryId === catFilter; });
			}
			if (subFilter) {
				clients = clients.filter(function (c) { return c.caseSubcategoryId === subFilter; });
			}

			return clients;
		}

		function renderResults() {
			var clients = filterCases();
			var el = document.getElementById('case-search-results');

			if (!clients.length) {
				el.innerHTML = RM.Components.emptyState(t('pages.caseSearch.noCasesFound'), t('pages.caseSearch.noCasesHint'));
				return;
			}

			var rows = clients.map(function (c) {
				var workflow = RM.CaseWorkflow.forClient(c);
				var stageStatus = RM.Workflow.getStatus(c);
				var cm = RM.UserRepository.findById(c.caseManagerId);
				var caseType = RM.CaseCategories.subcategoryLabel(c.caseSubcategoryId) ||
					RM.CaseCategories.categoryLabel(c.caseCategoryId);
				return '<tr class="case-search-row" data-client-id="' + RM.Components.escapeHtml(c.id) +
					'" data-case-id="' + RM.Components.escapeHtml(c.caseId || '') + '" role="button" tabindex="0">' +
					'<td class="col-client"><strong title="' + RM.Components.escapeHtml(c.name) + '">' +
					RM.Components.escapeHtml(c.name) + '</strong></td>' +
					'<td class="col-type"><span class="case-type-chip" title="' + RM.Components.escapeHtml(caseType) + '">' +
					RM.Components.escapeHtml(caseType) + '</span></td>' +
					'<td class="col-workflow"><span class="case-workflow-name" title="' + RM.Components.escapeHtml(workflow.name) + '">' +
					RM.Components.escapeHtml(workflow.name) + '</span></td>' +
					'<td class="col-stage"><span class="case-stage-chip" title="' + RM.Components.escapeHtml(stageStatus.label) + '">' +
					RM.Components.escapeHtml(t('workspace.stageChip', { stage: stageStatus.stage })) + '</span></td>' +
					'<td class="col-manager" title="' + RM.Components.escapeHtml(cm ? cm.name : '—') + '">' +
					RM.Components.escapeHtml(cm ? cm.name : '—') + '</td>' +
					'<td class="col-opened">' + RM.Components.formatDate(c.createdAt) + '</td>' +
					'<td class="col-status">' + RM.Components.escapeHtml(RM.I18n.clientStatusLabel(c.status)) + '</td>' +
					'<td class="col-action">' +
					'<a href="' + RM.Links.page('case-workspace', { clientId: c.id, caseId: c.caseId }) + '" class="btn btn-sm btn-primary" onclick="event.stopPropagation()">' + RM.Components.escapeHtml(t('pages.caseSearch.open')) + '</a>' +
					'</td></tr>';
			}).join('');

			el.innerHTML =
				'<div class="card case-search-results-card">' +
				'<div class="table-responsive">' +
				'<table class="data-table data-table-interactive case-search-table">' +
				'<thead><tr><th>' + RM.Components.escapeHtml(t('pages.caseSearch.tableClient')) + '</th>' +
				'<th>' + RM.Components.escapeHtml(t('pages.caseSearch.tableProgram')) + '</th>' +
				'<th>' + RM.Components.escapeHtml(t('pages.caseSearch.tableWorkflow')) + '</th>' +
				'<th>' + RM.Components.escapeHtml(t('pages.caseSearch.tableStage')) + '</th>' +
				'<th>' + RM.Components.escapeHtml(t('pages.caseSearch.tableCaseManager')) + '</th>' +
				'<th>' + RM.Components.escapeHtml(t('pages.caseSearch.tableOpened')) + '</th>' +
				'<th>' + RM.Components.escapeHtml(t('pages.caseSearch.tableStatus')) + '</th><th></th></tr></thead>' +
				'<tbody>' + rows + '</tbody></table></div></div>';

			var table = el.querySelector('.data-table-interactive');
			RM.Components.wireInteractiveTable(table, '.case-search-row', function (row) {
				var caseId = row.getAttribute('data-case-id');
				var clientId = row.getAttribute('data-client-id');
				var view = caseId ? RM.CaseService.view(caseId) : RM.CaseService.resolveView(clientId, null);
				if (view) {
					RM.Components.openCaseDrawer(view, table, '.case-search-row');
				}
			});
		}

		categoryEl.addEventListener('change', function () {
			refreshSubcategories();
			renderResults();
		});
		subcategoryEl.addEventListener('change', renderResults);

		function scheduleSearch() {
			window.clearTimeout(searchTimer);
			searchTimer = window.setTimeout(renderResults, 200);
		}

		searchInput.addEventListener('input', scheduleSearch);
		searchInput.addEventListener('keydown', function (e) {
			if (e.key === 'Enter') {
				window.clearTimeout(searchTimer);
				renderResults();
			}
		});

		refreshSubcategories();
		renderResults();
	}
})();
