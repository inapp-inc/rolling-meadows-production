/* global RM */
(function () {
	'use strict';

	var DOMAINS = ['falls', 'nutrition', 'isolation', 'housing', 'abuseRisk'];
	var LEVELS = ['Low', 'Medium', 'High'];

	RM.FormHelpers = {
		SOURCES: ['Family', 'Hospital', 'Physician', 'Police', 'Neighbor', 'Community agency', 'Self'],
		REASONS: ['Self-neglect', 'Isolation', 'Cognitive decline', 'Falls', 'Medication issues', 'Food insecurity', 'Elder abuse', 'Unsafe living conditions', 'Welfare check'],
		CARE_PLAN_STATUSES: ['Not Started', 'In Progress', 'Complete', 'Abandoned'],
		NOTE_TYPES: ['phone call', 'home visit', 'provider coordination'],
		CBO_STATUSES: ['Pending', 'Sent', 'Confirmed'],
		REASSESSMENT_TRIGGERS: ['Manual', '6-month timer', 'Hospitalization', 'Post-PT progress'],
		CLOSURE_REASONS: ['Goals met', 'Relocated', 'Transferred', 'Declined services', 'No longer needed'],
		DOMAINS: DOMAINS,
		LEVELS: LEVELS,

		localizedLevels: function () {
			return LEVELS.map(function (level) {
				return { value: level, label: RM.I18n.riskLabel(level) };
			});
		},

		levelLabel: function (level) {
			return RM.I18n.riskLabel(this.normalizeRiskLevel(level));
		},

		enumSelectOptions: function (category, values) {
			return (values || []).map(function (value) {
				return {
					value: value,
					label: RM.I18n.enumLabel(category, value)
				};
			});
		},

		carePlanStatusOptions: function () {
			return this.enumSelectOptions('carePlanStatus', this.CARE_PLAN_STATUSES);
		},

		cboStatusOptions: function () {
			return this.enumSelectOptions('cboStatus', this.CBO_STATUSES);
		},

		normalizeRiskLevel: function (level) {
			if (level === 'Moderate') { return 'Medium'; }
			return level;
		},

		ratingMatches: function (stored, level) {
			if (!stored) { return false; }
			return stored === level || (stored === 'Moderate' && level === 'Medium');
		},

		setSelectValue: function (select, value) {
			if (!select || value == null || value === '') { return false; }
			var str = String(value);
			var options = Array.prototype.slice.call(select.options).map(function (o) { return o.value; });
			if (options.indexOf(str) !== -1) {
				select.value = str;
				return true;
			}
			var first = str.split(',')[0].trim();
			if (options.indexOf(first) !== -1) {
				select.value = first;
				return true;
			}
			var lower = str.toLowerCase();
			for (var i = 0; i < select.options.length; i++) {
				if (select.options[i].value.toLowerCase() === lower) {
					select.value = select.options[i].value;
					return true;
				}
			}
			return false;
		},

		formatDomain: function (d) {
			return d.replace(/([A-Z])/g, ' $1').replace(/^./, function (s) { return s.toUpperCase(); });
		},

		calcComposite: function (ratings) {
			var score = 0;
			var map = { Low: 1, Medium: 2, Moderate: 2, High: 3 };
			DOMAINS.forEach(function (d) {
				score += map[ratings[d]] || 0;
			});
			var avg = score / DOMAINS.length;
			var overall = avg >= 2.5 ? 'High' : avg >= 1.5 ? 'Medium' : 'Low';
			return { compositeScore: Math.round(avg * 25), overallRisk: overall };
		},

		workspaceUrl: function (clientId, tab, caseId) {
			var params = { clientId: clientId, tab: tab || undefined };
			if (caseId) { params.caseId = caseId; }
			return RM.Links.page('case-workspace', params);
		}
	};
})();
