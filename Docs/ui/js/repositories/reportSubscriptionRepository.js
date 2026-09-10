/* global RM */
(function () {
	'use strict';

	var base = RM.BaseRepository.createBase('reportSubscription');

	RM.ReportSubscriptionRepository = Object.assign({}, base, {
		findByUser: function (userId) {
			if (!userId) { return []; }
			return this.findAll().filter(function (sub) {
				return sub.userId === userId;
			}).sort(function (a, b) {
				return (a.reportLabel || '').localeCompare(b.reportLabel || '');
			});
		},

		findByUserAndReport: function (userId, reportKey, reportKind) {
			if (!userId || !reportKey) { return null; }
			return this.findByUser(userId).find(function (sub) {
				return sub.reportKey === reportKey && sub.reportKind === (reportKind || 'catalog');
			}) || null;
		},

		upsert: function (payload) {
			var existing = this.findByUserAndReport(payload.userId, payload.reportKey, payload.reportKind);
			if (existing) {
				payload.id = existing.id;
				payload.createdAt = existing.createdAt;
			} else if (!payload.id) {
				payload.id = 'rsub-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
				payload.createdAt = new Date().toISOString();
			}
			payload.updatedAt = new Date().toISOString();
			this.save(payload);
			return payload;
		}
	});
})();
