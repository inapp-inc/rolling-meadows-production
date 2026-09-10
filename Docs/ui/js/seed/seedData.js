/* global RM */
(function () {
	'use strict';

	var PROGRAM_ID = 'prog-senior-services';
	var CM_ID = 'usr-case-manager';

	RM.Seed = {
		VERSION: 25,

		load: function () {
			if (!this._repositoriesReady()) {
				console.error('RM.Seed.load: required repositories are not loaded on this page.');
				return;
			}
			RM.Store.clearAll();
			this._seedUsers();
			this._seedMarySmithData();
			this._seedSeniorCaseload();
			this._seedSpecialCases();
			this._seedMultiProgramClient();
			this._seedRegistrationOnlyClients();
			this._seedDuplicateCandidates();
			this._seedSampleDocuments();
			this._seedReportingData();
			RM.Store.setMeta('initialized', true);
			RM.Store.setMeta('seedVersion', this.VERSION);
			RM.Audit.record('system', 'demo_reset', 'Seed data v' + this.VERSION + ' loaded');
		},

		ensureLoaded: function () {
			if (!this._repositoriesReady()) {
				return;
			}
			var version = RM.Store.getMeta('seedVersion');
			var ready = RM.Store.getMeta('initialized') === true;
			var valid = ready && version === this.VERSION && this._validate();

			if (!valid) {
				this.load();
			}
		},

		_repositoriesReady: function () {
			return !!(RM.UserRepository && RM.ClientRepository && RM.CaseRepository &&
				RM.ReferralRepository && RM.IntakeRepository && RM.RiskAssessmentRepository &&
				RM.CarePlanRepository && RM.ServiceEnrollmentRepository && RM.CBOReferralRepository &&
				RM.CaseNoteRepository && RM.ReassessmentRepository && RM.DocumentRepository &&
				RM.DocumentService && RM.CaseService && RM.InitiativeRepository &&
				RM.ServiceUtilizationRepository && RM.CustomReportRepository);
		},

		_validate: function () {
			if (!this._repositoriesReady()) {
				return false;
			}
			return RM.UserRepository.findAll().length >= 4 &&
				RM.ClientRepository.findAll().length >= 19 &&
				RM.CaseRepository.findAll().length >= 13 &&
				RM.RiskAssessmentRepository.findAll().length >= 10;
		},

		_seedUsers: function () {
			[
				{
					id: 'usr-case-manager',
					name: 'Case Manager',
					role: 'case_manager',
					programId: PROGRAM_ID,
					status: 'Active',
					contactPhone: '(847) 555-0101'
				},
				{
					id: 'usr-supervisor',
					name: 'Supervisor / Dept Admin',
					role: 'supervisor',
					programId: PROGRAM_ID,
					status: 'Active',
					contactPhone: '(847) 555-0102'
				},
				{
					id: 'usr-cross-program-liaison',
					name: 'Cross-Program Liaison',
					role: 'cross_program_liaison',
					programId: 'prog-community-services',
					status: 'Active',
					contactPhone: '(847) 555-0103'
				},
				{ id: 'usr-auditor', name: 'Auditor', role: 'auditor', programId: PROGRAM_ID, status: 'Active', contactPhone: '—' }
			].forEach(function (u) { RM.UserRepository.save(u); });
		},

		_seedClientRecord: function (client, bundle) {
			var caseFieldKeys = [
				'programId', 'caseCategoryId', 'caseSubcategoryId', 'caseManagerId',
				'status', 'currentStage', 'incompleteIntake', 'createdAt', 'caseNumber', 'caseId'
			];
			var caseFields = {};
			var person = Object.assign({}, client);
			caseFieldKeys.forEach(function (key) {
				if (person[key] !== undefined) {
					caseFields[key] = person[key];
					delete person[key];
				}
			});

			person.registeredAt = person.registeredAt || caseFields.createdAt || '2026-01-01';
			person.registrationSource = person.registrationSource || 'walk_in';
			RM.ClientRepository.save(person);

			if (!bundle && !caseFields.caseManagerId && !caseFields.status) {
				return;
			}

			var caseRecord = RM.CaseRepository.save({
				id: caseFields.caseId || ('case-' + person.id),
				clientId: person.id,
				caseNumber: caseFields.caseNumber || RM.CaseService.nextCaseNumber(),
				programId: caseFields.programId || PROGRAM_ID,
				caseCategoryId: caseFields.caseCategoryId || 'cat-senior-services',
				caseSubcategoryId: caseFields.caseSubcategoryId || 'sub-seniors-at-risk',
				caseManagerId: caseFields.caseManagerId || CM_ID,
				status: caseFields.status || 'active',
				currentStage: caseFields.currentStage,
				incompleteIntake: caseFields.incompleteIntake,
				openDate: caseFields.createdAt || person.registeredAt,
				createdAt: caseFields.createdAt || person.registeredAt
			});

			if (!bundle) { return; }

			var link = { clientId: person.id, caseId: caseRecord.id };

			if (bundle.referral) {
				RM.ReferralRepository.save(Object.assign({}, link, bundle.referral));
			}
			if (bundle.intake) {
				RM.IntakeRepository.save(Object.assign({}, link, bundle.intake));
			}
			if (bundle.assessment) {
				RM.RiskAssessmentRepository.save(Object.assign({}, link, { assessorId: CM_ID }, bundle.assessment));
			}
			if (bundle.carePlans) {
				bundle.carePlans.forEach(function (cp, i) {
					RM.CarePlanRepository.save(Object.assign({}, link, { voided: false }, cp, {
						id: cp.id || ('cp-' + person.id + '-' + (i + 1))
					}));
				});
			}
			if (bundle.enrollments) {
				bundle.enrollments.forEach(function (e, i) {
					RM.ServiceEnrollmentRepository.save(Object.assign({}, link, {
						voided: false, enrolledBy: CM_ID, status: 'active'
					}, e, { id: e.id || ('enr-' + person.id + '-' + (i + 1)) }));
				});
			}
			if (bundle.cbo) {
				RM.CBOReferralRepository.save(Object.assign({}, link, bundle.cbo));
			}
			if (bundle.notes) {
				bundle.notes.forEach(function (n, i) {
					RM.CaseNoteRepository.save(Object.assign({}, link, {
						authorId: CM_ID, voided: false
					}, n, { id: n.id || ('note-' + person.id + '-' + (i + 1)) }));
				});
			}
			if (bundle.reassessments) {
				bundle.reassessments.forEach(function (r, i) {
					RM.ReassessmentRepository.save(Object.assign({}, link, r, {
						id: r.id || ('re-' + person.id + '-' + (i + 1))
					}));
				});
			}
		},

		_seedCaseBundle: function (clientId, caseId, bundle) {
			var link = { clientId: clientId, caseId: caseId };

			if (bundle.referral) {
				RM.ReferralRepository.save(Object.assign({}, link, bundle.referral));
			}
			if (bundle.intake) {
				RM.IntakeRepository.save(Object.assign({}, link, bundle.intake));
			}
			if (bundle.assessment) {
				RM.RiskAssessmentRepository.save(Object.assign({}, link, { assessorId: CM_ID }, bundle.assessment));
			}
			if (bundle.carePlans) {
				bundle.carePlans.forEach(function (cp, i) {
					RM.CarePlanRepository.save(Object.assign({}, link, { voided: false }, cp, {
						id: cp.id || ('cp-' + caseId + '-' + (i + 1))
					}));
				});
			}
			if (bundle.enrollments) {
				bundle.enrollments.forEach(function (e, i) {
					RM.ServiceEnrollmentRepository.save(Object.assign({}, link, {
						voided: false, enrolledBy: CM_ID, status: 'active'
					}, e, { id: e.id || ('enr-' + caseId + '-' + (i + 1)) }));
				});
			}
			if (bundle.cbo) {
				RM.CBOReferralRepository.save(Object.assign({}, link, bundle.cbo));
			}
			if (bundle.notes) {
				bundle.notes.forEach(function (n, i) {
					RM.CaseNoteRepository.save(Object.assign({}, link, {
						authorId: CM_ID, voided: false
					}, n, { id: n.id || ('note-' + caseId + '-' + (i + 1)) }));
				});
			}
			if (bundle.reassessments) {
				bundle.reassessments.forEach(function (r, i) {
					RM.ReassessmentRepository.save(Object.assign({}, link, r, {
						id: r.id || ('re-' + caseId + '-' + (i + 1))
					}));
				});
			}
		},

		_seedMarySmithData: function () {
			this._seedClientRecord({
				id: 'cli-mary-smith',
				name: 'Mary Smith',
				dob: '1942-03-15',
				phone: '(847) 555-0142',
				address: '412 Meadow Lane, Rolling Meadows, IL 60008',
				demographics: { gender: 'F', ethnicity: 'White', age: 84 },
				programId: PROGRAM_ID,
				caseCategoryId: 'cat-senior-services',
				caseSubcategoryId: 'sub-seniors-at-risk',
				caseManagerId: CM_ID,
			}, {
				referral: {
					id: 'ref-mary-1', source: 'Hospital', reason: 'Falls',
					dateReceived: '2026-02-01', referredBy: 'Advocate Lutheran General Hospital Social Work'
				},
				intake: {
					id: 'int-mary-1', livingArrangement: 'Lives alone in single-family home',
					medicalHistory: 'Hypertension, osteoarthritis, history of fall',
					consentOnFile: true, completeness: 'complete',
					comprehensiveAssessmentNotes: 'Holistic review completed — fall risk and nutrition concerns documented for care planning.',
					intakeQuestions: {
						livesWith: 'Alone',
						mealPrep: 'Limited — skips meals frequently',
						transportation: 'No longer drives; relies on neighbors occasionally',
						medication: 'Self-manages with occasional missed doses'
					}
				},
				assessment: {
					id: 'ra-mary-1', date: '2026-02-05',
					ratings: { falls: 'High', nutrition: 'Medium', isolation: 'High', housing: 'Low', abuseRisk: 'Medium' },
					compositeScore: 72, overallRisk: 'High'
				},
				carePlans: [
					{ id: 'cp-mary-1', issue: 'Fall Risk', goal: 'Prevent future falls', service: 'Home safety assessment', status: 'In Progress' },
					{ id: 'cp-mary-2', issue: 'Nutrition', goal: 'Improve nutritional intake', service: 'Meals on Wheels referral', status: 'In Progress' },
					{ id: 'cp-mary-3', issue: 'Social Isolation', goal: 'Increase social engagement', service: 'Community center enrollment', status: 'Not Started' }
				],
				enrollments: [
					{ id: 'enr-mary-meals', serviceOrEventId: 'evt-meals', dateEnrolled: '2026-03-01' },
					{ id: 'enr-mary-holiday', serviceOrEventId: 'evt-holiday', dateEnrolled: '2026-06-15' },
					{
						id: 'enr-mary-transport-voided',
						serviceOrEventId: 'evt-safety',
						dateEnrolled: '2026-03-04',
						voided: true,
						voidReason: 'Duplicate enrollment — corrected by staff',
						voidedBy: CM_ID,
						voidedAt: '2026-03-05T14:22:00.000Z'
					}
				],
				cbo: { id: 'cbo-mary-1', cboName: 'Meals on Wheels Northwest', cboId: 'cbo-mow', status: 'Confirmed', date: '2026-03-02' },
				notes: [
					{ id: 'note-mary-1', date: '2026-03-10', type: 'home visit', text: 'Home visit completed. Client reports dizziness when standing. Medication review scheduled.' },
					{ id: 'note-mary-2', date: '2026-07-08', type: 'phone call', text: 'Follow-up call — client missed morning medication dose yesterday.' }
				],
				reassessments: [{
					id: 're-mary-1',
					date: '2026-07-01',
					trigger: '6-month timer',
					previousRatings: { falls: 'High', nutrition: 'Medium', isolation: 'High', housing: 'Low', abuseRisk: 'Medium' },
					newRatings: { falls: 'Medium', nutrition: 'Medium', isolation: 'Medium', housing: 'Low', abuseRisk: 'Low' }
				}]
			});

			RM.Audit.record('enrollment:enr-mary-transport-voided', 'void', 'Duplicate enrollment — corrected by staff');
		},

		_seedSeniorCaseload: function () {
			var seniors = [
				{ id: 'cli-john-davis', name: 'John Davis', dob: '1938-07-22', phone: '(847) 555-0201', address: '88 Oak Street, Rolling Meadows, IL', risk: 'High' },
				{ id: 'cli-elena-rodriguez', name: 'Elena Rodriguez', dob: '1940-11-03', phone: '(847) 555-0202', address: '15 Pine Court, Rolling Meadows, IL', risk: 'Medium' },
				{ id: 'cli-robert-kim', name: 'Robert Kim', dob: '1935-04-18', phone: '(847) 555-0203', address: '902 Central Rd, Rolling Meadows, IL', risk: 'Low' },
				{ id: 'cli-dorothy-williams', name: 'Dorothy Williams', dob: '1944-09-30', phone: '(847) 555-0204', address: '77 Birch Ave, Rolling Meadows, IL', risk: 'Medium' },
				{ id: 'cli-frank-miller', name: 'Frank Miller', dob: '1939-01-12', phone: '(847) 555-0205', address: '203 Willow Dr, Rolling Meadows, IL', risk: 'High' },
				{ id: 'cli-helen-chen', name: 'Helen Chen', dob: '1941-06-25', phone: '(847) 555-0206', address: '44 Maple St, Rolling Meadows, IL', risk: 'Medium' },
				{ id: 'cli-george-patel', name: 'George Patel', dob: '1937-12-08', phone: '(847) 555-0207', address: '561 Elm Way, Rolling Meadows, IL', risk: 'Low' },
				{ id: 'cli-ruth-anderson', name: 'Ruth Anderson', dob: '1943-02-14', phone: '(847) 555-0208', address: '19 Cedar Ln, Rolling Meadows, IL', risk: 'Medium' },
				{ id: 'cli-james-wilson', name: 'James Wilson', dob: '1936-08-19', phone: '(847) 555-0209', address: '330 Park Blvd, Rolling Meadows, IL', risk: 'High' },
				{ id: 'cli-margaret-lee', name: 'Margaret Lee', dob: '1945-05-07', phone: '(847) 555-0210', address: '67 Spruce Ct, Rolling Meadows, IL', risk: 'Medium' },
				{ id: 'cli-william-brown', name: 'William Brown', dob: '1934-10-31', phone: '(847) 555-0211', address: '118 Ash St, Rolling Meadows, IL', risk: 'Low' },
				{ id: 'cli-betty-taylor', name: 'Betty Taylor', dob: '1942-07-04', phone: '(847) 555-0212', address: '245 Hickory Rd, Rolling Meadows, IL', risk: 'Medium' }
			];

			var sources = ['Hospital', 'Physician', 'Police', 'Self', 'Neighbor'];
			var reasons = ['Falls', 'Isolation', 'Medication issues', 'Food insecurity', 'Self-neglect'];

			var noteDates = {
				'cli-john-davis': '2026-07-04',
				'cli-elena-rodriguez': '2026-07-01',
				'cli-robert-kim': '2026-05-01',
				'cli-dorothy-williams': '2026-06-13',
				'cli-frank-miller': '2026-07-11',
				'cli-helen-chen': '2026-06-25',
				'cli-george-patel': '2026-04-15',
				'cli-ruth-anderson': '2026-06-28',
				'cli-james-wilson': '2026-07-15',
				'cli-margaret-lee': '2026-06-13',
				'cli-william-brown': '2026-04-20',
				'cli-betty-taylor': '2026-06-20'
			};

			seniors.forEach(function (s, i) {
				var noteDate = noteDates[s.id] || '2026-07-10';
				var subcategories = ['sub-seniors-at-risk', 'sub-in-home-support', 'sub-nutrition-programs'];
				this._seedClientRecord({
					id: s.id,
					name: s.name,
					dob: s.dob,
					phone: s.phone,
					address: s.address,
					programId: PROGRAM_ID,
					caseCategoryId: 'cat-senior-services',
					caseSubcategoryId: subcategories[i % subcategories.length],
					caseManagerId: CM_ID,
					status: 'active',
					incompleteIntake: false,
					currentStage: 3 + (i % 4),
					createdAt: '2026-01-15'
				}, {
					referral: {
						id: 'ref-' + s.id,
						source: sources[i % sources.length],
						reason: reasons[i % reasons.length],
						dateReceived: '2026-01-18',
						referredBy: 'Rolling Meadows community referral'
					},
					intake: {
						id: 'int-' + s.id,
						livingArrangement: i % 2 === 0 ? 'Lives alone' : 'Lives with spouse',
						medicalHistory: 'Chronic conditions managed with PCP',
						consentOnFile: true,
						completeness: 'complete',
						intakeQuestions: {
							livesWith: i % 2 === 0 ? 'Alone' : 'Spouse',
							mealPrep: 'Prepares simple meals independently',
							transportation: 'Family assists with appointments',
							medication: 'Uses pill organizer'
						}
					},
					assessment: {
						id: 'ra-' + s.id,
						date: '2026-01-20',
						ratings: {
							falls: s.risk === 'Moderate' ? 'Medium' : s.risk,
							nutrition: 'Low',
							isolation: 'Medium',
							housing: 'Low',
							abuseRisk: 'Low'
						},
						compositeScore: 40 + i * 3,
						overallRisk: s.risk === 'Moderate' ? 'Medium' : s.risk
					},
					carePlans: i % 2 === 0 ? [{
						issue: 'Safety', goal: 'Reduce fall risk', service: 'Home visit monitoring', status: 'In Progress'
					}] : [],
					enrollments: i < 10 ? [{ serviceOrEventId: 'evt-holiday', dateEnrolled: '2026-06-10' }] : [],
					cbo: i === 1 ? { cboName: 'Northwest Community Center', status: 'Pending', date: '2026-06-01' } :
						i === 4 ? { cboName: 'Area Agency on Aging', status: 'Sent', date: '2026-05-28' } : null,
					notes: [{ date: noteDate, type: i % 2 === 0 ? 'phone call' : 'home visit', text: 'Routine follow-up completed.' }]
				});
			}, this);
		},

		_seedSpecialCases: function () {
			this._seedProgramCaseExamples();
			this._seedClientRecord({
				id: 'cli-incomplete-1',
				name: 'Robert J Smith',
				dob: '',
				phone: '(847) 555-0199',
				address: 'Unknown — police referral',
				programId: PROGRAM_ID,
				caseManagerId: CM_ID,
				status: 'active',
				incompleteIntake: true,
				currentStage: 2,
				createdAt: '2026-07-01'
			}, {
				referral: {
					id: 'ref-incomplete-1', source: 'Police', reason: 'Unsafe living conditions',
					dateReceived: '2026-07-01', referredBy: 'Rolling Meadows Police Department'
				},
				intake: { id: 'int-incomplete-1', completeness: 'incomplete', consentOnFile: false }
			});

			RM.ClientRepository.save({
				id: 'cli-flag-demo',
				name: 'Susan Taylor',
				dob: '1946-03-20',
				phone: '(847) 555-0300',
				address: '100 Main St, Rolling Meadows, IL',
				registeredAt: '2026-06-01',
				registrationSource: 'referral'
			});

			var flagCase = RM.CaseRepository.save({
				id: 'case-flag-demo',
				clientId: 'cli-flag-demo',
				caseNumber: 'C-2026-099',
				programId: 'prog-community-services',
				caseCategoryId: 'cat-community-services',
				caseSubcategoryId: 'sub-general-intake',
				caseManagerId: 'usr-cross-program-liaison',
				status: 'active',
				currentStage: 3,
				openDate: '2026-06-01',
				createdAt: '2026-06-01'
			});

			RM.ReferralRepository.save({
				id: 'ref-flag-demo', clientId: 'cli-flag-demo', caseId: flagCase.id, source: 'Police',
				reason: 'Welfare check', dateReceived: '2026-06-15', referredBy: 'Community referral partner'
			});

			this._seedCaseBundle('cli-flag-demo', flagCase.id, {
				intake: {
					id: 'int-flag-demo',
					livingArrangement: 'Lives alone in apartment',
					medicalHistory: 'Diabetes, mild cognitive impairment',
					consentOnFile: true,
					completeness: 'complete',
					comprehensiveAssessmentNotes: 'Cross-program intake completed — community services assessment documented.',
					intakeQuestions: {
						livesWith: 'Alone',
						mealPrep: 'Uses delivered meals twice weekly',
						transportation: 'Paratransit for medical appointments',
						medication: 'Self-managed with weekly pill box setup'
					}
				},
				assessment: {
					id: 'ra-flag-demo',
					date: '2026-06-18',
					ratings: { safety: 'Medium', housing: 'Medium', nutrition: 'Low', isolation: 'High', medical: 'Medium' },
					compositeScore: 55,
					overallRisk: 'Medium'
				},
				notes: [{ date: '2026-06-25', type: 'phone call', text: 'Cross-program liaison confirmed welfare check follow-up.' }]
			});
		},

		_seedMultiProgramClient: function () {
			RM.ClientRepository.save({
				id: 'cli-multi-program',
				name: 'Robert Chen',
				dob: '1950-11-03',
				phone: '(847) 555-0310',
				address: '220 Oak Ave, Rolling Meadows, IL',
				registeredAt: '2026-05-10',
				registrationSource: 'referral'
			});

			RM.CaseRepository.save({
				id: 'case-multi-senior',
				clientId: 'cli-multi-program',
				caseNumber: 'C-2026-098',
				programId: PROGRAM_ID,
				caseCategoryId: 'cat-senior-services',
				caseSubcategoryId: 'sub-seniors-at-risk',
				caseManagerId: CM_ID,
				status: 'active',
				currentStage: 4,
				openDate: '2026-05-10',
				createdAt: '2026-05-10'
			});

			RM.CaseRepository.save({
				id: 'case-multi-community',
				clientId: 'cli-multi-program',
				caseNumber: 'C-2026-097',
				programId: 'prog-community-services',
				caseCategoryId: 'cat-community-services',
				caseSubcategoryId: 'sub-general-intake',
				caseManagerId: 'usr-cross-program-liaison',
				status: 'active',
				currentStage: 3,
				openDate: '2026-06-01',
				createdAt: '2026-06-01'
			});

			this._seedCaseBundle('cli-multi-program', 'case-multi-senior', {
				referral: {
					id: 'ref-multi-senior', source: 'Hospital', reason: 'Falls',
					dateReceived: '2026-05-10', referredBy: 'Advocate Lutheran General Hospital'
				},
				intake: {
					id: 'int-multi-senior', livingArrangement: 'Lives with spouse',
					medicalHistory: 'Osteoarthritis, recent fall in bathroom',
					consentOnFile: true, completeness: 'complete',
					comprehensiveAssessmentNotes: 'Senior services holistic review — fall prevention and meal support identified.',
					intakeQuestions: {
						livesWith: 'Spouse',
						mealPrep: 'Spouse prepares most meals',
						transportation: 'Spouse drives to appointments',
						medication: 'Uses pill organizer'
					}
				},
				assessment: {
					id: 'ra-multi-senior', date: '2026-05-12',
					ratings: { falls: 'High', nutrition: 'Medium', isolation: 'Low', housing: 'Low', abuseRisk: 'Low' },
					compositeScore: 58, overallRisk: 'Medium'
				},
				carePlans: [{
					issue: 'Fall prevention', goal: 'Reduce fall risk at home', service: 'Home safety assessment', status: 'In Progress'
				}],
				notes: [{ date: '2026-06-05', type: 'home visit', text: 'Grab bars installed in bathroom; follow-up in two weeks.' }]
			});

			this._seedCaseBundle('cli-multi-program', 'case-multi-community', {
				referral: {
					id: 'ref-multi-community', source: 'Self-referral', reason: 'Financial hardship / housing risk',
					dateReceived: '2026-06-01', referredBy: 'Family resource center walk-in'
				},
				intake: {
					id: 'int-multi-community', livingArrangement: 'Renting with spouse',
					medicalHistory: 'Hypertension — stable on medication',
					consentOnFile: true, completeness: 'complete',
					comprehensiveAssessmentNotes: 'Community services intake — utility assistance and benefits screening completed.',
					intakeQuestions: {
						livesWith: 'Spouse',
						mealPrep: 'Independent',
						transportation: 'Own vehicle',
						medication: 'Self-managed'
					}
				},
				assessment: {
					id: 'ra-multi-community', date: '2026-06-03',
					ratings: { housing: 'Medium', finances: 'High', nutrition: 'Low', transportation: 'Low', safety: 'Low' },
					compositeScore: 49, overallRisk: 'Medium'
				},
				enrollments: [{ serviceOrEventId: 'evt-safety', dateEnrolled: '2026-06-08' }],
				notes: [{ date: '2026-06-12', type: 'phone call', text: 'LIHEAP application submitted; awaiting determination.' }]
			});

			RM.ClientRepository.save({
				id: 'cli-triple-program',
				name: 'Diana Morrison',
				dob: '1968-07-19',
				phone: '(847) 555-0311',
				address: '88 Meadowbrook Dr, Rolling Meadows, IL',
				registeredAt: '2026-04-05',
				registrationSource: 'referral'
			});

			RM.CaseRepository.save({
				id: 'case-triple-senior',
				clientId: 'cli-triple-program',
				caseNumber: 'C-2026-096',
				programId: PROGRAM_ID,
				caseCategoryId: 'cat-senior-services',
				caseSubcategoryId: 'sub-in-home-support',
				caseManagerId: CM_ID,
				status: 'active',
				currentStage: 5,
				openDate: '2026-04-05',
				createdAt: '2026-04-05'
			});

			RM.CaseRepository.save({
				id: 'case-triple-community',
				clientId: 'cli-triple-program',
				caseNumber: 'C-2026-095',
				programId: 'prog-community-services',
				caseCategoryId: 'cat-community-services',
				caseSubcategoryId: 'sub-housing-assistance',
				caseManagerId: CM_ID,
				status: 'active',
				currentStage: 4,
				openDate: '2026-04-12',
				createdAt: '2026-04-12'
			});

			RM.CaseRepository.save({
				id: 'case-triple-mental-health',
				clientId: 'cli-triple-program',
				caseNumber: 'C-2026-094',
				programId: 'prog-mental-health',
				caseCategoryId: 'cat-mental-health',
				caseSubcategoryId: 'sub-crisis-response',
				caseManagerId: CM_ID,
				status: 'active',
				currentStage: 3,
				openDate: '2026-04-20',
				createdAt: '2026-04-20'
			});

			this._seedCaseBundle('cli-triple-program', 'case-triple-senior', {
				referral: {
					id: 'ref-triple-senior', source: 'Physician', reason: 'Self-neglect',
					dateReceived: '2026-04-05', referredBy: 'Primary care — home safety concern'
				},
				intake: {
					id: 'int-triple-senior', livingArrangement: 'Lives alone',
					medicalHistory: 'COPD, limited mobility',
					consentOnFile: true, completeness: 'complete',
					comprehensiveAssessmentNotes: 'In-home support assessment — ADL assistance and meal delivery recommended.',
					intakeQuestions: {
						livesWith: 'Alone',
						mealPrep: 'Skips meals frequently',
						transportation: 'No longer drives',
						medication: 'Misses doses without reminders'
					}
				},
				assessment: {
					id: 'ra-triple-senior', date: '2026-04-08',
					ratings: { falls: 'Medium', nutrition: 'High', isolation: 'High', housing: 'Medium', abuseRisk: 'Low' },
					compositeScore: 64, overallRisk: 'High'
				},
				carePlans: [{
					issue: 'Nutrition', goal: 'Ensure daily meals', service: 'Meals on Wheels', status: 'In Progress'
				}],
				enrollments: [{ serviceOrEventId: 'evt-holiday', dateEnrolled: '2026-05-01' }],
				notes: [{ date: '2026-05-15', type: 'home visit', text: 'Meal delivery started; client receptive to in-home aide visit.' }]
			});

			this._seedCaseBundle('cli-triple-program', 'case-triple-community', {
				referral: {
					id: 'ref-triple-community', source: 'Neighbor', reason: 'Unsafe living conditions',
					dateReceived: '2026-04-12', referredBy: 'Neighbor welfare concern'
				},
				intake: {
					id: 'int-triple-community', livingArrangement: 'Renting single-bedroom apartment',
					medicalHistory: 'Depression — untreated until recent PCP visit',
					consentOnFile: true, completeness: 'complete',
					comprehensiveAssessmentNotes: 'Housing assistance intake — arrears and habitability issues documented.',
					intakeQuestions: {
						livesWith: 'Alone',
						mealPrep: 'Limited budget',
						transportation: 'Public transit',
						medication: 'Recently restarted antidepressant'
					}
				},
				assessment: {
					id: 'ra-triple-community', date: '2026-04-14',
					ratings: { housing: 'High', finances: 'High', nutrition: 'Medium', transportation: 'Medium', safety: 'Medium' },
					compositeScore: 71, overallRisk: 'High'
				},
				carePlans: [{
					issue: 'Housing stability', goal: 'Prevent eviction', service: 'Emergency rental assistance', status: 'In Progress'
				}],
				notes: [{ date: '2026-05-01', type: 'virtual meeting', text: 'Landlord payment plan negotiated; case manager monitoring compliance.' }]
			});

			this._seedCaseBundle('cli-triple-program', 'case-triple-mental-health', {
				referral: {
					id: 'ref-triple-mh', source: 'Crisis hotline', reason: 'Acute mental health crisis',
					dateReceived: '2026-04-20', referredBy: '988 crisis line warm transfer'
				},
				intake: {
					id: 'int-triple-mh', livingArrangement: 'Lives alone',
					medicalHistory: 'Major depression, prior hospitalization',
					consentOnFile: true, completeness: 'complete',
					comprehensiveAssessmentNotes: 'Crisis stabilization intake — safety plan co-developed with client.',
					intakeQuestions: {
						livesWith: 'Alone',
						mealPrep: 'Irregular when symptomatic',
						transportation: 'Uses paratransit',
						medication: 'Psychiatric meds — needs adherence support'
					}
				},
				assessment: {
					id: 'ra-triple-mh', date: '2026-04-20',
					ratings: { suicideRisk: 'Medium', selfHarm: 'Low', substanceUse: 'Low', safetyPlan: 'High', supportSystem: 'Low' },
					compositeScore: 60, overallRisk: 'Medium'
				},
				notes: [{ date: '2026-04-22', type: 'phone call', text: 'Weekly therapy referral sent; safety plan reviewed with client.' }]
			});
		},

		_seedRegistrationOnlyClients: function () {
			RM.ClientRepository.save({
				id: 'cli-info-thomas',
				name: 'Thomas Wright',
				dob: '1955-02-10',
				phone: '(847) 555-0801',
				address: '14 Library Lane, Rolling Meadows, IL',
				registeredAt: '2026-07-18',
				registrationSource: 'walk_in',
				screening: {
					date: '2026-07-18',
					contactReason: 'information',
					notes: 'Asked for senior center hours and program brochure. No service need identified.',
					emergencyTrigger: '',
					serviceNeedIdentified: false,
					performedBy: CM_ID,
					intakeQuestions: {
						livesWith: 'Lives alone in a condo',
						mealPrep: 'Prepares simple meals; interested in congregate dining',
						transportation: 'Drives locally; no immediate transport need',
						medication: 'Manages own medications'
					}
				}
			});

			RM.ClientRepository.save({
				id: 'cli-brochure-linda',
				name: 'Linda Harper',
				dob: '1962-08-04',
				phone: '(847) 555-0802',
				address: '902 Central Rd, Rolling Meadows, IL',
				registeredAt: '2026-07-21',
				registrationSource: 'phone',
				screening: {
					date: '2026-07-21',
					contactReason: 'brochure',
					notes: 'Mailed Parent Support Services brochure; caller declined intake.',
					emergencyTrigger: '',
					serviceNeedIdentified: false,
					performedBy: CM_ID
				}
			});
		},

		_seedProgramCaseExamples: function () {
			this._seedClientRecord({
				id: 'cli-attendance-demo',
				name: 'Maria Gonzalez',
				dob: '1988-04-12',
				phone: '(847) 555-0501',
				address: '45 School St, Rolling Meadows, IL',
				programId: PROGRAM_ID,
				caseCategoryId: 'cat-parenting-support',
				caseSubcategoryId: 'sub-youth-empowerment',
				caseManagerId: CM_ID,
				status: 'active',
				incompleteIntake: false,
				currentStage: 4,
				createdAt: '2026-05-01'
			}, {
				referral: {
					id: 'ref-attendance-demo', source: 'School', reason: 'Chronic absenteeism',
					dateReceived: '2026-05-01', referredBy: 'Rolling Meadows Middle School social worker'
				},
				intake: {
					id: 'int-attendance-demo', livingArrangement: 'Parent with two children',
					consentOnFile: true, completeness: 'complete',
					comprehensiveAssessmentNotes: 'Transportation and childcare barriers affecting attendance.',
					intakeQuestions: { livesWith: 'Children', mealPrep: 'Independent', transportation: 'Limited', medication: 'N/A' }
				},
				assessment: {
					id: 'ra-attendance-demo', date: '2026-05-08',
					ratings: { attendance: 'Medium', transportation: 'High', childcare: 'High', familyStress: 'Medium', schoolEngagement: 'Low' },
					compositeScore: 58, overallRisk: 'Medium'
				},
				carePlans: [{
					issue: 'Attendance', goal: 'Improve attendance to 95%', service: 'Transportation assistance', status: 'In Progress'
				}],
				notes: [{ date: '2026-06-15', type: 'phone call', text: 'Monthly attendance review — improving from 70% to 82%.' }]
			});

			this._seedClientRecord({
				id: 'cli-parenting-demo',
				name: 'James Porter',
				dob: '1990-09-03',
				phone: '(847) 555-0502',
				address: '12 Oak Park Dr, Rolling Meadows, IL',
				programId: PROGRAM_ID,
				caseCategoryId: 'cat-parenting-support',
				caseSubcategoryId: 'sub-parent-education',
				caseManagerId: CM_ID,
				status: 'active',
				incompleteIntake: false,
				currentStage: 5,
				createdAt: '2026-04-10'
			}, {
				referral: {
					id: 'ref-parenting-demo', source: 'Healthcare provider', reason: 'Child behavioral concerns',
					dateReceived: '2026-04-10', referredBy: 'Pediatric clinic referral'
				},
				intake: {
					id: 'int-parenting-demo', livingArrangement: 'Single parent, one child',
					consentOnFile: true, completeness: 'complete',
					comprehensiveAssessmentNotes: 'High parental stress; needs behavior management strategies.',
					intakeQuestions: { livesWith: 'Child', mealPrep: 'Independent', transportation: 'Own vehicle', medication: 'N/A' }
				},
				assessment: {
					id: 'ra-parenting-demo', date: '2026-04-15',
					ratings: { attendance: 'Low', transportation: 'Low', childcare: 'Medium', familyStress: 'High', schoolEngagement: 'Medium' },
					compositeScore: 52, overallRisk: 'Medium'
				},
				carePlans: [{
					issue: 'Parenting', goal: 'Improve parent-child interactions', service: 'Parent coaching', status: 'In Progress'
				}],
				enrollments: [{ serviceOrEventId: 'evt-holiday', dateEnrolled: '2026-05-01' }],
				notes: [{ date: '2026-06-20', type: 'virtual meeting', text: 'Parent reports improved morning routines.' }]
			});

			this._seedClientRecord({
				id: 'cli-housing-demo',
				name: 'Angela Brooks',
				dob: '1985-11-22',
				phone: '(847) 555-0503',
				address: '300 Elm Ave, Rolling Meadows, IL',
				programId: PROGRAM_ID,
				caseCategoryId: 'cat-community-services',
				caseSubcategoryId: 'sub-housing-assistance',
				caseManagerId: CM_ID,
				status: 'active',
				incompleteIntake: false,
				currentStage: 5,
				createdAt: '2026-03-20'
			}, {
				referral: {
					id: 'ref-housing-demo', source: 'Self-referral', reason: 'Financial hardship / housing risk',
					dateReceived: '2026-03-20', referredBy: 'Self-referral via family resource center'
				},
				intake: {
					id: 'int-housing-demo', livingArrangement: 'Renting apartment with two children',
					consentOnFile: true, completeness: 'complete',
					comprehensiveAssessmentNotes: 'Unstable employment and risk of housing loss identified.',
					intakeQuestions: { livesWith: 'Children', mealPrep: 'Limited budget', transportation: 'Public transit', medication: 'N/A' }
				},
				assessment: {
					id: 'ra-housing-demo', date: '2026-03-25',
					ratings: { attendance: 'Low', transportation: 'Medium', childcare: 'High', familyStress: 'High', schoolEngagement: 'Low' },
					compositeScore: 62, overallRisk: 'High'
				},
				carePlans: [{
					issue: 'Housing', goal: 'Maintain stable housing', service: 'Housing assistance application', status: 'In Progress'
				}],
				enrollments: [{ serviceOrEventId: 'evt-safety', dateEnrolled: '2026-04-01' }],
				notes: [{ date: '2026-06-01', type: 'virtual meeting', text: 'Monthly progress meeting — employment interview scheduled.' }]
			});

			this._seedClientRecord({
				id: 'cli-crisis-demo',
				name: 'David Nguyen',
				dob: '1995-07-08',
				phone: '(847) 555-0504',
				address: '88 Lakeview Rd, Rolling Meadows, IL',
				programId: PROGRAM_ID,
				caseCategoryId: 'cat-mental-health',
				caseSubcategoryId: 'sub-crisis-response',
				caseManagerId: CM_ID,
				status: 'active',
				incompleteIntake: false,
				currentStage: 3,
				createdAt: '2026-07-10'
			}, {
				referral: {
					id: 'ref-crisis-demo', source: 'Crisis hotline', reason: 'Acute mental health crisis',
					dateReceived: '2026-07-10', referredBy: '988 crisis line warm transfer'
				},
				intake: {
					id: 'int-crisis-demo', livingArrangement: 'Lives with partner',
					consentOnFile: true, completeness: 'complete',
					comprehensiveAssessmentNotes: 'Immediate safety assessment completed; stabilization plan initiated.',
					intakeQuestions: { livesWith: 'Partner', mealPrep: 'Independent', transportation: 'Own vehicle', medication: 'Psychiatric meds' }
				},
				assessment: {
					id: 'ra-crisis-demo', date: '2026-07-10',
					ratings: { suicideRisk: 'High', selfHarm: 'Medium', substanceUse: 'Low', safetyPlan: 'High', supportSystem: 'Medium' },
					compositeScore: 68, overallRisk: 'High'
				}
			});
		},

		_seedDuplicateCandidates: function () {
			// Pair 1 — same person entered twice (punctuation / formatting difference)
			this._seedClientRecord({
				id: 'cli-dup-oconnor-a',
				name: "Margaret O'Connor",
				dob: '1943-05-12',
				phone: '(847) 555-0401',
				address: '220 Linden Ave, Rolling Meadows, IL',
				programId: PROGRAM_ID,
				caseManagerId: CM_ID,
				status: 'active',
				incompleteIntake: false,
				currentStage: 3,
				createdAt: '2026-06-20'
			}, {
				referral: {
					id: 'ref-dup-oconnor-a', source: 'Hospital', reason: 'Falls',
					dateReceived: '2026-06-20', referredBy: 'Advocate Lutheran General Hospital'
				},
				intake: {
					id: 'int-dup-oconnor-a', livingArrangement: 'Lives alone',
					consentOnFile: true, completeness: 'complete',
					intakeQuestions: { livesWith: 'Alone', mealPrep: 'Independent', transportation: 'Family', medication: 'Self-managed' }
				},
				assessment: {
					id: 'ra-dup-oconnor-a', date: '2026-06-22',
					ratings: { falls: 'Medium', nutrition: 'Low', isolation: 'Medium', housing: 'Low', abuseRisk: 'Low' },
					compositeScore: 48, overallRisk: 'Medium'
				}
			});

			this._seedClientRecord({
				id: 'cli-dup-oconnor-b',
				name: 'Margaret OConnor',
				dob: '1943-05-12',
				phone: '(847) 555-0401',
				address: '220 Linden Avenue, Rolling Meadows, IL 60008',
				programId: PROGRAM_ID,
				caseManagerId: CM_ID,
				status: 'active',
				incompleteIntake: true,
				currentStage: 2,
				createdAt: '2026-07-18'
			}, {
				referral: {
					id: 'ref-dup-oconnor-b', source: 'Physician', reason: 'Falls',
					dateReceived: '2026-07-18', referredBy: 'Dr. Patel — Rolling Meadows Medical Group'
				},
				intake: {
					id: 'int-dup-oconnor-b', completeness: 'incomplete', consentOnFile: false
				}
			});

			// Pair 2 — nickname vs legal name, shared phone and DOB
			this._seedClientRecord({
				id: 'cli-dup-walsh-a',
				name: 'Patricia Walsh',
				dob: '1944-07-01',
				phone: '(847) 555-0402',
				address: '18 Grove St, Rolling Meadows, IL',
				programId: PROGRAM_ID,
				caseManagerId: CM_ID,
				status: 'active',
				incompleteIntake: false,
				currentStage: 4,
				createdAt: '2026-05-10'
			}, {
				referral: {
					id: 'ref-dup-walsh-a', source: 'Self', reason: 'Isolation',
					dateReceived: '2026-05-10', referredBy: 'Self-referral via community center'
				},
				intake: {
					id: 'int-dup-walsh-a', livingArrangement: 'Lives with adult daughter',
					consentOnFile: true, completeness: 'complete',
					intakeQuestions: { livesWith: 'Daughter', mealPrep: 'Daughter prepares meals', transportation: 'Limited', medication: 'Daughter assists' }
				},
				assessment: {
					id: 'ra-dup-walsh-a', date: '2026-05-12',
					ratings: { falls: 'Low', nutrition: 'Medium', isolation: 'High', housing: 'Low', abuseRisk: 'Low' },
					compositeScore: 52, overallRisk: 'Medium'
				},
				notes: [{ date: '2026-06-01', type: 'phone call', text: 'Initial outreach — client prefers to be called Pat.' }]
			});

			this._seedClientRecord({
				id: 'cli-dup-walsh-b',
				name: 'Pat Walsh',
				dob: '1944-07-01',
				phone: '(847) 555-0402',
				address: '18 Grove Street, Rolling Meadows, IL',
				programId: PROGRAM_ID,
				caseManagerId: CM_ID,
				status: 'active',
				incompleteIntake: true,
				currentStage: 2,
				createdAt: '2026-07-19'
			}, {
				referral: {
					id: 'ref-dup-walsh-b', source: 'Neighbor', reason: 'Isolation',
					dateReceived: '2026-07-19', referredBy: 'Neighbor welfare concern'
				},
				intake: {
					id: 'int-dup-walsh-b', completeness: 'incomplete', consentOnFile: false
				}
			});
		},

		_seedSampleDocuments: function () {
			[
				{ id: 'doc-mary-consent', clientId: 'cli-mary-smith', kind: 'consent' },
				{ id: 'doc-mary-assessment', clientId: 'cli-mary-smith', kind: 'assessment' },
				{ id: 'doc-john-consent', clientId: 'cli-john-davis', kind: 'consent' }
			].forEach(function (entry) {
				RM.DocumentRepository.save(Object.assign(
					{ id: entry.id },
					RM.DocumentService.buildSampleDocument(entry.clientId, entry.kind)
				));
			});

			RM.DocumentRepository.save(Object.assign(
				{ id: 'doc-mary-discharge-link' },
				RM.DocumentService.buildSampleLink(
					'cli-mary-smith',
					'Hospital discharge summary (SharePoint)',
					'https://contoso.sharepoint.com/sites/seniors/documents/mary-smith-discharge.pdf',
					'intake',
					'2026-02-03T09:00:00.000Z'
				)
			));
		},

		_seedReportingData: function () {
			RM.InitiativeRepository.save({
				id: 'init-flu-2026',
				name: 'Flu Shot Awareness Campaign',
				startDate: '2026-08-01',
				endDate: '2026-10-31',
				status: 'active',
				targetOutreach: 200,
				referralsGenerated: 47,
				enrollments: 38,
				completions: 31,
				programId: 'prog-senior-services'
			});

			RM.InitiativeRepository.save({
				id: 'init-food-security-2026',
				name: 'Food Security Outreach',
				startDate: '2026-06-01',
				endDate: '2026-12-31',
				status: 'active',
				targetOutreach: 150,
				referralsGenerated: 62,
				enrollments: 55,
				completions: 48,
				programId: 'prog-community-services'
			});

			var months = ['2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08'];
			var categories = ['food_pantry', 'therapy', 'court_advocacy', 'crisis_counseling'];
			var baseUnits = { food_pantry: 118, therapy: 42, court_advocacy: 11, crisis_counseling: 26 };
			months.forEach(function (month, monthIndex) {
				categories.forEach(function (category) {
					RM.ServiceUtilizationRepository.save({
						id: 'util-' + month + '-' + category,
						month: month,
						category: category,
						units: baseUnits[category] + monthIndex * 6 + (category === 'food_pantry' ? 4 : 0)
					});
				});
			});

			[
				{ id: 'enr-report-food-1', clientId: 'cli-john-davis', serviceOrEventId: 'evt-food-pantry', dateEnrolled: '2026-08-12' },
				{ id: 'enr-report-food-2', clientId: 'cli-elena-rodriguez', serviceOrEventId: 'evt-food-pantry', dateEnrolled: '2026-08-18' },
				{ id: 'enr-report-therapy-1', clientId: 'cli-frank-miller', serviceOrEventId: 'evt-therapy', dateEnrolled: '2026-08-05' },
				{ id: 'enr-report-therapy-2', clientId: 'cli-housing-demo', serviceOrEventId: 'evt-therapy', dateEnrolled: '2026-07-22' },
				{ id: 'enr-report-court-1', clientId: 'cli-crisis-demo', serviceOrEventId: 'evt-court-advocacy', dateEnrolled: '2026-08-20' },
				{ id: 'enr-report-crisis-1', clientId: 'cli-crisis-demo', serviceOrEventId: 'evt-crisis-counseling', dateEnrolled: '2026-08-08' },
				{ id: 'enr-report-flu-1', clientId: 'cli-mary-smith', serviceOrEventId: 'evt-flu-awareness', dateEnrolled: '2026-08-15' },
				{ id: 'enr-report-flu-2', clientId: 'cli-dorothy-williams', serviceOrEventId: 'evt-flu-awareness', dateEnrolled: '2026-08-22' },
				{ id: 'enr-report-flu-3', clientId: 'cli-helen-chen', serviceOrEventId: 'evt-flu-awareness', dateEnrolled: '2026-07-28' },
				{ id: 'enr-report-prior-1', clientId: 'cli-robert-kim', serviceOrEventId: 'evt-food-pantry', dateEnrolled: '2026-07-10' },
				{ id: 'enr-report-prior-2', clientId: 'cli-george-patel', serviceOrEventId: 'evt-therapy', dateEnrolled: '2026-07-14' }
			].forEach(function (entry) {
				var caseRecord = RM.CaseRepository.findLatestByClientId(entry.clientId);
				RM.ServiceEnrollmentRepository.save(Object.assign({}, entry, {
					caseId: caseRecord ? caseRecord.id : null
				}));
			});

			var auditEntries = [
				{
					id: 'aud-seed-view-1',
					entityRef: 'client:cli-mary-smith',
					action: 'view_record',
					actorId: 'usr-case-manager',
					actorName: 'Case Manager',
					timestamp: '2026-08-28T14:22:00.000Z',
					reason: 'Case review before follow-up'
				},
				{
					id: 'aud-seed-export-1',
					entityRef: 'report:caseload',
					action: 'export_report',
					actorId: 'usr-supervisor',
					actorName: 'Supervisor / Dept Admin',
					timestamp: '2026-08-27T16:05:00.000Z',
					reason: 'Monthly caseload export'
				},
				{
					id: 'aud-seed-dup-1',
					entityRef: 'client:cli-dup-walsh-a',
					action: 'duplicate_review',
					actorId: 'usr-supervisor',
					actorName: 'Supervisor / Dept Admin',
					timestamp: '2026-08-26T11:30:00.000Z',
					reason: 'Reviewed Walsh duplicate pair'
				},
				{
					id: 'aud-seed-intake-1',
					entityRef: 'client:cli-incomplete-1',
					action: 'intake_updated',
					actorId: 'usr-case-manager',
					actorName: 'Case Manager',
					timestamp: '2026-08-25T09:15:00.000Z',
					reason: 'Partial intake saved'
				},
				{
					id: 'aud-seed-handoff-1',
					entityRef: 'client:cli-multi-program',
					action: 'case_handoff',
					actorId: 'usr-cross-program-liaison',
					actorName: 'Cross-Program Liaison',
					timestamp: '2026-08-24T13:40:00.000Z',
					reason: 'Cross-program coordination'
				},
				{
					id: 'aud-seed-enroll-1',
					entityRef: 'client:cli-john-davis',
					action: 'bulk_enroll',
					actorId: 'usr-case-manager',
					actorName: 'Case Manager',
					timestamp: '2026-08-12T10:00:00.000Z',
					reason: 'Food pantry enrollment'
				}
			];
			RM.Store.set('audit:log', auditEntries);

			RM.CustomReportRepository.save({
				id: 'cr-seed-caseload',
				name: 'Active client caseload',
				reportType: 'table',
				ownerId: 'usr-supervisor',
				shared: true,
				primaryEntity: 'client',
				joins: ['case', 'riskAssessment'],
				columns: [
					{ entity: 'client', field: 'name' },
					{ entity: 'client', field: 'phone' },
					{ entity: 'case', field: 'programId' },
					{ entity: 'case', field: 'status' },
					{ entity: 'riskAssessment', field: 'overallRisk' }
				],
				parameters: [
					{
						id: 'param-caseload-status',
						label: 'Case status',
						type: 'caseStatus',
						entity: 'case',
						field: 'status',
						defaultValue: 'active'
					},
					{
						id: 'param-caseload-period',
						label: 'Client registered',
						type: 'relativePeriod',
						entity: 'client',
						field: 'registeredAt',
						defaultPreset: 'all'
					}
				],
				filters: [{ entity: 'case', field: 'status', op: 'eq', value: 'active' }],
				sortBy: { entity: 'client', field: 'name', dir: 'asc' },
				joinAggregates: { riskAssessment: 'latest' },
				updatedAt: '2026-08-01T12:00:00.000Z'
			});

			RM.CustomReportRepository.save({
				id: 'cr-seed-by-program',
				name: 'Cases by program (chart)',
				reportType: 'chart',
				ownerId: 'usr-supervisor',
				shared: true,
				primaryEntity: 'case',
				joins: [],
				columns: [],
				parameters: [
					{
						id: 'param-chart-status',
						label: 'Case status',
						type: 'caseStatus',
						entity: 'case',
						field: 'status',
						defaultValue: 'active'
					},
					{
						id: 'param-chart-open-date',
						label: 'Case opened',
						type: 'relativePeriod',
						entity: 'case',
						field: 'openDate',
						defaultPreset: 'all'
					}
				],
				filters: [{ entity: 'case', field: 'status', op: 'eq', value: 'active' }],
				chart: {
					xAxis: { entity: 'case', field: 'programId' },
					yAxis: { aggregate: 'count' },
					chartType: 'bar'
				},
				updatedAt: '2026-08-01T12:00:00.000Z'
			});
		},

		ROLE_OPTIONS: [
			{ userId: 'usr-case-manager', label: 'Case Manager' },
			{ userId: 'usr-supervisor', label: 'Supervisor / Dept Admin' },
			{ userId: 'usr-cross-program-liaison', label: 'Cross-Program Liaison' },
			{ userId: 'usr-auditor', label: 'Auditor (Aggregate reports only)' }
		]
	};
})();
