/* global RM */
(function () {
	'use strict';

	var base = RM.BaseRepository.createBase('serviceEnrollment');

	RM.ServiceEnrollmentRepository = Object.assign({}, base, {
		findByCaseId: function (caseId) {
			return this.findAll().filter(function (e) {
				return e.caseId === caseId && !e.voided;
			});
		},

		findByClientId: function (clientId) {
			return this.findAll().filter(function (e) {
				return e.clientId === clientId && !e.voided;
			});
		},

		findAllRecordsByClientId: function (clientId) {
			return this.findAll().filter(function (e) {
				return e.clientId === clientId;
			});
		},

		findByEventId: function (eventId) {
			return this.findAll().filter(function (e) {
				return e.serviceOrEventId === eventId && !e.voided;
			});
		},

		bulkEnroll: function (clientIds, eventId, actorId) {
			var results = [];
			var self = this;
			clientIds.forEach(function (clientId) {
				var existing = self.findByClientId(clientId).find(function (e) {
					return e.serviceOrEventId === eventId;
				});
				if (existing) { return; }
				var enrollment = self.save({
					clientId: clientId,
					serviceOrEventId: eventId,
					dateEnrolled: new Date().toISOString().slice(0, 10),
					status: 'active',
					voided: false,
					enrolledBy: actorId
				});
				RM.Audit.record('enrollment:' + enrollment.id, 'bulk_enroll', 'Event: ' + eventId);
				results.push(enrollment);
			});
			return results;
		},

		void: function (id, reason, actorId) {
			var item = this.findById(id);
			if (!item || item.voided) { return null; }
			item.voided = true;
			item.voidReason = reason;
			item.voidedBy = actorId;
			item.voidedAt = new Date().toISOString();
			this.save(item);
			RM.Audit.record('enrollment:' + id, 'void', reason);
			return item;
		}
	});
})();
