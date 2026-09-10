/* global RM */
(function () {
	'use strict';

	var base = RM.BaseRepository.createBase('initiative');

	RM.InitiativeRepository = Object.assign({}, base, {
		findActive: function () {
			var today = new Date().toISOString().slice(0, 10);
			return this.findAll().filter(function (i) {
				return (!i.endDate || i.endDate >= today) && i.status !== 'closed';
			});
		}
	});
})();
