/* global RM */
(function () {
	'use strict';

	/** Read-only accessors — all data comes from sessionStorage repositories. */
	RM.Data = {
		activeClients: function () {
			return RM.ClientRepository.findAll();
		},

		registeredClients: function () {
			return RM.ClientRepository.findAll();
		},

		activeCases: function () {
			return RM.CaseService ? RM.CaseService.activeCases() : [];
		},

		caseloadForUser: function (user) {
			if (RM.CaseService) {
				return RM.CaseService.caseloadForUser(user);
			}
			if (!user) { return []; }
			if (user.role === 'case_manager') {
				return RM.ClientRepository.findByCaseManager(user.id);
			}
			return this.activeClients().filter(function (c) {
				return c.status !== 'closed';
			});
		},

		clientWithRisk: function (clientOrView) {
			var view = clientOrView;
			if (view && !view.caseId && view.id && RM.CaseService) {
				view = RM.CaseService.resolveView(view.id) || view;
			}
			var assessment = RM.RiskAssessmentRepository.findLatest(view);
			return {
				client: view,
				riskLevel: assessment ? assessment.overallRisk : 'Unknown',
				assessment: assessment
			};
		},

		groupByRisk: function (clients) {
			var groups = { High: [], Medium: [], Moderate: [], Low: [], Unknown: [] };
			clients.forEach(function (c) {
				var level = this.clientWithRisk(c).riskLevel;
				if (!groups[level]) { groups[level] = []; }
				groups[level].push(c);
			}, this);
			return groups;
		}
	};
})();
