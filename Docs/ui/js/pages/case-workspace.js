/* global RM */
(function () {
	'use strict';

	function t(key, params) {
		return RM.I18n.t(key, params);
	}

	var FH = RM.FormHelpers;

	var state = { clientId: null, caseId: null, activeTab: 'intake' };

	function getView() {
		return RM.CaseService.resolveView(state.clientId, state.caseId);
	}

	function intakeRecord(view) {
		if (view && view.caseId) {
			return RM.IntakeRepository.findByCaseId(view.caseId);
		}
		return RM.IntakeRepository.findByClientId(view.id);
	}

	function referralsRecord(view) {
		if (view && view.caseId) {
			return RM.ReferralRepository.findByCaseId(view.caseId);
		}
		return RM.ReferralRepository.findByClientId(view.id);
	}

	function closureRecord(view) {
		if (view && view.caseId) {
			return RM.CaseClosureRepository.findByCaseId(view.caseId);
		}
		return RM.CaseClosureRepository.findByClientId(view.id);
	}

	function entityLink(view, extra) {
		return Object.assign({ clientId: view.id, caseId: view.caseId || null }, extra || {});
	}

	function stageCtx(client, tabId) {
		return RM.CaseForm.stageContext(client, tabId || state.activeTab);
	}

	function dis(readOnly) {
		return readOnly ? ' disabled' : '';
	}

	document.addEventListener('DOMContentLoaded', function () {
		RM.Boot.init({
			activeModule: 'cases',
			activeNav: 'case-workspace',
			onReady: function () {
				if (RM.Permissions.isAuditor()) {
					window.location.href = 'reports.html';
					return;
				}
				if (!RM.Permissions.canViewCaseDetail()) {
					window.location.href = RM.Links.page('case-search');
					return;
				}
				var caseId = RM.Navigation.getQueryParam('caseId') || RM.Session.getActiveCaseId();
				var clientId = RM.Navigation.getQueryParam('clientId') || RM.Session.getActiveClientId();
				if (!clientId && caseId) {
					var byCase = RM.CaseService.view(caseId);
					clientId = byCase ? byCase.id : null;
				}
				if (!clientId) {
					window.location.href = RM.Links.page('case-search');
					return;
				}
				var view = RM.CaseService.resolveView(clientId, caseId);
				if (!view || !view.caseId) {
					window.location.href = RM.Links.page('case-creation', { clientId: clientId });
					return;
				}
				RM.Session.setActiveClientId(clientId);
				RM.Session.setActiveCaseId(view.caseId);
				state.clientId = clientId;
				state.caseId = view.caseId;
				state.activeTab = normalizeTab(RM.Navigation.getQueryParam('tab'), view);
				renderWorkspace();
			}
		});
	});

	function tabsForClient(client) {
		return RM.CaseWorkflow ? RM.CaseWorkflow.tabsForClient(client) : [];
	}

	function normalizeTab(tab, client) {
		var tabs = tabsForClient(client);
		var valid = tabs.some(function (t) { return t.id === tab; });
		return valid ? tab : 'intake';
	}

	function renderWorkspace(options) {
		options = options || {};
		var client = getView();
		if (!client || !client.caseId) {
			document.getElementById('page-content').innerHTML = RM.Components.alert('danger', t('workspace.clientNotFound'));
			return;
		}

		var assessment = RM.RiskAssessmentRepository.findLatest(client);
		var closure = closureRecord(client);
		var readOnly = RM.Permissions.isReadOnly() || client.status === 'closed' || !!closure;
		var main = document.getElementById('page-content');
		var shellExists = !!main.querySelector('#workspace-panel');

		var tabs = tabsForClient(client);
		var workflow = RM.CaseWorkflow.forClient(client);

		if (!shellExists || options.fullRebuild) {
			main.innerHTML =
				'<nav class="workspace-breadcrumb" aria-label="Breadcrumb">' +
				'<a href="' + RM.Links.page('case-search') + '">' + RM.Components.escapeHtml(t('workspace.breadcrumbCaseSearch')) + '</a>' +
				'<span class="breadcrumb-sep" aria-hidden="true">›</span>' +
				'<span>Case: <strong id="workspace-breadcrumb-name">' + RM.Components.escapeHtml(client.name) + '</strong>' +
				(client.caseNumber ? ' <span class="text-muted">(' + RM.Components.escapeHtml(client.caseNumber) + ')</span>' : '') +
				'</span>' +
				'</nav>' +
				'<div class="workspace-header">' +
				'<div class="workspace-client">' +
				'<h1 id="workspace-client-name">' + RM.Components.escapeHtml(client.name) + '</h1>' +
				'<p class="workspace-meta" id="workspace-client-meta">' + RM.Components.formatDate(client.dob) + ' · ' + RM.Components.escapeHtml(client.phone) +
				' · ' + RM.Components.escapeHtml(RM.Components.workflowStageLabel(client)) + '</p>' +
				'<p class="workspace-workflow-meta" id="workspace-workflow-meta">' + RM.Components.escapeHtml(workflow.name) + '</p>' +
				'<div class="workspace-badges" id="workspace-badges">' + buildWorkspaceBadges(client, assessment, closure) + '</div></div>' +
				'<div class="workspace-actions">' +
				'<a href="' + RM.Links.page('client-profile', { clientId: client.id, caseId: client.caseId }) + '" class="btn btn-secondary btn-sm">' + RM.Components.escapeHtml(t('workspace.view360')) + '</a>' +
				'<a href="' + RM.Links.page('case-search') + '" class="btn btn-secondary btn-sm">' + RM.Components.escapeHtml(t('workspace.backToCaseSearch')) + '</a>' +
				'</div></div>' +
				'<div id="workspace-stepper"></div>' +
				'<div id="workspace-alerts"></div>' +
				'<nav class="workspace-tabs workspace-tabs-support" aria-label="' + RM.Components.escapeHtml(t('workspace.caseRecordsAria')) + '">' +
				tabs.filter(function (t) { return !t.process; }).map(function (t) {
					return '<button type="button" class="workspace-tab workspace-tab-support' + (t.id === state.activeTab ? ' active' : '') +
						'" data-tab="' + t.id + '">' + RM.Components.escapeHtml(t.label) + '</button>';
				}).join('') +
				'</nav>' +
				'<div id="workspace-panel" class="workspace-panel"></div>';

			main.querySelectorAll('.workspace-tab').forEach(function (btn) {
				btn.addEventListener('click', function () {
					state.activeTab = btn.getAttribute('data-tab');
					updateTabButtons(main);
					var freshClient = getView();
					var freshClosure = closureRecord(freshClient);
					var freshReadOnly = RM.Permissions.isReadOnly() || freshClient.status === 'closed' || !!freshClosure;
					renderActivePanel(freshClient, freshReadOnly, freshClosure);
				});
			});
		} else {
			updateWorkspaceHeader(client, assessment, closure);
			updateTabButtons(main);
		}

		renderActivePanel(client, readOnly, closure);
		if (RM.Stepper) {
			RM.Stepper.render('workspace-stepper', state.activeTab, client);
			wireStepperNavigation(main, client);
		}
		if (RM.AutofillFab) {
			RM.AutofillFab.sync();
		}
	}

	function wireStepperNavigation(main, client) {
		var stepper = main.querySelector('#workspace-stepper');
		if (!stepper) { return; }
		stepper.querySelectorAll('.workflow-stepper a[href]').forEach(function (link) {
			link.addEventListener('click', function (e) {
				e.preventDefault();
				var href = link.getAttribute('href') || '';
				var q = href.indexOf('?') >= 0 ? href.slice(href.indexOf('?') + 1) : '';
				var tab = q ? new URLSearchParams(q).get('tab') : null;
				if (!tab) { return; }
				state.activeTab = normalizeTab(tab, client);
				updateTabButtons(main);
				var freshClient = getView();
				var freshClosure = closureRecord(freshClient);
				var freshReadOnly = RM.Permissions.isReadOnly() || freshClient.status === 'closed' || !!freshClosure;
				renderActivePanel(freshClient, freshReadOnly, freshClosure);
				RM.Stepper.render('workspace-stepper', state.activeTab, freshClient);
				wireStepperNavigation(main, freshClient);
			});
		});
	}

	function buildWorkspaceBadges(client, assessment, closure) {
		return RM.Components.caseCategoryBadge(client) +
			RM.Components.workflowStageBadge(client) +
			(assessment ? RM.Components.riskBadge(assessment.overallRisk) : '') +
			(client.incompleteIntake ? '<span class="incomplete-badge">' + RM.Components.escapeHtml(t('components.incompleteIntake')) + '</span>' : '') +
			(closure ? '<span class="client-status-badge">' + RM.Components.escapeHtml(t('workspace.closedBadge')) + '</span>' : '');
	}

	function updateWorkspaceHeader(client, assessment, closure) {
		var nameEl = document.getElementById('workspace-client-name');
		var breadcrumbName = document.getElementById('workspace-breadcrumb-name');
		var metaEl = document.getElementById('workspace-client-meta');
		var badgesEl = document.getElementById('workspace-badges');
		if (nameEl) { nameEl.textContent = client.name; }
		if (breadcrumbName) { breadcrumbName.textContent = client.name; }
		if (metaEl) {
			metaEl.textContent = RM.Components.formatDate(client.dob) + ' · ' + (client.phone || '') +
				' · ' + RM.Components.workflowStageLabel(client);
		}
		if (badgesEl) {
			badgesEl.innerHTML = buildWorkspaceBadges(client, assessment, closure);
		}
	}

	function updateTabButtons(main) {
		main.querySelectorAll('.workspace-tab').forEach(function (btn) {
			btn.classList.toggle('active', btn.getAttribute('data-tab') === state.activeTab);
		});
	}

	function renderActivePanel(client, readOnly, closure) {
		var panel = document.getElementById('workspace-panel');
		if (!panel) { return; }
		switch (state.activeTab) {
			case 'intake': renderIntakeTab(panel, client, readOnly); break;
			case 'assessment': renderComprehensiveAssessmentTab(panel, client, readOnly); break;
			case 'risk': renderRiskTab(panel, client, readOnly); break;
			case 'careplan': renderCarePlanTab(panel, client, readOnly); break;
			case 'services': renderServicesTab(panel, client, readOnly); break;
			case 'followup': renderFollowupTab(panel, client, readOnly); break;
			case 'reassessment': renderReassessmentTab(panel, client, readOnly); break;
			case 'documents': renderDocumentsTab(panel, client, readOnly); break;
			case 'activity': renderActivityTab(panel, client); break;
			case 'closure': renderClosureTab(panel, client, readOnly || !!closure); break;
		}
		if (RM.AutofillFab) {
			RM.AutofillFab.sync();
		}
	}

	function showAlert(type, message) {
		if (type === 'success') {
			RM.Components.showToast(message, 'success');
			return;
		}
		document.getElementById('workspace-alerts').innerHTML = RM.Components.alert(type, message);
	}

	function renderIntakeTab(panel, client, readOnly) {
		var ctx = stageCtx(client, 'intake');
		panel.innerHTML =
			'<form id="intake-form" class="card">' +
			RM.CaseForm.intakeFormHtml(ctx, {
				readOnly: readOnly,
				submitLabel: readOnly ? '' : RM.CaseForm.saveContinueLabel(ctx, t('workspace.saveReferralIntake'))
			}) +
			'</form>';

		var intake = intakeRecord(client);
		var ref = referralsRecord(client)[0];
		RM.CaseForm.populateIntakeForm(client, ctx.config, intake, ref);

		if (!readOnly) {
			document.getElementById('intake-form').addEventListener('submit', function (e) {
				e.preventDefault();
				saveIntake(client);
			});
		}
	}

	function saveIntake(client) {
		var ctx = stageCtx(client, 'intake');
		var payload = RM.CaseForm.readIntakePayload(ctx.config);
		var incomplete = !payload.partial.dob || !payload.intake.consentOnFile;

		var existingClient = RM.ClientRepository.findById(client.id);
		RM.ClientRepository.save(Object.assign({}, existingClient, {
			name: payload.partial.name,
			dob: payload.partial.dob,
			phone: payload.partial.phone,
			address: document.getElementById('client-address').value.trim(),
			screening: Object.assign({}, existingClient.screening || {}, {
				intakeQuestions: payload.intake.intakeQuestions
			})
		}));
		RM.CaseService.saveCaseFields(client.caseId, { incompleteIntake: incomplete });
		client = getView();

		var refs = referralsRecord(client);
		if (refs.length) {
			RM.ReferralRepository.update(refs[0].id, payload.referral);
		} else {
			RM.ReferralRepository.save(Object.assign(entityLink(client, payload.referral), {
				dateReceived: today()
			}));
		}

		var existingIntake = intakeRecord(client);
		RM.IntakeRepository.save(Object.assign({}, existingIntake || entityLink(client), payload.intake, {
			completeness: incomplete ? 'incomplete' : 'complete'
		}));

		RM.Audit.record('case:' + client.caseId, 'intake_updated', client.name);
		var nextTab = incomplete ? 'intake' : (ctx.nextTabId || 'assessment');
		RM.Workflow.setStage(client.caseId, RM.CaseWorkflow.stageForTab(client, nextTab));
		showAlert('success', ctx.title + t('workspace.savedSuffix'));
		state.activeTab = nextTab;
		renderWorkspace({ fullRebuild: false });
	}

	function renderComprehensiveAssessmentTab(panel, client, readOnly) {
		var ctx = stageCtx(client, 'assessment');
		var cfg = ctx.config;
		var intake = intakeRecord(client);
		var referral = referralsRecord(client)[0];
		var summary = intake && intake.comprehensiveAssessmentNotes ? intake.comprehensiveAssessmentNotes : '';

		panel.innerHTML =
			'<div class="card"><h3 class="form-section-title">' + RM.Components.escapeHtml(t('workspace.intakeSummaryTitle')) + '</h3>' +
			'<p><strong>' + RM.Components.escapeHtml(t('workspace.referralSource')) + '</strong> ' + RM.Components.escapeHtml(referral ? RM.I18n.referralSourceLabel(referral.source) : '—') +
			' · <strong>' + RM.Components.escapeHtml(t('components.reasonLabel')) + '</strong> ' + RM.Components.escapeHtml(referral ? RM.I18n.referralReasonLabel(referral.reason) : '—') + '</p>' +
			'<p><strong>' + RM.Components.escapeHtml(cfg.livingLabel) + ':</strong> ' + RM.Components.escapeHtml(intake ? intake.livingArrangement || '—' : '—') + '</p>' +
			'<p><strong>' + RM.Components.escapeHtml(cfg.assessmentSummaryBackgroundLabel) + ':</strong> ' + RM.Components.escapeHtml(intake ? intake.medicalHistory || '—' : '—') + '</p></div>' +
			'<form id="comprehensive-form" class="card">' +
			RM.CaseForm.panelHeader(ctx) +
			'<div class="form-group"><label for="comprehensive-notes">' + RM.Components.escapeHtml(cfg.assessmentNoteLabel) + '</label>' +
			'<textarea id="comprehensive-notes" rows="5" placeholder="' + RM.Components.escapeHtml(cfg.assessmentNotePlaceholder) + '"' + dis(readOnly) + '></textarea></div>' +
			(!readOnly ? '<div class="form-actions"><button type="submit" class="btn btn-primary">' +
			RM.CaseForm.saveContinueLabel(ctx, t('workspace.saveAssessment')) + '</button></div>' : '') +
			'</form>';

		document.getElementById('comprehensive-notes').value = summary;

		if (!readOnly) {
			document.getElementById('comprehensive-form').addEventListener('submit', function (e) {
				e.preventDefault();
				var notes = document.getElementById('comprehensive-notes').value.trim();
				var existingIntake = intakeRecord(client);
				RM.IntakeRepository.save(Object.assign({}, existingIntake || entityLink(client), {
					comprehensiveAssessmentNotes: notes
				}));
				var nextTab = ctx.nextTabId || 'risk';
				RM.Workflow.setStage(client.id, RM.CaseWorkflow.stageForTab(client, nextTab));
				showAlert('success', ctx.title + t('workspace.savedSuffix'));
				state.activeTab = nextTab;
				renderWorkspace({ fullRebuild: false });
			});
		}
	}

	function renderRiskTab(panel, client, readOnly) {
		var ctx = stageCtx(client, 'risk');
		var cfg = ctx.config;
		var existing = RM.RiskAssessmentRepository.findLatest(client);
		panel.innerHTML =
			'<form id="risk-form" class="card">' +
			RM.CaseForm.panelHeader(ctx) +
			RM.CaseForm.riskScoringGuideHtml() +
			ratingsTable('risk', existing ? existing.ratings : {}, readOnly, ctx.domains) +
			'<div class="form-group"><label for="override-note">' + RM.Components.escapeHtml(cfg.riskOverrideLabel) + '</label>' +
			'<textarea id="override-note" rows="2"' + dis(readOnly) + '></textarea></div>' +
			'<div id="risk-score-summary"></div>' +
			(!readOnly ? '<div class="form-actions"><button type="submit" class="btn btn-primary">' +
			RM.CaseForm.saveContinueLabel(ctx, t('workspace.saveRatings')) + '</button></div>' : '') +
			'</form>';

		if (existing && existing.overrideNote) {
			document.getElementById('override-note').value = existing.overrideNote;
		}
		wireComposite('risk-form', 'risk', ctx.domains, 'risk-score-summary', existing);

		if (!readOnly) {
			document.getElementById('risk-form').addEventListener('submit', function (e) {
				e.preventDefault();
				var ratings = readRatings('risk', ctx.domains);
				var calc = RM.CaseForm.calcComposite(ratings, ctx.domains);
				RM.RiskAssessmentRepository.upsertLatest(client.id, {
					date: today(),
					ratings: ratings,
					compositeScore: calc.compositeScore,
					overallRisk: calc.overallRisk,
					overrideNote: document.getElementById('override-note').value.trim() || null,
					assessorId: RM.Session.getCurrentUser().id
				});
				var nextTab = ctx.nextTabId || 'careplan';
				RM.Workflow.setStage(client.id, RM.CaseWorkflow.stageForTab(client, nextTab));
				showAlert('success', ctx.title + t('workspace.savedSuffix'));
				state.activeTab = nextTab;
				renderWorkspace({ fullRebuild: false });
			});
		}
	}

	function renderCarePlanTab(panel, client, readOnly) {
		var ctx = stageCtx(client, 'careplan');
		var cfg = ctx.config;
		panel.innerHTML =
			(!readOnly ? '<form id="careplan-form" class="card">' + RM.CaseForm.panelHeader(ctx) +
			'<div class="form-row">' +
			textInput('cp-issue', cfg.carePlanIssueLabel, true, readOnly) +
			textInput('cp-goal', cfg.carePlanGoalLabel, true, readOnly) +
			textInput('cp-service', cfg.carePlanServiceLabel, true, readOnly) +
			selectField('cp-status', t('workspace.status'), FH.carePlanStatusOptions(), false) +
			'</div><button type="submit" class="btn btn-primary">' + RM.Components.escapeHtml(t('workspace.addItem')) + '</button></form>' : '') +
			'<div class="card"><h2>' + RM.Components.escapeHtml(cfg.carePlanListTitle) + '</h2><div id="careplan-list"></div></div>';

		renderCarePlanList(client.id, readOnly, cfg);

		if (!readOnly) {
			FH.setSelectValue(document.getElementById('cp-status'), 'Not Started');
			document.getElementById('careplan-form').addEventListener('submit', function (e) {
				e.preventDefault();
				RM.CarePlanRepository.save({
					clientId: client.id,
					issue: document.getElementById('cp-issue').value.trim(),
					goal: document.getElementById('cp-goal').value.trim(),
					service: document.getElementById('cp-service').value.trim(),
					status: document.getElementById('cp-status').value,
					voided: false
				});
				document.getElementById('careplan-form').reset();
				renderCarePlanList(client.id, readOnly);
				showAlert('success', t('workspace.carePlanAdded'));
			});
		}
	}

	function renderCarePlanList(clientId, readOnly, cfg) {
		cfg = cfg || stageCtx(RM.ClientRepository.findById(clientId), 'careplan').config;
		var items = RM.CarePlanRepository.findAllRecordsByClientId(clientId);
		var el = document.getElementById('careplan-list');
		if (!items.length) {
			el.innerHTML = RM.Components.emptyState(t('workspace.noPlanItems'), t('workspace.addPlanHint', {
				issue: cfg.carePlanIssueLabel.toLowerCase(),
				goal: cfg.carePlanGoalLabel.toLowerCase(),
				service: cfg.carePlanServiceLabel.toLowerCase()
			}));
			return;
		}
		el.innerHTML = '<table class="data-table"><thead><tr><th>' + RM.Components.escapeHtml(cfg.carePlanIssueLabel) +
			'</th><th>' + RM.Components.escapeHtml(cfg.carePlanGoalLabel) + 			'</th><th>' + RM.Components.escapeHtml(cfg.carePlanServiceLabel) +
			'</th><th>' + RM.Components.escapeHtml(t('workspace.status')) + '</th><th></th></tr></thead><tbody>' +
			items.map(function (i) {
				var rowClass = i.voided ? 'voided-row' : '';
				return '<tr class="' + rowClass + '"><td>' + RM.Components.escapeHtml(i.issue) + RM.Components.voidedLabel(i) +
					'</td><td>' + RM.Components.escapeHtml(i.goal) +
					'</td><td>' + RM.Components.escapeHtml(i.service) + '</td><td>' + RM.Components.escapeHtml(RM.I18n.enumLabel('carePlanStatus', i.status)) +
					'</td><td>' + (!readOnly && !i.voided && RM.Permissions.can('voidOwn') ?
						'<button type="button" class="btn btn-sm btn-danger" data-void-cp="' + i.id + '">' + RM.Components.escapeHtml(t('workspace.void')) + '</button>' : '') + '</td></tr>';
			}).join('') + '</tbody></table>';

		el.querySelectorAll('[data-void-cp]').forEach(function (btn) {
			btn.addEventListener('click', function () {
				RM.Components.promptVoid(function (reason) {
					RM.CarePlanRepository.void(btn.getAttribute('data-void-cp'), reason, RM.Session.getCurrentUser().id);
					renderCarePlanList(clientId, readOnly, cfg);
					refreshActivityPanel(clientId);
				});
			});
		});
	}

	function renderServicesTab(panel, client, readOnly) {
		var ctx = stageCtx(client, 'services');
		var cfg = ctx.config;
		var events = RM.ReportEngine.localizedEvents();
		panel.innerHTML =
			'<div class="card">' + RM.CaseForm.panelHeader(ctx) +
			(!readOnly ? '<div class="bulk-toolbar">' +
			'<div class="form-group" style="margin:0"><label for="enroll-event">' + RM.Components.escapeHtml(t('workspace.enrollInProgram')) + '</label>' +
			'<select id="enroll-event">' + events.map(function (e) {
				return '<option value="' + e.id + '">' + RM.Components.escapeHtml(e.name) + '</option>';
			}).join('') + '</select></div>' +
			'<button type="button" id="btn-enroll-one" class="btn btn-primary">' + RM.Components.escapeHtml(t('workspace.enrollClient')) + '</button></div>' : '') +
			'<div id="enrollment-list"></div></div>' +
			'<div class="card"><h2>' + RM.Components.escapeHtml(cfg.cboTitle) + '</h2><div id="cbo-block"></div></div>';

		renderEnrollmentList(client.id, readOnly);
		renderCboBlock(client.id, readOnly);

		if (!readOnly && RM.Permissions.can('bulkEnroll')) {
			document.getElementById('btn-enroll-one').addEventListener('click', function () {
				var eventId = document.getElementById('enroll-event').value;
				RM.ServiceEnrollmentRepository.bulkEnroll([client.id], eventId, RM.Session.getCurrentUser().id);
				renderEnrollmentList(client.id, readOnly);
				showAlert('success', t('workspace.clientEnrolled'));
			});
		}
	}

	function renderEnrollmentList(clientId, readOnly) {
		var enr = RM.ServiceEnrollmentRepository.findAllRecordsByClientId(clientId);
		var el = document.getElementById('enrollment-list');
		if (!enr.length) {
			el.innerHTML = RM.Components.emptyState(t('workspace.noEnrollments'), t('workspace.noEnrollmentsHint'));
			return;
		}
		el.innerHTML = '<table class="data-table"><thead><tr><th>' + RM.Components.escapeHtml(t('workspace.program')) + '</th><th>' + RM.Components.escapeHtml(t('workspace.date')) + '</th><th>' + RM.Components.escapeHtml(t('workspace.status')) + '</th><th></th></tr></thead><tbody>' +
			enr.map(function (e) {
				var eventName = RM.ReportEngine.eventName(e.serviceOrEventId);
				var rowClass = e.voided ? 'voided-row' : '';
				return '<tr class="' + rowClass + '"><td>' + RM.Components.escapeHtml(eventName) +
					RM.Components.voidedLabel(e) + '</td>' +
					'<td>' + RM.Components.formatDate(e.dateEnrolled) + '</td><td>' + RM.Components.escapeHtml(RM.I18n.enumLabel('enrollmentStatus', e.status) || '—') +
					'</td><td>' + (!readOnly && !e.voided && RM.Permissions.can('voidOwn') ?
						'<button type="button" class="btn btn-sm btn-danger" data-void-enr="' + e.id + '">' + RM.Components.escapeHtml(t('workspace.void')) + '</button>' : '') + '</td></tr>';
			}).join('') + '</tbody></table>';

		el.querySelectorAll('[data-void-enr]').forEach(function (btn) {
			btn.addEventListener('click', function () {
				RM.Components.promptVoid(function (reason) {
					RM.ServiceEnrollmentRepository.void(btn.getAttribute('data-void-enr'), reason, RM.Session.getCurrentUser().id);
					renderEnrollmentList(clientId, readOnly);
					refreshActivityPanel(clientId);
				});
			});
		});
	}

	function renderCboBlock(clientId, readOnly) {
		var el = document.getElementById('cbo-block');
		var cbos = client.caseId
			? RM.CBOReferralRepository.findByCaseId(client.caseId)
			: RM.CBOReferralRepository.findByClientId(clientId);
		var formHtml = !readOnly ?
			'<form id="cbo-form"><div class="form-row">' +
			textInput('cbo-name', t('workspace.cboName'), true, readOnly) +
			selectField('cbo-status', t('workspace.status'), FH.cboStatusOptions(), false) +
			'</div><button type="submit" class="btn btn-primary">' + RM.Components.escapeHtml(t('workspace.addCboReferral')) + '</button></form>' : '';
		el.innerHTML = formHtml + '<div id="cbo-list"></div>';

		var listEl = document.getElementById('cbo-list');
		listEl.innerHTML = cbos.length ?
			'<ul>' + cbos.map(function (r) {
				return '<li>' + RM.Components.escapeHtml(r.cboName) + ' — ' + RM.Components.escapeHtml(RM.I18n.enumLabel('cboStatus', r.status)) +
					' (' + RM.Components.formatDate(r.date) + ')</li>';
			}).join('') + '</ul>' :
			RM.Components.emptyState(t('workspace.noCboReferrals'), t('workspace.noCboReferralsHint'));

		if (!readOnly) {
			FH.setSelectValue(document.getElementById('cbo-status'), 'Pending');
			document.getElementById('cbo-form').addEventListener('submit', function (e) {
				e.preventDefault();
				RM.CBOReferralRepository.save({
					clientId: clientId,
					cboName: document.getElementById('cbo-name').value.trim(),
					status: document.getElementById('cbo-status').value,
					date: today()
				});
				document.getElementById('cbo-form').reset();
				renderCboBlock(clientId, readOnly);
				showAlert('success', t('workspace.cboAdded'));
			});
		}
	}

	function renderFollowupTab(panel, client, readOnly) {
		var ctx = stageCtx(client, 'followup');
		var cfg = ctx.config;
		var assessment = RM.RiskAssessmentRepository.findLatest(client);
		var cadence = assessment ? RM.FollowUpCadenceService.getCadence(assessment.overallRisk) : null;

		panel.innerHTML =
			'<div class="card"><h2>' + RM.Components.escapeHtml(cfg.followupCadenceTitle) + '</h2>' +
			'<p>' + RM.Components.escapeHtml(t('workspace.riskLabel')) + ' ' + (assessment ? RM.Components.riskBadge(assessment.overallRisk) : RM.Components.escapeHtml(t('workspace.riskUnknown'))) +
			(cadence ? ' · ' + RM.Components.escapeHtml(t('workspace.recommendedCadence')) + ' <strong>' + cadence.label + '</strong>' : '') + '</p></div>' +
			'<div class="card">' + RM.CaseForm.panelHeader(ctx) +
			(!readOnly ? '<form id="note-form"><div class="form-row">' +
			selectField('note-type', t('workspace.note'), mapPicklistOptions(cfg.noteTypes, 'noteTypes'), false) +
			'<div class="form-group"><label for="note-text">' + RM.Components.escapeHtml(t('workspace.note')) + '</label><textarea id="note-text" rows="3" required></textarea></div></div>' +
			'<button type="submit" class="btn btn-primary">' + RM.Components.escapeHtml(t('workspace.logFollowUp')) + '</button></form>' : '') +
			'<div id="notes-list"></div></div>';

		renderNotesList(client.id, readOnly);

		if (!readOnly) {
			FH.setSelectValue(document.getElementById('note-type'), (cfg.noteTypes || RM.FormHelpers.NOTE_TYPES || [])[0]);
			document.getElementById('note-form').addEventListener('submit', function (e) {
				e.preventDefault();
				RM.CaseNoteRepository.save({
					clientId: client.id,
					authorId: RM.Session.getCurrentUser().id,
					date: today(),
					type: document.getElementById('note-type').value,
					text: document.getElementById('note-text').value.trim(),
					voided: false
				});
				document.getElementById('note-form').reset();
				renderNotesList(client.id, readOnly);
				showAlert('success', t('workspace.followUpLogged'));
			});
		}
	}

	function renderNotesList(clientId, readOnly) {
		var notes = RM.CaseNoteRepository.findAllRecordsByClientId(clientId);
		var el = document.getElementById('notes-list');
		if (!notes.length) {
			el.innerHTML = RM.Components.emptyState(t('workspace.noFollowUpNotes'), t('workspace.noFollowUpNotesHint'));
			return;
		}
		el.innerHTML = notes.map(function (n) {
			var rowClass = n.voided ? 'note-entry voided-row' : 'note-entry';
			return '<div class="' + rowClass + '"><div class="note-meta">' + RM.Components.formatDate(n.date) +
				' · ' + RM.Components.escapeHtml(RM.I18n.noteTypeLabel(n.type)) + RM.Components.voidedLabel(n) + '</div><p>' +
				RM.Components.escapeHtml(n.text) + '</p>' +
				(!readOnly && !n.voided && RM.Permissions.can('voidOwn') ?
					'<button type="button" class="btn btn-sm btn-danger" data-void-note="' + n.id + '">' + RM.Components.escapeHtml(t('workspace.void')) + '</button>' : '') +
				'</div>';
		}).join('');

		el.querySelectorAll('[data-void-note]').forEach(function (btn) {
			btn.addEventListener('click', function () {
				RM.Components.promptVoid(function (reason) {
					RM.CaseNoteRepository.void(btn.getAttribute('data-void-note'), reason, RM.Session.getCurrentUser().id);
					renderNotesList(clientId, readOnly);
					refreshActivityPanel(clientId);
				});
			});
		});
	}

	function renderReassessmentTab(panel, client, readOnly) {
		var ctx = stageCtx(client, 'reassessment');
		var cfg = ctx.config;
		var domains = ctx.domains;
		var previous = RM.RiskAssessmentRepository.findLatest(client);
		panel.innerHTML =
			(previous ? '<div class="card"><h3 class="form-section-title">' + RM.Components.escapeHtml(t('workspace.currentAssessment', { date: RM.Components.formatDate(previous.date) })) + '</h3>' +
				'<div id="previous-risk-score"></div>' +
				ratingsTable('prev', previous.ratings, true, domains) + '</div>' : '') +
			(!readOnly ? '<form id="reassessment-form" class="card">' + RM.CaseForm.panelHeader(ctx) +
			RM.CaseForm.riskScoringGuideHtml() +
			selectField('re-trigger', t('workspace.trigger'), mapPicklistOptions(cfg.reassessmentTriggers, 'reassessmentTriggers'), false) +
			ratingsTable('re', {}, false, domains) +
			'<div id="reassessment-score-summary"></div>' +
			'<button type="submit" class="btn btn-primary">' + RM.CaseForm.saveContinueLabel(ctx, t('workspace.saveReassessment')) + '</button></form>' : '') +
			'<div class="card"><h2>' + RM.Components.escapeHtml(t('workspace.history')) + '</h2><div id="rehistory"></div></div>';

		if (previous) {
			document.getElementById('previous-risk-score').innerHTML = RM.CaseForm.formatRiskScoreSummary(previous, {
				label: t('workspace.currentFinalRiskScore'),
				assessedDate: previous.date
			});
		}

		renderRehistory(client);

		if (!readOnly) {
			FH.setSelectValue(document.getElementById('re-trigger'), (cfg.reassessmentTriggers || RM.FormHelpers.REASSESSMENT_TRIGGERS || [])[0]);
			wireComposite('reassessment-form', 're', domains, 'reassessment-score-summary', previous);
			document.getElementById('reassessment-form').addEventListener('submit', function (e) {
				e.preventDefault();
				var newRatings = readRatings('re', domains);
				var calc = RM.CaseForm.calcComposite(newRatings, domains);
				RM.ReassessmentRepository.save({
					clientId: client.id,
					date: today(),
					previousRatings: previous ? previous.ratings : {},
					newRatings: newRatings,
					trigger: document.getElementById('re-trigger').value
				});
				RM.RiskAssessmentRepository.upsertLatest(client.id, {
					date: today(),
					ratings: newRatings,
					compositeScore: calc.compositeScore,
					overallRisk: calc.overallRisk,
					assessorId: RM.Session.getCurrentUser().id
				});
				showAlert('success', t('workspace.reassessmentSaved'));
				renderWorkspace({ fullRebuild: false });
			});
		}
	}

	function renderRehistory(client) {
		var list = client.caseId
			? RM.ReassessmentRepository.findByCaseId(client.caseId)
			: RM.ReassessmentRepository.findByClientId(client.id);
		var el = document.getElementById('rehistory');
		if (!list.length) {
			el.innerHTML = RM.Components.emptyState(t('workspace.noReassessments'), t('workspace.noReassessmentsHint'));
			return;
		}
		el.innerHTML = list.map(function (r) {
			return '<div class="card reassessment-history-card"><div class="note-meta">' +
				RM.Components.formatDate(r.date) + ' · ' + RM.Components.escapeHtml(RM.I18n.picklistLabel('reassessmentTriggers', r.trigger)) + '</div>' +
				RM.Components.renderRatingsCompare(r.previousRatings, r.newRatings, client) + '</div>';
		}).join('');
	}

	function renderActivityTab(panel, client) {
		panel.innerHTML =
			'<div class="card"><h2>' + RM.Components.escapeHtml(t('workspace.activityAuditTrail')) + '</h2>' +
			'<div id="activity-log"></div></div>' +
			'<div class="card"><h2>' + RM.Components.escapeHtml(t('workspace.voidedEntries')) + '</h2><div id="voided-summary"></div></div>';
		renderActivityPanel(client.id);
	}

	function renderActivityPanel(clientId) {
		var logEl = document.getElementById('activity-log');
		var voidEl = document.getElementById('voided-summary');
		if (!logEl) { return; }

		var entries = RM.Audit.findForClient(clientId);
		logEl.innerHTML = RM.Components.renderActivityLog(entries);

		if (!voidEl) { return; }
		var voidedItems = [];
		RM.ServiceEnrollmentRepository.findAllRecordsByClientId(clientId).forEach(function (e) {
			if (e.voided) {
				voidedItems.push(t('workspace.enrollmentVoidLabel', {
					name: RM.ReportEngine.eventName(e.serviceOrEventId),
					reason: e.voidReason || t('components.noReason')
				}));
			}
		});
		RM.CarePlanRepository.findAllRecordsByClientId(clientId).forEach(function (item) {
			if (item.voided) {
				voidedItems.push(t('workspace.carePlanVoidLabel', {
					issue: item.issue,
					reason: item.voidReason || t('components.noReason')
				}));
			}
		});
		RM.CaseNoteRepository.findAllRecordsByClientId(clientId).forEach(function (note) {
			if (note.voided) {
				voidedItems.push(t('workspace.noteVoidLabel', {
					type: RM.I18n.noteTypeLabel(note.type),
					reason: note.voidReason || t('components.noReason')
				}));
			}
		});

		voidEl.innerHTML = voidedItems.length ?
			'<ul class="voided-summary-list">' + voidedItems.map(function (line) {
				return '<li class="voided-row">' + RM.Components.escapeHtml(line) + '</li>';
			}).join('') + '</ul>' :
			RM.Components.emptyState(t('workspace.noVoidedEntries'), t('workspace.voidedEntriesHint'));
	}

	function refreshActivityPanel(clientId) {
		if (state.activeTab === 'activity') {
			renderActivityPanel(clientId);
		}
	}

	function renderDocumentsTab(panel, client, readOnly) {
		panel.innerHTML =
			'<div class="card"><h2>' + RM.Components.escapeHtml(t('workspace.documentVault')) + '</h2>' +
			RM.DocumentService.renderVaultBody(readOnly) +
			'</div>';

		if (!readOnly) {
			RM.DocumentService.mountVault(client.id, panel, 'case-workspace', {
				onNotify: function (message, type) {
					if (message && type) {
						showAlert(type, message);
					}
				}
			});
		} else {
			RM.DocumentService.mountList(client.id, panel);
		}
	}

	function renderClosureTab(panel, client, readOnly) {
		var ctx = stageCtx(client, 'closure');
		var cfg = ctx.config;
		var existing = closureRecord(client);
		panel.innerHTML =
			(existing ? RM.Components.alert('info', t('workspace.caseClosedOn', { date: RM.Components.formatDate(existing.date) })) : '') +
			'<form id="closure-form" class="card">' + RM.CaseForm.panelHeader(ctx) +
			selectField('closure-reason', t('workspace.closureReason'), FH.enumSelectOptions('closureReason', FH.CLOSURE_REASONS), true) +
			'<div class="form-group"><label for="services-provided">' + RM.Components.escapeHtml(cfg.closureServicesLabel) + '</label><textarea id="services-provided" rows="2"' + dis(readOnly) + '></textarea></div>' +
			'<div class="form-group"><label for="outcomes">' + RM.Components.escapeHtml(cfg.closureOutcomesLabel) + '</label><textarea id="outcomes" rows="2"' + dis(readOnly) + '></textarea></div>' +
			'<div class="form-group"><label for="remaining-risks">' + RM.Components.escapeHtml(cfg.closureRisksLabel) + '</label><textarea id="remaining-risks" rows="2"' + dis(readOnly) + '></textarea></div>' +
			'<div class="form-group"><label for="referral-forward">' + RM.Components.escapeHtml(cfg.closureReferralLabel) + '</label><textarea id="referral-forward" rows="2"' + dis(readOnly) + '></textarea></div>' +
			(!readOnly ? '<button type="submit" class="btn btn-primary">' + RM.Components.escapeHtml(t('workspace.completeStageButtonPrefix')) + ' ' + RM.Components.escapeHtml(ctx.title) + '</button>' : '') +
			'</form>';

		if (existing) {
			FH.setSelectValue(document.getElementById('closure-reason'), existing.reason);
			document.getElementById('services-provided').value = existing.outcomesSummary.servicesProvided || '';
			document.getElementById('outcomes').value = existing.outcomesSummary.outcomesAchieved || '';
			document.getElementById('remaining-risks').value = existing.outcomesSummary.remainingRisks || '';
			document.getElementById('referral-forward').value = existing.outcomesSummary.referralForward || '';
		}

		if (!readOnly) {
			document.getElementById('closure-form').addEventListener('submit', function (e) {
				e.preventDefault();
				if (!window.confirm(t('workspace.completeClosureConfirm'))) { return; }
				RM.CaseClosureRepository.save(entityLink(client, {
					date: today(),
					reason: document.getElementById('closure-reason').value,
					outcomesSummary: {
						servicesProvided: document.getElementById('services-provided').value.trim(),
						outcomesAchieved: document.getElementById('outcomes').value.trim(),
						remainingRisks: document.getElementById('remaining-risks').value.trim(),
						referralForward: document.getElementById('referral-forward').value.trim()
					}
				}));
				RM.CaseService.saveCaseFields(client.caseId, { status: 'closed' });
				RM.Audit.record('case:' + client.caseId, 'case_closed', document.getElementById('closure-reason').value);
				showAlert('success', t('workspace.caseClosedToast'));
				renderWorkspace({ fullRebuild: false });
			});
		}
	}

	function ratingsTable(prefix, ratings, disabled, domains) {
		if (!domains || !domains.length) {
			domains = RM.CaseForm.domainsForClient({ caseSubcategoryId: 'sub-seniors-at-risk' });
		}
		var namePrefix = prefix === 'assessment' ? '' : prefix + '-';
		return '<table class="data-table rating-table"><thead><tr><th>' + RM.Components.escapeHtml(t('components.domain')) + '</th>' +
			FH.localizedLevels().map(function (l) { return '<th>' + RM.Components.escapeHtml(l.label) + '</th>'; }).join('') +
			'</tr></thead><tbody>' +
			domains.map(function (d) {
				return '<tr><td>' + RM.CaseForm.domainLabel(d) + '</td>' +
					FH.LEVELS.map(function (l) {
						var checked = FH.ratingMatches(ratings[d], l) ? ' checked' : '';
						var name = disabled && prefix === 'prev' ? '' : ' name="' + namePrefix + d + '"';
						return '<td><input type="radio"' + name + ' value="' + l + '"' + checked +
							(disabled ? ' disabled' : ' required') + '></td>';
					}).join('') + '</tr>';
			}).join('') + '</tbody></table>';
	}

	function readRatings(prefix, domains) {
		if (!domains || !domains.length) {
			domains = RM.CaseForm.domainsForClient({ caseSubcategoryId: 'sub-seniors-at-risk' });
		}
		var ratings = {};
		var namePrefix = prefix === 'assessment' ? '' : prefix + '-';
		domains.forEach(function (d) {
			var sel = document.querySelector('[name="' + namePrefix + d + '"]:checked');
			ratings[d] = sel ? sel.value : null;
		});
		return ratings;
	}

	function wireComposite(formId, ratingPrefix, domains, summaryElId, savedAssessment) {
		if (!domains || !domains.length) {
			domains = RM.CaseForm.domainsForClient({ caseSubcategoryId: 'sub-seniors-at-risk' });
		}
		summaryElId = summaryElId || 'composite-display';
		ratingPrefix = ratingPrefix || (formId === 'assessment-form' ? 'assessment' : 're');
		var namePrefix = ratingPrefix === 'assessment' ? '' : ratingPrefix + '-';

		function update() {
			var el = document.getElementById(summaryElId);
			if (!el) { return; }
			var ratings = readRatings(ratingPrefix, domains);
			if (domains.some(function (d) { return !ratings[d]; })) {
				if (savedAssessment && savedAssessment.compositeScore != null && ratingPrefix === 'risk') {
					el.innerHTML = RM.CaseForm.formatRiskScoreSummary(savedAssessment, {
						label: t('workspace.finalRiskScore'),
						assessedDate: savedAssessment.date
					});
				} else {
					el.innerHTML = RM.CaseForm.formatRiskScoreSummary(null, { label: t('workspace.finalRiskScore') });
				}
				return;
			}
			var calc = RM.CaseForm.calcComposite(ratings, domains);
			el.innerHTML = RM.CaseForm.formatRiskScoreSummary(calc, {
				label: ratingPrefix === 'risk' ? t('workspace.finalRiskScore') : t('workspace.updatedRiskScore')
			});
		}
		domains.forEach(function (d) {
			document.querySelectorAll('[name="' + namePrefix + d + '"]').forEach(function (r) {
				r.addEventListener('change', update);
			});
		});
		update();
	}

	function mapPicklistOptions(values, category) {
		return (values || []).map(function (value) {
			return { value: value, label: RM.I18n.picklistLabel(category, value) };
		});
	}

	function selectField(id, label, options, required) {
		return '<div class="form-group"><label for="' + id + '">' + label + '</label><select id="' + id + '"' +
			(required ? ' required' : '') + '><option value="">' + RM.Components.escapeHtml(t('forms.common.select')) + '</option>' +
			options.map(function (o) {
				var value = typeof o === 'object' ? o.value : o;
				var display = typeof o === 'object' ? o.label : o;
				return '<option value="' + RM.Components.escapeHtml(value) + '">' + RM.Components.escapeHtml(display) + '</option>';
			}).join('') +
			'</select></div>';
	}

	function textField(id, label, rows, readOnly) {
		return '<div class="form-group"><label for="' + id + '">' + label + '</label>' +
			'<textarea id="' + id + '" rows="' + rows + '"' + dis(readOnly) + '></textarea></div>';
	}

	function textInput(id, label, required, readOnly) {
		return '<div class="form-group"><label for="' + id + '">' + label + '</label>' +
			'<input type="text" id="' + id + '"' + (required ? ' required' : '') + dis(readOnly) + '></div>';
	}

	function today() {
		return new Date().toISOString().slice(0, 10);
	}
})();
