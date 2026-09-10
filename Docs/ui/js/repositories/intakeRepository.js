/* global RM */
(function () {
	'use strict';

	var base = RM.BaseRepository.createBase('intake');

	RM.IntakeRepository = Object.assign({}, base, {
		findByCaseId: function (caseId) {
			return this.findAll().find(function (i) { return i.caseId === caseId; }) || null;
		},

		findByClientId: function (clientId) {
			var items = this.findAll().filter(function (i) { return i.clientId === clientId; });
			return items.length ? items[items.length - 1] : null;
		}
	});
})();
