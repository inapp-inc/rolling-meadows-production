(function () {
	'use strict';

	if (!window.RM || !RM.Session || !RM.Session.isAuthenticated()) {
		var target = window.location.protocol === 'file:' ? 'index.src.html' : 'index.html';
		location.replace(target);
		return;
	}

	var file = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
	var routes = {
		'dashboard.html': 'dashboard',
		'client-search.html': 'client-search',
		'referral-intake.html': 'referral-intake',
		'case-creation.html': 'case-creation',
		'case-search.html': 'case-search',
		'bulk-enrollment.html': 'bulk-enroll',
		'case-workspace.html': 'case-workspace',
		'client-profile.html': 'client-profile',
		'reports.html': 'reports',
		'report-builder.html': 'report-builder',
		'admin-duplicates.html': 'admin-duplicates',
		'liaison-lookup.html': 'liaison-lookup',
		'liaison.html': 'liaison-lookup'
	};
	var workspaceTabs = {
		'risk-assessment.html': 'risk',
		'care-plan.html': 'careplan',
		'service-coordination.html': 'services',
		'monitoring.html': 'followup',
		'reassessment.html': 'reassessment',
		'case-closure.html': 'closure'
	};

	var route = routes[file] || (workspaceTabs[file] ? 'case-workspace' : file.replace(/\.html$/, ''));
	var params = new URLSearchParams(location.search);

	if (workspaceTabs[file]) {
		params.set('tab', workspaceTabs[file]);
	}

	var qs = params.toString();
	location.replace(route + '.html' + (qs ? '?' + qs : ''));
})();
