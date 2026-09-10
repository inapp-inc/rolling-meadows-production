/* global RM */
(function () {
	'use strict';

	function t(key, params) {
		return RM.I18n.t(key, params);
	}

	document.addEventListener('DOMContentLoaded', function () {
		RM.Boot.init({
			activeModule: 'clients',
			activeNav: 'client-search',
			onReady: function () {
				if (RM.Permissions.isLiaison()) {
					window.location.href = 'liaison-lookup.html';
					return;
				}
				if (RM.Permissions.isAuditor()) {
					window.location.href = 'reports.html';
					return;
				}
				var user = RM.Session.getCurrentUser();
				var canDetail = RM.Permissions.canViewCaseDetail();
				renderSearchPage(user, canDetail, document.getElementById('page-content'));
			}
		});
	});

	function renderSearchPage(user, canDetail, main) {
		main.innerHTML =
			RM.Components.modulePageHeader('client-search') +
			'<div class="search-bar">' +
			'<label for="search-input" class="sr-only">' + RM.Components.escapeHtml(t('pages.clientSearch.searchLabel')) + '</label>' +
			'<input type="search" id="search-input" placeholder="' + RM.Components.escapeHtml(t('pages.clientSearch.searchPlaceholder')) + '" aria-label="' + RM.Components.escapeHtml(t('pages.clientSearch.searchLabel')) + '">' +
			'<button type="button" id="btn-search" class="btn btn-primary">' + RM.Components.escapeHtml(t('pages.clientSearch.searchButton')) + '</button>' +
			'</div>' +
			'<div id="cross-program-alert"></div>' +
			'<div id="search-results"></div>';

		function doSearch() {
			var q = document.getElementById('search-input').value.trim();
			var results = q ? RM.ClientRepository.search(q) : RM.Data.registeredClients();
			renderResults(results, canDetail, user, q);
		}

		function scheduleSearch() {
			window.clearTimeout(searchTimer);
			searchTimer = window.setTimeout(doSearch, 200);
		}

		var searchTimer = null;

		document.getElementById('btn-search').addEventListener('click', doSearch);
		document.getElementById('search-input').addEventListener('input', scheduleSearch);
		document.getElementById('search-input').addEventListener('keydown', function (e) {
			if (e.key === 'Enter') {
				window.clearTimeout(searchTimer);
				doSearch();
			}
		});
		doSearch();
	}

	function normalizeSearchText(text) {
		return (text || '').toLowerCase().replace(/[^a-z0-9]/g, '');
	}

	function searchMatchFields(client, query) {
		if (!query) { return []; }
		var q = normalizeSearchText(query);
		var phoneQ = RM.DeduplicationService.normalizePhone(query);
		var fields = [];

		if (q && normalizeSearchText(client.name).indexOf(q) !== -1) {
			fields.push('name');
		}
		if (phoneQ && RM.DeduplicationService.normalizePhone(client.phone).indexOf(phoneQ) !== -1) {
			fields.push('phone');
		}
		if (q && normalizeSearchText(client.address).indexOf(q) !== -1) {
			fields.push('address');
		}
		return fields;
	}

	function searchMatchBadge(client, query) {
		var fields = searchMatchFields(client, query);
		if (!fields.length) { return '—'; }
		var labels = {
			name: t('pages.clientSearch.matchName'),
			phone: t('pages.clientSearch.matchPhone'),
			address: t('pages.clientSearch.matchAddress')
		};
		return fields.map(function (field) {
			return labels[field] || field;
		}).join(', ');
	}

	function duplicatePairsBanner(clients) {
		var pairs = RM.DeduplicationService.pairsAmong(clients);
		if (!pairs.length) { return ''; }

		var items = pairs.map(function (pair) {
			return '<li><strong>' + RM.Components.escapeHtml(pair.client.name) + '</strong> · ' +
				RM.Components.escapeHtml(pair.other.name) + '</li>';
		}).join('');

		return RM.Components.alertHtml('warning',
			'<strong>' + RM.Components.escapeHtml(t('pages.clientSearch.duplicatePairsTitle')) + '</strong>' +
			'<p class="text-muted">' + RM.Components.escapeHtml(t('pages.clientSearch.duplicatePairsHint')) + '</p>' +
			'<ul class="dedup-match-list">' + items + '</ul>');
	}

	function caseCountLabel(client) {
		var cases = RM.CaseService.casesForClient(client.id);
		if (!cases.length) {
			return t('pages.clientSearch.noCases');
		}
		var open = cases.filter(function (c) { return c.status !== 'closed'; }).length;
		return t('pages.clientSearch.caseCount', { total: cases.length, open: open });
	}

	function renderResults(clients, canDetail, user, query) {
		var el = document.getElementById('search-results');
		var alertEl = document.getElementById('cross-program-alert');
		alertEl.innerHTML = '';

		if (!clients.length) {
			el.innerHTML = RM.Components.emptyState(t('pages.clientSearch.noClientsFound'), t('pages.clientSearch.noClientsHint'));
			return;
		}

		if (!canDetail && clients.length) {
			clients.forEach(function (c) {
				var openCases = RM.CaseService.openCasesForClient(c.id);
				openCases.forEach(function (caseRecord) {
					var cm = RM.UserRepository.findById(caseRecord.caseManagerId);
					var programLabel = caseRecord.caseCategoryId && RM.CaseCategories
						? RM.CaseCategories.categoryLabel(caseRecord.caseCategoryId)
						: RM.CrossProgramFlagService.programLabel(caseRecord.programId);
					alertEl.innerHTML += RM.Components.alertHtml('warning',
						'<strong>' + RM.Components.escapeHtml(t('pages.clientSearch.crossProgramFlag')) + '</strong> — ' +
						t('pages.clientSearch.crossProgramBody', {
							program: programLabel,
							name: c.name,
							manager: cm ? cm.name : t('pages.clientSearch.assignedCaseManager')
						}));
				});
			});
		}

		if (!canDetail) {
			el.innerHTML = '';
			return;
		}

		alertEl.innerHTML = duplicatePairsBanner(clients);

		var rows = clients.map(function (c) {
			var dup = RM.DeduplicationService.check({ name: c.name, phone: c.phone, dob: c.dob }, c.id);
			var dupFlag = dup.length ? ' <span title="' + RM.Components.escapeHtml(t('pages.clientSearch.hasDuplicates')) + '">⚠</span>' : '';
			return '<tr class="client-search-row" data-client-id="' + RM.Components.escapeHtml(c.id) + '" role="button" tabindex="0" aria-label="' +
				RM.Components.escapeHtml(t('pages.clientSearch.viewClientAria', { name: c.name })) + '">' +
				'<td>' + RM.Components.escapeHtml(c.name) + dupFlag + '</td>' +
				'<td>' + RM.Components.escapeHtml(searchMatchBadge(c, query)) + '</td>' +
				'<td>' + RM.Components.escapeHtml(c.phone) + '</td>' +
				'<td>' + RM.Components.escapeHtml(c.address) + '</td>' +
				'<td>' + RM.Components.formatDate(c.registeredAt) + '</td>' +
				'<td>' + RM.Components.escapeHtml(caseCountLabel(c)) + '</td></tr>';
		}).join('');

		el.innerHTML = RM.Components.tableResponsive(
			'<table class="data-table data-table-interactive"><thead><tr>' +
			'<th>' + RM.Components.escapeHtml(t('pages.clientSearch.tableName')) + '</th>' +
			'<th>' + RM.Components.escapeHtml(t('pages.clientSearch.tableMatch')) + '</th>' +
			'<th>' + RM.Components.escapeHtml(t('pages.clientSearch.tablePhone')) + '</th>' +
			'<th>' + RM.Components.escapeHtml(t('pages.clientSearch.tableAddress')) + '</th>' +
			'<th>' + RM.Components.escapeHtml(t('pages.clientSearch.tableRegistered')) + '</th>' +
			'<th>' + RM.Components.escapeHtml(t('pages.clientSearch.tableCases')) + '</th></tr></thead><tbody>' + rows + '</tbody></table>'
		);

		el.querySelectorAll('.client-search-row').forEach(function (row) {
			function activate() {
				var clientId = row.getAttribute('data-client-id');
				var client = RM.ClientRepository.findById(clientId);
				if (!client) { return; }
				el.querySelectorAll('.client-search-row').forEach(function (r) { r.classList.remove('active'); });
				row.classList.add('active');
				openClientDrawer(client);
			}
			row.addEventListener('click', activate);
			row.addEventListener('keydown', function (e) {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault();
					activate();
				}
			});
		});
	}

	function openClientDrawer(client) {
		var table = document.querySelector('#search-results .data-table-interactive');
		RM.Components.openClientCasesDrawer(client, table, '.client-search-row');
	}
})();
