/* global RM */
(function () {
	'use strict';

	function t(key, params) {
		return RM.I18n.t(key, params);
	}

	document.addEventListener('DOMContentLoaded', function () {
		RM.Boot.init({
			activeModule: 'clients',
			activeNav: 'client-registration',
			onReady: function () {
				if (RM.Permissions.isLiaison()) {
					window.location.href = 'liaison-lookup.html';
					return;
				}
				if (RM.Permissions.isAuditor()) {
					window.location.href = 'reports.html';
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
		var main = document.getElementById('page-content');
		var reasons = [
			{ value: 'information', labelKey: 'pages.clientRegistration.reasonInformation' },
			{ value: 'brochure', labelKey: 'pages.clientRegistration.reasonBrochure' },
			{ value: 'service_need', labelKey: 'pages.clientRegistration.reasonServiceNeed' },
			{ value: 'emergency', labelKey: 'pages.clientRegistration.reasonEmergency' }
		];

		main.innerHTML =
			RM.Components.modulePageHeader('client-registration') +
			'<p class="page-lead">' + RM.Components.escapeHtml(t('pages.clientRegistration.lead')) + '</p>' +
			'<div id="registration-alerts"></div>' +
			'<form id="client-registration-form" class="card">' +
			'<h2 class="form-section-title">' + RM.Components.escapeHtml(t('pages.clientRegistration.basicInfoTitle')) + '</h2>' +
			'<div class="form-row form-row-2">' +
			'<div class="form-group"><label for="reg-name">' + RM.Components.escapeHtml(t('pages.clientRegistration.nameLabel')) + '</label>' +
			'<input type="text" id="reg-name" required autocomplete="name"></div>' +
			'<div class="form-group"><label for="reg-dob">' + RM.Components.escapeHtml(t('pages.clientRegistration.dobLabel')) + '</label>' +
			'<input type="date" id="reg-dob"></div></div>' +
			'<div class="form-row form-row-2">' +
			'<div class="form-group"><label for="reg-phone">' + RM.Components.escapeHtml(t('pages.clientRegistration.phoneLabel')) + '</label>' +
			'<input type="tel" id="reg-phone" required autocomplete="tel"></div>' +
			'<div class="form-group"><label for="reg-address">' + RM.Components.escapeHtml(t('pages.clientRegistration.addressLabel')) + '</label>' +
			'<input type="text" id="reg-address" required autocomplete="street-address"></div></div>' +
			'<div id="live-cross-program"></div>' +
			'<div id="live-dedup"></div>' +
			RM.CaseForm.registrationScreeningHtml() +
			'<h2 class="form-section-title">' + RM.Components.escapeHtml(t('pages.clientRegistration.screeningTitle')) + '</h2>' +
			'<p class="text-muted">' + RM.Components.escapeHtml(t('pages.clientRegistration.screeningHint')) + '</p>' +
			'<div class="form-group"><label for="reg-reason">' + RM.Components.escapeHtml(t('pages.clientRegistration.contactReasonLabel')) + '</label>' +
			'<select id="reg-reason" required>' +
			reasons.map(function (item) {
				return '<option value="' + item.value + '">' + RM.Components.escapeHtml(t(item.labelKey)) + '</option>';
			}).join('') +
			'</select></div>' +
			'<div class="form-group"><label for="reg-notes">' + RM.Components.escapeHtml(t('pages.clientRegistration.screeningNotesLabel')) + '</label>' +
			'<textarea id="reg-notes" rows="3" placeholder="' + RM.Components.escapeHtml(t('pages.clientRegistration.screeningNotesPlaceholder')) + '"></textarea></div>' +
			'<div class="form-group"><label for="reg-emergency">' + RM.Components.escapeHtml(t('pages.clientRegistration.emergencyTriggerLabel')) + '</label>' +
			'<input type="text" id="reg-emergency" placeholder="' + RM.Components.escapeHtml(t('pages.clientRegistration.emergencyTriggerPlaceholder')) + '">' +
			'<p class="field-hint">' + RM.Components.escapeHtml(t('pages.clientRegistration.emergencyTriggerHint')) + '</p></div>' +
			'<div class="form-check-row">' +
			'<label class="checkbox-label" for="reg-service-need">' +
			'<input type="checkbox" id="reg-service-need">' +
			'<span>' + RM.Components.escapeHtml(t('pages.clientRegistration.serviceNeedLabel')) + '</span></label></div>' +
			'<div class="form-actions">' +
			'<button type="submit" class="btn btn-primary">' + RM.Components.escapeHtml(t('pages.clientRegistration.submit')) + '</button>' +
			'</div></form>';

		['reg-name', 'reg-phone', 'reg-dob'].forEach(function (id) {
			var el = document.getElementById(id);
			el.addEventListener('input', function () {
				liveCrossProgram();
				scheduleDedupCheck();
			});
			el.addEventListener('blur', liveDedup);
		});

		document.getElementById('client-registration-form').addEventListener('submit', function (e) {
			e.preventDefault();
			submitRegistration();
		});
	}

	function identityPartial() {
		return {
			name: document.getElementById('reg-name').value,
			dob: document.getElementById('reg-dob').value,
			phone: document.getElementById('reg-phone').value
		};
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

	var dedupTimer = null;

	function scheduleDedupCheck() {
		window.clearTimeout(dedupTimer);
		dedupTimer = window.setTimeout(updateInlineDedup, 250);
	}

	function liveCrossProgram() {
		var partial = identityPartial();
		if (!hasMeaningfulDedupInput(partial)) {
			document.getElementById('live-cross-program').innerHTML = '';
			return;
		}
		var flag = RM.CrossProgramFlagService.check(partial);
		document.getElementById('live-cross-program').innerHTML = flag
			? RM.Components.renderCrossProgramFlag(flag)
			: '';
	}

	function updateInlineDedup() {
		var partial = identityPartial();
		var el = document.getElementById('live-dedup');
		if (!hasMeaningfulDedupInput(partial)) {
			el.innerHTML = '';
			return;
		}
		var matches = RM.DeduplicationService.check(partial, null);
		if (!matches.length) {
			el.innerHTML = '';
			return;
		}
		el.innerHTML = RM.Components.renderDedupMatches(matches, { linkClient: true });
		wireDedupLinks(el);
	}

	function wireDedupLinks(container) {
		if (!container) { return; }
		container.querySelectorAll('.dedup-open-link').forEach(function (link) {
			link.addEventListener('click', function (ev) {
				ev.preventDefault();
				var clientId = link.getAttribute('data-client-id');
				var client = RM.ClientRepository.findById(clientId);
				if (client) {
					RM.Components.openClientCasesDrawer(client);
				}
			});
		});
	}

	function liveDedup() {
		var partial = identityPartial();
		if (!hasMeaningfulDedupInput(partial)) {
			RM.Components.showDedupDrawer([], {});
			updateInlineDedup();
			return;
		}
		var matches = RM.DeduplicationService.check(partial, null);
		updateInlineDedup();
		RM.Components.showDedupDrawer(matches, {
			onOpen: function (clientId) {
				var client = RM.ClientRepository.findById(clientId);
				if (client) {
					RM.Components.openClientCasesDrawer(client);
				}
			}
		});
	}

	function registrationPayload() {
		return {
			name: document.getElementById('reg-name').value.trim(),
			dob: document.getElementById('reg-dob').value,
			phone: document.getElementById('reg-phone').value.trim(),
			address: document.getElementById('reg-address').value.trim(),
			screening: {
				contactReason: document.getElementById('reg-reason').value,
				notes: document.getElementById('reg-notes').value.trim(),
				emergencyTrigger: document.getElementById('reg-emergency').value.trim(),
				serviceNeedIdentified: document.getElementById('reg-service-need').checked,
				intakeQuestions: RM.CaseForm.readRegistrationScreening()
			}
		};
	}

	function submitRegistration() {
		var user = RM.Session.getCurrentUser();
		var payload = registrationPayload();
		var partial = { name: payload.name, dob: payload.dob, phone: payload.phone };

		var flag = RM.CrossProgramFlagService.check(partial);
		if (flag) {
			document.getElementById('registration-alerts').innerHTML = RM.Components.renderCrossProgramFlag(flag);
		}

		if (!hasMeaningfulDedupInput(partial)) {
			finishRegistration(payload, user);
			return;
		}

		var matches = RM.DeduplicationService.check(partial, null);
		if (matches.length) {
			RM.Components.showDuplicateModal(
				matches,
				function (clientId) {
					var client = RM.ClientRepository.findById(clientId);
					if (client) {
						RM.Components.openClientCasesDrawer(client);
					}
				},
				function () { finishRegistration(payload, user); }
			);
			return;
		}

		finishRegistration(payload, user);
	}

	function finishRegistration(payload, user) {
		var result = RM.CaseService.registerClient(payload, user);
		var alerts = document.getElementById('registration-alerts');

		if (result.openCase) {
			RM.Session.setPendingClientId(result.client.id);
			alerts.innerHTML = RM.Components.alert('warning',
				t('pages.clientRegistration.caseRequiredNotice', { name: result.client.name }));
			window.setTimeout(function () {
				window.location.href = RM.Links.page('case-creation', {
					clientId: result.client.id,
					urgent: result.emergency ? '1' : undefined
				});
			}, 800);
			return;
		}

		alerts.innerHTML = RM.Components.alert('success',
			t('pages.clientRegistration.successNoCase', { name: result.client.name }));
		document.getElementById('client-registration-form').reset();
		document.getElementById('live-cross-program').innerHTML = '';
		document.getElementById('live-dedup').innerHTML = '';
		RM.Components.closeSideDrawer('left');
	}
})();
