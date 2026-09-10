/* global RM */
(function () {
	'use strict';

	var base = RM.BaseRepository.createBase('user');

	RM.UserRepository = Object.assign({}, base, {
		findByRole: function (role) {
			return this.findAll().filter(function (u) { return u.role === role; });
		}
	});
})();
