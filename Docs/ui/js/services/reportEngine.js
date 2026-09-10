/* global RM */
(function () {
	'use strict';

	RM.ReportEngine = {
		EVENTS: [
			{ id: 'evt-meals' },
			{ id: 'evt-holiday' },
			{ id: 'evt-safety' },
			{ id: 'evt-food-pantry' },
			{ id: 'evt-therapy' },
			{ id: 'evt-court-advocacy' },
			{ id: 'evt-crisis-counseling' },
			{ id: 'evt-flu-awareness' }
		],

		SERVICE_UTIL_CATEGORIES: [
			'food_pantry',
			'therapy',
			'court_advocacy',
			'crisis_counseling'
		],

		SUBDIVISION_ORDER: ['senior', 'community', 'parenting', 'mental_health'],

		SUBDIVISION_MAP: {
			'prog-senior-services': 'senior',
			'prog-community-services': 'community',
			'prog-parenting-support': 'parenting',
			'prog-mental-health': 'mental_health'
		},

		SUBDIVISION_COLORS: {
			senior: '#2563eb',
			community: '#059669',
			parenting: '#7c3aed',
			mental_health: '#db2777'
		},

		AGE_BANDS: [
			{ id: '0-17', min: 0, max: 17 },
			{ id: '18-59', min: 18, max: 59 },
			{ id: '60-74', min: 60, max: 74 },
			{ id: '75+', min: 75, max: 200 }
		],

		serviceUtilLabel: function (category) {
			return RM.I18n ? RM.I18n.t('pages.reports.serviceUtil.' + category) : category;
		},

		subdivisionLabel: function (subdivisionId) {
			return RM.I18n ? RM.I18n.t('pages.reports.subdivision.' + subdivisionId) : subdivisionId;
		},

		_ageFromDob: function (dob) {
			if (!dob) { return null; }
			var born = new Date(dob);
			if (isNaN(born.getTime())) { return null; }
			var today = new Date();
			var age = today.getFullYear() - born.getFullYear();
			var m = today.getMonth() - born.getMonth();
			if (m < 0 || (m === 0 && today.getDate() < born.getDate())) { age -= 1; }
			return age;
		},

		_zipFromAddress: function (address) {
			var match = (address || '').match(/\b(\d{5})(?:-\d{4})?\b/);
			return match ? match[1] : 'Unknown';
		},

		_daysBetween: function (startIso, endIso) {
			if (!startIso || !endIso) { return null; }
			var start = new Date(startIso);
			var end = new Date(endIso);
			if (isNaN(start.getTime()) || isNaN(end.getTime())) { return null; }
			return Math.round((end - start) / (1000 * 60 * 60 * 24));
		},

		_filterContext: null,

		setFilterContext: function (ctx) {
			this._filterContext = ctx || null;
		},

		_parseDateOnly: function (value) {
			if (!value) { return null; }
			var d = new Date(value);
			if (isNaN(d.getTime())) { return null; }
			d.setHours(0, 0, 0, 0);
			return d;
		},

		_dateInRange: function (dateStr, from, to) {
			if (!from && !to) { return true; }
			if (!dateStr) { return false; }
			var date = this._parseDateOnly(dateStr);
			if (!date) { return false; }
			if (from) {
				var start = this._parseDateOnly(from);
				if (start && date < start) { return false; }
			}
			if (to) {
				var end = this._parseDateOnly(to);
				if (end) {
					end.setHours(23, 59, 59, 999);
					if (date > end) { return false; }
				}
			}
			return true;
		},

		_caseMatchesFilterContext: function (caseRecord) {
			var ctx = this._filterContext;
			if (!ctx || !caseRecord) { return true; }
			if (ctx.programId && caseRecord.programId !== ctx.programId) { return false; }
			if (ctx.caseStatus === 'active' && caseRecord.status === 'closed') { return false; }
			if (ctx.caseStatus === 'closed' && caseRecord.status !== 'closed') { return false; }
			var caseDate = caseRecord.openDate || caseRecord.createdAt;
			return this._dateInRange(caseDate, ctx.dateFrom, ctx.dateTo);
		},

		_clientMatchesFilterContext: function (client, options) {
			options = options || {};
			var ctx = this._filterContext;
			if (!ctx || !client) { return true; }
			if (!this._dateInRange(client.registeredAt, ctx.dateFrom, ctx.dateTo)) { return false; }
			var needsCaseMatch = options.requireMatchingCase || ctx.programId || ctx.caseStatus;
			if (!needsCaseMatch) { return true; }
			var cases = RM.CaseRepository.findByClientId(client.id).filter(this._caseMatchesFilterContext.bind(this));
			return cases.length > 0;
		},

		_filterCases: function (caseManagerId) {
			var self = this;
			var ctx = this._filterContext;
			var cases = RM.CaseRepository.findAll();
			if (!ctx || ctx.caseStatus === 'active' || ctx.caseStatus == null) {
				cases = cases.filter(function (caseRecord) { return caseRecord.status !== 'closed'; });
			} else if (ctx.caseStatus === 'closed') {
				cases = cases.filter(function (caseRecord) { return caseRecord.status === 'closed'; });
			}
			cases = cases.filter(function (caseRecord) { return self._caseMatchesFilterContext(caseRecord); });
			if (caseManagerId) {
				cases = cases.filter(function (caseRecord) {
					return caseRecord.caseManagerId === caseManagerId;
				});
			}
			return cases;
		},

		_scopedClients: function (caseManagerId) {
			var self = this;
			var cases = this._filterCases(caseManagerId);
			var clientIds = {};
			cases.forEach(function (caseRecord) { clientIds[caseRecord.clientId] = true; });
			var allClients = RM.ClientRepository.findAll();
			var scoped = caseManagerId
				? allClients.filter(function (client) { return clientIds[client.id]; })
				: allClients;
			return scoped.filter(function (client) {
				return self._clientMatchesFilterContext(client, { requireMatchingCase: !!caseManagerId });
			});
		},

		clientsForZip: function (zip, caseManagerId) {
			var self = this;
			return this._scopedClients(caseManagerId).filter(function (client) {
				return self._zipFromAddress(client.address) === zip;
			});
		},

		clientsForAgeBand: function (ageBandId, caseManagerId) {
			var self = this;
			var band = this.AGE_BANDS.find(function (item) { return item.id === ageBandId; });
			if (!band) { return []; }
			return this._scopedClients(caseManagerId).filter(function (client) {
				var age = self._ageFromDob(client.dob);
				return age != null && age >= band.min && age <= band.max;
			});
		},

		clientsForSubdivision: function (subdivisionId, caseManagerId) {
			var self = this;
			var clientIds = {};
			this._filterCases(caseManagerId).forEach(function (caseRecord) {
				var subdivision = self.SUBDIVISION_MAP[caseRecord.programId] || 'community';
				if (subdivision === subdivisionId) {
					clientIds[caseRecord.clientId] = true;
				}
			});
			return Object.keys(clientIds).map(function (clientId) {
				return RM.ClientRepository.findById(clientId);
			}).filter(function (client) { return !!client; });
		},

		clientsGroupedByRisk: function (caseManagerId) {
			var self = this;
			var clients = caseManagerId
				? RM.ClientRepository.findByCaseManager(caseManagerId)
				: RM.Data.activeClients();
			clients = clients.filter(function (client) {
				return self._clientMatchesFilterContext(client, { requireMatchingCase: true });
			});
			return RM.Data.groupByRisk(clients);
		},

		overdueFollowUpsFiltered: function (filterType, filterValue, caseManagerId) {
			var rows = this.overdueFollowUps(caseManagerId);
			if (filterType === 'risk') {
				return rows.filter(function (row) { return row.riskLevel === filterValue; });
			}
			if (filterType === 'cadence') {
				return rows.filter(function (row) { return row.cadence === filterValue; });
			}
			return rows;
		},

		openCBOReferralsFiltered: function (filterType, filterValue) {
			var rows = this.openCBOReferrals();
			if (filterType === 'status') {
				return rows.filter(function (row) { return row.status === filterValue; });
			}
			if (filterType === 'cbo') {
				return rows.filter(function (row) { return row.cboName === filterValue; });
			}
			return rows;
		},

		staffCaseloadClients: function (staffId) {
			var clientIds = {};
			RM.CaseRepository.findByCaseManager(staffId).forEach(function (caseRecord) {
				clientIds[caseRecord.clientId] = true;
			});
			return Object.keys(clientIds).map(function (clientId) {
				return RM.ClientRepository.findById(clientId);
			}).filter(function (client) { return !!client; });
		},

		utilizationSeriesDetail: function (category) {
			if (!RM.ServiceUtilizationRepository) { return []; }
			var self = this;
			return RM.ServiceUtilizationRepository.findAll()
				.filter(function (row) { return row.category === category; })
				.map(function (row) {
					return {
						month: row.month,
						category: self.serviceUtilLabel(row.category),
						units: row.units
					};
				})
				.sort(function (a, b) { return a.month.localeCompare(b.month); });
		},

		_firstServiceDateForCase: function (caseRecord) {
			var clientId = caseRecord.clientId;
			var enrollments = RM.ServiceEnrollmentRepository.findByClientId(clientId)
				.filter(function (e) { return !e.voided; })
				.sort(function (a, b) {
					return new Date(a.dateEnrolled || 0) - new Date(b.dateEnrolled || 0);
				});
			if (enrollments.length) {
				return enrollments[0].dateEnrolled;
			}
			var cbo = RM.CBOReferralRepository.findByClientId(clientId)
				.filter(function (r) { return r.status === 'Confirmed'; })
				.sort(function (a, b) {
					return new Date(a.date || 0) - new Date(b.date || 0);
				});
			return cbo.length ? cbo[0].date : null;
		},

		communityImpactDashboard: function (caseManagerId) {
			var self = this;
			var cases = this._filterCases(caseManagerId);
			var clientIds = {};
			cases.forEach(function (caseRecord) { clientIds[caseRecord.clientId] = true; });

			var allClients = RM.ClientRepository.findAll();
			var scopedClients = caseManagerId
				? allClients.filter(function (c) { return clientIds[c.id]; })
				: allClients;

			var activeCases = cases.length;
			var registrationOnly = allClients.filter(function (client) {
				if (caseManagerId && !clientIds[client.id]) { return false; }
				var open = RM.CaseService ? RM.CaseService.openCasesForClient(client.id).length : 0;
				return open === 0;
			}).length;

			var servicesDelivered = RM.ServiceEnrollmentRepository.findAll().filter(function (e) {
				if (e.voided) { return false; }
				return !caseManagerId || clientIds[e.clientId];
			}).length;

			var zipCounts = {};
			var ageCounts = {};
			this.AGE_BANDS.forEach(function (band) { ageCounts[band.id] = 0; });

			scopedClients.forEach(function (client) {
				var zip = self._zipFromAddress(client.address);
				zipCounts[zip] = (zipCounts[zip] || 0) + 1;
				var age = self._ageFromDob(client.dob);
				if (age == null) { return; }
				self.AGE_BANDS.forEach(function (band) {
					if (age >= band.min && age <= band.max) {
						ageCounts[band.id] += 1;
					}
				});
			});

			var zipRows = Object.keys(zipCounts).map(function (zip) {
				return { zip: zip, count: zipCounts[zip] };
			}).sort(function (a, b) { return b.count - a.count; });

			var ageRows = this.AGE_BANDS.map(function (band) {
				return {
					ageBand: band.id,
					ageBandLabel: RM.I18n ? RM.I18n.t('pages.reports.ageBand.' + band.id) : band.id,
					count: ageCounts[band.id] || 0
				};
			}).filter(function (row) { return row.count > 0; });

			return {
				totalClients: scopedClients.length,
				activeCases: activeCases,
				registrationOnly: registrationOnly,
				servicesDelivered: servicesDelivered,
				zipDistribution: zipRows,
				ageDistribution: ageRows
			};
		},

		initiativePerformance: function () {
			var self = this;
			if (!RM.InitiativeRepository) { return []; }
			return RM.InitiativeRepository.findAll().filter(function (initiative) {
				return self._dateInRange(initiative.startDate, (self._filterContext || {}).dateFrom, (self._filterContext || {}).dateTo) ||
					self._dateInRange(initiative.endDate, (self._filterContext || {}).dateFrom, (self._filterContext || {}).dateTo);
			}).map(function (initiative) {
				var outreachPct = initiative.targetOutreach
					? Math.round((initiative.referralsGenerated / initiative.targetOutreach) * 100)
					: 0;
				var completionPct = initiative.enrollments
					? Math.round((initiative.completions / initiative.enrollments) * 100)
					: 0;
				return {
					id: initiative.id,
					name: initiative.name,
					startDate: initiative.startDate,
					endDate: initiative.endDate,
					status: initiative.status || 'active',
					targetOutreach: initiative.targetOutreach || 0,
					referralsGenerated: initiative.referralsGenerated || 0,
					enrollments: initiative.enrollments || 0,
					completions: initiative.completions || 0,
					outreachPct: outreachPct,
					completionPct: completionPct
				};
			}).sort(function (a, b) { return a.name.localeCompare(b.name); });
		},

		performanceOutcomeKpis: function (caseManagerId) {
			var self = this;
			var cases = this._filterCases(caseManagerId);
			var referralTotal = 0;
			var referralComplete = 0;
			var timeToServiceDays = [];
			var intakeWithin7 = 0;
			var intakeEligible = 0;

			cases.forEach(function (caseRecord) {
				var referral = RM.ReferralRepository.findByCaseId
					? RM.ReferralRepository.findByCaseId(caseRecord.id)[0]
					: RM.ReferralRepository.findByClientId(caseRecord.clientId)[0];
				if (referral) {
					referralTotal += 1;
					if (!caseRecord.incompleteIntake) {
						referralComplete += 1;
					}
				}

				var openDate = caseRecord.openDate || caseRecord.createdAt;
				if (openDate) {
					intakeEligible += 1;
					var intake = RM.IntakeRepository.findByClientId(caseRecord.clientId)[0];
					if (intake && intake.completeness === 'complete') {
						var intakeDate = intake.updatedAt || intake.dateCompleted || openDate;
						var days = self._daysBetween(openDate, intakeDate);
						if (days != null && days <= 7) { intakeWithin7 += 1; }
					}
				}

				var serviceDate = self._firstServiceDateForCase(caseRecord);
				if (openDate && serviceDate) {
					var tts = self._daysBetween(openDate, serviceDate);
					if (tts != null) { timeToServiceDays.push(tts); }
				}
			});

			var avgTimeToService = timeToServiceDays.length
				? Math.round(timeToServiceDays.reduce(function (sum, d) { return sum + d; }, 0) / timeToServiceDays.length)
				: null;

			var currentEnrollments = RM.ServiceEnrollmentRepository.findAll().filter(function (e) {
				if (e.voided) { return false; }
				if (!caseManagerId) { return true; }
				var caseRecord = RM.CaseRepository.findLatestByClientId(e.clientId);
				return caseRecord && caseRecord.caseManagerId === caseManagerId;
			}).length;

			var priorCutoff = new Date();
			priorCutoff.setDate(priorCutoff.getDate() - 30);
			var priorStart = new Date(priorCutoff);
			priorStart.setDate(priorStart.getDate() - 30);

			var recentEnrollments = RM.ServiceEnrollmentRepository.findAll().filter(function (e) {
				if (e.voided || !e.dateEnrolled) { return false; }
				var d = new Date(e.dateEnrolled);
				return d >= priorCutoff;
			}).length;

			var priorEnrollments = RM.ServiceEnrollmentRepository.findAll().filter(function (e) {
				if (e.voided || !e.dateEnrolled) { return false; }
				var d = new Date(e.dateEnrolled);
				return d >= priorStart && d < priorCutoff;
			}).length;

			var enrollmentTrendPct = priorEnrollments
				? Math.round(((recentEnrollments - priorEnrollments) / priorEnrollments) * 100)
				: (recentEnrollments ? 100 : 0);

			return {
				referralCompletionRate: referralTotal
					? Math.round((referralComplete / referralTotal) * 100)
					: null,
				referralTotal: referralTotal,
				referralComplete: referralComplete,
				avgTimeToServiceDays: avgTimeToService,
				intakeWithin7DayPct: intakeEligible
					? Math.round((intakeWithin7 / intakeEligible) * 100)
					: null,
				enrollmentTrendPct: enrollmentTrendPct,
				recentEnrollments: recentEnrollments,
				priorEnrollments: priorEnrollments,
				currentEnrollments: currentEnrollments
			};
		},

		subdivisionCaseloadSummary: function (caseManagerId) {
			var self = this;
			var cases = this._filterCases(caseManagerId);
			var bySubdivision = {};
			this.SUBDIVISION_ORDER.forEach(function (id) {
				bySubdivision[id] = { openCases: 0, uniqueClients: {}, highRisk: 0, incompleteIntake: 0 };
			});

			cases.forEach(function (caseRecord) {
				var subdivisionId = self.SUBDIVISION_MAP[caseRecord.programId] || 'community';
				if (!bySubdivision[subdivisionId]) {
					bySubdivision[subdivisionId] = { openCases: 0, uniqueClients: {}, highRisk: 0, incompleteIntake: 0 };
				}
				var bucket = bySubdivision[subdivisionId];
				bucket.openCases += 1;
				bucket.uniqueClients[caseRecord.clientId] = true;
				if (caseRecord.incompleteIntake) { bucket.incompleteIntake += 1; }
				var assessment = RM.RiskAssessmentRepository.findLatest(caseRecord.clientId);
				if (assessment && assessment.overallRisk === 'High') { bucket.highRisk += 1; }
			});

			return this.SUBDIVISION_ORDER.map(function (subdivisionId, index) {
				var bucket = bySubdivision[subdivisionId] || { openCases: 0, uniqueClients: {}, highRisk: 0, incompleteIntake: 0 };
				return {
					subdivisionId: subdivisionId,
					subdivisionLabel: self.subdivisionLabel(subdivisionId),
					openCases: bucket.openCases,
					uniqueClients: Object.keys(bucket.uniqueClients).length,
					highRisk: bucket.highRisk,
					incompleteIntake: bucket.incompleteIntake,
					color: self.SUBDIVISION_COLORS[subdivisionId] || self.PROGRAM_CHART_FALLBACK_COLORS[index % 5]
				};
			}).filter(function (row) { return row.openCases > 0 || row.uniqueClients > 0; });
		},

		serviceUtilizationTrend: function () {
			var self = this;
			if (!RM.ServiceUtilizationRepository) { return { months: [], series: [] }; }
			var rows = RM.ServiceUtilizationRepository.findAll();
			var ctx = this._filterContext || {};
			if (ctx.dateFrom || ctx.dateTo) {
				rows = rows.filter(function (row) {
					return self._dateInRange(row.month + '-01', ctx.dateFrom, ctx.dateTo);
				});
			}
			var monthSet = {};
			rows.forEach(function (row) { monthSet[row.month] = true; });
			var months = Object.keys(monthSet).sort();

			var series = this.SERVICE_UTIL_CATEGORIES.map(function (category) {
				return {
					category: category,
					categoryLabel: self.serviceUtilLabel(category),
					points: months.map(function (month) {
						var match = rows.find(function (row) {
							return row.month === month && row.category === category;
						});
						return { month: month, units: match ? match.units : 0 };
					})
				};
			});

			return { months: months, series: series };
		},

		serviceUtilizationDetail: function () {
			var self = this;
			if (!RM.ServiceUtilizationRepository) { return []; }
			var rows = RM.ServiceUtilizationRepository.findAll();
			var ctx = this._filterContext || {};
			if (ctx.dateFrom || ctx.dateTo) {
				rows = rows.filter(function (row) {
					return self._dateInRange(row.month + '-01', ctx.dateFrom, ctx.dateTo);
				});
			}
			return rows.map(function (row) {
				return {
					month: row.month,
					category: self.serviceUtilLabel(row.category),
					units: row.units
				};
			}).sort(function (a, b) {
				return a.month.localeCompare(b.month) || a.category.localeCompare(b.category);
			});
		},

		staffActivityUtilization: function (caseManagerId) {
			var users = RM.UserRepository.findAll().filter(function (user) {
				return user.role === 'case_manager' || user.role === 'supervisor';
			});
			if (caseManagerId) {
				users = users.filter(function (user) { return user.id === caseManagerId; });
			}

			return users.map(function (user) {
				var caseload = RM.CaseRepository.findByCaseManager(user.id);
				var clientIds = {};
				caseload.forEach(function (caseRecord) { clientIds[caseRecord.clientId] = true; });

				var notes = RM.CaseNoteRepository.findAll().filter(function (note) {
					return !note.voided && clientIds[note.clientId];
				}).length;

				var enrollments = RM.ServiceEnrollmentRepository.findAll().filter(function (e) {
					return !e.voided && clientIds[e.clientId];
				}).length;

				var closures = RM.CaseClosureRepository.findAll().filter(function (closure) {
					return clientIds[closure.clientId];
				}).length;

				var estimatedHours = Math.round(notes * 0.5 + enrollments * 0.25 + caseload.length * 1.5);

				return {
					staffId: user.id,
					staffName: user.name,
					role: RM.Permissions.formatRoleLabel(user.role),
					caseload: caseload.length,
					notesLogged: notes,
					enrollments: enrollments,
					closures: closures,
					estimatedDirectHours: estimatedHours
				};
			}).sort(function (a, b) { return b.caseload - a.caseload; });
		},

		clientDataIntegrityAudit: function (caseManagerId) {
			var self = this;
			var clients = RM.ClientRepository.findAll();
			if (caseManagerId) {
				var managedIds = {};
				RM.CaseRepository.findByCaseManager(caseManagerId).forEach(function (caseRecord) {
					managedIds[caseRecord.clientId] = true;
				});
				clients = clients.filter(function (client) { return managedIds[client.id]; });
			}

			var duplicatePairs = RM.DeduplicationService.pairsAmong(clients);
			var incompleteIntakes = clients.filter(function (client) {
				var openCases = RM.CaseService ? RM.CaseService.openCasesForClient(client.id) : [];
				return openCases.some(function (caseRecord) { return caseRecord.incompleteIntake; });
			});
			var registrationOnly = clients.filter(function (client) {
				return !(RM.CaseService && RM.CaseService.openCasesForClient(client.id).length);
			});
			var missingCaseManager = clients.filter(function (client) {
				var openCases = RM.CaseService ? RM.CaseService.openCasesForClient(client.id) : [];
				return openCases.some(function (caseRecord) { return !caseRecord.caseManagerId; });
			});

			var issueRows = [];
			duplicatePairs.forEach(function (pair) {
				issueRows.push({
					clientId: pair.client.id,
					issueType: RM.I18n ? RM.I18n.t('pages.reports.integrity.duplicate') : 'Duplicate',
					clientName: pair.client.name,
					detail: (RM.I18n ? RM.I18n.t('pages.reports.integrity.duplicateDetail') : 'Possible duplicate of') +
						' ' + pair.other.name,
					severity: 'high'
				});
			});
			incompleteIntakes.forEach(function (client) {
				issueRows.push({
					clientId: client.id,
					issueType: RM.I18n ? RM.I18n.t('pages.reports.integrity.incompleteIntake') : 'Incomplete intake',
					clientName: client.name,
					detail: client.phone || '',
					severity: 'medium'
				});
			});
			registrationOnly.forEach(function (client) {
				issueRows.push({
					clientId: client.id,
					issueType: RM.I18n ? RM.I18n.t('pages.reports.integrity.registrationOnly') : 'Registration only',
					clientName: client.name,
					detail: client.registeredAt || '',
					severity: 'low'
				});
			});
			missingCaseManager.forEach(function (client) {
				issueRows.push({
					clientId: client.id,
					issueType: RM.I18n ? RM.I18n.t('pages.reports.integrity.missingCm') : 'Missing case manager',
					clientName: client.name,
					detail: client.phone || '',
					severity: 'high'
				});
			});

			return {
				summary: {
					duplicatePairs: duplicatePairs.length,
					incompleteIntakes: incompleteIntakes.length,
					registrationOnly: registrationOnly.length,
					missingCaseManager: missingCaseManager.length,
					totalIssues: issueRows.length
				},
				issues: issueRows.sort(function (a, b) {
					return a.clientName.localeCompare(b.clientName);
				})
			};
		},

		systemAuditLogExport: function () {
			var self = this;
			var ctx = this._filterContext || {};
			return RM.Audit.findAll().filter(function (entry) {
				return self._dateInRange(entry.timestamp, ctx.dateFrom, ctx.dateTo);
			}).map(function (entry) {
				return {
					timestamp: entry.timestamp,
					actor: entry.actorName || entry.actorId,
					action: RM.I18n ? RM.I18n.tOr('audit.' + entry.action, entry.action) : entry.action,
					entityRef: entry.entityRef,
					reason: entry.reason || ''
				};
			}).sort(function (a, b) {
				return new Date(b.timestamp) - new Date(a.timestamp);
			});
		},

		eventName: function (eventId) {
			return RM.I18n ? RM.I18n.eventLabel(eventId) : eventId;
		},

		localizedEvents: function () {
			var self = this;
			return this.EVENTS.map(function (e) {
				return { id: e.id, name: self.eventName(e.id) };
			});
		},

		caseloadByRisk: function (caseManagerId) {
			var self = this;
			var clients = caseManagerId
				? RM.ClientRepository.findByCaseManager(caseManagerId)
				: RM.ClientRepository.findAll().filter(function (c) {
					return c.status !== 'closed';
				});
			clients = clients.filter(function (client) {
				return self._clientMatchesFilterContext(client, { requireMatchingCase: true });
			});
			var counts = { High: 0, Medium: 0, Moderate: 0, Low: 0, Unknown: 0 };

			clients.forEach(function (client) {
				var a = RM.RiskAssessmentRepository.findLatest(client.id);
				var level = a ? a.overallRisk : 'Unknown';
				counts[level] = (counts[level] || 0) + 1;
			});

			return Object.keys(counts).map(function (level) {
				return { riskLevel: level, count: counts[level] };
			}).filter(function (r) { return r.count > 0; });
		},

		enrolledInEvent: function (eventId, caseManagerId) {
			var self = this;
			var ctx = this._filterContext || {};
			if (!eventId && ctx.eventId) { eventId = ctx.eventId; }
			var enrollments = eventId
				? RM.ServiceEnrollmentRepository.findByEventId(eventId)
				: RM.ServiceEnrollmentRepository.findAll().filter(function (e) { return !e.voided; });
			enrollments = enrollments.filter(function (e) {
				if (e.voided) { return false; }
				if (!self._dateInRange(e.dateEnrolled, ctx.dateFrom, ctx.dateTo)) { return false; }
				if (!caseManagerId) { return true; }
				var caseRecord = RM.CaseRepository.findLatestByClientId(e.clientId);
				return caseRecord && caseRecord.caseManagerId === caseManagerId;
			});
			return enrollments.map(function (e) {
				var client = RM.ClientRepository.findById(e.clientId);
				var resolvedEventId = e.serviceOrEventId || eventId;
				return {
					clientId: e.clientId,
					clientName: client ? client.name : (RM.I18n ? RM.I18n.t('risk.Unknown') : 'Unknown'),
					dateEnrolled: e.dateEnrolled,
					eventId: resolvedEventId,
					eventName: self.eventName(resolvedEventId)
				};
			}).sort(function (a, b) {
				return (b.dateEnrolled || '').localeCompare(a.dateEnrolled || '') ||
					a.clientName.localeCompare(b.clientName);
			});
		},

		overdueFollowUps: function (caseManagerId) {
			var self = this;
			return RM.FollowUpCadenceService.getDueFollowUps(caseManagerId).filter(function (d) {
				return self._clientMatchesFilterContext(d.client, { requireMatchingCase: true });
			}).map(function (d) {
				return {
					clientId: d.client.id,
					clientName: d.client.name,
					daysOverdue: d.daysOverdue,
					cadence: d.cadence,
					riskLevel: d.riskLevel
				};
			});
		},

		openCBOReferrals: function (caseManagerId) {
			var self = this;
			return RM.CBOReferralRepository.findAll().filter(function (r) {
				if (r.status !== 'Pending' && r.status !== 'Sent') { return false; }
				if (!self._dateInRange(r.date, (self._filterContext || {}).dateFrom, (self._filterContext || {}).dateTo)) {
					return false;
				}
				if (!caseManagerId) { return true; }
				var caseRecord = RM.CaseRepository.findLatestByClientId(r.clientId);
				return caseRecord && caseRecord.caseManagerId === caseManagerId;
			}).map(function (r) {
				var client = RM.ClientRepository.findById(r.clientId);
				return {
					clientId: r.clientId,
					clientName: client ? client.name : (RM.I18n ? RM.I18n.t('risk.Unknown') : 'Unknown'),
					cboName: r.cboName,
					status: r.status,
					date: r.date
				};
			});
		},

		programSnapshot: function () {
			var clients = RM.Data.activeClients();
			var riskGroups = RM.Data.groupByRisk(clients);
			return {
				totalActive: clients.length,
				highRisk: (riskGroups.High || []).length,
				incompleteIntakes: clients.filter(function (c) { return c.incompleteIntake; }).length,
				openCboReferrals: this.openCBOReferrals().length,
				overdueFollowUps: RM.FollowUpCadenceService.getDueFollowUps(null).length
			};
		},

		enrollmentCountForEvent: function (eventId) {
			return {
				eventId: eventId,
				eventName: this.eventName(eventId),
				count: RM.ServiceEnrollmentRepository.findByEventId(eventId).length
			};
		},

		overdueSummary: function () {
			var rows = this.overdueFollowUps(null);
			var byRisk = {};
			var byCadence = {};
			rows.forEach(function (row) {
				byRisk[row.riskLevel] = (byRisk[row.riskLevel] || 0) + 1;
				byCadence[row.cadence] = (byCadence[row.cadence] || 0) + 1;
			});
			return { total: rows.length, byRisk: byRisk, byCadence: byCadence };
		},

		cboReferralSummary: function () {
			var rows = this.openCBOReferrals();
			var byStatus = {};
			var byCbo = {};
			rows.forEach(function (row) {
				byStatus[row.status] = (byStatus[row.status] || 0) + 1;
				byCbo[row.cboName] = (byCbo[row.cboName] || 0) + 1;
			});
			return { total: rows.length, byStatus: byStatus, byCbo: byCbo };
		},

		caseloadSuccessMetrics: function (caseload, overdueCount) {
			var clientIds = {};
			caseload.forEach(function (c) { clientIds[c.id] = true; });
			var total = caseload.length;
			var riskOrder = { Low: 1, Medium: 2, Moderate: 2, High: 3 };

			var enrollments = RM.ServiceEnrollmentRepository.findAll().filter(function (e) {
				return !e.voided && clientIds[e.clientId];
			});
			var clientsWithServices = {};
			enrollments.forEach(function (e) { clientsWithServices[e.clientId] = true; });

			var activeGoals = RM.CarePlanRepository.findAll().filter(function (cp) {
				if (cp.voided || !clientIds[cp.clientId]) { return false; }
				return cp.status === 'In Progress' || /^complete/i.test(cp.status || '');
			});

			var completeIntakes = caseload.filter(function (c) { return !c.incompleteIntake; }).length;
			var overdue = typeof overdueCount === 'number' ? overdueCount : 0;
			var followUpOnTrackPct = total ? Math.round(((total - Math.min(overdue, total)) / total) * 100) : 100;
			var servicesPct = total ? Math.round((Object.keys(clientsWithServices).length / total) * 100) : 0;

			var riskImprovements = 0;
			caseload.forEach(function (c) {
				RM.ReassessmentRepository.findByClientId(c.id).forEach(function (r) {
					if (!r.previousRatings || !r.newRatings) { return; }
					var improved = false;
					Object.keys(r.newRatings).forEach(function (key) {
						var prev = riskOrder[r.previousRatings[key]] || 0;
						var curr = riskOrder[r.newRatings[key]] || 0;
						if (curr && prev && curr < prev) { improved = true; }
					});
					if (improved) { riskImprovements += 1; }
				});
			});

			var cboConfirmed = RM.CBOReferralRepository.findAll().filter(function (r) {
				return clientIds[r.clientId] && r.status === 'Confirmed';
			}).length;

			return {
				total: total,
				serviceEnrollments: enrollments.length,
				clientsWithServices: Object.keys(clientsWithServices).length,
				activeGoals: activeGoals.length,
				completeIntakes: completeIntakes,
				intakeCompletePct: total ? Math.round((completeIntakes / total) * 100) : 0,
				followUpOnTrackPct: followUpOnTrackPct,
				servicesConnectedPct: servicesPct,
				riskImprovements: riskImprovements,
				cboConfirmed: cboConfirmed
			};
		},

		caseloadRiskDrilldown: function (caseManagerId) {
			var self = this;
			var clients = caseManagerId
				? RM.ClientRepository.findByCaseManager(caseManagerId)
				: RM.Data.activeClients();
			clients = clients.filter(function (client) {
				return self._clientMatchesFilterContext(client, { requireMatchingCase: true });
			});
			return clients.map(function (client) {
				var assessment = RM.RiskAssessmentRepository.findLatest(client.id);
				var cm = RM.UserRepository.findById(client.caseManagerId);
				return {
					clientName: client.name,
					dob: client.dob,
					phone: client.phone,
					riskLevel: assessment ? assessment.overallRisk : 'Unknown',
					compositeScore: assessment && assessment.compositeScore != null ? assessment.compositeScore : '',
					processStage: RM.Components.workflowStageLabel(client),
					caseManager: cm ? cm.name : '',
					intakeStatus: client.incompleteIntake
						? (RM.I18n ? RM.I18n.intakeCompletenessLabel('incomplete') : 'Incomplete')
						: (RM.I18n ? RM.I18n.intakeCompletenessLabel('complete') : 'Complete')
				};
			}).sort(function (a, b) { return a.clientName.localeCompare(b.clientName); });
		},

		dashboardCaseloadDrilldown: function (caseload, filter, overdueByClientId) {
			var clients = caseload.slice();
			if (filter === 'overdue') {
				clients = clients.filter(function (c) { return overdueByClientId[c.id]; });
			} else if (filter === 'incomplete') {
				clients = clients.filter(function (c) { return c.incompleteIntake; });
			}
			return clients.map(function (client) {
				var assessment = RM.RiskAssessmentRepository.findLatest(client.id);
				var overdue = overdueByClientId[client.id];
				return {
					clientName: client.name,
					dob: client.dob,
					phone: client.phone,
					processStage: RM.Components.workflowStageLabel(client),
					riskLevel: assessment ? assessment.overallRisk : 'Unknown',
					followUpStatus: overdue
						? (RM.I18n ? RM.I18n.t('pages.reports.daysOverdueBadge', { count: overdue.daysOverdue }) : overdue.daysOverdue + ' days overdue') +
							' (' + overdue.cadence + ')'
						: (RM.I18n ? RM.I18n.t('pages.reports.followUpCurrent') : 'Current'),
					intakeStatus: client.incompleteIntake
						? (RM.I18n ? RM.I18n.intakeCompletenessLabel('incomplete') : 'Incomplete')
						: (RM.I18n ? RM.I18n.intakeCompletenessLabel('complete') : 'Complete')
				};
			}).sort(function (a, b) { return a.clientName.localeCompare(b.clientName); });
		},

		REGISTERED_ONLY_PROGRAM_ID: '__registered_only__',

		ALL_PROGRAM_IDS: [
			'prog-senior-services',
			'prog-community-services',
			'prog-parenting-support',
			'prog-mental-health'
		],

		PROGRAM_CHART_COLORS: {
			'prog-senior-services': '#2563eb',
			'prog-community-services': '#059669',
			'prog-parenting-support': '#7c3aed',
			'prog-mental-health': '#db2777',
			'__registered_only__': '#94a3b8'
		},

		PROGRAM_CHART_FALLBACK_COLORS: ['#2563eb', '#059669', '#7c3aed', '#db2777', '#d97706', '#0891b2'],

		programChartColor: function (programId, index) {
			if (this.PROGRAM_CHART_COLORS[programId]) {
				return this.PROGRAM_CHART_COLORS[programId];
			}
			var palette = this.PROGRAM_CHART_FALLBACK_COLORS;
			return palette[(index || 0) % palette.length];
		},

		clientsByProgram: function (caseManagerId) {
			var self = this;
			var cases = this._filterCases(caseManagerId);

			var byProgram = {};
			var clientsWithOpenCase = {};

			cases.forEach(function (caseRecord) {
				var programId = caseRecord.programId || 'unknown';
				if (!byProgram[programId]) {
					byProgram[programId] = {};
				}
				byProgram[programId][caseRecord.clientId] = true;
				clientsWithOpenCase[caseRecord.clientId] = true;
			});

			var rows = this.ALL_PROGRAM_IDS.map(function (programId, index) {
				var clientIds = Object.keys(byProgram[programId] || {});
				return {
					programId: programId,
					programLabel: RM.I18n ? RM.I18n.programLabel(programId) : programId,
					count: clientIds.length,
					clientIds: clientIds,
					color: self.programChartColor(programId, index)
				};
			});

			Object.keys(byProgram).forEach(function (programId) {
				if (self.ALL_PROGRAM_IDS.indexOf(programId) !== -1) { return; }
				var clientIds = Object.keys(byProgram[programId]);
				rows.push({
					programId: programId,
					programLabel: RM.I18n ? RM.I18n.programLabel(programId) : programId,
					count: clientIds.length,
					clientIds: clientIds,
					color: self.programChartColor(programId, rows.length)
				});
			});

			var ctx = this._filterContext || {};
			if (!caseManagerId && !ctx.programId && (!ctx.caseStatus || ctx.caseStatus === 'active')) {
				var registeredOnlyIds = RM.ClientRepository.findAll()
					.filter(function (client) {
						if (clientsWithOpenCase[client.id]) { return false; }
						return self._clientMatchesFilterContext(client);
					})
					.map(function (client) { return client.id; });
				if (registeredOnlyIds.length) {
					rows.push({
						programId: self.REGISTERED_ONLY_PROGRAM_ID,
						programLabel: RM.I18n
							? RM.I18n.t('pages.reports.registeredOnlyProgram')
							: 'Registration only (no open case)',
						count: registeredOnlyIds.length,
						clientIds: registeredOnlyIds,
						color: self.programChartColor(self.REGISTERED_ONLY_PROGRAM_ID, rows.length)
					});
				}
			}

			if (ctx.programId) {
				rows = rows.filter(function (row) { return row.programId === ctx.programId; });
			}

			return rows.filter(function (row) { return row.count > 0; });
		},

		clientsByProgramGroups: function (caseManagerId) {
			var groups = {};
			this.clientsByProgram(caseManagerId).forEach(function (row) {
				groups[row.programId] = row.clientIds.map(function (clientId) {
					return RM.ClientRepository.findById(clientId);
				}).filter(function (client) { return !!client; });
			});
			return groups;
		},

		clientsByProgramDetail: function (caseManagerId) {
			var self = this;
			var detail = [];
			this.clientsByProgram(caseManagerId).forEach(function (row) {
				row.clientIds.forEach(function (clientId) {
					var client = RM.ClientRepository.findById(clientId);
					if (!client) { return; }
					var openCases = RM.CaseService ? RM.CaseService.openCasesForClient(clientId).length : 0;
					detail.push({
						clientId: clientId,
						clientName: client.name,
						dob: client.dob,
						phone: client.phone,
						program: row.programLabel,
						openCases: openCases,
						registeredAt: client.registeredAt || ''
					});
				});
			});
			return detail.sort(function (a, b) {
				return a.program.localeCompare(b.program) || a.clientName.localeCompare(b.clientName);
			});
		},

		MULTI_PROGRAM_BUCKETS: [
			{ id: '1', labelKey: 'pages.reports.singleProgramBucket', color: '#94a3b8' },
			{ id: '2', labelKey: 'pages.reports.twoProgramsBucket', color: '#2563eb' },
			{ id: '3plus', labelKey: 'pages.reports.threePlusProgramsBucket', color: '#7c3aed' }
		],

		_activeCasesForReport: function (caseManagerId) {
			return this._filterCases(caseManagerId);
		},

		clientProgramCounts: function (caseManagerId) {
			var byClient = {};
			this._activeCasesForReport(caseManagerId).forEach(function (caseRecord) {
				if (!byClient[caseRecord.clientId]) {
					byClient[caseRecord.clientId] = {};
				}
				byClient[caseRecord.clientId][caseRecord.programId || 'unknown'] = true;
			});

			return Object.keys(byClient).map(function (clientId) {
				var programIds = Object.keys(byClient[clientId]);
				return {
					clientId: clientId,
					programIds: programIds,
					programLabels: programIds.map(function (programId) {
						return RM.I18n ? RM.I18n.programLabel(programId) : programId;
					}).sort(),
					programCount: programIds.length
				};
			});
		},

		multiProgramDistribution: function (caseManagerId) {
			var counts = { '1': 0, '2': 0, '3plus': 0 };
			this.clientProgramCounts(caseManagerId).forEach(function (entry) {
				if (entry.programCount >= 3) {
					counts['3plus'] += 1;
				} else {
					counts[String(entry.programCount)] = (counts[String(entry.programCount)] || 0) + 1;
				}
			});

			return this.MULTI_PROGRAM_BUCKETS.map(function (bucket) {
				return {
					bucketId: bucket.id,
					programLabel: RM.I18n ? RM.I18n.t(bucket.labelKey) : bucket.id,
					count: counts[bucket.id] || 0,
					color: bucket.color
				};
			});
		},

		multiProgramEnrollmentCount: function (caseManagerId) {
			return this.clientProgramCounts(caseManagerId).filter(function (entry) {
				return entry.programCount >= 2;
			}).length;
		},

		multiProgramEnrollmentDetail: function (caseManagerId) {
			return this.clientProgramDetailForBucket(caseManagerId, 'multi');
		},

		_clientProgramDetailRow: function (entry) {
			var client = RM.ClientRepository.findById(entry.clientId);
			if (!client) { return null; }
			return {
				clientId: entry.clientId,
				clientName: client.name,
				dob: client.dob,
				phone: client.phone,
				programCount: entry.programCount,
				programs: entry.programLabels.join(' · '),
				openCases: RM.CaseService ? RM.CaseService.openCasesForClient(entry.clientId).length : entry.programCount
			};
		},

		clientProgramDetailForBucket: function (caseManagerId, bucketId) {
			var self = this;
			return this.clientProgramCounts(caseManagerId)
				.filter(function (entry) {
					if (!bucketId || bucketId === 'multi') { return entry.programCount >= 2; }
					if (bucketId === '3plus') { return entry.programCount >= 3; }
					if (bucketId === '2') { return entry.programCount === 2; }
					return entry.programCount === 1;
				})
				.map(function (entry) { return self._clientProgramDetailRow(entry); })
				.filter(function (row) { return !!row; })
				.sort(function (a, b) {
					return b.programCount - a.programCount || a.clientName.localeCompare(b.clientName);
				});
		},

		multiProgramClientsForBucket: function (bucketId, caseManagerId) {
			return this.clientProgramCounts(caseManagerId)
				.filter(function (entry) {
					if (bucketId === '3plus') { return entry.programCount >= 3; }
					if (bucketId === '2') { return entry.programCount === 2; }
					return entry.programCount === 1;
				})
				.map(function (entry) {
					return RM.ClientRepository.findById(entry.clientId);
				})
				.filter(function (client) { return !!client; });
		}
	};
})();
