/* global RM */
(function () {
	'use strict';

	function t(key, params) {
		return RM.I18n.t(key, params);
	}

	document.addEventListener('DOMContentLoaded', function () {
		RM.Boot.init({
			activeModule: 'workflow',
			activeNav: 'workflow-hub',
			onReady: function () {
				if (RM.Permissions.isLiaison()) {
					window.location.href = 'liaison-lookup.html';
					return;
				}
				if (RM.Permissions.isAuditor()) {
					window.location.href = 'reports.html';
					return;
				}
				renderPage();
				document.addEventListener('rm:store-changed', renderPage);
			}
		});
	});

	function renderPage() {
		var user = RM.Session.getCurrentUser();
		var main = document.getElementById('page-content');
		var caseload = RM.Data.caseloadForUser(user);

		main.innerHTML =
			RM.Components.modulePageHeader('workflow-hub') +
			'<div class="card"><div class="card-header"><h2>' + RM.Components.escapeHtml(t('pages.workflowHub.activeByStep')) + '</h2></div>' +
			'<div id="workflow-board"></div></div>' +
			'<div class="card"><div class="card-header"><h2>' + RM.Components.escapeHtml(t('pages.workflowHub.roleHandoffs')) + '</h2></div>' +
			'<div id="handoff-list"></div></div>';

		renderBoard(caseload);
		renderHandoffs(caseload, user);
	}

	function renderProgressTrack(client) {
		var steps = RM.Workflow.getAllStageStatuses(client);
		var completeCount = steps.filter(function (s) { return s.status === 'complete'; }).length;

		var segments = steps.map(function (step) {
			var statusText = RM.I18n.stepStatusLabel(step.status);
			return '<span class="workflow-track-seg workflow-track-' + step.status + '" ' +
				'title="' + RM.Components.escapeHtml(step.label + ' — ' + statusText) + '" ' +
				'aria-label="' + RM.Components.escapeHtml(t('pages.workflowHub.stageAria', {
					num: step.stage,
					label: step.label,
					status: statusText
				})) + '">' +
				'<span class="workflow-track-seg-num">' + (step.status === 'complete' ? '✓' : step.stage) + '</span></span>';
		}).join('');

		return '<div class="workflow-track-wrap">' +
			'<div class="workflow-track" role="img" aria-label="' + RM.Components.escapeHtml(t('pages.workflowHub.processProgressAria', { name: client.name })) + '">' +
			segments + '</div>' +
			'<span class="workflow-track-summary">' + RM.Components.escapeHtml(t('pages.workflowHub.stageComplete', {
				complete: completeCount,
				total: steps.length
			})) + '</span></div>';
	}

	function renderBoard(caseload) {
		var el = document.getElementById('workflow-board');
		if (!caseload.length) {
			el.innerHTML = RM.Components.emptyState(t('pages.workflowHub.noActiveCases'), t('pages.workflowHub.noActiveCasesHint'));
			return;
		}

		el.innerHTML = '<ul class="workflow-board-list">' + caseload.map(function (client) {
			var workflow = RM.CaseWorkflow.forClient(client);
			var stageStatus = RM.Workflow.getStatus(client);
			var steps = RM.Workflow.getAllStageStatuses(client);
			var currentStep = steps.find(function (s) { return s.stage === stageStatus.stage; });
			var statusClass = currentStep ? currentStep.status : 'not_started';
			var program = RM.CaseCategories.subcategoryLabel(client.caseSubcategoryId) ||
				RM.CaseCategories.categoryLabel(client.caseCategoryId);

			return '<li class="workflow-board-card" data-client-id="' + RM.Components.escapeHtml(client.id) + '" role="button" tabindex="0">' +
				'<div class="workflow-board-card-head">' +
				'<div class="workflow-board-card-title">' +
				'<strong>' + RM.Components.escapeHtml(client.name) + '</strong>' +
				'<span class="step-status-pill step-status-' + statusClass + ' workflow-board-current" title="' +
				RM.Components.escapeHtml(stageStatus.label) + '">' + RM.Components.escapeHtml(t('workspace.stageChip', { stage: stageStatus.stage })) + '</span></div>' +
				'<a href="' + RM.Links.page('case-workspace', { clientId: client.id }) + '" class="btn btn-sm btn-secondary" onclick="event.stopPropagation()">' + RM.Components.escapeHtml(t('pages.workflowHub.open')) + '</a></div>' +
				'<p class="workflow-board-meta">' + RM.Components.escapeHtml(program) + ' · ' + RM.Components.escapeHtml(workflow.name) + '</p>' +
				'<p class="workflow-board-current-label">' + RM.Components.escapeHtml(stageStatus.label) + '</p>' +
				renderProgressTrack(client) +
				'</li>';
		}).join('') + '</ul>';

		el.querySelectorAll('.workflow-board-card').forEach(function (card) {
			function activate(e) {
				if (e.target.closest('a')) { return; }
				var client = RM.ClientRepository.findById(card.getAttribute('data-client-id'));
				if (client) {
					RM.Components.openCaseDrawer(client);
				}
			}
			card.addEventListener('click', activate);
			card.addEventListener('keydown', function (e) {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault();
					activate(e);
				}
			});
		});
	}

	function renderHandoffs(caseload, user) {
		var el = document.getElementById('handoff-list');
		var handoffs = caseload.filter(function (c) {
			return c.incompleteIntake || RM.Workflow.getStageStatus(c, 3) === 'in_progress';
		}).slice(0, 8);

		if (!handoffs.length) {
			el.innerHTML = RM.Components.emptyState(t('pages.workflowHub.noPendingHandoffs'), t('pages.workflowHub.noPendingHandoffsHint'));
			return;
		}

		el.innerHTML = '<ul class="handoff-list">' + handoffs.map(function (client) {
			var cm = RM.UserRepository.findById(client.caseManagerId);
			var task = client.incompleteIntake ? t('pages.workflowHub.completeIntakeTask') : t('pages.workflowHub.reviewRiskTask');
			return '<li class="handoff-item">' +
				'<div><strong>' + RM.Components.escapeHtml(client.name) + '</strong>' +
				'<span class="handoff-task">' + RM.Components.escapeHtml(task) + '</span></div>' +
				'<div class="handoff-meta">' + RM.Components.escapeHtml(t('pages.workflowHub.assigned')) + ' ' + RM.Components.escapeHtml(cm ? cm.name : t('pages.workflowHub.unassigned')) +
				(user.role === 'supervisor' ? ' · <button type="button" class="btn btn-sm btn-secondary handoff-claim" data-client-id="' +
					RM.Components.escapeHtml(client.id) + '">' + RM.Components.escapeHtml(t('pages.workflowHub.assignToMe')) + '</button>' : '') +
				'</div></li>';
		}).join('') + '</ul>';

		el.querySelectorAll('.handoff-claim').forEach(function (btn) {
			btn.addEventListener('click', function () {
				var client = RM.ClientRepository.findById(btn.getAttribute('data-client-id'));
				if (!client) { return; }
				client.caseManagerId = user.id;
				RM.ClientRepository.save(client);
				RM.Audit.record('client:' + client.id, 'case_handoff', t('audit.assignedTo', { name: user.name }));
				RM.Components.showToast(t('pages.workflowHub.caseAssignedToast'), 'success');
				renderPage();
			});
		});
	}
})();
