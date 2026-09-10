/* global RM */
(function () {
	'use strict';

	function t(key, params) {
		return RM.I18n.t(key, params);
	}

	function programLabel(programId) {
		return RM.I18n ? RM.I18n.programLabel(programId) : programId;
	}

	function caseManagerContact(caseManagerId) {
		var cm = RM.UserRepository.findById(caseManagerId);
		if (!cm) {
			return {
				caseManagerName: t('pages.workflowHub.unassigned'),
				caseManagerStatus: '—',
				contactPhone: '—'
			};
		}
		return {
			caseManagerName: cm.name || RM.Permissions.formatRoleLabel(cm.role),
			caseManagerStatus: cm.availability || cm.status || t('enums.clientStatus.active'),
			contactPhone: cm.contactPhone || cm.phone || '—'
		};
	}

	function openCasesForClient(clientId) {
		if (RM.CaseRepository) {
			return RM.CaseRepository.findOpenByClientId(clientId);
		}
		var client = RM.ClientRepository.findById(clientId);
		if (client && (client.status === 'active' || client.status === 'open')) {
			return [client];
		}
		return [];
	}

	RM.CrossProgramFlagService = {
		programLabel: programLabel,

		formatMessage: function (flag) {
			if (!flag) { return ''; }
			var phone = flag.caseManagerPhone && flag.caseManagerPhone !== '—'
				? t('pages.clientSearch.contactAtPhone', { phone: flag.caseManagerPhone })
				: '';
			return t('pages.clientSearch.crossProgramFlagBody', {
				program: flag.programLabel,
				manager: flag.caseManagerName,
				phone: phone
			});
		},

		check: function (partial) {
			var matches = RM.ClientRepository.findDuplicates(partial);
			var activeCases = [];

			matches.forEach(function (match) {
				openCasesForClient(match.client.id).forEach(function (caseRecord) {
					var contact = caseManagerContact(caseRecord.caseManagerId);
					activeCases.push({
						clientId: match.client.id,
						caseManagerName: contact.caseManagerName,
						caseManagerPhone: contact.contactPhone,
						programId: caseRecord.programId,
						programLabel: programLabel(caseRecord.programId),
						score: match.score
					});
				});
			});

			return activeCases.length ? activeCases[0] : null;
		},

		lookupContacts: function (query) {
			if (!query || !String(query).trim()) { return []; }

			var clients = RM.ClientRepository.search(query.trim());
			var rows = [];

			clients.forEach(function (client) {
				openCasesForClient(client.id).forEach(function (caseRecord) {
					var contact = caseManagerContact(caseRecord.caseManagerId);
					rows.push({
						clientName: client.name,
						programLabel: programLabel(caseRecord.programId),
						caseManagerName: contact.caseManagerName,
						caseManagerStatus: contact.caseManagerStatus,
						contactPhone: contact.contactPhone
					});
				});
			});

			return rows.sort(function (a, b) {
				return a.clientName.localeCompare(b.clientName);
			});
		}
	};
})();
