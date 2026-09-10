/* global RM */
(function () {
	'use strict';

	var base = RM.BaseRepository.createBase('customReport');

	RM.CustomReportRepository = Object.assign({}, base, {
		findByOwner: function (ownerId) {
			return this.findAll().filter(function (report) {
				return !ownerId || report.ownerId === ownerId || report.shared;
			}).sort(function (a, b) {
				return (a.name || '').localeCompare(b.name || '');
			});
		}
	});
})();
