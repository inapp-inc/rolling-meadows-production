/* global RM */
(function () {
	'use strict';

	var CATEGORIES = [
		{
			id: 'cat-senior-services',
			label: 'Senior Social Services',
			subcategories: [
				{ id: 'sub-seniors-at-risk', label: 'Seniors at Risk' },
				{ id: 'sub-in-home-support', label: 'In-Home Support' },
				{ id: 'sub-nutrition-programs', label: 'Nutrition Programs' }
			]
		},
		{
			id: 'cat-parenting-support',
			label: 'Parenting Support Programs',
			subcategories: [
				{ id: 'sub-youth-empowerment', label: 'Youth Empowerment Groups' },
				{ id: 'sub-family-resource', label: 'Family Resource Center' },
				{ id: 'sub-parent-education', label: 'Parent Education' }
			]
		},
		{
			id: 'cat-mental-health',
			label: 'Mental Health Services',
			subcategories: [
				{ id: 'sub-crisis-response', label: 'Crisis Response' },
				{ id: 'sub-outpatient-counseling', label: 'Outpatient Counseling' },
				{ id: 'sub-peer-support', label: 'Peer Support' }
			]
		},
		{
			id: 'cat-community-services',
			label: 'Community Social Services',
			subcategories: [
				{ id: 'sub-housing-assistance', label: 'Housing Assistance' },
				{ id: 'sub-employment-support', label: 'Employment Support' },
				{ id: 'sub-general-intake', label: 'General Intake' }
			]
		}
	];

	var SUB_BY_ID = {};
	var CAT_BY_ID = {};

	CATEGORIES.forEach(function (cat) {
		CAT_BY_ID[cat.id] = cat;
		cat.subcategories.forEach(function (sub) {
			SUB_BY_ID[sub.id] = { category: cat, subcategory: sub };
		});
	});

	RM.CaseCategories = {
		list: CATEGORIES,

		findCategory: function (categoryId) {
			return CAT_BY_ID[categoryId] || null;
		},

		findSubcategory: function (subcategoryId) {
			return SUB_BY_ID[subcategoryId] || null;
		},

		categoryLabel: function (categoryId) {
			var cat = CAT_BY_ID[categoryId];
			if (!cat) { return categoryId || '—'; }
			if (RM.I18n) {
				return RM.I18n.tOr('category.' + categoryId, cat.label);
			}
			return cat.label;
		},

		subcategoryLabel: function (subcategoryId) {
			var entry = SUB_BY_ID[subcategoryId];
			if (!entry) { return subcategoryId || '—'; }
			if (RM.I18n) {
				return RM.I18n.tOr('subcategory.' + subcategoryId, entry.subcategory.label);
			}
			return entry.subcategory.label;
		},

		localizedCategories: function () {
			return CATEGORIES.map(function (cat) {
				return {
					id: cat.id,
					label: RM.CaseCategories.categoryLabel(cat.id),
					subcategories: cat.subcategories.map(function (sub) {
						return {
							id: sub.id,
							label: RM.CaseCategories.subcategoryLabel(sub.id)
						};
					})
				};
			});
		},

		subcategoriesFor: function (categoryId) {
			var cat = CAT_BY_ID[categoryId];
			return cat ? cat.subcategories.slice() : [];
		},

		defaultSelection: function () {
			return {
				categoryId: 'cat-senior-services',
				subcategoryId: 'sub-seniors-at-risk'
			};
		}
	};
})();
