/* global RM */
(function () {
	'use strict';

	function t(key, params) {
		return RM.I18n.t(key, params);
	}

	function pairKey(idA, idB) {
		return [idA, idB].sort().join('::');
	}

	function isPairDismissed(idA, idB) {
		var dismissed = RM.Store.getMeta('dismissedDuplicatePairs') || [];
		return dismissed.indexOf(pairKey(idA, idB)) !== -1;
	}

	function pendingDuplicateCount() {
		var clients = RM.ClientRepository.findAll();
		var count = 0;

		clients.forEach(function (c, i) {
			clients.slice(i + 1).forEach(function (c2) {
				if (isPairDismissed(c.id, c2.id)) { return; }
				var matches = RM.DeduplicationService.check({ name: c.name, phone: c.phone, dob: c.dob }, null);
				var found = matches.find(function (m) { return m.client.id === c2.id && m.score >= 25; });
				if (found) { count += 1; }
			});
		});

		return count;
	}

	RM.NotificationService = {
		getForUser: function (user) {
			if (!user || RM.Permissions.isAuditor() || RM.Permissions.isLiaison()) {
				return [];
			}

			var items = [];
			var overdue = RM.FollowUpCadenceService.getDueFollowUps(
				user.role === 'case_manager' ? user.id : null
			);

			overdue.slice(0, 3).forEach(function (d) {
				items.push({
					type: 'overdue',
					title: t('notifications.overdueFollowUp'),
					body: t(d.daysOverdue === 1 ? 'notifications.daysOverdueBody' : 'notifications.daysOverdueBodyPlural', {
						name: d.client.name,
						count: d.daysOverdue
					}),
					href: RM.Links.page('case-workspace', { clientId: d.client.id, tab: 'followup' })
				});
			});

			var caseload = RM.Data.caseloadForUser(user);
			caseload.filter(function (c) { return c.incompleteIntake; }).slice(0, 2).forEach(function (c) {
				items.push({
					type: 'intake',
					title: t('notifications.incompleteIntake'),
					body: t('notifications.consentDobMissingBody', { name: c.name }),
					href: RM.Links.page('case-workspace', { clientId: c.id, tab: 'intake' })
				});
			});

			if (RM.Permissions.can('mergeDuplicates')) {
				var dupCount = pendingDuplicateCount();
				if (dupCount) {
					items.push({
						type: 'duplicate',
						title: t('notifications.duplicateReview'),
						body: t(dupCount === 1 ? 'notifications.duplicatePairsBody' : 'notifications.duplicatePairsBodyPlural', {
							count: dupCount
						}),
						href: RM.Links.page('admin-duplicates')
					});
				}
			}

			return items.slice(0, 8);
		},

		countForUser: function (user) {
			return this.getForUser(user).length;
		}
	};
})();
