/* global RM */
(function () {
	'use strict';

	RM.ClientService = {
		mergeInto: function (keepId, removeId) {
			if (!keepId || !removeId || keepId === removeId) { return keepId; }

			var repos = [
				RM.ReferralRepository,
				RM.IntakeRepository,
				RM.RiskAssessmentRepository,
				RM.CarePlanRepository,
				RM.ServiceEnrollmentRepository,
				RM.CBOReferralRepository,
				RM.CaseNoteRepository,
				RM.ReassessmentRepository,
				RM.CaseClosureRepository,
				RM.DocumentRepository
			];

			repos.forEach(function (repo) {
				repo.findAll().forEach(function (entity) {
					if (entity.clientId === removeId) {
						repo.update(entity.id, { clientId: keepId });
					}
				});
			});

			if (RM.CaseRepository) {
				RM.CaseRepository.findByClientId(removeId).forEach(function (caseRecord) {
					RM.CaseRepository.save(Object.assign({}, caseRecord, { clientId: keepId }));
				});
			}

			RM.ClientRepository.remove(removeId);
			RM.Audit.record('client:' + removeId, 'merge_duplicate', 'Merged into ' + keepId);
			return keepId;
		},

		deleteCascade: function (clientId) {
			[
				RM.ReferralRepository,
				RM.IntakeRepository,
				RM.RiskAssessmentRepository,
				RM.CarePlanRepository,
				RM.ServiceEnrollmentRepository,
				RM.CBOReferralRepository,
				RM.CaseNoteRepository,
				RM.ReassessmentRepository,
				RM.CaseClosureRepository,
				RM.DocumentRepository
			].forEach(function (repo) {
				repo.removeByClientId(clientId);
			});
			if (RM.CaseRepository) {
				RM.CaseRepository.removeByClientId(clientId);
			}
			RM.ClientRepository.remove(clientId);
		}
	};
})();
