/* global RM */
(function () {
	'use strict';

	function stagesFor(client) {
		if (RM.CaseWorkflow) {
			return RM.CaseWorkflow.stagesForClient(client);
		}
		return RM.Workflow._defaultStages();
	}

	function intakeFor(client) {
		if (client && client.caseId && RM.IntakeRepository.findByCaseId) {
			return RM.IntakeRepository.findByCaseId(client.caseId);
		}
		return RM.IntakeRepository.findByClientId(client.id);
	}

	function referralsFor(client) {
		if (client && client.caseId && RM.ReferralRepository.findByCaseId) {
			return RM.ReferralRepository.findByCaseId(client.caseId);
		}
		return RM.ReferralRepository.findByClientId(client.id);
	}

	function carePlansFor(client) {
		if (client && client.caseId && RM.CarePlanRepository.findByCaseId) {
			return RM.CarePlanRepository.findByCaseId(client.caseId);
		}
		return RM.CarePlanRepository.findByClientId(client.id);
	}

	function enrollmentsFor(client) {
		if (client && client.caseId && RM.ServiceEnrollmentRepository.findByCaseId) {
			return RM.ServiceEnrollmentRepository.findByCaseId(client.caseId);
		}
		return RM.ServiceEnrollmentRepository.findByClientId(client.id);
	}

	function notesFor(client) {
		if (client && client.caseId && RM.CaseNoteRepository.findByCaseId) {
			return RM.CaseNoteRepository.findByCaseId(client.caseId);
		}
		return RM.CaseNoteRepository.findByClientId(client.id);
	}

	function reassessmentsFor(client) {
		if (client && client.caseId && RM.ReassessmentRepository.findByCaseId) {
			return RM.ReassessmentRepository.findByCaseId(client.caseId);
		}
		return RM.ReassessmentRepository.findByClientId(client.id);
	}

	function closureFor(client) {
		if (client && client.caseId && RM.CaseClosureRepository.findByCaseId) {
			return RM.CaseClosureRepository.findByCaseId(client.caseId);
		}
		return RM.CaseClosureRepository.findByClientId(client.id);
	}

	RM.Workflow = {
		_defaultStages: function () {
			return [
				{ stage: 1, tabId: 'intake', label: 'Referral & Intake', shortLabel: 'Referral & Intake' },
				{ stage: 2, tabId: 'assessment', label: 'Comprehensive Assessment', shortLabel: 'Comprehensive Assessment' },
				{ stage: 3, tabId: 'risk', label: 'Risk Identification & Prioritization', shortLabel: 'Risk Identification & Prioritization' },
				{ stage: 4, tabId: 'careplan', label: 'Care / Service Plan Development', shortLabel: 'Care / Service Plan Development' },
				{ stage: 5, tabId: 'services', label: 'Service Coordination', shortLabel: 'Service Coordination' },
				{ stage: 6, tabId: 'followup', label: 'Ongoing Monitoring & Follow-Up', shortLabel: 'Ongoing Monitoring & Follow-Up' },
				{ stage: 7, tabId: 'reassessment', label: 'Reassessment', shortLabel: 'Reassessment' },
				{ stage: 8, tabId: 'closure', label: 'Case Resolution / Closure', shortLabel: 'Case Resolution / Closure' }
			];
		},

		get STAGES() {
			return this._defaultStages();
		},

		stagesForClient: function (client) {
			return stagesFor(client);
		},

		stageLabel: function (client, stage) {
			if (RM.CaseWorkflow && client) {
				return RM.CaseWorkflow.stageLabel(client, stage);
			}
			var match = this._defaultStages().find(function (s) { return s.stage === stage; });
			return match ? match.label : '';
		},

		isClosed: function (client) {
			return client.status === 'closed' || !!closureFor(client);
		},

		inferStage: function (client) {
			if (this.isClosed(client)) {
				return 8;
			}
			if (reassessmentsFor(client).length) {
				return 7;
			}
			var enrollments = enrollmentsFor(client);
			var notes = notesFor(client);
			if (enrollments.length && notes.length) {
				return 6;
			}
			if (enrollments.length) {
				return 5;
			}
			if (carePlansFor(client).length) {
				return 4;
			}
			if (RM.RiskAssessmentRepository.findLatest(client)) {
				return 3;
			}
			var intake = intakeFor(client);
			if (intake && intake.comprehensiveAssessmentNotes) {
				return 2;
			}
			if (intake && !client.incompleteIntake && intake.completeness !== 'incomplete') {
				return 2;
			}
			if (referralsFor(client).length || intake) {
				return 1;
			}
			return 1;
		},

		resolveStage: function (client) {
			if (this.isClosed(client)) {
				return 8;
			}
			if (typeof client.currentStage === 'number' && client.currentStage >= 1) {
				return Math.min(Math.max(client.currentStage, 1), 8);
			}
			return this.inferStage(client);
		},

		getStatus: function (client) {
			if (!client) {
				var first = this._defaultStages()[0];
				return { stage: 1, label: first.label, shortLabel: first.shortLabel };
			}
			var stage = this.resolveStage(client);
			var label = this.stageLabel(client, stage);
			return { stage: stage, label: label, shortLabel: label };
		},

		setStage: function (clientIdOrCaseId, stage) {
			var view = RM.CaseService ? RM.CaseService.resolveView(clientIdOrCaseId) : null;
			if (view && view.caseId && RM.CaseService) {
				RM.CaseService.setStage(view.caseId, stage);
				return true;
			}
			var client = RM.ClientRepository.findById(clientIdOrCaseId);
			if (!client) {
				return false;
			}
			client.currentStage = Math.min(Math.max(stage, 1), 8);
			RM.ClientRepository.save(client);
			return true;
		},

		_rawStageStatus: function (client, stage) {
			if (!client) { return 'not_started'; }
			if (this.isClosed(client)) {
				return stage === 8 ? 'complete' : (stage < 8 ? 'complete' : 'not_started');
			}

			var intake = intakeFor(client);
			var referral = referralsFor(client).length;
			var assessment = RM.RiskAssessmentRepository.findLatest(client);
			var carePlans = carePlansFor(client);
			var enrollments = enrollmentsFor(client);
			var notes = notesFor(client).filter(function (n) { return !n.voided; });
			var reassessments = reassessmentsFor(client);

			switch (stage) {
				case 1:
					if (intake && referral && !client.incompleteIntake && intake.completeness !== 'incomplete') {
						return 'complete';
					}
					if (referral || intake) { return 'in_progress'; }
					return 'not_started';
				case 2:
					if (intake && intake.comprehensiveAssessmentNotes) { return 'complete'; }
					if (intake && !client.incompleteIntake) { return 'in_progress'; }
					return 'not_started';
				case 3:
					if (assessment) { return 'complete'; }
					if (intake && intake.comprehensiveAssessmentNotes) { return 'in_progress'; }
					return 'not_started';
				case 4:
					if (carePlans.length) { return 'complete'; }
					if (assessment) { return 'in_progress'; }
					return 'not_started';
				case 5:
					if (enrollments.length) { return 'complete'; }
					if (carePlans.length) { return 'in_progress'; }
					return 'not_started';
				case 6:
					if (notes.length) { return 'complete'; }
					if (enrollments.length) { return 'in_progress'; }
					return 'not_started';
				case 7:
					if (reassessments.length) { return 'complete'; }
					if (notes.length) { return 'in_progress'; }
					return 'not_started';
				case 8:
					return this.isClosed(client) ? 'complete' : 'not_started';
				default:
					return 'not_started';
			}
		},

		getStageStatus: function (client, stage) {
			var raw = this._rawStageStatus(client, stage);
			var firstOpen = null;

			for (var s = 1; s <= 8; s++) {
				if (this._rawStageStatus(client, s) !== 'complete') {
					firstOpen = s;
					break;
				}
			}

			if (firstOpen === null) {
				return raw;
			}
			if (stage < firstOpen) {
				return 'complete';
			}
			if (stage === firstOpen) {
				return raw === 'not_started' ? 'in_progress' : raw;
			}
			return 'not_started';
		},

		getAllStageStatuses: function (client) {
			var self = this;
			return stagesFor(client).map(function (stageDef) {
				return {
					stage: stageDef.stage,
					tabId: stageDef.tabId,
					label: stageDef.label,
					shortLabel: stageDef.shortLabel || stageDef.label,
					deliverable: stageDef.deliverable || '',
					status: self.getStageStatus(client, stageDef.stage)
				};
			});
		}
	};
})();
