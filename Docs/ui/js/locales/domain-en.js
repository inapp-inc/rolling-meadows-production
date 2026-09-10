/* global RM */
(function () {
	'use strict';

	var locale = window.RM._LOCALES.en;
	Object.assign(locale, {
		category: {
			'cat-senior-services': 'Senior Social Services',
			'cat-parenting-support': 'Parenting Support Programs',
			'cat-mental-health': 'Mental Health Services',
			'cat-community-services': 'Community Social Services'
		},
		subcategory: {
			'sub-seniors-at-risk': 'Seniors at Risk',
			'sub-in-home-support': 'In-Home Support',
			'sub-nutrition-programs': 'Nutrition Programs',
			'sub-youth-empowerment': 'Youth Empowerment Groups',
			'sub-family-resource': 'Family Resource Center',
			'sub-parent-education': 'Parent Education',
			'sub-crisis-response': 'Crisis Response',
			'sub-outpatient-counseling': 'Outpatient Counseling',
			'sub-peer-support': 'Peer Support',
			'sub-housing-assistance': 'Housing Assistance',
			'sub-employment-support': 'Employment Support',
			'sub-general-intake': 'General Intake'
		},
		case: {
			caseCategory: 'Case category',
			subcategory: 'Subcategory',
			allCategories: 'All categories',
			allSubcategories: 'All subcategories',
			continueReferral: 'Continue to referral & intake',
			selectSubcategoryPreview: 'Select a subcategory to preview the workflow.',
			categoryBanner: 'Case category:',
			subcategoryBanner: 'Subcategory:'
		},
		workflow: {
			tabs: {
				documents: 'Documents',
				activity: 'Activity'
			},
			default: {
				name: 'Case Management Workflow',
				description: 'Standard eight-stage case management process.',
				exampleProgram: 'Generic case management',
				stages: {
					intake: { label: 'Referral & Intake', deliverable: 'Referral record and consent on file' },
					assessment: { label: 'Comprehensive Assessment', deliverable: 'Holistic assessment summary' },
					risk: { label: 'Risk Identification & Prioritization', deliverable: 'Prioritized risk profile' },
					careplan: { label: 'Care / Service Plan Development', deliverable: 'Individualized care plan' },
					services: { label: 'Service Coordination', deliverable: 'Service enrollments and CBO referrals' },
					followup: { label: 'Ongoing Monitoring & Follow-Up', deliverable: 'Contact notes and follow-up cadence' },
					reassessment: { label: 'Reassessment', deliverable: 'Updated risk ratings and plan adjustments' },
					closure: { label: 'Case Resolution / Closure', deliverable: 'Closure summary and outcomes' }
				}
			},
			'sub-seniors-at-risk': {
				name: 'Seniors at Risk Case Management',
				description: 'Identify safety and wellbeing risks for older adults and coordinate protective services.',
				exampleProgram: 'Hospital or community referral for falls, isolation, or self-neglect concerns',
				stages: {
					intake: { label: 'Referral & Intake', deliverable: 'Referral record received and assigned' },
					assessment: { label: 'Comprehensive Assessment', deliverable: 'Holistic assessment summary' },
					risk: { label: 'Risk Identification & Prioritization', deliverable: 'Prioritized risk profile' },
					careplan: { label: 'Care / Service Plan Development', deliverable: 'Individualized care plan' },
					services: { label: 'Service Coordination', deliverable: 'Service enrollments and CBO referrals' },
					followup: { label: 'Ongoing Monitoring & Follow-Up', deliverable: 'Contact notes and follow-up cadence' },
					reassessment: { label: 'Reassessment', deliverable: 'Updated risk ratings and plan adjustments' },
					closure: { label: 'Case Resolution / Closure', deliverable: 'Closure summary and outcomes' }
				},
				focusAreas: {
					0: 'Fall prevention',
					1: 'Medication safety',
					2: 'Social isolation',
					3: 'Abuse or neglect screening'
				}
			},
			'sub-in-home-support': {
				name: 'In-Home Support Workflow',
				description: 'Support aging adults to remain safely at home through coordinated in-home services.',
				exampleProgram: 'Physician referral for ADL support and home safety',
				stages: {
					intake: { label: 'Referral & Intake', deliverable: 'Referral and home support eligibility' },
					assessment: { label: 'In-Home Needs Assessment', deliverable: 'Functional and home environment summary' },
					risk: { label: 'Safety & Independence Review', deliverable: 'Prioritized support needs' },
					careplan: { label: 'In-Home Care Plan', deliverable: 'Personal care and equipment plan' },
					services: { label: 'Provider Coordination', deliverable: 'Home care and equipment referrals' },
					followup: { label: 'Home Visit Monitoring', deliverable: 'Visit notes and caregiver coordination' },
					reassessment: { label: 'Functional Reassessment', deliverable: 'Updated independence goals' },
					closure: { label: 'Transition / Closure', deliverable: 'Transition to alternate level of care or graduation' }
				},
				focusAreas: {
					0: 'Activities of daily living',
					1: 'Caregiver support',
					2: 'Home modifications',
					3: 'Equipment needs'
				}
			},
			'sub-nutrition-programs': {
				name: 'Nutrition Program Workflow',
				description: 'Connect seniors to meal programs and monitor nutritional wellbeing.',
				exampleProgram: 'Community referral for food insecurity or malnutrition risk',
				stages: {
					intake: { label: 'Referral & Intake', deliverable: 'Nutrition program referral record' },
					assessment: { label: 'Nutritional Screening', deliverable: 'Dietary and food access assessment' },
					risk: { label: 'Nutrition Risk Prioritization', deliverable: 'Priority level for meal services' },
					careplan: { label: 'Nutrition Support Plan', deliverable: 'Meal service and dietary goals' },
					services: { label: 'Meal Program Enrollment', deliverable: 'Meals on Wheels or congregate dining enrollment' },
					followup: { label: 'Nutrition Monitoring', deliverable: 'Weight, appetite, and meal delivery tracking' },
					reassessment: { label: 'Quarterly Nutrition Review', deliverable: 'Updated dietary plan' },
					closure: { label: 'Program Graduation / Closure', deliverable: 'Transition to self-sufficiency or alternate program' }
				},
				focusAreas: {
					0: 'Food access',
					1: 'Meal delivery',
					2: 'Dietary restrictions',
					3: 'Social dining engagement'
				}
			},
			'sub-youth-empowerment': {
				name: 'School Attendance Support Workflow',
				description: 'Support families when school attendance or youth engagement is at risk.',
				exampleProgram: 'School referral for chronic absenteeism',
				stages: {
					intake: { label: 'School Referral & Intake', deliverable: 'School referral record assigned' },
					assessment: { label: 'Family & Attendance Assessment', deliverable: 'Barriers to attendance identified' },
					risk: { label: 'Attendance Risk Prioritization', deliverable: 'Priority barriers ranked' },
					careplan: { label: 'Attendance Support Plan', deliverable: 'Goals for attendance and family-school engagement' },
					services: { label: 'Resource Referrals', deliverable: 'Transportation, childcare, and school counselor links' },
					followup: { label: 'Monthly Attendance Review', deliverable: 'Attendance tracking and coaching notes' },
					reassessment: { label: 'Progress Review', deliverable: 'Attendance trend and plan adjustments' },
					closure: { label: 'Case Resolution / Closure', deliverable: 'Family self-sufficient in managing attendance' }
				},
				focusAreas: {
					0: 'School attendance',
					1: 'Transportation barriers',
					2: 'Childcare challenges',
					3: 'Family-school communication'
				}
			},
			'sub-family-resource': {
				name: 'Family Resource Center Workflow',
				description: 'Connect families to community resources through a family resource center model.',
				exampleProgram: 'Self-referral or agency referral to a family resource center',
				stages: {
					intake: { label: 'Referral & Intake', deliverable: 'Referral record received and assigned' },
					assessment: { label: 'Intake & Enrollment', deliverable: 'Family profile and eligibility verified' },
					risk: { label: 'Needs Assessment', deliverable: 'Needs assessment summary' },
					careplan: { label: 'Goal Setting & Service Planning', deliverable: 'Individualized family support plan' },
					services: { label: 'Service Coordination & Referrals', deliverable: 'Referral tracking and activated services' },
					followup: { label: 'Ongoing Support & Monitoring', deliverable: 'Case notes and updated action items' },
					reassessment: { label: 'Progress Review', deliverable: 'Updated support plan and progress report' },
					closure: { label: 'Case Resolution / Closure', deliverable: 'Outcome summary and exit documentation' }
				},
				focusAreas: {
					0: 'Parenting support',
					1: 'Child development',
					2: 'Community resources',
					3: 'Family relationships'
				}
			},
			'sub-parent-education': {
				name: 'Parenting Skills Program Workflow',
				description: 'Build parenting confidence through coaching, groups, and counseling referrals.',
				exampleProgram: 'Referral for child behavior challenges',
				stages: {
					intake: { label: 'Referral & Intake', deliverable: 'Parenting program referral received' },
					assessment: { label: 'Parenting & Family Assessment', deliverable: 'Behavior management and stress factors identified' },
					risk: { label: 'Family Stress & Priority Review', deliverable: 'High-stress areas prioritized' },
					careplan: { label: 'Parent Coaching Plan', deliverable: 'Goals for interactions and stress reduction' },
					services: { label: 'Coaching & Group Referrals', deliverable: 'Parent coaching, support groups, counseling' },
					followup: { label: 'Skill Implementation Tracking', deliverable: 'Parenting skill practice documentation' },
					reassessment: { label: 'Progress Review', deliverable: 'Behavior incident and confidence review' },
					closure: { label: 'Case Resolution / Closure', deliverable: 'Parent confident managing challenges independently' }
				},
				focusAreas: {
					0: 'Behavior management',
					1: 'Parent-child interactions',
					2: 'Parental stress',
					3: 'Support groups'
				}
			},
			'sub-crisis-response': {
				name: 'Crisis Response Workflow',
				description: 'Rapid response for mental health crises with safety planning and stabilization.',
				exampleProgram: 'Crisis hotline or ER referral requiring immediate triage',
				stages: {
					intake: { label: 'Crisis Referral & Triage', deliverable: 'Crisis referral logged and assigned' },
					assessment: { label: 'Safety & Crisis Assessment', deliverable: 'Immediate safety and risk evaluation' },
					risk: { label: 'Acuity Prioritization', deliverable: 'Crisis acuity level documented' },
					careplan: { label: 'Stabilization Plan', deliverable: 'Safety plan and immediate interventions' },
					services: { label: 'Crisis Resource Linkage', deliverable: 'Crisis bed, mobile team, or outpatient link' },
					followup: { label: 'Crisis Monitoring', deliverable: '24–72 hour follow-up contacts' },
					reassessment: { label: 'Stabilization Review', deliverable: 'Readiness for step-down care' },
					closure: { label: 'Crisis Discharge / Closure', deliverable: 'Warm handoff to ongoing services' }
				},
				focusAreas: {
					0: 'Suicide/homicide risk',
					1: 'Safety planning',
					2: 'Crisis stabilization',
					3: 'Warm handoff'
				}
			},
			'sub-outpatient-counseling': {
				name: 'Outpatient Counseling Workflow',
				description: 'Outpatient mental health case management from intake through treatment planning.',
				exampleProgram: 'Healthcare or self-referral for outpatient counseling',
				stages: {
					intake: { label: 'Referral & Intake', deliverable: 'Counseling referral and consent' },
					assessment: { label: 'Clinical Intake Assessment', deliverable: 'Biopsychosocial assessment summary' },
					risk: { label: 'Clinical Risk Screening', deliverable: 'Risk factors and acuity documented' },
					careplan: { label: 'Treatment Plan Development', deliverable: 'Goals, modalities, and frequency' },
					services: { label: 'Therapy Coordination', deliverable: 'Session scheduling and ancillary referrals' },
					followup: { label: 'Treatment Monitoring', deliverable: 'Session notes and engagement tracking' },
					reassessment: { label: 'Treatment Plan Review', deliverable: 'Goal progress and plan updates' },
					closure: { label: 'Discharge Planning', deliverable: 'Step-down or successful completion summary' }
				},
				focusAreas: {
					0: 'Clinical assessment',
					1: 'Treatment planning',
					2: 'Therapy engagement',
					3: 'Medication coordination'
				}
			},
			'sub-peer-support': {
				name: 'Peer Support Workflow',
				description: 'Peer-led recovery support with goal setting and community connection.',
				exampleProgram: 'Referral to certified peer support specialist program',
				stages: {
					intake: { label: 'Referral & Enrollment', deliverable: 'Peer support enrollment record' },
					assessment: { label: 'Recovery Needs Assessment', deliverable: 'Recovery goals and strengths identified' },
					risk: { label: 'Support Needs Prioritization', deliverable: 'Priority recovery domains ranked' },
					careplan: { label: 'Peer Recovery Plan', deliverable: 'Peer-defined goals and action steps' },
					services: { label: 'Peer Service Linkage', deliverable: 'Groups, coaching, and community connections' },
					followup: { label: 'Peer Check-ins', deliverable: 'Recovery progress and barrier documentation' },
					reassessment: { label: 'Recovery Progress Review', deliverable: 'Goal achievement review' },
					closure: { label: 'Graduation / Closure', deliverable: 'Transition to self-directed recovery supports' }
				},
				focusAreas: {
					0: 'Recovery goals',
					1: 'Peer mentoring',
					2: 'Community integration',
					3: 'Relapse prevention'
				}
			},
			'sub-housing-assistance': {
				name: 'Family Stability Program Workflow',
				description: 'Stabilize housing and basic needs for families facing financial hardship.',
				exampleProgram: 'Family request for assistance due to financial hardship',
				stages: {
					intake: { label: 'Referral & Intake', deliverable: 'Housing stability referral received' },
					assessment: { label: 'Stability Assessment', deliverable: 'Employment, housing, and childcare findings' },
					risk: { label: 'Instability Risk Review', deliverable: 'Eviction and crisis risk prioritized' },
					careplan: { label: 'Stability Support Plan', deliverable: 'Employment, housing, and childcare goals' },
					services: { label: 'Housing & Benefit Referrals', deliverable: 'Workforce, housing, and subsidy applications' },
					followup: { label: 'Monthly Progress Meetings', deliverable: 'Progress notes and barrier tracking' },
					reassessment: { label: 'Stability Progress Review', deliverable: 'Housing and income outcome review' },
					closure: { label: 'Case Resolution / Closure', deliverable: 'Stable housing and long-term supports connected' }
				},
				focusAreas: {
					0: 'Housing stability',
					1: 'Employment',
					2: 'Affordable childcare',
					3: 'Financial literacy'
				}
			},
			'sub-employment-support': {
				name: 'Employment Support Workflow',
				description: 'Help clients secure and maintain employment through workforce development services.',
				exampleProgram: 'Community agency referral for job search and retention support',
				stages: {
					intake: { label: 'Referral & Intake', deliverable: 'Employment program referral record' },
					assessment: { label: 'Workforce Assessment', deliverable: 'Skills, barriers, and job readiness summary' },
					risk: { label: 'Employment Barrier Review', deliverable: 'Priority barriers to employment' },
					careplan: { label: 'Employment Action Plan', deliverable: 'Job search goals and training steps' },
					services: { label: 'Workforce Referrals', deliverable: 'Training, job placement, and support services' },
					followup: { label: 'Job Search Monitoring', deliverable: 'Application and interview tracking' },
					reassessment: { label: 'Employment Progress Review', deliverable: 'Job retention and income review' },
					closure: { label: 'Employment Closure', deliverable: 'Stable employment and follow-up resources' }
				},
				focusAreas: {
					0: 'Job readiness',
					1: 'Skills training',
					2: 'Job placement',
					3: 'Retention support'
				}
			},
			'sub-general-intake': {
				name: 'Community Intake Workflow',
				description: 'General community social services intake connecting clients to appropriate programs.',
				exampleProgram: 'Walk-in or partner agency referral for undetermined service needs',
				stages: {
					intake: { label: 'Referral & Intake', deliverable: 'Referral record received and assigned' },
					assessment: { label: 'Intake & Enrollment', deliverable: 'Family profile and eligibility verified' },
					risk: { label: 'Needs Assessment', deliverable: 'Needs assessment summary' },
					careplan: { label: 'Goal Setting & Service Planning', deliverable: 'Individualized family support plan' },
					services: { label: 'Service Coordination & Referrals', deliverable: 'Referral tracking and activated services' },
					followup: { label: 'Ongoing Support & Monitoring', deliverable: 'Case notes and updated action items' },
					reassessment: { label: 'Progress Review', deliverable: 'Updated support plan and progress report' },
					closure: { label: 'Case Resolution / Closure', deliverable: 'Outcome summary and exit documentation' }
				},
				focusAreas: {
					0: 'Eligibility screening',
					1: 'Program routing',
					2: 'Basic needs',
					3: 'Warm referrals'
				}
			}
		}
	});
})();
