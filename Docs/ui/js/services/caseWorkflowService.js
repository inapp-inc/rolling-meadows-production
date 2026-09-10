/* global RM */
(function () {
	'use strict';

	var TAB_IDS = ['intake', 'assessment', 'risk', 'careplan', 'services', 'followup', 'reassessment', 'closure'];

	function stage(tabId, label, deliverable) {
		return {
			tabId: tabId,
			label: label,
			shortLabel: label,
			deliverable: deliverable || ''
		};
	}

	function buildWorkflow(id, name, description, exampleProgram, stages, focusAreas) {
		return {
			id: id,
			name: name,
			description: description,
			exampleProgram: exampleProgram,
			focusAreas: focusAreas || [],
			stages: stages.map(function (s, i) {
				return Object.assign({ stage: i + 1 }, s);
			})
		};
	}

	var PARENT_SUPPORT_STAGES = [
		stage('intake', 'Referral & Intake', 'Referral record received and assigned'),
		stage('assessment', 'Intake & Enrollment', 'Family profile and eligibility verified'),
		stage('risk', 'Needs Assessment', 'Needs assessment summary'),
		stage('careplan', 'Goal Setting & Service Planning', 'Individualized family support plan'),
		stage('services', 'Service Coordination & Referrals', 'Referral tracking and activated services'),
		stage('followup', 'Ongoing Support & Monitoring', 'Case notes and updated action items'),
		stage('reassessment', 'Progress Review', 'Updated support plan and progress report'),
		stage('closure', 'Case Resolution / Closure', 'Outcome summary and exit documentation')
	];

	var SENIOR_STAGES = [
		stage('intake', 'Referral & Intake', 'Referral record and consent on file'),
		stage('assessment', 'Comprehensive Assessment', 'Holistic assessment summary'),
		stage('risk', 'Risk Identification & Prioritization', 'Prioritized risk profile'),
		stage('careplan', 'Care / Service Plan Development', 'Individualized care plan'),
		stage('services', 'Service Coordination', 'Service enrollments and CBO referrals'),
		stage('followup', 'Ongoing Monitoring & Follow-Up', 'Contact notes and follow-up cadence'),
		stage('reassessment', 'Reassessment', 'Updated risk ratings and plan adjustments'),
		stage('closure', 'Case Resolution / Closure', 'Closure summary and outcomes')
	];

	var WORKFLOWS_BY_SUBCATEGORY = {
		'sub-seniors-at-risk': buildWorkflow(
			'wf-senior-at-risk',
			'Seniors at Risk Case Management',
			'Identify safety and wellbeing risks for older adults and coordinate protective services.',
			'Hospital or community referral for falls, isolation, or self-neglect concerns',
			SENIOR_STAGES,
			['Fall prevention', 'Medication safety', 'Social isolation', 'Abuse or neglect screening']
		),
		'sub-in-home-support': buildWorkflow(
			'wf-in-home-support',
			'In-Home Support Workflow',
			'Support aging adults to remain safely at home through coordinated in-home services.',
			'Physician referral for ADL support and home safety',
			[
				stage('intake', 'Referral & Intake', 'Referral and home support eligibility'),
				stage('assessment', 'In-Home Needs Assessment', 'Functional and home environment summary'),
				stage('risk', 'Safety & Independence Review', 'Prioritized support needs'),
				stage('careplan', 'In-Home Care Plan', 'Personal care and equipment plan'),
				stage('services', 'Provider Coordination', 'Home care and equipment referrals'),
				stage('followup', 'Home Visit Monitoring', 'Visit notes and caregiver coordination'),
				stage('reassessment', 'Functional Reassessment', 'Updated independence goals'),
				stage('closure', 'Transition / Closure', 'Transition to alternate level of care or graduation')
			],
			['Activities of daily living', 'Caregiver support', 'Home modifications', 'Equipment needs']
		),
		'sub-nutrition-programs': buildWorkflow(
			'wf-nutrition-programs',
			'Nutrition Program Workflow',
			'Connect seniors to meal programs and monitor nutritional wellbeing.',
			'Community referral for food insecurity or malnutrition risk',
			[
				stage('intake', 'Referral & Intake', 'Nutrition program referral record'),
				stage('assessment', 'Nutritional Screening', 'Dietary and food access assessment'),
				stage('risk', 'Nutrition Risk Prioritization', 'Priority level for meal services'),
				stage('careplan', 'Nutrition Support Plan', 'Meal service and dietary goals'),
				stage('services', 'Meal Program Enrollment', 'Meals on Wheels or congregate dining enrollment'),
				stage('followup', 'Nutrition Monitoring', 'Weight, appetite, and meal delivery tracking'),
				stage('reassessment', 'Quarterly Nutrition Review', 'Updated dietary plan'),
				stage('closure', 'Program Graduation / Closure', 'Transition to self-sufficiency or alternate program')
			],
			['Food access', 'Meal delivery', 'Dietary restrictions', 'Social dining engagement']
		),
		'sub-youth-empowerment': buildWorkflow(
			'wf-youth-empowerment',
			'School Attendance Support Workflow',
			'Support families when school attendance or youth engagement is at risk.',
			'School referral for chronic absenteeism',
			[
				stage('intake', 'School Referral & Intake', 'School referral record assigned'),
				stage('assessment', 'Family & Attendance Assessment', 'Barriers to attendance identified'),
				stage('risk', 'Attendance Risk Prioritization', 'Priority barriers ranked'),
				stage('careplan', 'Attendance Support Plan', 'Goals for attendance and family-school engagement'),
				stage('services', 'Resource Referrals', 'Transportation, childcare, and school counselor links'),
				stage('followup', 'Monthly Attendance Review', 'Attendance tracking and coaching notes'),
				stage('reassessment', 'Progress Review', 'Attendance trend and plan adjustments'),
				stage('closure', 'Case Resolution / Closure', 'Family self-sufficient in managing attendance')
			],
			['School attendance', 'Transportation barriers', 'Childcare challenges', 'Family-school communication']
		),
		'sub-family-resource': buildWorkflow(
			'wf-family-resource-center',
			'Family Resource Center Workflow',
			'Connect families to community resources through a family resource center model.',
			'Self-referral or agency referral to a family resource center',
			PARENT_SUPPORT_STAGES,
			['Parenting support', 'Child development', 'Community resources', 'Family relationships']
		),
		'sub-parent-education': buildWorkflow(
			'wf-parenting-skills',
			'Parenting Skills Program Workflow',
			'Build parenting confidence through coaching, groups, and counseling referrals.',
			'Referral for child behavior challenges',
			[
				stage('intake', 'Referral & Intake', 'Parenting program referral received'),
				stage('assessment', 'Parenting & Family Assessment', 'Behavior management and stress factors identified'),
				stage('risk', 'Family Stress & Priority Review', 'High-stress areas prioritized'),
				stage('careplan', 'Parent Coaching Plan', 'Goals for interactions and stress reduction'),
				stage('services', 'Coaching & Group Referrals', 'Parent coaching, support groups, counseling'),
				stage('followup', 'Skill Implementation Tracking', 'Parenting skill practice documentation'),
				stage('reassessment', 'Progress Review', 'Behavior incident and confidence review'),
				stage('closure', 'Case Resolution / Closure', 'Parent confident managing challenges independently')
			],
			['Behavior management', 'Parent-child interactions', 'Parental stress', 'Support groups']
		),
		'sub-crisis-response': buildWorkflow(
			'wf-crisis-response',
			'Crisis Response Workflow',
			'Rapid response for mental health crises with safety planning and stabilization.',
			'Crisis hotline or ER referral requiring immediate triage',
			[
				stage('intake', 'Crisis Referral & Triage', 'Crisis referral logged and assigned'),
				stage('assessment', 'Safety & Crisis Assessment', 'Immediate safety and risk evaluation'),
				stage('risk', 'Acuity Prioritization', 'Crisis acuity level documented'),
				stage('careplan', 'Stabilization Plan', 'Safety plan and immediate interventions'),
				stage('services', 'Crisis Resource Linkage', 'Crisis bed, mobile team, or outpatient link'),
				stage('followup', 'Crisis Monitoring', '24–72 hour follow-up contacts'),
				stage('reassessment', 'Stabilization Review', 'Readiness for step-down care'),
				stage('closure', 'Crisis Discharge / Closure', 'Warm handoff to ongoing services')
			],
			['Suicide/homicide risk', 'Safety planning', 'Crisis stabilization', 'Warm handoff']
		),
		'sub-outpatient-counseling': buildWorkflow(
			'wf-outpatient-counseling',
			'Outpatient Counseling Workflow',
			'Outpatient mental health case management from intake through treatment planning.',
			'Healthcare or self-referral for outpatient counseling',
			[
				stage('intake', 'Referral & Intake', 'Counseling referral and consent'),
				stage('assessment', 'Clinical Intake Assessment', 'Biopsychosocial assessment summary'),
				stage('risk', 'Clinical Risk Screening', 'Risk factors and acuity documented'),
				stage('careplan', 'Treatment Plan Development', 'Goals, modalities, and frequency'),
				stage('services', 'Therapy Coordination', 'Session scheduling and ancillary referrals'),
				stage('followup', 'Treatment Monitoring', 'Session notes and engagement tracking'),
				stage('reassessment', 'Treatment Plan Review', 'Goal progress and plan updates'),
				stage('closure', 'Discharge Planning', 'Step-down or successful completion summary')
			],
			['Clinical assessment', 'Treatment planning', 'Therapy engagement', 'Medication coordination']
		),
		'sub-peer-support': buildWorkflow(
			'wf-peer-support',
			'Peer Support Workflow',
			'Peer-led recovery support with goal setting and community connection.',
			'Referral to certified peer support specialist program',
			[
				stage('intake', 'Referral & Enrollment', 'Peer support enrollment record'),
				stage('assessment', 'Recovery Needs Assessment', 'Recovery goals and strengths identified'),
				stage('risk', 'Support Needs Prioritization', 'Priority recovery domains ranked'),
				stage('careplan', 'Peer Recovery Plan', 'Peer-defined goals and action steps'),
				stage('services', 'Peer Service Linkage', 'Groups, coaching, and community connections'),
				stage('followup', 'Peer Check-ins', 'Recovery progress and barrier documentation'),
				stage('reassessment', 'Recovery Progress Review', 'Goal achievement review'),
				stage('closure', 'Graduation / Closure', 'Transition to self-directed recovery supports')
			],
			['Recovery goals', 'Peer mentoring', 'Community integration', 'Relapse prevention']
		),
		'sub-housing-assistance': buildWorkflow(
			'wf-family-stability',
			'Family Stability Program Workflow',
			'Stabilize housing and basic needs for families facing financial hardship.',
			'Family request for assistance due to financial hardship',
			[
				stage('intake', 'Referral & Intake', 'Housing stability referral received'),
				stage('assessment', 'Stability Assessment', 'Employment, housing, and childcare findings'),
				stage('risk', 'Instability Risk Review', 'Eviction and crisis risk prioritized'),
				stage('careplan', 'Stability Support Plan', 'Employment, housing, and childcare goals'),
				stage('services', 'Housing & Benefit Referrals', 'Workforce, housing, and subsidy applications'),
				stage('followup', 'Monthly Progress Meetings', 'Progress notes and barrier tracking'),
				stage('reassessment', 'Stability Progress Review', 'Housing and income outcome review'),
				stage('closure', 'Case Resolution / Closure', 'Stable housing and long-term supports connected')
			],
			['Housing stability', 'Employment', 'Affordable childcare', 'Financial literacy']
		),
		'sub-employment-support': buildWorkflow(
			'wf-employment-support',
			'Employment Support Workflow',
			'Help clients secure and maintain employment through workforce development services.',
			'Community agency referral for job search and retention support',
			[
				stage('intake', 'Referral & Intake', 'Employment program referral record'),
				stage('assessment', 'Workforce Assessment', 'Skills, barriers, and job readiness summary'),
				stage('risk', 'Employment Barrier Review', 'Priority barriers to employment'),
				stage('careplan', 'Employment Action Plan', 'Job search goals and training steps'),
				stage('services', 'Workforce Referrals', 'Training, job placement, and support services'),
				stage('followup', 'Job Search Monitoring', 'Application and interview tracking'),
				stage('reassessment', 'Employment Progress Review', 'Job retention and income review'),
				stage('closure', 'Employment Closure', 'Stable employment and follow-up resources')
			],
			['Job readiness', 'Skills training', 'Job placement', 'Retention support']
		),
		'sub-general-intake': buildWorkflow(
			'wf-general-intake',
			'Community Intake Workflow',
			'General community social services intake connecting clients to appropriate programs.',
			'Walk-in or partner agency referral for undetermined service needs',
			PARENT_SUPPORT_STAGES,
			['Eligibility screening', 'Program routing', 'Basic needs', 'Warm referrals']
		)
	};

	var DEFAULT_WORKFLOW = buildWorkflow(
		'wf-default',
		'Case Management Workflow',
		'Standard eight-stage case management process.',
		'Generic case management',
		SENIOR_STAGES,
		[]
	);

	function localizeWorkflow(workflow, scopeId) {
		if (!workflow || !RM.I18n || !scopeId) {
			return workflow;
		}
		var base = 'workflow.' + scopeId;
		return Object.assign({}, workflow, {
			name: RM.I18n.tOr(base + '.name', workflow.name),
			description: RM.I18n.tOr(base + '.description', workflow.description),
			exampleProgram: RM.I18n.tOr(base + '.exampleProgram', workflow.exampleProgram),
			stages: workflow.stages.map(function (stageDef) {
				var stageBase = base + '.stages.' + stageDef.tabId;
				return Object.assign({}, stageDef, {
					label: RM.I18n.tOr(stageBase + '.label', stageDef.label),
					shortLabel: RM.I18n.tOr(stageBase + '.label', stageDef.shortLabel || stageDef.label),
					deliverable: RM.I18n.tOr(stageBase + '.deliverable', stageDef.deliverable || '')
				});
			}),
			focusAreas: (workflow.focusAreas || []).map(function (area, index) {
				return RM.I18n.tOr(base + '.focusAreas.' + index, area);
			})
		});
	}

	function resolveWorkflow(subcategoryId) {
		return WORKFLOWS_BY_SUBCATEGORY[subcategoryId] || DEFAULT_WORKFLOW;
	}

	RM.CaseWorkflow = {
		TAB_IDS: TAB_IDS,

		forClient: function (client) {
			if (!client) {
				return localizeWorkflow(DEFAULT_WORKFLOW, 'default');
			}
			var scopeId = client.caseSubcategoryId || client.caseCategoryId || 'default';
			return localizeWorkflow(resolveWorkflow(scopeId), scopeId);
		},

		forSubcategory: function (subcategoryId) {
			var scopeId = subcategoryId || 'default';
			return localizeWorkflow(resolveWorkflow(scopeId), scopeId);
		},

		stagesForClient: function (client) {
			return this.forClient(client).stages;
		},

		stageLabel: function (client, stageNum) {
			var stages = this.stagesForClient(client);
			var match = stages.find(function (s) { return s.stage === stageNum; });
			if (match) { return match.label; }
			var fallback = localizeWorkflow(DEFAULT_WORKFLOW, 'default').stages[stageNum - 1];
			return fallback ? fallback.label : '';
		},

		tabLabel: function (client, tabId) {
			var stages = this.stagesForClient(client);
			var match = stages.find(function (s) { return s.tabId === tabId; });
			return match ? match.label : tabId;
		},

		tabsForClient: function (client) {
			var stages = this.stagesForClient(client);
			var processTabs = stages.map(function (s) {
				return { id: s.tabId, label: s.label, process: true, stage: s.stage, deliverable: s.deliverable };
			});
			return processTabs.concat([
				{ id: 'documents', label: RM.I18n ? RM.I18n.t('workflow.tabs.documents') : 'Documents', process: false },
				{ id: 'activity', label: RM.I18n ? RM.I18n.t('workflow.tabs.activity') : 'Activity', process: false }
			]);
		},

		stageForTab: function (client, tabId) {
			var stages = this.stagesForClient(client);
			var match = stages.find(function (s) { return s.tabId === tabId; });
			return match ? match.stage : 1;
		},

		tabForStage: function (client, stageNum) {
			var stages = this.stagesForClient(client);
			var match = stages.find(function (s) { return s.stage === stageNum; });
			return match ? match.tabId : 'intake';
		},

		deliverableForStage: function (client, stageNum) {
			var stages = this.stagesForClient(client);
			var match = stages.find(function (s) { return s.stage === stageNum; });
			return match ? match.deliverable : '';
		},

		listWorkflows: function () {
			return Object.keys(WORKFLOWS_BY_SUBCATEGORY).map(function (key) {
				return Object.assign({ subcategoryId: key }, WORKFLOWS_BY_SUBCATEGORY[key]);
			});
		}
	};
})();
