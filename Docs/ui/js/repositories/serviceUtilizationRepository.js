/* global RM */
(function () {
	'use strict';

	var base = RM.BaseRepository.createBase('serviceUtil');

	RM.ServiceUtilizationRepository = Object.assign({}, base, {
		findByMonth: function (monthKey) {
			return this.findAll().filter(function (row) {
				return row.month === monthKey;
			});
		},

		findByCategory: function (category) {
			return this.findAll().filter(function (row) {
				return row.category === category;
			});
		}
	});
})();
