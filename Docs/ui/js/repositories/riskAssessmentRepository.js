/* global RM */
(function () {
	'use strict';

	var base = RM.BaseRepository.createBase('riskAssessment');

	function sortByDateDesc(list) {
		return list.sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
	}

	RM.RiskAssessmentRepository = Object.assign({}, base, {
		findByCaseId: function (caseId) {
			return sortByDateDesc(this.findAll().filter(function (r) { return r.caseId === caseId; }));
		},

		findByClientId: function (clientId) {
			return sortByDateDesc(this.findAll().filter(function (r) { return r.clientId === clientId; }));
		},

		findLatest: function (clientIdOrView) {
			if (clientIdOrView && typeof clientIdOrView === 'object' && clientIdOrView.caseId) {
				var byCase = this.findByCaseId(clientIdOrView.caseId);
				return byCase.length ? byCase[0] : null;
			}
			var list = this.findByClientId(clientIdOrView);
			return list.length ? list[0] : null;
		},

		upsertLatest: function (clientIdOrView, payload) {
			var view = typeof clientIdOrView === 'object'
				? clientIdOrView
				: { id: clientIdOrView, caseId: null };
			var latest = this.findLatest(view);
			var today = new Date().toISOString().slice(0, 10);
			var basePayload = Object.assign({}, payload, {
				clientId: view.id,
				caseId: view.caseId || payload.caseId || null
			});
			if (latest && latest.date === today) {
				return this.update(latest.id, Object.assign({}, basePayload));
			}
			return this.save(Object.assign({ date: today }, basePayload));
		}
	});
})();
