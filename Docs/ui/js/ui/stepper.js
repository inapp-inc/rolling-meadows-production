/* global RM */
(function () {
	'use strict';

	function t(key, params) {
		return RM.I18n.t(key, params);
	}

	RM.Stepper = {
		render: function (containerId, activeTabId, client) {
			var container = document.getElementById(containerId);
			if (!container) { return; }

			if (!client) {
				var clientId = RM.Navigation.resolveClientId();
				client = clientId ? RM.ClientRepository.findById(clientId) : null;
			}

			var stages = client && RM.Workflow
				? RM.Workflow.getAllStageStatuses(client)
				: (RM.Workflow ? RM.Workflow.stagesForClient(null) : []).map(function (s) {
					return Object.assign({}, s, { status: 'not_started' });
				});

			if (!stages.length) { return; }

			var activeStage = RM.CaseWorkflow && client
				? RM.CaseWorkflow.stageForTab(client, activeTabId)
				: 1;

			var clientId = client ? client.id : RM.Navigation.resolveClientId();

			var html = '<div class="stepper-wrap">' +
				'<div class="stepper-legend" aria-hidden="true">' +
				'<span class="step-legend-item step-legend-complete">' + t('stepStatus.legendComplete') + '</span>' +
				'<span class="step-legend-item step-legend-in-progress">' + t('stepStatus.legendInProgress') + '</span>' +
				'<span class="step-legend-item step-legend-not-started">' + t('stepStatus.legendNotStarted') + '</span>' +
				'</div>' +
				'<nav class="workflow-stepper workflow-stepper-fit" aria-label="' + RM.Components.escapeHtml(t('components.processStageTitle')) + '"><ol>';

			stages.forEach(function (stage) {
				var isActive = stage.stage === activeStage;
				var status = stage.status || 'not_started';
				var cls = [status, isActive ? 'active' : ''].filter(Boolean).join(' ');
				var tab = stage.tabId || RM.CaseWorkflow.tabForStage(client, stage.stage);
				var href = clientId
					? RM.Links.page('case-workspace', { clientId: clientId, tab: tab })
					: '#';
				var stepIndicator = status === 'complete' ? '✓' : String(stage.stage);
				var statusText = RM.I18n.stepStatusLabel(status);
				var title = stage.label + ' — ' + statusText;
				if (stage.deliverable) {
					title += ' · ' + t('stepStatus.deliverablePrefix') + ' ' + stage.deliverable;
				}

				html += '<li class="' + cls + '" title="' + RM.Components.escapeHtml(title) + '">' +
					'<a href="' + href + '">' +
					'<span class="step-num">' + stepIndicator + '</span>' +
					'<span class="step-label">' + RM.Components.escapeHtml(stage.label) + '</span></a></li>';
			});
			html += '</ol></nav></div>';
			container.innerHTML = html;
		}
	};
})();
