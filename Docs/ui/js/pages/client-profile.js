/* global RM */
(function () {
	'use strict';

	var state = { clientId: null, caseId: null };

	function t(key, params) {
		return RM.I18n.t(key, params);
	}

	document.addEventListener('DOMContentLoaded', function () {
		RM.Boot.init({
			activeModule: 'cases',
			activeNav: 'client-profile',
			onReady: function () {
				if (RM.Permissions.isAuditor()) {
					window.location.href = 'reports.html';
					return;
				}
				if (!RM.Permissions.canViewCaseDetail()) {
					window.location.href = 'client-search.html';
					return;
				}
				var clientId = RM.Navigation.resolveClientId();
				if (!clientId) {
					window.location.href = 'client-search.html';
					return;
				}
				var person = RM.ClientRepository.findById(clientId);
				if (!person) {
					document.getElementById('page-content').innerHTML = RM.Components.alert('danger', t('workspace.clientNotFound'));
					return;
				}
				state.clientId = clientId;
				state.caseId = RM.Navigation.getQueryParam('caseId') || RM.Session.getActiveCaseId();
				var view = RM.CaseService.resolveView(clientId, state.caseId);
				if (view && view.caseId) {
					state.caseId = view.caseId;
					RM.Session.setActiveCaseId(view.caseId);
				}
				renderProfile(view || person);
			}
		});
	});

	function esc(text) {
		return RM.Components.escapeHtml(text);
	}

	function listForView(repo, view) {
		if (view.caseId && repo.findByCaseId) {
			var byCase = repo.findByCaseId(view.caseId);
			return Array.isArray(byCase) ? byCase : (byCase ? [byCase] : []);
		}
		var byClient = repo.findByClientId(view.id);
		return Array.isArray(byClient) ? byClient : (byClient ? [byClient] : []);
	}

	function intakeForView(view) {
		if (view.caseId) {
			return RM.IntakeRepository.findByCaseId(view.caseId);
		}
		return RM.IntakeRepository.findByClientId(view.id);
	}

	function closureForView(view) {
		if (view.caseId) {
			return RM.CaseClosureRepository.findByCaseId(view.caseId);
		}
		return RM.CaseClosureRepository.findByClientId(view.id);
	}

	function caseSwitcherHtml(view) {
		var cases = RM.CaseService.casesForClient(view.id);
		if (cases.length <= 1) {
			if (cases.length === 1 && cases[0].caseNumber) {
				return '<p class="profile-meta">' + esc(t('pages.clientProfile.caseLabel')) + ' ' +
					esc(cases[0].caseNumber) + '</p>';
			}
			return '';
		}
		var options = cases.map(function (caseRecord) {
			var label = (caseRecord.caseNumber || caseRecord.id) + ' — ' +
				RM.CaseCategories.categoryLabel(caseRecord.caseCategoryId);
			var selected = caseRecord.id === view.caseId ? ' selected' : '';
			return '<option value="' + esc(caseRecord.id) + '"' + selected + '>' + esc(label) + '</option>';
		}).join('');
		return '<div class="profile-case-switch form-group">' +
			'<label for="profile-case-select">' + esc(t('pages.clientProfile.caseLabel')) + '</label>' +
			'<select id="profile-case-select" aria-label="' + esc(t('pages.clientProfile.caseSwitchAria')) + '">' +
			options + '</select></div>';
	}

	function wireCaseSwitcher() {
		var select = document.getElementById('profile-case-select');
		if (!select) { return; }
		select.addEventListener('change', function () {
			state.caseId = select.value;
			RM.Session.setActiveCaseId(state.caseId);
			var url = RM.Links.page('client-profile', { clientId: state.clientId, caseId: state.caseId });
			if (RM.Navigate) {
				RM.Navigate.go(url);
			} else {
				window.location.href = url;
			}
		});
	}

	function sectionWrap(section, client, bodyHtml, options) {
		options = options || {};
		return '<section class="profile-360-section" id="profile-section-' + esc(section.tabId) + '">' +
			RM.CaseForm.profileSectionHeader(section, client, options) +
			'<div class="profile-360-section-body">' + bodyHtml + '</div></section>';
	}

	function renderProfile(client) {
		var main = document.getElementById('page-content');
		var assessment = RM.RiskAssessmentRepository.findLatest(client);
		var closure = closureForView(client);
		var readOnly = RM.Permissions.isReadOnly() || client.status === 'closed' || !!closure;
		var cfg = RM.CaseForm.configForClient(client);
		var profile = RM.CaseForm.profileSections(client);
		var workflow = profile.workflow;
		var focusHtml = workflow.focusAreas.length
			? '<ul class="profile-workflow-focus">' + workflow.focusAreas.map(function (f) {
				return '<li>' + esc(f) + '</li>';
			}).join('') + '</ul>'
			: '';
		var workspaceHref = client.caseId
			? RM.Links.page('case-workspace', { clientId: client.id, caseId: client.caseId })
			: RM.Links.page('case-creation', { clientId: client.id });

		main.innerHTML =
			RM.Components.pageHeader(t('pages.clientProfile.title'), { moduleId: 'cases', lead: client.name }) +
			'<div class="profile-header">' +
			'<div class="profile-header-main">' +
			'<div class="profile-avatar" aria-hidden="true">' + RM.Components.clientInitials(client.name) + '</div>' +
			'<div><p class="profile-name">' + esc(client.name) + '</p>' +
			'<p class="profile-meta">' + esc(t('pages.clientProfile.dobPrefix')) + ' ' + RM.Components.formatDate(client.dob) + ' · ' + esc(client.phone) + '</p>' +
			'<p class="profile-meta">' + esc(client.address) + '</p>' +
			caseSwitcherHtml(client) +
			(client.caseId ? '<p class="profile-meta profile-workflow">' + RM.Components.workflowStageBadge(client) + '</p>' : '') +
			'</div></div>' +
			'<div class="profile-actions">' +
			(assessment ? RM.Components.riskBadge(assessment.overallRisk) : '') +
			(closure ? RM.Components.alert('info', t('components.caseClosedReadOnlyShort')) : '') +
			(client.caseId ? '<a href="' + workspaceHref + '" class="btn btn-primary">' + esc(t('pages.clientProfile.openCaseWorkspace')) + '</a>' : '') +
			'</div></div>' +
			(client.caseId ?
				'<div class="profile-workflow-banner card">' +
				'<p class="profile-workflow-name">' + esc(workflow.name) + '</p>' +
				'<p class="profile-workflow-meta">' + esc(RM.CaseCategories.categoryLabel(client.caseCategoryId)) +
				' · ' + esc(RM.CaseCategories.subcategoryLabel(client.caseSubcategoryId)) + '</p>' +
				(workflow.description ? '<p class="profile-workflow-desc">' + esc(workflow.description) + '</p>' : '') +
				(focusHtml ? '<div class="profile-workflow-focus-wrap"><strong>' + esc(t('pages.clientProfile.focusAreas')) + '</strong>' + focusHtml + '</div>' : '') +
				'</div>' : '') +
			'<div class="profile-360">' +
			(client.caseId ?
				renderIntakeSection(client, cfg, findSection(profile.sections, 'intake')) +
				renderAssessmentSection(client, cfg, findSection(profile.sections, 'assessment')) +
				renderRiskSection(client, findSection(profile.sections, 'risk')) +
				renderCarePlanSection(client, cfg, findSection(profile.sections, 'careplan')) +
				renderServicesSection(client, cfg, findSection(profile.sections, 'services')) +
				renderFollowupSection(client, cfg, findSection(profile.sections, 'followup')) +
				renderReassessmentSection(client, findSection(profile.sections, 'reassessment')) +
				renderClosureSection(client, cfg, findSection(profile.sections, 'closure'), closure) +
				renderDocumentsSection(client, findSection(profile.sections, 'documents'), readOnly)
				: RM.Components.emptyState(t('pages.clientProfile.noOpenCases'), t('pages.clientProfile.noOpenCasesHint'))) +
			'</div>';

		wireCaseSwitcher();
		if (client.caseId) {
			wireDocumentUpload(client.id, readOnly);
		}
	}

	function findSection(sections, tabId) {
		return sections.find(function (s) { return s.tabId === tabId; }) || {
			tabId: tabId,
			title: tabId,
			deliverable: '',
			stageNum: null
		};
	}

	function renderIntakeSection(client, cfg, section) {
		var refs = listForView(RM.ReferralRepository, client);
		var intake = intakeForView(client);
		var body = '';

		if (refs.length) {
			body += refs.map(function (r) {
				return '<div class="profile-subblock"><p><strong>' + esc(t('pages.clientProfile.source')) + '</strong> ' + esc(RM.I18n.referralSourceLabel(r.source)) +
					'</p><p><strong>' + esc(t('pages.clientProfile.reason')) + '</strong> ' + esc(RM.I18n.referralReasonLabel(r.reason)) +
					'</p><p><strong>' + esc(t('pages.clientProfile.date')) + '</strong> ' + RM.Components.formatDate(r.dateReceived) +
					'</p><p><strong>' + esc(t('pages.clientProfile.referredBy')) + '</strong> ' + esc(r.referredBy) + '</p></div>';
			}).join('');
		}

		if (intake) {
			body += '<div class="profile-subblock">' +
				'<p><strong>' + esc(cfg.livingLabel) + ':</strong> ' + esc(intake.livingArrangement || '—') + '</p>' +
				'<p><strong>' + esc(cfg.backgroundLabel) + ':</strong> ' + esc(intake.medicalHistory || '—') + '</p>' +
				(cfg.intakeQuestions || []).map(function (q) {
					var val = intake.intakeQuestions && intake.intakeQuestions[q.key];
					return '<p><strong>' + esc(q.label) + ':</strong> ' + esc(val || '—') + '</p>';
				}).join('') +
				'<p><strong>' + esc(t('pages.clientProfile.consentOnFile')) + '</strong> ' +
				(intake.consentOnFile ? esc(t('enums.consent.Yes')) : esc(t('enums.consent.No'))) + '</p>' +
				'<p><strong>' + esc(t('pages.clientProfile.status')) + '</strong> ' + esc(RM.I18n.intakeCompletenessLabel(intake.completeness) || '—') + '</p></div>';
		}

		if (!body) {
			body = RM.Components.emptyState(t('pages.clientProfile.noIntakeData'), t('pages.clientProfile.noIntakeHint', { stage: section.title.toLowerCase() }));
		}

		return sectionWrap(section, client, body);
	}

	function renderAssessmentSection(client, cfg, section) {
		var intake = intakeForView(client);
		var body = intake && intake.comprehensiveAssessmentNotes
			? '<div class="profile-subblock">' +
				'<p><strong>' + esc(cfg.assessmentSummaryBackgroundLabel) + ':</strong> ' +
				esc(intake.medicalHistory || '—') + '</p>' +
				'<p><strong>' + esc(cfg.assessmentNoteLabel) + ':</strong> ' +
				esc(intake.comprehensiveAssessmentNotes) + '</p></div>'
			: RM.Components.emptyState(t('pages.clientProfile.noAssessmentSummary'), t('pages.clientProfile.noAssessmentHint', { stage: section.title.toLowerCase() }));

		return sectionWrap(section, client, body);
	}

	function renderRiskSection(client, section) {
		var list = listForView(RM.RiskAssessmentRepository, client);
		var body = list.length
			? list.map(function (a) {
				return '<div class="profile-subblock">' +
					'<p class="profile-inline-meta">' + RM.Components.formatDate(a.date) +
					(a.compositeScore != null ? ' · ' + esc(t('pages.clientProfile.composite')) + ' ' + a.compositeScore : '') +
					' · ' + esc(t('pages.clientProfile.overall')) + ' ' + RM.Components.riskBadge(a.overallRisk) + '</p>' +
					RM.CaseForm.formatRatingsTable(a.ratings, client) + '</div>';
			}).join('')
			: RM.Components.emptyState(t('pages.clientProfile.noRatings'), t('pages.clientProfile.noRatingsHint', { stage: section.title.toLowerCase() }));

		return sectionWrap(section, client, body);
	}

	function renderCarePlanSection(client, cfg, section) {
		var items = listForView(RM.CarePlanRepository, client);
		var body = items.length
			? '<table class="data-table"><thead><tr><th>' + esc(cfg.carePlanIssueLabel) +
				'</th><th>' + esc(cfg.carePlanGoalLabel) + '</th><th>' + esc(cfg.carePlanServiceLabel) +
				'</th><th>' + esc(t('pages.clientProfile.status')) + '</th></tr></thead><tbody>' +
				items.map(function (i) {
					return '<tr><td>' + esc(i.issue) + '</td><td>' + esc(i.goal) +
						'</td><td>' + esc(i.service) + '</td><td>' + esc(RM.I18n.enumLabel('carePlanStatus', i.status)) + '</td></tr>';
				}).join('') + '</tbody></table>'
			: RM.Components.emptyState(t('pages.clientProfile.noPlanItems'), t('pages.clientProfile.noPlanHint', { list: cfg.carePlanListTitle.toLowerCase() }));

		return sectionWrap(section, client, body);
	}

	function renderServicesSection(client, cfg, section) {
		var enr = listForView(RM.ServiceEnrollmentRepository, client);
		var cbos = listForView(RM.CBOReferralRepository, client);
		var body = '';

		if (enr.length) {
			body += '<h3 class="profile-subheading">' + esc(cfg.servicesTitle) + '</h3><ul class="profile-list">' +
				enr.map(function (e) {
					return '<li>' + esc(RM.ReportEngine.eventName(e.serviceOrEventId)) + ' — ' + RM.Components.formatDate(e.dateEnrolled) + '</li>';
				}).join('') + '</ul>';
		}
		if (cbos.length) {
			body += '<h3 class="profile-subheading">' + esc(cfg.cboTitle) + '</h3><ul class="profile-list">' +
				cbos.map(function (r) {
					return '<li>' + esc(r.cboName) + ' — ' + esc(RM.I18n.enumLabel('cboStatus', r.status)) + '</li>';
				}).join('') + '</ul>';
		}
		if (!body) {
			body = RM.Components.emptyState(t('pages.clientProfile.noServices'), t('pages.clientProfile.noServicesHint', { services: cfg.servicesTitle.toLowerCase() }));
		}

		return sectionWrap(section, client, body);
	}

	function renderFollowupSection(client, cfg, section) {
		var notes = listForView(RM.CaseNoteRepository, client);
		var body = notes.length
			? notes.map(function (n) {
				return '<div class="note-entry"><div class="note-meta">' + RM.Components.formatDate(n.date) +
					' · ' + esc(RM.I18n.noteTypeLabel(n.type)) + '</div><p>' + esc(n.text) + '</p></div>';
			}).join('')
			: RM.Components.emptyState(t('pages.clientProfile.noFollowUpNotes'), t('pages.clientProfile.noFollowUpHint', { monitoring: cfg.followupMonitoringTitle }));

		return sectionWrap(section, client, body);
	}

	function renderReassessmentSection(client, section) {
		var list = listForView(RM.ReassessmentRepository, client);
		var body = list.length
			? list.map(function (r) {
				return '<div class="profile-subblock"><p class="profile-inline-meta">' +
					RM.Components.formatDate(r.date) + ' · ' + esc(t('pages.clientProfile.trigger')) + ' ' + esc(RM.I18n.picklistLabel('reassessmentTriggers', r.trigger)) + '</p>' +
					'<div class="compare-grid"><div><h4>' + esc(t('pages.clientProfile.previous')) + '</h4>' +
					RM.CaseForm.formatRatingsList(r.previousRatings, client) + '</div><div><h4>' + esc(t('pages.clientProfile.current')) + '</h4>' +
					RM.CaseForm.formatRatingsList(r.newRatings, client) + '</div></div>' +
					RM.Components.renderRatingsCompare(r.previousRatings, r.newRatings, client) + '</div>';
			}).join('')
			: RM.Components.emptyState(t('pages.clientProfile.noRecordedReviews'), t('pages.clientProfile.noReviewsHint', { stage: section.title.toLowerCase() }));

		return sectionWrap(section, client, body);
	}

	function renderClosureSection(client, cfg, section, closure) {
		var body = closure
			? '<div class="profile-subblock"><p><strong>' + esc(t('pages.clientProfile.closed')) + '</strong> ' + RM.Components.formatDate(closure.date) +
				'</p><p><strong>' + esc(t('pages.clientProfile.reasonLabel')) + '</strong> ' + esc(RM.I18n.enumLabel('closureReason', closure.reason)) + '</p>' +
				'<p><strong>' + esc(cfg.closureServicesLabel) + ':</strong> ' +
				esc(closure.outcomesSummary.servicesProvided || '—') + '</p>' +
				'<p><strong>' + esc(cfg.closureOutcomesLabel) + ':</strong> ' +
				esc(closure.outcomesSummary.outcomesAchieved || '—') + '</p>' +
				'<p><strong>' + esc(cfg.closureRisksLabel) + ':</strong> ' +
				esc(closure.outcomesSummary.remainingRisks || '—') + '</p>' +
				'<p><strong>' + esc(cfg.closureReferralLabel) + ':</strong> ' +
				esc(closure.outcomesSummary.referralForward || '—') + '</p></div>'
			: RM.Components.emptyState(t('pages.clientProfile.caseOpen'), t('pages.clientProfile.caseOpenHint', { stage: section.title }));

		return sectionWrap(section, client, body);
	}

	function renderDocumentsSection(client, section, readOnly) {
		return sectionWrap(section, client,
			RM.DocumentService.renderVaultBody(readOnly),
			{ workspaceLinkLabel: t('documents.manageInWorkspaceProfile') }
		);
	}

	function wireDocumentUpload(clientId, readOnly) {
		var sectionEl = document.getElementById('profile-section-documents');
		var root = sectionEl ? sectionEl.querySelector('.profile-360-section-body') : document;
		if (readOnly) {
			RM.DocumentService.mountList(clientId, root);
			return;
		}
		RM.DocumentService.mountVault(clientId, root, 'client-profile');
	}
})();
