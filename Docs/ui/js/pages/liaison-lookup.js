/* global RM */
(function () {
	'use strict';

	function t(key, params) {
		return RM.I18n.t(key, params);
	}

	document.addEventListener('DOMContentLoaded', function () {
		RM.Boot.init({
			activeModule: 'clients',
			activeNav: 'liaison-lookup',
			onReady: function () {
				if (RM.Permissions.isAuditor()) {
					window.location.href = 'reports.html';
					return;
				}
				if (!RM.Permissions.isLiaison()) {
					window.location.href = 'dashboard.html';
					return;
				}
				renderPage();
			}
		});
	});

	function renderPage() {
		var main = document.getElementById('page-content');
		main.innerHTML =
			RM.Components.modulePageHeader('liaison-lookup') +
			'<div class="card liaison-lookup-card">' +
			'<h2>' + RM.Components.escapeHtml(t('pages.liaisonLookup.lookupCaller')) + '</h2>' +
			'<div class="search-bar">' +
			'<label for="liaison-search" class="sr-only">' + RM.Components.escapeHtml(t('pages.liaisonLookup.searchLabel')) + '</label>' +
			'<input type="search" id="liaison-search" placeholder="' + RM.Components.escapeHtml(t('pages.liaisonLookup.searchPlaceholder')) + '" aria-label="' + RM.Components.escapeHtml(t('pages.liaisonLookup.searchLabel')) + '">' +
			'<button type="button" id="liaison-search-btn" class="btn btn-primary">' + RM.Components.escapeHtml(t('pages.liaisonLookup.searchButton')) + '</button>' +
			'</div>' +
			'<div id="liaison-results"></div>' +
			'</div>';

		function doSearch() {
			var q = document.getElementById('liaison-search').value.trim();
			renderResults(q);
		}

		document.getElementById('liaison-search-btn').addEventListener('click', doSearch);
		document.getElementById('liaison-search').addEventListener('keydown', function (e) {
			if (e.key === 'Enter') { doSearch(); }
		});

		renderResults('');
	}

	function renderResults(query) {
		var el = document.getElementById('liaison-results');
		var rows = RM.CrossProgramFlagService.lookupContacts(query);

		if (!query) {
			el.innerHTML = RM.Components.emptyState(
				t('pages.liaisonLookup.enterNameOrPhone'),
				t('pages.liaisonLookup.enterHint')
			);
			return;
		}

		if (!rows.length) {
			el.innerHTML = RM.Components.emptyState(
				t('pages.liaisonLookup.noActiveCase'),
				t('pages.liaisonLookup.noActiveCaseHint')
			);
			return;
		}

		el.innerHTML =
			'<p class="liaison-results-summary">' + RM.Components.escapeHtml(
				rows.length === 1
					? t('pages.liaisonLookup.resultsSummary', { count: rows.length })
					: t('pages.liaisonLookup.resultsSummaryPlural', { count: rows.length })
			) + '</p>' +
			'<table class="data-table liaison-results-table" aria-label="' + RM.Components.escapeHtml(t('pages.liaisonLookup.resultsAria')) + '">' +
			'<thead><tr>' +
			'<th>' + RM.Components.escapeHtml(t('pages.liaisonLookup.tableClient')) + '</th>' +
			'<th>' + RM.Components.escapeHtml(t('pages.liaisonLookup.tableProgram')) + '</th>' +
			'<th>' + RM.Components.escapeHtml(t('pages.liaisonLookup.tableCaseManager')) + '</th>' +
			'<th>' + RM.Components.escapeHtml(t('pages.liaisonLookup.tableStatus')) + '</th>' +
			'<th>' + RM.Components.escapeHtml(t('pages.liaisonLookup.tableContact')) + '</th>' +
			'</tr></thead><tbody>' +
			rows.map(function (row) {
				var contactCell = row.contactPhone && row.contactPhone !== '—'
					? '<a href="tel:' + row.contactPhone.replace(/\D/g, '') + '">' +
						RM.Components.escapeHtml(row.contactPhone) + '</a>'
					: RM.Components.escapeHtml(row.contactPhone);
				return '<tr>' +
					'<td>' + RM.Components.escapeHtml(row.clientName) + '</td>' +
					'<td>' + RM.Components.escapeHtml(row.programLabel) + '</td>' +
					'<td>' + RM.Components.escapeHtml(row.caseManagerName) + '</td>' +
					'<td><span class="client-status-badge">' + RM.Components.escapeHtml(RM.I18n.clientStatusLabel(row.caseManagerStatus) || row.caseManagerStatus) + '</span></td>' +
					'<td>' + contactCell + '</td></tr>';
			}).join('') +
			'</tbody></table>';
	}
})();
