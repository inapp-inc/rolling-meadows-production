/* global RM */
(function () {
	'use strict';

	function t(key, params) {
		return RM.I18n.t(key, params);
	}

	var FH = RM.FormHelpers;

	document.addEventListener('DOMContentLoaded', function () {
		RM.Boot.init({
			activeModule: 'cases',
			activeNav: 'case-creation',
			onReady: function () {
				if (RM.Permissions.isAuditor()) {
					window.location.href = 'reports.html';
					return;
				}
				if (!RM.Permissions.canViewCaseDetail()) {
					window.location.href = 'client-search.html';
					return;
				}
				renderForm();
			}
		});
	});

	function renderForm() {
		var main = document.getElementById('page-content');
		var pending = RM.Session.getPendingCase() || RM.CaseCategories.defaultSelection();
		var urlClientId = RM.Navigation.getQueryParam('clientId');
		var existingClient = urlClientId ? RM.ClientRepository.findById(urlClientId) : null;

		if (urlClientId && existingClient) {
			RM.Session.setPendingClientId(existingClient.id);
		} else if (!urlClientId) {
			RM.Session.clearPendingClientId();
		}
		var workflow = RM.CaseWorkflow.forSubcategory(pending.subcategoryId);
		var ctx = RM.CaseForm.stageContextForPending(pending, 'intake');
		var assessmentCtx = RM.CaseForm.stageContextForPending(pending, 'assessment');

		var categoryBanner =
			'<div class="case-category-banner">' +
			'<strong>' + RM.Components.escapeHtml(RM.I18n.t('case.categoryBanner')) + '</strong> ' +
			RM.Components.escapeHtml(RM.CaseCategories.categoryLabel(pending.categoryId)) +
			' · <strong>' + RM.Components.escapeHtml(RM.I18n.t('case.subcategoryBanner')) + '</strong> ' +
			RM.Components.escapeHtml(RM.CaseCategories.subcategoryLabel(pending.subcategoryId)) +
			' · <strong>' + RM.Components.escapeHtml(t('pages.referralIntake.workflowLabel')) + '</strong> ' + RM.Components.escapeHtml(workflow.name) +
			' · <a href="' + RM.Links.page('case-creation', existingClient ? { clientId: existingClient.id } : {}) + '">' +
			RM.Components.escapeHtml(t('pages.referralIntake.change')) + '</a>' +
			(existingClient ? ' · <a href="' + RM.Links.page('case-creation') + '">' +
			RM.Components.escapeHtml(t('pages.caseCreation.reset')) + '</a>' : '') +
			'</div>';

		var clientBanner = existingClient
			? '<div class="alert alert-info">' + RM.Components.escapeHtml(t('pages.referralIntake.existingClientBanner', { name: existingClient.name })) + '</div>'
			: '';
		var screeningPrefillBanner = existingClient && RM.CaseForm.hasRegistrationScreening(existingClient)
			? '<div class="alert alert-info">' + RM.Components.escapeHtml(t('pages.referralIntake.screeningPrefillHint')) + '</div>'
			: '';

		main.innerHTML =
			RM.Components.pageHeader(ctx.title, { moduleId: 'cases', lead: t('pages.referralIntake.stepLead') }) +
			categoryBanner +
			clientBanner +
			screeningPrefillBanner +
			'<div id="alerts"></div>' +
			'<form id="referral-intake-form" class="card">' +
			RM.CaseForm.intakeFormHtml(ctx, { includePanelHeader: true, readOnlyClient: !!existingClient }) +
			'<div id="live-cross-program"></div>' +
			'<div class="form-actions"><button type="submit" class="btn btn-primary">' +
			RM.Components.escapeHtml(t('pages.referralIntake.saveOpen', { next: assessmentCtx.title })) +
			'</button></div>' +
			'</form>';

		if (existingClient) {
			RM.CaseForm.populateIntakeForm(existingClient, ctx.config, null, null);
		}

		if (!existingClient) {
			['client-name', 'client-dob', 'client-phone'].forEach(function (id) {
				var el = document.getElementById(id);
				el.addEventListener('input', liveCrossProgram);
				el.addEventListener('blur', liveDedup);
			});
		}

		document.getElementById('referral-intake-form').addEventListener('submit', function (e) {
			e.preventDefault();
			submitForm(pending, ctx, existingClient);
		});
	}

	function liveCrossProgram() {
		var partial = {
			name: document.getElementById('client-name').value,
			dob: document.getElementById('client-dob').value,
			phone: document.getElementById('client-phone').value
		};
		var flag = RM.CrossProgramFlagService.check(partial);
		var el = document.getElementById('live-cross-program');
		el.innerHTML = flag ? RM.Components.renderCrossProgramFlag(flag) : '';
	}

	function hasMeaningfulDedupInput(partial) {
		if ((partial.dob || '').trim()) {
			return true;
		}
		if ((partial.name || '').trim().length >= 2) {
			return true;
		}
		return (partial.phone || '').replace(/\D/g, '').length >= 7;
	}

	function liveDedup() {
		var partial = {
			name: document.getElementById('client-name').value,
			dob: document.getElementById('client-dob').value,
			phone: document.getElementById('client-phone').value
		};
		if (!hasMeaningfulDedupInput(partial)) {
			RM.Components.showDedupDrawer([], {});
			return;
		}
		var matches = RM.DeduplicationService.check(partial, null);
		RM.Components.showDedupDrawer(matches);
	}

	function submitForm(pending, ctx, existingClient) {
		var payload = RM.CaseForm.readIntakePayload(ctx.config);
		var partial = payload.partial;

		if (!existingClient) {
			var flag = RM.CrossProgramFlagService.check(partial);
			if (flag) {
				document.getElementById('alerts').innerHTML = RM.Components.renderCrossProgramFlag(flag);
			}

			var matches = RM.DeduplicationService.check(partial, null);
			if (matches.length) {
				RM.Components.showDuplicateModal(matches, null, function () {
					saveCase(pending, ctx, payload, null);
				});
				return;
			}
		}

		saveCase(pending, ctx, payload, existingClient);
	}

	function saveCase(pending, ctx, payload, existingClient) {
		var user = RM.Session.getCurrentUser();
		var incomplete = !payload.partial.dob || !payload.intake.consentOnFile;
		var client;

		if (existingClient) {
			client = RM.ClientRepository.save(Object.assign({}, existingClient, {
				address: document.getElementById('client-address').value.trim() || existingClient.address,
				screening: Object.assign({}, existingClient.screening || {}, {
					intakeQuestions: payload.intake.intakeQuestions
				})
			}));
		} else {
			client = RM.ClientRepository.save({
				name: payload.partial.name,
				dob: payload.partial.dob,
				phone: payload.partial.phone,
				address: document.getElementById('client-address').value.trim(),
				registeredAt: new Date().toISOString().slice(0, 10),
				registrationSource: 'referral_intake',
				screening: {
					date: new Date().toISOString().slice(0, 10),
					intakeQuestions: payload.intake.intakeQuestions
				}
			});
			RM.Audit.record('client:' + client.id, 'client_registered', client.name);
		}

		var view = RM.CaseService.createCase(client.id, pending, user, { incompleteIntake: incomplete });
		var link = { clientId: client.id, caseId: view.caseId };

		RM.Session.clearPendingCase();
		RM.Session.clearPendingClientId();

		RM.ReferralRepository.save(Object.assign({}, link, payload.referral, {
			dateReceived: new Date().toISOString().slice(0, 10)
		}));

		RM.IntakeRepository.save(Object.assign({}, link, payload.intake, {
			completeness: incomplete ? 'incomplete' : 'complete'
		}));

		RM.Audit.record('case:' + view.caseId, 'case_intake_saved', client.name);
		RM.Session.setActiveClientId(client.id);
		RM.Session.setActiveCaseId(view.caseId);
		window.location.href = FH.workspaceUrl(client.id, ctx.nextTabId || 'assessment', view.caseId);
	}
})();
