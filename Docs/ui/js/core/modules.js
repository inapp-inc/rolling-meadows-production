/* global RM */
(function () {
	'use strict';

	var GLOBAL_NAV = [
		{
			id: 'dashboard',
			labelKey: 'nav.dashboard',
			href: 'dashboard.html',
			roles: ['case_manager', 'supervisor'],
			global: true
		}
	];

	var MODULES = [
		{
			id: 'analytics',
			labelKey: 'module.analytics',
			shortLabelKey: 'module.analyticsShort',
			roles: ['case_manager', 'supervisor', 'auditor']
		},
		{
			id: 'cases',
			labelKey: 'module.cases',
			shortLabelKey: 'module.casesShort',
			roles: ['case_manager', 'supervisor']
		},
		{
			id: 'clients',
			labelKey: 'module.clients',
			shortLabelKey: 'module.clientsShort',
			roles: ['case_manager', 'supervisor', 'cross_program_liaison']
		},
		{
			id: 'documents',
			labelKey: 'module.documents',
			shortLabelKey: 'module.documentsShort',
			roles: ['case_manager', 'supervisor']
		},
		{
			id: 'services',
			labelKey: 'module.services',
			shortLabelKey: 'module.servicesShort',
			roles: ['case_manager', 'supervisor']
		},
		{
			id: 'workflow',
			labelKey: 'module.workflow',
			shortLabelKey: 'module.workflowShort',
			roles: ['case_manager', 'supervisor']
		}
	];

	var NAV_BY_MODULE = {
		cases: [
			{ id: 'case-search', labelKey: 'nav.caseSearch', href: 'case-search.html', roles: ['case_manager', 'supervisor'] },
			{ id: 'case-creation', labelKey: 'nav.caseCreation', href: 'case-creation.html', roles: ['case_manager', 'supervisor'] }
		],
		clients: [
			{ id: 'client-registration', labelKey: 'nav.clientRegistration', href: 'client-registration.html', roles: ['case_manager', 'supervisor'] },
			{ id: 'client-search', labelKey: 'nav.clientSearch', href: 'client-search.html', roles: ['case_manager', 'supervisor'] },
			{ id: 'admin-duplicates', labelKey: 'nav.adminDuplicates', href: 'admin-duplicates.html', roles: ['supervisor'] },
			{ id: 'liaison-lookup', labelKey: 'nav.liaisonLookup', href: 'liaison-lookup.html', roles: ['cross_program_liaison'] }
		],
		documents: [
			{ id: 'documents-hub', labelKey: 'nav.documentsHub', href: 'documents-hub.html', roles: ['case_manager', 'supervisor'] }
		],
		workflow: [
			{ id: 'workflow-hub', labelKey: 'nav.workflowHub', href: 'workflow-hub.html', roles: ['case_manager', 'supervisor'] }
		],
		services: [
			{ id: 'services-hub', labelKey: 'nav.servicesHub', href: 'services-hub.html', roles: ['case_manager', 'supervisor'] },
			{ id: 'bulk-enroll', labelKey: 'nav.bulkEnroll', href: 'bulk-enrollment.html', roles: ['case_manager', 'supervisor'] }
		],
		analytics: [
			{
				id: 'standard-reports',
				labelKey: 'nav.standardReports',
				roles: ['case_manager', 'supervisor', 'auditor'],
				children: [
					{ id: 'reports-caseload', labelKey: 'nav.reportsCaseload', href: 'reports.html?tier=caseload', roles: ['case_manager', 'supervisor'] },
					{ id: 'reports-executive', labelKey: 'nav.reportsExecutive', href: 'reports.html?tier=executive', roles: ['case_manager', 'supervisor'] },
					{ id: 'reports-integrity', labelKey: 'nav.reportsIntegrity', href: 'reports.html?tier=integrity', roles: ['case_manager', 'supervisor', 'auditor'] },
					{ id: 'reports-operational', labelKey: 'nav.reportsOperational', href: 'reports.html?tier=operational', roles: ['case_manager', 'supervisor'] }
				]
			},
			{ id: 'custom-reports', labelKey: 'nav.customReports', href: 'custom-reports.html', roles: ['case_manager', 'supervisor'] }
		]
	};

	var NAV_TO_MODULE = {
		'referral-intake': 'cases',
		'case-search': 'cases',
		'case-creation': 'cases',
		'case-workspace': 'cases',
		'client-profile': 'cases',
		'client-registration': 'clients',
		'client-search': 'clients',
		'admin-duplicates': 'clients',
		'liaison-lookup': 'clients',
		'documents-hub': 'documents',
		'workflow-hub': 'workflow',
		dashboard: null,
		'services-hub': 'services',
		'bulk-enroll': 'services',
		reports: 'analytics',
		'standard-reports': 'analytics',
		'reports-executive': 'analytics',
		'reports-operational': 'analytics',
		'reports-integrity': 'analytics',
		'reports-caseload': 'analytics',
		'custom-reports': 'analytics',
		'report-builder': 'analytics',
		'audit-reports': 'analytics'
	};

	var NAV_ITEMS_FLAT = {};

	function translate(key) {
		return RM.I18n ? RM.I18n.t(key) : key;
	}

	function localizeItem(item) {
		if (!item) { return null; }
		var copy = Object.assign({}, item);
		if (copy.labelKey) {
			copy.label = translate(copy.labelKey);
		}
		if (copy.shortLabelKey) {
			copy.shortLabel = translate(copy.shortLabelKey);
		}
		if (copy.children) {
			copy.children = copy.children.map(localizeItem);
		}
		return copy;
	}

	function localizeModule(mod) {
		return Object.assign({}, mod, {
			label: translate(mod.labelKey),
			shortLabel: translate(mod.shortLabelKey || mod.labelKey)
		});
	}

	GLOBAL_NAV.forEach(function (item) {
		NAV_ITEMS_FLAT[item.id] = Object.assign({}, item);
	});

	Object.keys(NAV_BY_MODULE).forEach(function (moduleId) {
		NAV_BY_MODULE[moduleId].forEach(function (item) {
			NAV_ITEMS_FLAT[item.id] = Object.assign({ moduleId: moduleId }, item);
			if (item.children) {
				item.children.forEach(function (child) {
					NAV_ITEMS_FLAT[child.id] = Object.assign({ moduleId: moduleId, parentId: item.id }, child);
				});
			}
		});
	});

	NAV_ITEMS_FLAT['referral-intake'] = {
		id: 'referral-intake',
		labelKey: 'nav.referralIntake',
		href: 'referral-intake.html',
		moduleId: 'cases',
		roles: ['case_manager', 'supervisor'],
		hidden: true
	};

	function normalizeRole(role) {
		return RM.Permissions.normalizeRole(role);
	}

	function modulesForRole(role) {
		role = normalizeRole(role);
		if (role === 'cross_program_liaison') {
			return MODULES.filter(function (m) { return m.id === 'clients'; });
		}
		if (role === 'auditor') {
			return MODULES.filter(function (m) { return m.id === 'analytics'; });
		}
		return MODULES.filter(function (m) {
			return m.roles.indexOf(role) !== -1;
		});
	}

	function navItemsForModule(moduleId, role) {
		role = normalizeRole(role);
		var items = NAV_BY_MODULE[moduleId] || [];

		return items.filter(function (item) {
			return item.roles.indexOf(role) !== -1;
		}).map(function (item) {
			if (!item.children) { return item; }
			var children = item.children.filter(function (child) {
				return child.roles.indexOf(role) !== -1;
			});
			return Object.assign({}, item, { children: children });
		}).filter(function (item) {
			if (item.children) { return item.children.length > 0; }
			return true;
		});
	}

	function globalNavForRole(role) {
		role = normalizeRole(role);
		return GLOBAL_NAV.filter(function (item) {
			return item.roles.indexOf(role) !== -1;
		});
	}

	function resolveNavHref(item) {
		return item.href;
	}

	RM.Modules = {
		list: MODULES,

		resolveModule: function (navId) {
			if (Object.prototype.hasOwnProperty.call(NAV_TO_MODULE, navId)) {
				return NAV_TO_MODULE[navId];
			}
			return 'cases';
		},

		globalNavForUser: function (user) {
			if (!user) { return []; }
			return globalNavForRole(user.role).map(localizeItem);
		},

		navItem: function (navId) {
			return localizeItem(NAV_ITEMS_FLAT[navId] || null);
		},

		pageTitleForNav: function (navId) {
			var item = this.navItem(navId);
			return item ? item.label : '';
		},

		modulesForUser: function (user) {
			if (!user) { return []; }
			return modulesForRole(user.role).map(localizeModule);
		},

		navItemsForModule: function (moduleId, user) {
			if (!user) { return []; }
			return navItemsForModule(moduleId, user.role).map(localizeItem);
		},

		resolveNavHref: resolveNavHref,

		defaultModuleForUser: function (user) {
			var modules = this.modulesForUser(user);
			if (!modules.length) { return 'cases'; }
			var preferred = modules.find(function (m) { return m.id === 'cases'; });
			return preferred ? preferred.id : modules[0].id;
		},

		labelForModule: function (moduleId) {
			var mod = MODULES.find(function (m) { return m.id === moduleId; });
			return mod ? translate(mod.labelKey) : moduleId;
		}
	};
})();
