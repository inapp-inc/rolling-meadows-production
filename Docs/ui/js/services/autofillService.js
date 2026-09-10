/* global RM */
(function () {
	'use strict';

	var SUPPORTED_PAGES = {
		'client-registration.html': 'client-registration',
		'referral-intake.html': 'referral-intake',
		'case-workspace.html': 'case-workspace'
	};

	var SAMPLE = {
		name: 'Jordan Ellis',
		dob: '1958-04-12',
		phone: '(847) 555-0198',
		address: '412 Meadow Lane, Rolling Meadows, IL 60008',
		referredBy: 'Alex Morgan, RN — Rolling Meadows Medical Center',
		living: 'Lives alone in a single-family home; daughter checks in twice weekly.',
		medical: 'Type 2 diabetes, mild mobility limitations, recent fall without injury. Uses a cane indoors.',
		assessmentNotes: 'Client ambulates with a cane, prepares simple meals independently, and reports increased isolation since spouse passed. Home has grab bars in bathroom; no active safety plan on file.',
		riskOverride: 'Composite score reviewed with supervisor; moderate nutrition and isolation concerns drive follow-up cadence.',
		carePlan: {
			issue: 'Limited meal preparation and social isolation',
			goal: 'Maintain safe nutrition and weekly social contact within 90 days',
			service: 'Congregate dining referral and home-delivered meals screening'
		},
		cboName: 'Northwest Community Support Center',
		followUpNote: 'Completed wellness check-in by phone. Client agreed to meal program intake call next week.',
		closure: {
			servicesProvided: 'Home safety assessment, meal program enrollment, and care coordination with PCP.',
			outcomes: 'Client reports improved meal routine and attended two congregate dining sessions.',
			remainingRisks: 'Continued monitoring for fall risk during winter months.',
			referralForward: 'Primary care follow-up scheduled; no open CBO referrals.'
		},
		documentLink: {
			title: 'Care plan summary (demo)',
			url: 'https://example.com/docs/jordan-ellis-care-plan.pdf'
		},
		screeningAnswers: {
			livesWith: 'Lives alone; daughter visits weekly.',
			mealPrep: 'Relies on frozen meals; difficulty standing for long periods.',
			transportation: 'Uses senior shuttle for groceries and appointments.',
			medication: 'Weekly pill organizer; occasional missed evening doses.'
		},
		registrationNotes: 'Walk-in screening completed. Client reports difficulty managing meals and would like information on senior programs.',
		emergencyTrigger: ''
	};

	var REGISTRATION_SAMPLE = {
		name: 'Quinn Mercer',
		dob: '1959-11-28',
		address: '518 Demo Ridge Road, Rolling Meadows, IL 60008'
	};

	var RISK_PATTERN = ['Medium', 'Low', 'Medium', 'Low', 'High'];

	function registrationIdentity() {
		var ext = 9000 + (Date.now() % 999);
		return {
			name: REGISTRATION_SAMPLE.name,
			dob: REGISTRATION_SAMPLE.dob,
			phone: '(847) 555-' + String(ext),
			address: REGISTRATION_SAMPLE.address
		};
	}

	function isDuplicateIdentity(partial) {
		if (!partial || !RM.DeduplicationService) { return false; }
		return RM.DeduplicationService.check(partial, null).length > 0;
	}

	function t(key, params) {
		return RM.I18n.t(key, params);
	}

	function currentPageKey() {
		var file = (window.location.pathname.split('/').pop() || '').toLowerCase();
		return SUPPORTED_PAGES[file] || null;
	}

	function el(id) {
		return document.getElementById(id);
	}

	function canFill(node) {
		return !!(node && !node.disabled && !node.readOnly);
	}

	function setValue(node, value) {
		if (!canFill(node)) { return false; }
		node.value = value == null ? '' : String(value);
		fireChange(node);
		return true;
	}

	function setChecked(node, checked) {
		if (!canFill(node)) { return false; }
		node.checked = !!checked;
		fireChange(node);
		return true;
	}

	function fireChange(node) {
		node.dispatchEvent(new Event('input', { bubbles: true }));
		node.dispatchEvent(new Event('change', { bubbles: true }));
	}

	function setSelect(id, value) {
		var select = el(id);
		if (!canFill(select)) { return false; }
		if (!RM.FormHelpers.setSelectValue(select, value)) { return false; }
		fireChange(select);
		return true;
	}

	function fillScreeningQuestions(cfg, prefix) {
		prefix = prefix || '';
		var filled = 0;
		(cfg.intakeQuestions || []).forEach(function (q) {
			var field = el(prefix + q.fieldId);
			var answer = SAMPLE.screeningAnswers[q.key] || SAMPLE.screeningAnswers.mealPrep;
			if (setValue(field, answer)) { filled++; }
		});
		return filled;
	}

	function fillIntakeFields(cfg, options) {
		options = options || {};
		var filled = 0;
		var sources = cfg.sources || RM.FormHelpers.SOURCES;
		var reasons = cfg.reasons || RM.FormHelpers.REASONS;

		if (setSelect('ref-source', sources[0])) { filled++; }
		if (setSelect('ref-reason', reasons[Math.min(1, reasons.length - 1)])) { filled++; }
		if (setValue(el('ref-by'), SAMPLE.referredBy)) { filled++; }

		if (options.includeClient !== false) {
			if (setValue(el('client-name'), SAMPLE.name)) { filled++; }
			if (setValue(el('client-dob'), SAMPLE.dob)) { filled++; }
			if (setValue(el('client-phone'), SAMPLE.phone)) { filled++; }
		}

		if (setValue(el('client-address'), SAMPLE.address)) { filled++; }
		if (setValue(el('living'), SAMPLE.living)) { filled++; }
		if (setValue(el('medical'), SAMPLE.medical)) { filled++; }
		filled += fillScreeningQuestions(cfg);
		if (setChecked(el('consent'), true)) { filled++; }

		return filled;
	}

	function fillRegistration() {
		var identity = registrationIdentity();
		var attempts = 0;
		while (isDuplicateIdentity(identity) && attempts < 5) {
			identity = registrationIdentity();
			attempts++;
		}

		var filled = 0;
		if (setValue(el('reg-name'), identity.name)) { filled++; }
		if (setValue(el('reg-dob'), identity.dob)) { filled++; }
		if (setValue(el('reg-phone'), identity.phone)) { filled++; }
		if (setValue(el('reg-address'), identity.address)) { filled++; }
		if (setSelect('reg-reason', 'service_need')) { filled++; }
		if (setValue(el('reg-notes'), SAMPLE.registrationNotes)) { filled++; }
		if (setValue(el('reg-emergency'), SAMPLE.emergencyTrigger)) { filled++; }
		if (setChecked(el('reg-service-need'), true)) { filled++; }

		RM.CaseForm.registrationQuestions().forEach(function (q) {
			var answer = SAMPLE.screeningAnswers[q.key] || SAMPLE.screeningAnswers.mealPrep;
			if (setValue(el(q.fieldId), answer)) { filled++; }
		});

		return filled;
	}

	function fillReferralIntake() {
		var pending = RM.Session.getPendingCase() || RM.CaseCategories.defaultSelection();
		var ctx = RM.CaseForm.stageContextForPending(pending, 'intake');
		var existingClient = RM.Navigation.getQueryParam('clientId')
			? RM.ClientRepository.findById(RM.Navigation.getQueryParam('clientId'))
			: null;
		return fillIntakeFields(ctx.config, { includeClient: !existingClient });
	}

	function getWorkspaceTab() {
		var active = document.querySelector('.workspace-tab.active');
		if (active) {
			return active.getAttribute('data-tab');
		}
		return RM.Navigation.getQueryParam('tab') || 'intake';
	}

	function getWorkspaceClient() {
		var caseId = RM.Navigation.getQueryParam('caseId') || RM.Session.getActiveCaseId();
		var clientId = RM.Navigation.getQueryParam('clientId') || RM.Session.getActiveClientId();
		if (!clientId && caseId) {
			var byCase = RM.CaseService.view(caseId);
			clientId = byCase ? byCase.id : null;
		}
		return clientId ? RM.CaseService.resolveView(clientId, caseId) : null;
	}

	function fillRiskRatings(prefix, domains) {
		var filled = 0;
		var namePrefix = prefix === 'assessment' ? '' : prefix + '-';
		domains.forEach(function (domain, index) {
			var level = RISK_PATTERN[index % RISK_PATTERN.length];
			var radio = document.querySelector('[name="' + namePrefix + domain + '"][value="' + level + '"]');
			if (radio && canFill(radio)) {
				radio.checked = true;
				fireChange(radio);
				filled++;
			}
		});
		return filled;
	}

	function fillWorkspaceTab(tabId, client) {
		var ctx = RM.CaseForm.stageContext(client, tabId);
		var cfg = ctx.config;
		var filled = 0;

		switch (tabId) {
			case 'intake':
				filled = fillIntakeFields(cfg, {
					includeClient: !canFill(el('client-name')) ? false : true
				});
				break;
			case 'assessment':
				if (setValue(el('comprehensive-notes'), SAMPLE.assessmentNotes)) { filled++; }
				break;
			case 'risk':
				filled += fillRiskRatings('risk', ctx.domains);
				if (setValue(el('override-note'), SAMPLE.riskOverride)) { filled++; }
				break;
			case 'careplan':
				if (setValue(el('cp-issue'), SAMPLE.carePlan.issue)) { filled++; }
				if (setValue(el('cp-goal'), SAMPLE.carePlan.goal)) { filled++; }
				if (setValue(el('cp-service'), SAMPLE.carePlan.service)) { filled++; }
				if (setSelect('cp-status', 'Not Started')) { filled++; }
				break;
			case 'services':
				if (setValue(el('cbo-name'), SAMPLE.cboName)) { filled++; }
				if (setSelect('cbo-status', 'Pending')) { filled++; }
				break;
			case 'followup':
				if (setSelect('note-type', (cfg.noteTypes || RM.FormHelpers.NOTE_TYPES)[0])) { filled++; }
				if (setValue(el('note-text'), SAMPLE.followUpNote)) { filled++; }
				break;
			case 'reassessment':
				if (setSelect('re-trigger', (cfg.reassessmentTriggers || RM.FormHelpers.REASSESSMENT_TRIGGERS)[0])) { filled++; }
				filled += fillRiskRatings('re', ctx.domains);
				break;
			case 'closure':
				if (setSelect('closure-reason', 'Goals met')) { filled++; }
				if (setValue(el('services-provided'), SAMPLE.closure.servicesProvided)) { filled++; }
				if (setValue(el('outcomes'), SAMPLE.closure.outcomes)) { filled++; }
				if (setValue(el('remaining-risks'), SAMPLE.closure.remainingRisks)) { filled++; }
				if (setValue(el('referral-forward'), SAMPLE.closure.referralForward)) { filled++; }
				break;
			case 'documents':
				filled += fillDocumentLinkFields();
				break;
			default:
				return 0;
		}

		return filled;
	}

	function fillDocumentLinkFields() {
		var filled = 0;
		var title = document.querySelector('[data-doc-link-title]');
		var url = document.querySelector('[data-doc-link-url]');
		if (setValue(title, SAMPLE.documentLink.title)) { filled++; }
		if (setValue(url, SAMPLE.documentLink.url)) { filled++; }
		return filled;
	}

	function workspaceHasEditableFields() {
		var panel = document.getElementById('workspace-panel');
		if (!panel) { return false; }
		var tab = getWorkspaceTab();
		if (tab === 'activity') { return false; }
		return !!panel.querySelector(
			'input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled])'
		);
	}

	function canAutofillCurrentPage() {
		var pageKey = currentPageKey();
		if (!pageKey) { return false; }
		if (pageKey === 'case-workspace') {
			return workspaceHasEditableFields();
		}
		if (pageKey === 'client-registration' && !el('client-registration-form')) { return false; }
		if (pageKey === 'referral-intake' && !el('referral-intake-form')) { return false; }
		return true;
	}

	function fillCurrentPage() {
		var pageKey = currentPageKey();
		if (!pageKey) {
			return { ok: false, filled: 0, message: t('demoAutofill.unsupportedPage') };
		}

		var filled = 0;
		if (pageKey === 'client-registration') {
			filled = fillRegistration();
		} else if (pageKey === 'referral-intake') {
			filled = fillReferralIntake();
		} else if (pageKey === 'case-workspace') {
			var client = getWorkspaceClient();
			if (!client) {
				return { ok: false, filled: 0, message: t('demoAutofill.noClient') };
			}
			filled = fillWorkspaceTab(getWorkspaceTab(), client);
		}

		if (!filled) {
			return { ok: false, filled: 0, message: t('demoAutofill.nothingToFill') };
		}

		return { ok: true, filled: filled, message: t('demoAutofill.success') };
	}

	RM.Autofill = {
		currentPageKey: currentPageKey,
		canAutofillCurrentPage: canAutofillCurrentPage,
		fillCurrentPage: fillCurrentPage,
		getWorkspaceTab: getWorkspaceTab
	};
})();
