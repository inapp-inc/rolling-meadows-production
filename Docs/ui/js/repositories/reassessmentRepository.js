/* global RM */
(function () {
	'use strict';

	var base = RM.BaseRepository.createBase('reassessment');

	RM.ReassessmentRepository = Object.assign({}, base, {
		findByCaseId: function (caseId) {
			return this.findAll().filter(function (r) { return r.caseId === caseId; })
				.sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
		},

		findByClientId: function (clientId) {
			return this.findAll().filter(function (r) { return r.clientId === clientId; })
				.sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
		}
	});
})();
