/* global RM */
(function () {
	'use strict';

	var base = RM.BaseRepository.createBase('carePlan');

	function voidItem(id, reason, actorId) {
		var item = RM.CarePlanRepository.findById(id);
		if (!item || item.voided) { return null; }
		item.voided = true;
		item.voidReason = reason;
		item.voidedBy = actorId;
		item.voidedAt = new Date().toISOString();
		RM.CarePlanRepository.save(item);
		RM.Audit.record('carePlan:' + id, 'void', reason);
		return item;
	}

	RM.CarePlanRepository = Object.assign({}, base, {
		findByCaseId: function (caseId) {
			return this.findAll().filter(function (c) { return c.caseId === caseId && !c.voided; });
		},

		findByClientId: function (clientId) {
			return this.findAll().filter(function (c) { return c.clientId === clientId && !c.voided; });
		},

		findAllRecordsByClientId: function (clientId) {
			return this.findAll().filter(function (c) { return c.clientId === clientId; });
		},
		void: voidItem
	});
})();
