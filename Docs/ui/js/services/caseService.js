/* global RM */
(function () {
	'use strict';

	var CASE_FIELDS = [
		'caseNumber', 'programId', 'caseCategoryId', 'caseSubcategoryId',
		'caseManagerId', 'status', 'currentStage', 'incompleteIntake',
		'openDate', 'closedAt'
	];

	function todayIso() {
		return new Date().toISOString().slice(0, 10);
	}

	function nextCaseNumber() {
		var year = new Date().getFullYear();
		var prefix = 'C-' + year + '-';
		var max = 0;
		RM.CaseRepository.findAll().forEach(function (c) {
			var num = String(c.caseNumber || '');
			if (num.indexOf(prefix) !== 0) { return; }
			var n = parseInt(num.slice(prefix.length), 10);
			if (!isNaN(n) && n > max) { max = n; }
		});
		return prefix + String(max + 1).padStart(3, '0');
	}

	function stripCaseFields(client) {
		if (!client) { return null; }
		var copy = Object.assign({}, client);
		CASE_FIELDS.forEach(function (key) { delete copy[key]; });
		delete copy.caseId;
		return copy;
	}

	function shouldOpenCaseFromScreening(screening) {
		if (!screening) { return false; }
		if ((screening.emergencyTrigger || '').trim()) { return true; }
		if (screening.serviceNeedIdentified === true) { return true; }
		return screening.contactReason === 'emergency';
	}

	RM.CaseService = {
		nextCaseNumber: nextCaseNumber,

		merge: function (client, caseRecord) {
			if (!client || !caseRecord) { return null; }
			var merged = Object.assign({}, client, {
				caseId: caseRecord.id,
				caseNumber: caseRecord.caseNumber,
				programId: caseRecord.programId,
				caseCategoryId: caseRecord.caseCategoryId,
				caseSubcategoryId: caseRecord.caseSubcategoryId,
				caseManagerId: caseRecord.caseManagerId,
				status: caseRecord.status,
				currentStage: caseRecord.currentStage,
				incompleteIntake: caseRecord.incompleteIntake,
				openDate: caseRecord.openDate,
				createdAt: caseRecord.openDate || caseRecord.createdAt || client.registeredAt
			});
			return merged;
		},

		view: function (caseId) {
			var caseRecord = RM.CaseRepository.findById(caseId);
			if (!caseRecord) { return null; }
			var client = RM.ClientRepository.findById(caseRecord.clientId);
			return client ? this.merge(client, caseRecord) : null;
		},

		resolveView: function (clientId, caseId) {
			if (caseId) {
				var byCase = this.view(caseId);
				if (byCase && (!clientId || byCase.id === clientId)) {
					return byCase;
				}
			}
			if (clientId && RM.CaseRepository.findById(clientId)) {
				return this.view(clientId);
			}
			if (!clientId) { return null; }
			var latest = RM.CaseRepository.findLatestByClientId(clientId);
			if (latest) {
				return this.merge(RM.ClientRepository.findById(clientId), latest);
			}
			return RM.ClientRepository.findById(clientId);
		},

		casesForClient: function (clientId) {
			return RM.CaseRepository.findByClientId(clientId);
		},

		openCasesForClient: function (clientId) {
			return RM.CaseRepository.findOpenByClientId(clientId);
		},

		hasOpenCase: function (clientId) {
			return this.openCasesForClient(clientId).length > 0;
		},

		activeCases: function () {
			return RM.CaseRepository.findAll().filter(function (c) {
				return c.status !== 'closed';
			});
		},

		caseloadForUser: function (user) {
			if (!user) { return []; }
			var cases = user.role === 'case_manager'
				? RM.CaseRepository.findByCaseManager(user.id)
				: this.activeCases();
			return cases.map(function (caseRecord) {
				return RM.CaseService.merge(
					RM.ClientRepository.findById(caseRecord.clientId),
					caseRecord
				);
			}).filter(function (view) { return view && view.id; });
		},

		registerClient: function (payload, user) {
			var screening = Object.assign({
				date: todayIso(),
				contactReason: 'information',
				notes: '',
				emergencyTrigger: '',
				serviceNeedIdentified: false,
				performedBy: user ? user.id : null
			}, payload.screening || {});

			var client = RM.ClientRepository.save(stripCaseFields({
				name: payload.name,
				dob: payload.dob || '',
				phone: payload.phone || '',
				address: payload.address || '',
				demographics: payload.demographics || {},
				registeredAt: todayIso(),
				registrationSource: payload.registrationSource || 'walk_in',
				screening: screening
			}));

			RM.Audit.record('client:' + client.id, 'client_registered', client.name);

			var openCase = shouldOpenCaseFromScreening(screening);
			return {
				client: client,
				openCase: openCase,
				emergency: !!(screening.emergencyTrigger || '').trim() || screening.contactReason === 'emergency'
			};
		},

		createCase: function (clientId, pending, user, options) {
			options = options || {};
			var client = RM.ClientRepository.findById(clientId);
			if (!client) { return null; }

			var caseRecord = RM.CaseRepository.save({
				clientId: clientId,
				caseNumber: nextCaseNumber(),
				programId: options.programId || 'prog-senior-services',
				caseCategoryId: pending.categoryId,
				caseSubcategoryId: pending.subcategoryId,
				caseManagerId: user ? user.id : null,
				status: 'active',
				incompleteIntake: !!options.incompleteIntake,
				openDate: todayIso(),
				createdAt: todayIso()
			});

			RM.Audit.record('case:' + caseRecord.id, 'case_opened', caseRecord.caseNumber + ' — ' + client.name);
			return this.merge(client, caseRecord);
		},

		saveCaseFields: function (caseId, changes) {
			var existing = RM.CaseRepository.findById(caseId);
			if (!existing) { return null; }
			return RM.CaseRepository.save(Object.assign({}, existing, changes, { id: caseId }));
		},

		setStage: function (caseId, stage) {
			return this.saveCaseFields(caseId, {
				currentStage: Math.min(Math.max(stage, 1), 8)
			});
		},

		withCaseIds: function (entity, view) {
			return Object.assign({}, entity, {
				clientId: view.id,
				caseId: view.caseId
			});
		}
	};
})();
