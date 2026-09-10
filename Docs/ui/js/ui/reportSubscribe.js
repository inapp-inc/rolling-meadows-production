/* global RM */
(function () {
	'use strict';

	var FREQUENCIES = ['daily', 'weekly', 'monthly'];

	function t(key, params) {
		return RM.I18n ? RM.I18n.t(key, params) : key;
	}

	function frequencyOptions(selected) {
		return FREQUENCIES.map(function (freq) {
			return '<option value="' + freq + '"' + (selected === freq ? ' selected' : '') + '>' +
				RM.Components.escapeHtml(t('pages.reports.subscribeFrequency.' + freq)) + '</option>';
		}).join('');
	}

	RM.ReportSubscribe = {
		FREQUENCIES: FREQUENCIES,

		openModal: function (options) {
			options = options || {};
			var user = RM.Session.getCurrentUser();
			if (!user) { return; }

			var reportKey = options.reportKey;
			var reportKind = options.reportKind || 'catalog';
			var reportLabel = options.reportLabel || reportKey;
			var existing = RM.ReportSubscriptionRepository
				? RM.ReportSubscriptionRepository.findByUserAndReport(user.id, reportKey, reportKind)
				: null;

			var body =
				'<p class="text-muted report-subscribe-lead">' +
				RM.Components.escapeHtml(t('pages.reports.subscribeLead', { report: reportLabel })) + '</p>' +
				'<div class="form-group">' +
				'<label for="report-subscribe-email">' + RM.Components.escapeHtml(t('pages.reports.subscribeEmail')) + '</label>' +
				'<input type="email" id="report-subscribe-email" value="' +
				RM.Components.escapeHtml(existing ? existing.email : (user.email || '')) + '"></div>' +
				'<div class="form-group">' +
				'<label for="report-subscribe-frequency">' + RM.Components.escapeHtml(t('pages.reports.subscribeFrequencyLabel')) + '</label>' +
				'<select id="report-subscribe-frequency">' +
				frequencyOptions(existing ? existing.frequency : 'weekly') +
				'</select></div>' +
				'<div class="modal-actions">' +
				'<button type="button" class="btn btn-secondary" id="report-subscribe-cancel">' +
				RM.Components.escapeHtml(t('common.cancel')) + '</button>' +
				'<button type="button" class="btn btn-primary" id="report-subscribe-save">' +
				RM.Components.escapeHtml(t('pages.reports.subscribeSave')) + '</button></div>';

			RM.Components.openModal(t('pages.reports.subscribeTitle'), body, null, { wide: false });

			var modal = RM.Components._activeModal;
			if (!modal) { return; }

			var root = modal.overlay.querySelector('.modal-body');
			root.querySelector('#report-subscribe-cancel').addEventListener('click', function () {
				RM.Components.closeModal();
			});
			root.querySelector('#report-subscribe-save').addEventListener('click', function () {
				var email = (root.querySelector('#report-subscribe-email') || {}).value || '';
				var frequency = (root.querySelector('#report-subscribe-frequency') || {}).value || 'weekly';
				email = email.trim();
				if (!email) {
					RM.Components.showToast(t('pages.reports.subscribeEmailRequired'), 'warning');
					return;
				}
				RM.ReportSubscriptionRepository.upsert({
					userId: user.id,
					reportKey: reportKey,
					reportKind: reportKind,
					reportLabel: reportLabel,
					email: email,
					frequency: frequency
				});
				RM.Components.closeModal();
				RM.Components.showToast(t('pages.reports.subscribeSaved'), 'success');
			});
		},

		wire: function (root) {
			if (!root) { return; }
			root.addEventListener('click', function (e) {
				var btn = e.target.closest('.report-subscribe-btn');
				if (!btn) { return; }
				e.preventDefault();
				RM.ReportSubscribe.openModal({
					reportKey: btn.getAttribute('data-report-key'),
					reportKind: btn.getAttribute('data-report-kind') || 'catalog',
					reportLabel: btn.getAttribute('data-report-label') || ''
				});
			});
		},

		subscribeButtonHtml: function (reportKey, reportKind, reportLabel) {
			if (!reportKey) { return ''; }
			return '<button type="button" class="btn btn-secondary btn-sm report-card-btn report-subscribe-btn" ' +
				'data-report-key="' + RM.Components.escapeHtml(reportKey) + '" ' +
				'data-report-kind="' + RM.Components.escapeHtml(reportKind || 'catalog') + '" ' +
				'data-report-label="' + RM.Components.escapeHtml(reportLabel || '') + '">' +
				RM.Components.escapeHtml(t('pages.reports.subscribe')) + '</button>';
		}
	};
})();
