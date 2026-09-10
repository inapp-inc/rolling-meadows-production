/* global RM */
(function () {
	'use strict';

	var _lastBootOptions = null;
	var _localeListenerBound = false;

	function rerenderForLocale() {
		if (!_lastBootOptions) { return; }
		if (RM.Components) {
			RM.Components.closeSideDrawer();
			RM.Components.closeModal();
		}
		var options = _lastBootOptions;
		if (options.activeNav && RM.Shell) {
			var moduleId = options.activeModule || (RM.Modules ? RM.Modules.resolveModule(options.activeNav) : null);
			RM.Shell.render(options.activeNav, moduleId);
			if (RM.I18n.setPageTitle) {
				RM.I18n.setPageTitle(options.activeNav);
			}
		}
		if (options.onReady && typeof options.onReady === 'function') {
			options.onReady();
		}
		if (options.stepperPage && RM.Stepper) {
			RM.Stepper.render('workflow-stepper', options.stepperPage);
		}
		if (RM.I18n) {
			RM.I18n.applyPageTranslations(document.getElementById('page-content'));
		}
		if (RM.AutofillFab) {
			RM.AutofillFab.sync();
		}
	}

	RM.Boot = {
		init: function (options) {
			options = options || {};
			_lastBootOptions = options;

			if (RM.I18n) {
				RM.I18n.init();
			}

			if (!_localeListenerBound) {
				document.addEventListener('rm:locale-changed', rerenderForLocale);
				_localeListenerBound = true;
			}

			if (options.requireAuth !== false && !RM.Session.isAuthenticated()) {
				if (RM.Navigate) {
					RM.Navigate.toSignIn();
				} else {
					window.location.href = 'index.src.html';
				}
				return;
			}

			document.documentElement.classList.remove('auth-pending');
			RM.Seed.ensureLoaded();

			if (options.activeNav) {
				var moduleId = options.activeModule || (RM.Modules ? RM.Modules.resolveModule(options.activeNav) : null);
				RM.Shell.render(options.activeNav, moduleId);
				if (RM.I18n.setPageTitle) {
					RM.I18n.setPageTitle(options.activeNav);
				}
			}

			if (options.onReady && typeof options.onReady === 'function') {
				options.onReady();
			}

			if (RM.I18n) {
				RM.I18n.applyPageTranslations(document.getElementById('page-content'));
			}

			if (options.stepperPage) {
				RM.Stepper.render('workflow-stepper', options.stepperPage);
			}

			if (RM.AutofillFab) {
				RM.AutofillFab.sync();
			}
		}
	};
})();
