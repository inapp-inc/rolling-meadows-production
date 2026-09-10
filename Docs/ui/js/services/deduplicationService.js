/* global RM */
(function () {
	'use strict';

	RM.DeduplicationService = {
		check: function (partial, excludeId) {
			var matches = RM.ClientRepository.findDuplicates(partial);
			if (excludeId) {
				matches = matches.filter(function (m) { return m.client.id !== excludeId; });
			}
			return matches;
		},

		pairsAmong: function (clients) {
			var pairs = [];
			if (!clients || clients.length < 2) { return pairs; }

			clients.forEach(function (client, i) {
				clients.slice(i + 1).forEach(function (other) {
					var matches = this.check({
						name: client.name,
						phone: client.phone,
						dob: client.dob
					}, client.id);
					var hit = matches.find(function (m) {
						return m.client.id === other.id && m.score >= 25;
					});
					if (hit) {
						pairs.push({ client: client, other: other, match: hit });
					}
				}, this);
			}, this);

			return pairs;
		},

		normalizePhone: function (phone) {
			return (phone || '').replace(/\D/g, '');
		}
	};
})();
