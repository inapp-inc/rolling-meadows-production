/* global RM */
(function () {
	'use strict';

	var base = RM.BaseRepository.createBase('client');

	function normalize(str) {
		return (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
	}

	function levenshtein(a, b) {
		if (!a.length) { return b.length; }
		if (!b.length) { return a.length; }
		var matrix = [];
		for (var i = 0; i <= b.length; i++) { matrix[i] = [i]; }
		for (var j = 0; j <= a.length; j++) { matrix[0][j] = j; }
		for (i = 1; i <= b.length; i++) {
			for (j = 1; j <= a.length; j++) {
				if (b.charAt(i - 1) === a.charAt(j - 1)) {
					matrix[i][j] = matrix[i - 1][j - 1];
				} else {
					matrix[i][j] = Math.min(
						matrix[i - 1][j - 1] + 1,
						matrix[i][j - 1] + 1,
						matrix[i - 1][j] + 1
					);
				}
			}
		}
		return matrix[b.length][a.length];
	}

	RM.ClientRepository = Object.assign({}, base, {
		search: function (query) {
			var q = normalize(query);
			if (!q) { return this.findAll(); }
			return this.findAll().filter(function (c) {
				var name = normalize(c.name);
				var phone = normalize(c.phone);
				var address = normalize(c.address);
				return name.indexOf(q) !== -1 ||
					phone.indexOf(q) !== -1 ||
					address.indexOf(q) !== -1 ||
					levenshtein(name, q) <= 2;
			});
		},

		findDuplicates: function (partial) {
			var name = normalize(partial.name);
			var phone = normalize(partial.phone);
			var dob = partial.dob || '';
			var matches = [];

			this.findAll().forEach(function (c) {
				var score = 0;
				var fields = [];
				var cName = normalize(c.name);
				var cPhone = normalize(c.phone);

				if (name && cName) {
					var dist = levenshtein(name, cName);
					if (dist === 0) { score += 50; fields.push('name'); }
					else if (dist <= 2) { score += 35; fields.push('name'); }
					else if (cName.indexOf(name) !== -1 || name.indexOf(cName) !== -1) { score += 25; fields.push('name'); }
				}
				if (phone && cPhone && (cPhone.indexOf(phone) !== -1 || phone.indexOf(cPhone) !== -1)) {
					score += 40; fields.push('phone');
				}
				if (dob && c.dob === dob) { score += 30; fields.push('dob'); }

				if (score >= 25) {
					matches.push({ client: c, score: score, matchedFields: fields });
				}
			});

			return matches.sort(function (a, b) { return b.score - a.score; });
		},

		findByCaseManager: function (userId) {
			if (RM.CaseRepository && RM.CaseService) {
				return RM.CaseService.caseloadForUser({ id: userId, role: 'case_manager' });
			}
			return this.findAll().filter(function (c) {
				return c.caseManagerId === userId && c.status !== 'closed';
			});
		}
	});
})();
