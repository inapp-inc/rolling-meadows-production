/* global RM */
(function () {
	'use strict';

	function t(key, params) {
		return RM.I18n.t(key, params);
	}

	var tableEl = null;

	document.addEventListener('DOMContentLoaded', function () {
		RM.Boot.init({
			activeModule: 'documents',
			activeNav: 'documents-hub',
			onReady: function () {
				if (RM.Permissions.isAuditor() || RM.Permissions.isLiaison()) {
					window.location.href = RM.Links.page('dashboard');
					return;
				}
				if (!RM.Permissions.canViewCaseDetail()) {
					window.location.href = 'client-search.html';
					return;
				}
				renderPage();
			}
		});
	});

	function renderPage() {
		var user = RM.Session.getCurrentUser();
		var clients = RM.Data.caseloadForUser(user);
		var main = document.getElementById('page-content');

		main.innerHTML =
			RM.Components.modulePageHeader('documents-hub') +
			'<div id="documents-client-list"></div>';

		var el = document.getElementById('documents-client-list');
		if (!clients.length) {
			el.innerHTML = RM.Components.emptyState(t('pages.documentsHub.noActiveCases'), t('pages.documentsHub.noActiveCasesHint'));
			return;
		}

		var rows = clients.map(function (c) {
			var docs = RM.DocumentRepository.findByClientId(c.id);
			return '<tr class="hub-row" data-client-id="' + RM.Components.escapeHtml(c.id) + '" role="button" tabindex="0">' +
				'<td>' + RM.Components.escapeHtml(c.name) + '</td>' +
				'<td>' + RM.Components.processStageBadge(c) + '</td>' +
				'<td>' + docs.length + '</td>' +
				'<td><button type="button" class="btn btn-sm btn-primary doc-vault-open-btn">' + RM.Components.escapeHtml(t('pages.documentsHub.openVault')) + '</button></td></tr>';
		}).join('');

		el.innerHTML = RM.Components.tableResponsive(
			'<table class="data-table data-table-interactive"><thead><tr>' +
			'<th>' + RM.Components.escapeHtml(t('pages.documentsHub.tableClient')) + '</th>' +
			'<th>' + RM.Components.escapeHtml(t('pages.documentsHub.tableProcessStage')) + '</th>' +
			'<th>' + RM.Components.escapeHtml(t('pages.documentsHub.tableDocuments')) + '</th><th></th></tr></thead><tbody>' + rows + '</tbody></table>'
		);

		tableEl = el.querySelector('.data-table-interactive');
		el.querySelectorAll('.hub-row').forEach(function (row) {
			function openVault(e) {
				if (e && e.target.closest('.doc-vault-open-btn')) {
					e.stopPropagation();
				}
				var clientId = row.getAttribute('data-client-id');
				var client = RM.ClientRepository.findById(clientId);
				if (!client) { return; }
				tableEl.querySelectorAll('.hub-row').forEach(function (r) { r.classList.remove('active'); });
				row.classList.add('active');
				RM.DocumentService.openVaultDrawer(client, {
					onClose: function () {
						row.classList.remove('active');
					}
				});
			}
			row.addEventListener('click', openVault);
			row.querySelector('.doc-vault-open-btn').addEventListener('click', function (e) {
				e.stopPropagation();
				openVault(e);
			});
			row.addEventListener('keydown', function (e) {
				if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openVault(e); }
			});
		});
	}
})();
