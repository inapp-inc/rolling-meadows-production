/* global RM */
(function () {
	'use strict';

	var base = RM.BaseRepository.createBase('case');

	RM.CaseRepository = Object.assign({}, base, {
		findByClientId: function (clientId) {
			return this.findAll().filter(function (c) { return c.clientId === clientId; })
				.sort(function (a, b) {
					return new Date(b.openDate || b.createdAt || 0) - new Date(a.openDate || a.createdAt || 0);
				});
		},

		findOpenByClientId: function (clientId) {
			return this.findByClientId(clientId).filter(function (c) {
				return c.status !== 'closed';
			});
		},

		findByCaseManager: function (userId) {
			return this.findAll().filter(function (c) {
				return c.caseManagerId === userId && c.status !== 'closed';
			});
		},

		findLatestByClientId: function (clientId) {
			var cases = this.findByClientId(clientId);
			return cases.length ? cases[0] : null;
		},

		removeByClientId: function (clientId) {
			var self = this;
			this.findByClientId(clientId).forEach(function (entity) {
				self.remove(entity.id);
			});
		}
	});
})();
