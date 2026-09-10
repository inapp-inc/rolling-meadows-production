/* global RM */
(function () {
	'use strict';

	var FAMILY_BY_SUBCATEGORY = {
		'sub-seniors-at-risk': 'senior',
		'sub-in-home-support': 'in_home',
		'sub-nutrition-programs': 'nutrition',
		'sub-youth-empowerment': 'parenting',
		'sub-family-resource': 'parenting',
		'sub-parent-education': 'parenting',
		'sub-housing-assistance': 'parenting',
		'sub-crisis-response': 'mental_health',
		'sub-outpatient-counseling': 'mental_health',
		'sub-peer-support': 'mental_health',
		'sub-employment-support': 'employment',
		'sub-general-intake': 'general'
	};

	var SENIOR_DOMAINS = ['falls', 'nutrition', 'isolation', 'housing', 'abuseRisk'];
	var IN_HOME_DOMAINS = ['adlSupport', 'homeSafety', 'caregiverSupport', 'mobility', 'medicationManagement'];
	var NUTRITION_DOMAINS = ['foodAccess', 'mealDelivery', 'dietaryNeeds', 'weightMonitoring', 'socialDining'];
	var PARENTING_DOMAINS = ['attendance', 'transportation', 'childcare', 'familyStress', 'schoolEngagement'];
	var MENTAL_HEALTH_DOMAINS = ['suicideRisk', 'selfHarm', 'substanceUse', 'safetyPlan', 'supportSystem'];
	var EMPLOYMENT_DOMAINS = ['jobReadiness', 'skillsGap', 'transportation', 'childcare', 'incomeStability'];
	var GENERAL_DOMAINS = ['basicNeeds', 'housing', 'employment', 'health', 'supportNetwork'];

	function t(key, params) {
		return RM.I18n.t(key, params);
	}

	function clientShape(pendingOrClient) {
		if (!pendingOrClient) { return null; }
		return {
			caseSubcategoryId: pendingOrClient.caseSubcategoryId || pendingOrClient.subcategoryId,
			caseCategoryId: pendingOrClient.caseCategoryId || pendingOrClient.categoryId
		};
	}

	function familyForClient(client) {
		if (!client) { return 'general'; }
		return FAMILY_BY_SUBCATEGORY[client.caseSubcategoryId] ||
			FAMILY_BY_SUBCATEGORY[client.caseCategoryId] ||
			'general';
	}

	function configForClient(client) {
		return RM.I18n.familyFormConfig(familyForClient(client));
	}

	function domainsForFamily(family) {
		switch (family) {
			case 'in_home': return IN_HOME_DOMAINS;
			case 'nutrition': return NUTRITION_DOMAINS;
			case 'parenting': return PARENTING_DOMAINS;
			case 'mental_health': return MENTAL_HEALTH_DOMAINS;
			case 'employment': return EMPLOYMENT_DOMAINS;
			case 'general': return GENERAL_DOMAINS;
			default: return SENIOR_DOMAINS;
		}
	}

	function ratingDomainKeys(client, ratings) {
		var domains = client ? domainsForFamily(familyForClient(client)) : SENIOR_DOMAINS;
		var keys = domains.slice();
		if (ratings) {
			Object.keys(ratings).forEach(function (key) {
				if (keys.indexOf(key) === -1) { keys.push(key); }
			});
		}
		return keys;
	}

	function stageForTab(client, tabId) {
		if (!RM.CaseWorkflow || !client) { return null; }
		return RM.CaseWorkflow.stagesForClient(client).find(function (s) {
			return s.tabId === tabId;
		});
	}

	function nextStage(client, tabId) {
		var stage = stageForTab(client, tabId);
		if (!stage || !RM.CaseWorkflow) { return null; }
		return RM.CaseWorkflow.stagesForClient(client).find(function (s) {
			return s.stage === stage.stage + 1;
		});
	}

	function selectOptions(items, picklistCategory) {
		items = items || [];
		return '<option value="">' + RM.Components.escapeHtml(t('forms.common.select')) + '</option>' +
			items.map(function (item) {
				var label = picklistCategory
					? RM.I18n.picklistLabel(picklistCategory, item)
					: item;
				return '<option value="' + RM.Components.escapeHtml(item) + '">' + RM.Components.escapeHtml(label) + '</option>';
			}).join('');
	}

	RM.CaseForm = {
		familyForClient: familyForClient,
		configForClient: configForClient,

		configForPending: function (pending) {
			return configForClient(clientShape(pending));
		},

		domainsForClient: function (client) {
			return domainsForFamily(familyForClient(client));
		},

		ratingDomainKeys: ratingDomainKeys,

		domainLabel: function (domainKey) {
			return RM.I18n.domainLabel(domainKey);
		},

		formatRatingsList: function (ratings, client) {
			if (!ratings) { return '—'; }
			var self = this;
			return '<ul>' + ratingDomainKeys(client, ratings).filter(function (key) {
				return ratings[key];
			}).map(function (key) {
				return '<li>' + RM.Components.escapeHtml(self.domainLabel(key)) + ': ' +
					RM.Components.riskBadge(ratings[key]) + '</li>';
			}).join('') + '</ul>';
		},

		formatRatingsTable: function (ratings, client) {
			if (!ratings) { return '—'; }
			var self = this;
			var levels = ['Low', 'Medium', 'High'];
			var keys = ratingDomainKeys(client, ratings).filter(function (key) {
				return ratings[key];
			});
			if (!keys.length) { return '—'; }
			return '<table class="data-table rating-table rating-table-readonly"><thead><tr><th>' +
				RM.Components.escapeHtml(t('forms.common.domain')) + '</th>' +
				levels.map(function (l) {
					return '<th>' + RM.Components.escapeHtml(RM.I18n.riskLabel(l)) + '</th>';
				}).join('') + '</tr></thead><tbody>' +
				keys.map(function (key) {
					return '<tr><td>' + RM.Components.escapeHtml(self.domainLabel(key)) + '</td>' +
						levels.map(function (l) {
							var active = RM.FormHelpers.ratingMatches(ratings[key], l);
							return '<td class="rating-cell' + (active ? ' rating-cell-active' : '') + '">' +
								(active ? RM.Components.riskBadge(ratings[key]) : '—') + '</td>';
						}).join('') + '</tr>';
				}).join('') + '</tbody></table>';
		},

		profileTabLabels: function (client) {
			return this.profileSections(client).sections.map(function (s) { return s.title; });
		},

		profileSections: function (client) {
			var workflow = RM.CaseWorkflow.forClient(client);
			var sections = RM.CaseWorkflow.stagesForClient(client).map(function (s) {
				return {
					tabId: s.tabId,
					title: s.label,
					deliverable: s.deliverable || '',
					stageNum: s.stage
				};
			});
			sections.push({
				tabId: 'documents',
				title: t('forms.common.documentsTitle'),
				deliverable: t('forms.common.documentsDeliverable'),
				stageNum: null,
				supplemental: true
			});
			return { workflow: workflow, sections: sections };
		},

		profileSectionHeader: function (section, client, options) {
			options = options || {};
			var esc = RM.Components.escapeHtml;
			var num = section.stageNum
				? '<span class="profile-360-section-num" aria-hidden="true">' + section.stageNum + '</span>'
				: '';
			var edit = options.hideWorkspaceLink ? '' :
				'<a href="' + RM.Links.page('case-workspace', {
					clientId: client.id,
					tab: section.tabId
				}) + '" class="btn btn-sm btn-secondary">' +
				esc(options.workspaceLinkLabel || t('forms.common.openInWorkspace')) + '</a>';
			return '<header class="profile-360-section-header">' +
				'<div class="profile-360-section-heading">' + num +
				'<div><h2 class="profile-360-section-title">' + esc(section.title) + '</h2>' +
				(section.deliverable ? '<p class="profile-360-section-deliverable">' + esc(section.deliverable) + '</p>' : '') +
				'</div></div>' + edit + '</header>';
		},

		formatRiskScoreSummary: function (calc, options) {
			options = options || {};
			var label = options.label || t('forms.common.finalRiskScore');
			if (!calc || calc.compositeScore == null) {
				return '<div class="risk-score-summary risk-score-summary-pending">' +
					'<p class="risk-score-label">' + RM.Components.escapeHtml(label) + '</p>' +
					'<p class="risk-score-pending">' + RM.Components.escapeHtml(t('forms.common.riskScorePending')) + '</p></div>';
			}
			var html = '<div class="risk-score-summary">' +
				'<p class="risk-score-label">' + RM.Components.escapeHtml(label) + '</p>' +
				'<div class="risk-score-values">' +
				'<div class="risk-score-metric">' +
				'<span class="risk-score-metric-label">' + RM.Components.escapeHtml(t('forms.common.compositeScore')) + '</span>' +
				'<strong class="risk-score-number">' + calc.compositeScore + '</strong></div>' +
				'<div class="risk-score-metric">' +
				'<span class="risk-score-metric-label">' + RM.Components.escapeHtml(t('forms.common.overallRiskLevel')) + '</span>' +
				'<span class="risk-score-badge">' + RM.Components.riskBadge(calc.overallRisk) + '</span></div>' +
				'</div>';
			if (options.assessedDate) {
				html += '<p class="risk-score-meta">' + RM.Components.escapeHtml(t('forms.common.assessed', {
					date: RM.Components.formatDate(options.assessedDate)
				})) + '</p>';
			}
			html += '</div>';
			return html;
		},

		riskScoringGuideHtml: function () {
			var rulesHtml = [1, 2, 3].map(function (n) {
				return '<li>' + RM.Components.escapeHtml(t('forms.common.riskGuideRule' + n)) + '</li>';
			}).join('');
			return '<aside class="risk-scoring-guide">' +
				'<h3 class="risk-scoring-guide-title">' + RM.Components.escapeHtml(t('forms.common.riskGuideTitle')) + '</h3>' +
				'<p>' + RM.Components.escapeHtml(t('forms.common.riskGuideIntro')) + '</p>' +
				'<ul class="risk-scoring-rules">' + rulesHtml + '</ul>' +
				'<p class="risk-scoring-note">' + RM.Components.escapeHtml(t('forms.common.riskGuideNote')) + '</p>' +
				'</aside>';
		},

		calcComposite: function (ratings, domains) {
			domains = domains || SENIOR_DOMAINS;
			var score = 0;
			var map = { Low: 1, Medium: 2, Moderate: 2, High: 3 };
			var count = 0;
			domains.forEach(function (d) {
				if (ratings[d]) {
					score += map[ratings[d]] || 0;
					count++;
				}
			});
			if (!count) {
				return { compositeScore: 0, overallRisk: 'Low' };
			}
			var avg = score / count;
			var overall = avg >= 2.5 ? 'High' : avg >= 1.5 ? 'Medium' : 'Low';
			return { compositeScore: Math.round(avg * 25), overallRisk: overall };
		},

		stageContext: function (client, tabId) {
			var stage = stageForTab(client, tabId);
			var next = nextStage(client, tabId);
			var family = familyForClient(client);
			var config = configForClient(client);

			return {
				tabId: tabId,
				title: stage ? stage.label : tabId,
				deliverable: stage ? stage.deliverable : '',
				stageNum: stage ? stage.stage : 1,
				nextTabId: next ? next.tabId : null,
				nextTitle: next ? next.label : '',
				family: family,
				config: config,
				domains: domainsForFamily(family),
				focusAreas: (RM.CaseWorkflow.forClient(client).focusAreas || [])
			};
		},

		stageContextForPending: function (pending, tabId) {
			return this.stageContext(clientShape(pending), tabId || 'intake');
		},

		panelHeader: function (ctx) {
			var html = '<h2>' + RM.Components.escapeHtml(ctx.title) + '</h2>';
			if (ctx.deliverable) {
				html += '<p class="workspace-stage-deliverable"><strong>' + RM.Components.escapeHtml(t('forms.common.deliverable')) + '</strong> ' +
					RM.Components.escapeHtml(ctx.deliverable) + '</p>';
			}
			if (ctx.focusAreas.length) {
				html += '<p class="workspace-stage-focus"><strong>' + RM.Components.escapeHtml(t('forms.common.focusAreas')) + '</strong> ' +
					RM.Components.escapeHtml(ctx.focusAreas.join(' · ')) + '</p>';
			}
			return html;
		},

		saveContinueLabel: function (ctx, fallback) {
			if (ctx.nextTitle) {
				return RM.Components.escapeHtml(t('forms.common.saveContinue', { next: ctx.nextTitle }));
			}
			return fallback || t('forms.common.save');
		},

		intakeFormHtml: function (ctx, options) {
			options = options || {};
			var cfg = ctx.config;
			var dis = options.readOnly ? ' disabled' : '';
			var clientDis = (options.readOnly || options.readOnlyClient) ? ' disabled' : '';
			var header = options.includePanelHeader === false ? '' : this.panelHeader(ctx);
			var c = 'forms.common';

			return header +
				'<h3 class="form-section-title">' + RM.Components.escapeHtml(cfg.referralSectionTitle) + '</h3>' +
				'<div class="form-row form-row-2">' +
				'<div class="form-group"><label for="ref-source">' + RM.Components.escapeHtml(t(c + '.referralSource')) + '</label><select id="ref-source" required' + dis + '>' +
				selectOptions(cfg.sources || [], 'referralSources') + '</select></div>' +
				'<div class="form-group"><label for="ref-reason">' + RM.Components.escapeHtml(t(c + '.reason')) + '</label><select id="ref-reason" required' + dis + '>' +
				selectOptions(cfg.reasons || [], 'referralReasons') + '</select></div></div>' +
				'<div class="form-group"><label for="ref-by">' + RM.Components.escapeHtml(t(c + '.referredBy')) + '</label><input type="text" id="ref-by" required' + dis + '></div>' +
				'<h3 class="form-section-title">' + RM.Components.escapeHtml(cfg.intakeSectionTitle) + '</h3>' +
				'<div class="form-row form-row-2">' +
				'<div class="form-group"><label for="client-name">' + RM.Components.escapeHtml(t(c + '.clientName')) + '</label><input type="text" id="client-name" required autocomplete="name"' + clientDis + '></div>' +
				'<div class="form-group"><label for="client-dob">' + RM.Components.escapeHtml(t(c + '.dateOfBirth')) + '</label><input type="date" id="client-dob"' + clientDis + '></div></div>' +
				'<div class="form-row form-row-2">' +
				'<div class="form-group"><label for="client-phone">' + RM.Components.escapeHtml(t(c + '.phone')) + '</label><input type="tel" id="client-phone" autocomplete="tel"' + clientDis + '></div>' +
				'<div class="form-group"><label for="client-address">' + RM.Components.escapeHtml(t(c + '.address')) + '</label><input type="text" id="client-address"' + dis + '></div></div>' +
				'<div class="form-group"><label for="living">' + RM.Components.escapeHtml(cfg.livingLabel) + '</label><input type="text" id="living"' + dis + '></div>' +
				'<div class="form-group"><label for="medical">' + RM.Components.escapeHtml(cfg.backgroundLabel) + '</label><textarea id="medical" rows="3"' + dis + '></textarea></div>' +
				'<h3 class="form-section-title" style="font-size:0.9375rem;margin-top:1rem">' + RM.Components.escapeHtml(cfg.screeningSectionTitle) + '</h3>' +
				'<div class="form-row form-row-2 form-intake-grid">' +
				(cfg.intakeQuestions || []).map(function (q) {
					return '<div class="form-group"><label for="' + q.fieldId + '">' + RM.Components.escapeHtml(q.label) + '</label>' +
						'<textarea id="' + q.fieldId + '" rows="2"' + dis + '></textarea></div>';
				}).join('') +
				'</div>' +
				'<div class="form-check-row"><label class="checkbox-label" for="consent">' +
				'<input type="checkbox" id="consent"' + dis + '><span>' + RM.Components.escapeHtml(t(c + '.consentOnFile')) + '</span></label></div>' +
				(options.submitLabel ?
					'<div class="form-actions"><button type="submit" class="btn btn-primary">' + options.submitLabel + '</button></div>' : '');
		},

		registrationQuestions: function () {
			var general = RM.I18n.familyFormConfig('general');
			return (general.intakeQuestions || []).map(function (q) {
				return {
					key: q.key,
					fieldId: 'reg-' + q.fieldId,
					label: q.label
				};
			});
		},

		registrationScreeningHtml: function () {
			var questions = this.registrationQuestions();
			if (!questions.length) { return ''; }
			var general = RM.I18n.familyFormConfig('general');
			return '<h2 class="form-section-title">' +
				RM.Components.escapeHtml(general.screeningSectionTitle || t('forms.base.screeningSectionTitle')) + '</h2>' +
				'<p class="text-muted">' + RM.Components.escapeHtml(t('pages.clientRegistration.screeningQuestionsHint')) + '</p>' +
				'<div class="form-row form-row-2 form-intake-grid">' +
				questions.map(function (q) {
					return '<div class="form-group"><label for="' + q.fieldId + '">' +
						RM.Components.escapeHtml(q.label) + '</label>' +
						'<textarea id="' + q.fieldId + '" rows="2"></textarea></div>';
				}).join('') +
				'</div>';
		},

		readRegistrationScreening: function () {
			var intakeQuestions = {};
			this.registrationQuestions().forEach(function (q) {
				var el = document.getElementById(q.fieldId);
				intakeQuestions[q.key] = el ? el.value.trim() : '';
			});
			return intakeQuestions;
		},

		screeningAnswersForClient: function (client) {
			if (!client || !client.screening) { return {}; }
			return client.screening.intakeQuestions || {};
		},

		applyScreeningToIntakeFields: function (cfg, intake, screeningAnswers) {
			cfg = cfg || {};
			intake = intake || {};
			screeningAnswers = screeningAnswers || {};
			(cfg.intakeQuestions || []).forEach(function (q) {
				var el = document.getElementById(q.fieldId);
				if (!el) { return; }
				var fromIntake = intake.intakeQuestions && intake.intakeQuestions[q.key];
				if (fromIntake) {
					el.value = fromIntake;
					return;
				}
				if (screeningAnswers[q.key]) {
					el.value = screeningAnswers[q.key];
				}
			});
		},

		hasRegistrationScreening: function (client) {
			var answers = this.screeningAnswersForClient(client);
			return Object.keys(answers).some(function (key) {
				return !!(answers[key] || '').trim();
			});
		},

		populateIntakeForm: function (client, cfg, intake, referral) {
			cfg = cfg || configForClient(client);
			var nameEl = document.getElementById('client-name');
			if (!nameEl) { return; }
			nameEl.value = client.name || '';
			document.getElementById('client-dob').value = client.dob || '';
			document.getElementById('client-phone').value = client.phone || '';
			document.getElementById('client-address').value = client.address || '';

			intake = intake || null;
			if (intake) {
				document.getElementById('living').value = intake.livingArrangement || '';
				document.getElementById('medical').value = intake.medicalHistory || '';
				document.getElementById('consent').checked = !!intake.consentOnFile;
			}

			this.applyScreeningToIntakeFields(cfg, intake, this.screeningAnswersForClient(client));

			if (referral) {
				RM.FormHelpers.setSelectValue(document.getElementById('ref-source'), referral.source);
				RM.FormHelpers.setSelectValue(document.getElementById('ref-reason'), referral.reason);
				document.getElementById('ref-by').value = referral.referredBy || '';
			}
		},

		readIntakePayload: function (cfg) {
			var intakeQuestions = {};
			(cfg.intakeQuestions || []).forEach(function (q) {
				var el = document.getElementById(q.fieldId);
				intakeQuestions[q.key] = el ? el.value : '';
			});
			return {
				partial: {
					name: document.getElementById('client-name').value.trim(),
					dob: document.getElementById('client-dob').value,
					phone: document.getElementById('client-phone').value.trim()
				},
				referral: {
					source: document.getElementById('ref-source').value,
					reason: document.getElementById('ref-reason').value,
					referredBy: document.getElementById('ref-by').value.trim()
				},
				intake: {
					livingArrangement: document.getElementById('living').value.trim(),
					medicalHistory: document.getElementById('medical').value.trim(),
					consentOnFile: document.getElementById('consent').checked,
					intakeQuestions: intakeQuestions
				}
			};
		}
	};
})();
