/* global RM */
(function () {
	'use strict';

	var FAB_ID = 'demo-autofill-fab';
	var mounted = false;

	function t(key, params) {
		return RM.I18n.t(key, params);
	}

	function fillIconSvg() {
		return '<svg class="demo-autofill-fab-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
			'<path fill="currentColor" d="M16.56 5.44l-2.83 2.83 2.83 2.83 1.41-1.41-1.42-1.42 1.42-1.41-1.41-1.42zm-9.9 9.9l-3.58 3.58c-.39.39-.39 1.02 0 1.41l1.41 1.41c.39.39 1.02.39 1.41 0l3.58-3.58-2.82-2.82zM19 11.5V8l-6-6-8.8 8.8c-.31.31-.5.73-.5 1.15V19c0 1.1.9 2 2 2h4.5c.67 0 1.31-.27 1.78-.76l6.02-6.02c.39-.39.39-1.02 0-1.41L19 11.5z"/>' +
			'</svg>';
	}

	function ensureFab() {
		var btn = document.getElementById(FAB_ID);
		if (btn) { return btn; }

		btn = document.createElement('button');
		btn.id = FAB_ID;
		btn.type = 'button';
		btn.className = 'demo-autofill-fab hidden';
		btn.innerHTML = fillIconSvg();
		btn.addEventListener('click', onClick);
		document.body.appendChild(btn);
		mounted = true;
		return btn;
	}

	function onClick() {
		if (!RM.Autofill || !RM.Autofill.fillCurrentPage) { return; }
		var result = RM.Autofill.fillCurrentPage();
		if (RM.Components && RM.Components.showToast) {
			RM.Components.showToast(result.message, result.ok ? 'success' : 'warning');
		}
	}

	function sync() {
		if (!RM.Autofill) { return; }
		var btn = ensureFab();
		var visible = RM.Autofill.canAutofillCurrentPage();
		btn.classList.toggle('hidden', !visible);
		btn.setAttribute('aria-label', t('demoAutofill.buttonLabel'));
		btn.title = t('demoAutofill.buttonLabel');
	}

	RM.AutofillFab = {
		mount: ensureFab,
		sync: sync
	};

	document.addEventListener('DOMContentLoaded', function () {
		if (RM.AutofillFab) {
			RM.AutofillFab.mount();
		}
	});
})();
