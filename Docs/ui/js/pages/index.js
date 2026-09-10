/* global RM */
(function () {
	'use strict';

	function roleOptionLabel(opt) {
		if (opt.userId === 'usr-auditor') {
			return RM.I18n.t('role.auditorSignIn');
		}
		var user = RM.UserRepository.findById(opt.userId);
		return user ? RM.Permissions.formatRoleLabel(user.role) : opt.label;
	}

	function populateRoles() {
		var select = document.getElementById('role-select');
		if (!select) { return; }
		var current = select.value;
		select.innerHTML = '';
		RM.Seed.ROLE_OPTIONS.forEach(function (opt) {
			var el = document.createElement('option');
			el.value = opt.userId;
			el.textContent = roleOptionLabel(opt);
			select.appendChild(el);
		});
		if (current) {
			select.value = current;
		}
	}

	function showSignInError(message) {
		var el = document.getElementById('sign-in-error');
		if (!el) { return; }
		el.textContent = message || '';
		el.classList.toggle('hidden', !message);
	}

	function applySignInLocale() {
		document.title = RM.I18n.t('signIn.pageTitle');
		document.getElementById('sign-in-title').textContent = RM.I18n.t('signIn.title');
		document.getElementById('sign-in-subtitle').textContent = RM.I18n.t('signIn.subtitle');
		document.getElementById('sign-in-role-label').textContent = RM.I18n.t('signIn.roleLabel');
		document.getElementById('sign-in-continue').textContent = RM.I18n.t('signIn.continue');
		document.getElementById('sign-in-demo-by').textContent = RM.I18n.t('shell.demoBy');
		document.getElementById('sign-in-hero').setAttribute('aria-label', RM.I18n.t('signIn.welcomeAria'));
		document.getElementById('sign-in-locale-wrap').innerHTML = RM.I18n.renderSwitcher();
		populateRoles();
		showSignInError('');
	}

	document.addEventListener('DOMContentLoaded', function () {
		if (!RM.I18n) {
			console.error('RM.I18n failed to load. Use index.src.html for local development, or re-run npm run encrypt-login.');
			return;
		}
		RM.I18n.init();
		RM.Seed.ensureLoaded();
		applySignInLocale();
		if (!RM.UserRepository.findById('usr-case-manager')) {
			console.error('Sign-in seed data did not load. Check the browser console for missing script errors.');
			showSignInError(RM.I18n.t('signIn.seedError'));
		}
		document.addEventListener('rm:locale-changed', applySignInLocale);

		document.getElementById('sign-in-form').addEventListener('submit', function (e) {
			e.preventDefault();
			showSignInError('');
			var select = document.getElementById('role-select');
			var user = RM.UserRepository.findById(select.value);
			if (user) {
				RM.Session.setCurrentUser(user);
				if (RM.Permissions.normalizeRole(user.role) === 'cross_program_liaison') {
					window.location.href = 'liaison-lookup.html';
				} else if (RM.Permissions.normalizeRole(user.role) === 'auditor') {
					window.location.href = 'reports.html';
				} else {
					window.location.href = 'case-creation.html';
				}
				return;
			}
			showSignInError(RM.I18n.t('signIn.userMissing'));
		});
	});
})();
