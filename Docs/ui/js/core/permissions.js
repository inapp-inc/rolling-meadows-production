/* global RM */
(function () {
	'use strict';

	var RM = window.RM = window.RM || {};

	var LEGACY_SUPERVISOR_ROLES = ['program_supervisor', 'department_admin', 'system_admin'];

	var ROLE_LABELS = {
		case_manager: 'Case Manager',
		supervisor: 'Supervisor / Dept Admin',
		cross_program_liaison: 'Cross-Program Liaison',
		auditor: 'Auditor'
	};

	var ROLE_INITIALS = {
		case_manager: 'CM',
		supervisor: 'SD',
		cross_program_liaison: 'CL',
		auditor: 'AU'
	};

	var NAV_ITEMS = [
		{ id: 'dashboard', labelKey: 'nav.dashboard', href: 'dashboard.html', roles: ['case_manager', 'supervisor'] },
		{ id: 'clients', labelKey: 'nav.clientSearch', href: 'client-search.html', roles: ['case_manager', 'supervisor'] },
		{ id: 'case-creation', labelKey: 'nav.caseCreation', href: 'case-creation.html', roles: ['case_manager', 'supervisor'] },
		{ id: 'reports', labelKey: 'nav.reports', href: 'reports.html', roles: ['case_manager', 'supervisor', 'auditor'] },
		{ id: 'admin', labelKey: 'nav.adminDuplicates', href: 'admin-duplicates.html', roles: ['supervisor'] }
	];

	var PERMISSIONS = {
		case_manager: {
			viewCaseDetail: true,
			voidOwn: true,
			bulkEnroll: true,
			resetDemo: false,
			viewCrossProgramFlag: true
		},
		supervisor: {
			viewCaseDetail: true,
			voidOwn: true,
			voidAny: true,
			bulkEnroll: true,
			resetDemo: true,
			mergeDuplicates: true,
			viewCrossProgramFlag: true
		},
		cross_program_liaison: {
			viewCaseDetail: false,
			viewCrossProgramFlag: true,
			resetDemo: false
		},
		auditor: {
			viewCaseDetail: false,
			viewAggregateReports: true,
			readOnly: true,
			viewCrossProgramFlag: false,
			resetDemo: false
		}
	};

	function normalizeRole(role) {
		if (LEGACY_SUPERVISOR_ROLES.indexOf(role) !== -1) {
			return 'supervisor';
		}
		return role;
	}

	RM.Permissions = {
		normalizeRole: normalizeRole,

		formatRoleLabel: function (role) {
			role = normalizeRole(role);
			if (RM.I18n) {
				var key = 'role.' + role;
				var translated = RM.I18n.t(key);
				if (translated !== key) {
					return translated;
				}
			}
			return ROLE_LABELS[role] || (role || '').replace(/_/g, ' ');
		},

		roleInitials: function (role) {
			return ROLE_INITIALS[normalizeRole(role)] || 'U';
		},

		getNavItems: function () {
			var user = RM.Session.getCurrentUser();
			if (!user) {
				return [];
			}
			var role = normalizeRole(user.role);
			if (role === 'cross_program_liaison') {
				return [{
					id: 'liaison',
					labelKey: 'nav.liaisonLookup',
					label: RM.I18n.t('nav.liaisonLookup'),
					href: 'liaison-lookup.html',
					roles: ['cross_program_liaison']
				}];
			}
			if (role === 'auditor') {
				return [{
					id: 'reports',
					labelKey: 'nav.auditReports',
					label: RM.I18n.t('nav.auditReports'),
					href: 'reports.html',
					roles: ['auditor']
				}];
			}
			return NAV_ITEMS.filter(function (item) {
				return item.roles.indexOf(role) !== -1;
			}).map(function (item) {
				return Object.assign({}, item, {
					label: item.labelKey && RM.I18n ? RM.I18n.t(item.labelKey) : item.label
				});
			});
		},

		can: function (action) {
			var user = RM.Session.getCurrentUser();
			if (!user) {
				return false;
			}
			var perms = PERMISSIONS[normalizeRole(user.role)] || {};
			return !!perms[action];
		},

		isReadOnly: function () {
			var user = RM.Session.getCurrentUser();
			return user && normalizeRole(user.role) === 'auditor';
		},

		canViewCaseDetail: function () {
			return this.can('viewCaseDetail');
		},

		isLiaison: function () {
			var user = RM.Session.getCurrentUser();
			return user && normalizeRole(user.role) === 'cross_program_liaison';
		},

		isAuditor: function () {
			var user = RM.Session.getCurrentUser();
			return user && normalizeRole(user.role) === 'auditor';
		}
	};
})();
