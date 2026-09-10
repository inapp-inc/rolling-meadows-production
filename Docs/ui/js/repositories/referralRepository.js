/* global RM */
(function () {
	'use strict';

	var base = RM.BaseRepository.createBase('referral');

	RM.ReferralRepository = Object.assign({}, base, {
		findByCaseId: function (caseId) {
			return this.findAll().filter(function (r) { return r.caseId === caseId; });
		},

		findByClientId: function (clientId) {
			return this.findAll().filter(function (r) { return r.clientId === clientId; });
		}
	});
})();
