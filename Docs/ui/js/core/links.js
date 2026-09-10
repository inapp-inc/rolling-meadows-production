/* global RM */
(function () {
	'use strict';

	var ROUTE_ALIASES = {
		'dashboard.html': 'dashboard',
		'client-search.html': 'client-search',
		'client-registration.html': 'client-registration',
		'referral-intake.html': 'referral-intake',
		'case-workspace.html': 'case-workspace',
		'client-profile.html': 'client-profile',
		'reports.html': 'reports-caseload',
		'custom-reports.html': 'custom-reports',
		'report-builder.html': 'custom-reports',
		'admin-duplicates.html': 'admin-duplicates',
		'liaison-lookup.html': 'liaison-lookup',
		'documents-hub.html': 'documents-hub',
		'services-hub.html': 'services-hub',
		'case-creation.html': 'case-creation',
		'case-search.html': 'case-search',
		'workflow-hub.html': 'workflow-hub',
		'bulk-enrollment.html': 'bulk-enroll'
	};

	var FILE_BY_ID = {};
	Object.keys(ROUTE_ALIASES).forEach(function (filename) {
		FILE_BY_ID[ROUTE_ALIASES[filename]] = filename.replace(/\.html$/, '');
	});

	function resolvePageFile(route) {
		if (!route) { return 'dashboard.html'; }
		if (route.indexOf('.html') !== -1) { return route; }
		return (FILE_BY_ID[route] || route) + '.html';
	}

	RM.Links = {
		page: function (route, params) {
			params = params || {};
			var file = resolvePageFile(route);
			var pairs = Object.keys(params).filter(function (key) {
				return params[key] != null && params[key] !== '';
			}).map(function (key) {
				return encodeURIComponent(key) + '=' + encodeURIComponent(params[key]);
			});
			return file + (pairs.length ? '?' + pairs.join('&') : '');
		},

		go: function (route, params) {
			var url = this.page(route, params);
			if (RM.Navigate) {
				RM.Navigate.go(url);
			} else {
				window.location.href = url;
			}
		}
	};
})();
