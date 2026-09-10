/* global RM */
(function () {
	'use strict';

	var MODULE_ICONS = {
		workflow: '<svg class="module-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
		clients: '<svg class="module-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></svg>',
		cases: '<svg class="module-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>',
		documents: '<svg class="module-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M13 2v7h7"/></svg>',
		services: '<svg class="module-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
		analytics: '<svg class="module-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>'
	};

	var CHEVRON = '<svg class="sidebar-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg>';
	var STORAGE_KEY = 'rm.sidebar.expandedModules';
	var _notificationsWired = false;

	function userDisplayLabel(user) {
		return RM.Permissions.formatRoleLabel(user.role);
	}

	function getExpandedModules(activeModuleId) {
		var stored = [];
		try {
			var raw = window.sessionStorage.getItem(STORAGE_KEY);
			if (raw) { stored = JSON.parse(raw); }
		} catch (e) { stored = []; }
		if (!Array.isArray(stored)) { stored = []; }
		if (activeModuleId && stored.indexOf(activeModuleId) === -1) {
			stored.push(activeModuleId);
		}
		if (!stored.length && activeModuleId) {
			stored = [activeModuleId];
		}
		return stored;
	}

	function saveExpandedModules(moduleIds) {
		try {
			window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(moduleIds));
		} catch (e) { /* ignore */ }
	}

	function renderNotificationMarkup(user) {
		var notificationsLabel = RM.I18n.t('shell.notifications');
		if (!user || !RM.NotificationService) {
			return '<button type="button" class="notification-bell" title="' + RM.Components.escapeHtml(notificationsLabel) +
				'" aria-label="' + RM.Components.escapeHtml(notificationsLabel) + '">' +
				RM.Components.icon('bell') + '</button>';
		}
		var count = RM.NotificationService.countForUser(user);
		return '<div class="notification-wrap">' +
			'<button type="button" class="notification-bell" id="btn-notifications" title="' +
			RM.Components.escapeHtml(notificationsLabel) + '" aria-label="' +
			RM.Components.escapeHtml(notificationsLabel) + '" aria-expanded="false">' +
			RM.Components.icon('bell') +
			(count ? '<span class="notification-count">' + count + '</span>' : '') +
			'</button>' +
			'<div class="notification-dropdown hidden" id="notification-dropdown" role="menu"></div></div>';
	}

	function refreshNotificationDropdown() {
		var dropdown = document.getElementById('notification-dropdown');
		var bell = document.getElementById('btn-notifications');
		if (!dropdown || !bell || !RM.NotificationService) { return; }

		var user = RM.Session.getCurrentUser();
		var items = RM.NotificationService.getForUser(user);
		var countEl = bell.querySelector('.notification-count');

		if (countEl) {
			if (items.length) {
				countEl.textContent = String(items.length);
			} else {
				countEl.parentNode.removeChild(countEl);
			}
		} else if (items.length) {
			var badge = document.createElement('span');
			badge.className = 'notification-count';
			badge.textContent = String(items.length);
			bell.appendChild(badge);
		}

		if (!items.length) {
			dropdown.innerHTML = '<div class="notification-empty">' + RM.Components.escapeHtml(RM.I18n.t('shell.noAlerts')) + '</div>';
			return;
		}

		dropdown.innerHTML = items.map(function (item) {
			return '<a class="notification-item" href="' + RM.Components.escapeHtml(item.href) + '" role="menuitem">' +
				'<span class="notification-item-title">' + RM.Components.escapeHtml(item.title) + '</span>' +
				'<span class="notification-item-body">' + RM.Components.escapeHtml(item.body) + '</span></a>';
		}).join('');
	}

	function wireNotifications() {
		var bell = document.getElementById('btn-notifications');
		var dropdown = document.getElementById('notification-dropdown');
		if (!bell || !dropdown) { return; }

		refreshNotificationDropdown();

		bell.addEventListener('click', function (e) {
			e.stopPropagation();
			var open = !dropdown.classList.contains('hidden');
			dropdown.classList.toggle('hidden', open);
			bell.setAttribute('aria-expanded', open ? 'false' : 'true');
		});

		document.addEventListener('click', function (e) {
			if (!dropdown.classList.contains('hidden') && !e.target.closest('.notification-wrap')) {
				dropdown.classList.add('hidden');
				bell.setAttribute('aria-expanded', 'false');
			}
		});

		if (!_notificationsWired) {
			document.addEventListener('rm:store-changed', refreshNotificationDropdown);
			_notificationsWired = true;
		}
	}

	function renderSidebarNavLink(item, activeNavId) {
		var isActive = activeNavId === item.id;
		var href = RM.Modules.resolveNavHref(item);
		return '<li class="' + (isActive ? 'active' : '') + '">' +
			'<a href="' + RM.Components.escapeHtml(href) + '">' +
			RM.Components.escapeHtml(item.label) +
			'</a></li>';
	}

	function renderSidebarNavItem(item, activeNavId) {
		if (item.children && item.children.length) {
			var childActive = item.children.some(function (child) { return child.id === activeNavId; });
			var subNav = item.children.map(function (child) {
				return renderSidebarNavLink(child, activeNavId);
			}).join('');
			return '<li class="sidebar-nav-group' + (childActive ? ' is-active-group is-expanded' : '') + '">' +
				'<button type="button" class="sidebar-nav-group-trigger" aria-expanded="' + (childActive ? 'true' : 'false') + '">' +
				'<span class="sidebar-nav-group-label">' + RM.Components.escapeHtml(item.label) + '</span>' +
				CHEVRON +
				'</button>' +
				'<ul class="sidebar-nav-sublist">' + subNav + '</ul></li>';
		}
		return renderSidebarNavLink(item, activeNavId);
	}

	function buildGlobalNav(activeNavId, user) {
		if (!RM.Modules || !RM.Modules.globalNavForUser) { return ''; }
		var items = RM.Modules.globalNavForUser(user);
		if (!items.length) { return ''; }

		var links = items.map(function (item) {
			var isActive = activeNavId === item.id;
			var href = RM.Modules.resolveNavHref(item);
			return '<li class="' + (isActive ? 'active' : '') + '">' +
				'<a href="' + RM.Components.escapeHtml(href) + '">' +
				RM.Components.escapeHtml(item.label) +
				'</a></li>';
		}).join('');

		return '<div class="sidebar-global-nav" aria-label="' + RM.Components.escapeHtml(RM.I18n.t('shell.homeAria')) + '">' +
			'<ul class="sidebar-global-list">' + links + '</ul></div>';
	}

	function buildModuleNav(activeModuleId, activeNavId, user) {
		var modules = RM.Modules.modulesForUser(user);
		var resolvedModule = RM.Modules.resolveModule(activeNavId);
		if (resolvedModule && (!activeModuleId || modules.every(function (m) { return m.id !== activeModuleId; }))) {
			activeModuleId = resolvedModule;
		} else if (!resolvedModule) {
			activeModuleId = null;
		}

		var expandedModules = getExpandedModules(activeModuleId);

		var sections = modules.map(function (mod) {
			var isExpanded = expandedModules.indexOf(mod.id) !== -1;
			var hasActivePage = mod.id === activeModuleId;
			var icon = MODULE_ICONS[mod.id] || MODULE_ICONS.workflow;
			var items = RM.Modules.navItemsForModule(mod.id, user);

			if (!items.length) { return ''; }

			var subNav = items.map(function (item) {
				return renderSidebarNavItem(item, activeNavId);
			}).join('');

			return '<div class="sidebar-section' + (isExpanded ? ' is-expanded' : '') + (hasActivePage ? ' is-current-module' : '') + '" data-module="' + RM.Components.escapeHtml(mod.id) + '">' +
				'<button type="button" class="sidebar-section-trigger" aria-expanded="' + isExpanded + '" aria-controls="sidebar-panel-' + mod.id + '">' +
				icon +
				'<span class="sidebar-section-title">' + RM.Components.escapeHtml(mod.label) + '</span>' +
				CHEVRON +
				'</button>' +
				'<ul class="sidebar-section-panel" id="sidebar-panel-' + mod.id + '">' + subNav + '</ul></div>';
		}).join('');

		return '<div class="sidebar-nav">' +
			'<div class="sidebar-nav-heading">' + RM.Components.escapeHtml(RM.I18n.t('shell.modulesHeading')) + '</div>' +
			sections +
			'</div>';
	}

	function wireSidebarAccordion(activeModuleId) {
		var nav = document.querySelector('.sidebar-nav');
		if (!nav) { return; }

		nav.querySelectorAll('.sidebar-nav-group-trigger').forEach(function (trigger) {
			trigger.addEventListener('click', function () {
				var group = trigger.closest('.sidebar-nav-group');
				if (!group) { return; }
				var willExpand = !group.classList.contains('is-expanded');
				group.classList.toggle('is-expanded', willExpand);
				trigger.setAttribute('aria-expanded', willExpand ? 'true' : 'false');
			});
		});

		nav.querySelectorAll('.sidebar-section-trigger').forEach(function (trigger) {
			trigger.addEventListener('click', function () {
				var section = trigger.closest('.sidebar-section');
				if (!section) { return; }
				var moduleId = section.getAttribute('data-module');
				var willExpand = !section.classList.contains('is-expanded');

				nav.querySelectorAll('.sidebar-section').forEach(function (other) {
					other.classList.remove('is-expanded');
					var btn = other.querySelector('.sidebar-section-trigger');
					if (btn) { btn.setAttribute('aria-expanded', 'false'); }
				});

				if (willExpand) {
					section.classList.add('is-expanded');
					trigger.setAttribute('aria-expanded', 'true');
					saveExpandedModules([moduleId]);
				} else {
					trigger.setAttribute('aria-expanded', 'false');
					saveExpandedModules([]);
				}
			});
		});
	}

	RM.Shell = {
		render: function (activeNavId, activeModuleId) {
			var shell = document.getElementById('app-shell');
			if (!shell) { return; }

			var main = document.getElementById('page-content');
			if (main && shell.contains(main)) {
				shell.parentNode.insertBefore(main, shell.nextSibling);
			}

			var user = RM.Session.getCurrentUser();
			if (!activeModuleId && RM.Modules) {
				activeModuleId = RM.Modules.resolveModule(activeNavId);
			}

			var moduleNavHtml = RM.Modules ? buildGlobalNav(activeNavId, user) + buildModuleNav(activeModuleId, activeNavId, user) : '';

			var resetBtn = RM.Permissions.can('resetDemo')
				? '<button type="button" id="btn-reset-demo" class="btn btn-sm btn-ghost">' +
					RM.Components.escapeHtml(RM.I18n.t('shell.resetDemo')) + '</button>'
				: '';

			shell.innerHTML =
				'<header class="top-bar">' +
				'<div class="top-bar-left">' +
				'<div class="rm-logo-wrap">' +
				'<img src="assets/rmeadows-logo.png" alt="City of Rolling Meadows" class="rm-logo">' +
				'</div></div>' +
				'<div class="top-bar-right">' +
				'<div class="demo-by-inapp" title="' + RM.Components.escapeHtml(RM.I18n.t('shell.demoByInAppTitle')) + '">' +
				'<span class="demo-by-label">' + RM.Components.escapeHtml(RM.I18n.t('shell.demoBy')) + '</span>' +
				'<img src="assets/inapp-logo.webp" alt="InApp" class="inapp-logo">' +
				'</div>' +
				RM.I18n.renderSwitcher() +
				renderNotificationMarkup(user) +
				(user ? '<div class="user-badge">' +
					'<span class="user-avatar" aria-hidden="true">' + RM.Permissions.roleInitials(user.role) + '</span>' +
					'<span class="user-info">' +
					'<span class="user-name">' + RM.Components.escapeHtml(userDisplayLabel(user)) + '</span>' +
					'<span class="user-role">' + RM.Components.escapeHtml(RM.I18n.t('shell.demoSession')) + '</span>' +
					'</span></div>' : '') +
				resetBtn +
				'<button type="button" id="btn-sign-out" class="btn btn-sm btn-ghost">' +
				RM.Components.escapeHtml(RM.I18n.t('shell.signOut')) + '</button>' +
				'</div></header>' +
				'<div class="app-body">' +
				'<nav class="left-nav module-sidebar" aria-label="' + RM.Components.escapeHtml(RM.I18n.t('shell.moduleNavAria')) + '">' +
				moduleNavHtml +
				'<div class="nav-footer">' + RM.Components.escapeHtml(RM.I18n.t('shell.navFooter')) + '<br>' +
				RM.Components.escapeHtml(RM.I18n.t('shell.navFooterCopy')) + '</div>' +
				'</nav>' +
				'<div class="main-wrapper"></div></div>';

			var wrapper = shell.querySelector('.main-wrapper');
			if (main && wrapper) {
				wrapper.appendChild(main);
			}

			document.getElementById('btn-sign-out').addEventListener('click', function () {
				RM.Session.signOut();
			});
			var reset = document.getElementById('btn-reset-demo');
			if (reset) {
				reset.addEventListener('click', function () {
					if (window.confirm(RM.I18n.t('shell.resetConfirm'))) {
						RM.Session.resetDemo();
					}
				});
			}

			RM.I18n.wireSwitcher();
			wireSidebarAccordion(activeModuleId);
			wireNotifications();
		}
	};
})();
