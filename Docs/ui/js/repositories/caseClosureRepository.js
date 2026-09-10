/* global RM */
(function () {
	'use strict';

	var base = RM.BaseRepository.createBase('caseClosure');

	RM.CaseClosureRepository = Object.assign({}, base, {
		findByCaseId: function (caseId) {
			return this.findAll().find(function (c) { return c.caseId === caseId; }) || null;
		},

		findByClientId: function (clientId) {
			return this.findAll().find(function (c) { return c.clientId === clientId; }) || null;
		}
	});
})();
