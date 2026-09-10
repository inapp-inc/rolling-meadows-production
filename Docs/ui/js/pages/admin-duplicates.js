/* global RM */
(function () {
	'use strict';

	function t(key, params) {
		return RM.I18n.t(key, params);
	}

	var queuePairs = [];
	var queueListEl = null;
	var pageReady = false;

	var storeListenerBound = false;

	document.addEventListener('DOMContentLoaded', function () {
		RM.Boot.init({
			activeModule: 'clients',
			activeNav: 'admin-duplicates',
			onReady: function () {
				if (RM.Permissions.isAuditor()) {
					window.location.href = 'reports.html';
					return;
				}
				if (!RM.Permissions.can('mergeDuplicates')) {
					document.getElementById('page-content').innerHTML =
						RM.Components.alert('danger', t('pages.adminDuplicates.accessDenied'));
					return;
				}
				initPage();
				if (!storeListenerBound) {
					document.addEventListener('rm:store-changed', refreshQueueList);
					storeListenerBound = true;
				}
			}
		});
	});

	function initPage() {
		var main = document.getElementById('page-content');
		main.innerHTML =
			RM.Components.modulePageHeader('admin-duplicates') +
			'<div id="queue-list" class="dup-queue"></div>';

		queueListEl = document.getElementById('queue-list');
		pageReady = true;
		refreshQueueList();
	}

	function refreshQueueList() {
		if (!pageReady || !queueListEl) { return; }

		RM.Components.closeSideDrawer();
		RM.Components.closeModal();
		queuePairs = buildPairs();

		if (!queuePairs.length) {
			queueListEl.innerHTML = RM.Components.emptyState(
				t('pages.adminDuplicates.noDuplicates'),
				t('pages.adminDuplicates.noDuplicatesHint')
			);
			return;
		}

		renderPairList();
	}

	function pairKey(idA, idB) {
		return [idA, idB].sort().join('|');
	}

	function getDismissedPairKeys() {
		return RM.Store.getMeta('dismissedDuplicatePairs') || [];
	}

	function dismissPair(idA, idB) {
		var key = pairKey(idA, idB);
		var dismissed = getDismissedPairKeys();
		if (dismissed.indexOf(key) === -1) {
			dismissed.push(key);
			RM.Store.setMeta('dismissedDuplicatePairs', dismissed);
		}
	}

	function isPairDismissed(idA, idB) {
		return getDismissedPairKeys().indexOf(pairKey(idA, idB)) !== -1;
	}

	function buildPairs() {
		var clients = RM.ClientRepository.findAll();
		var pairs = [];

		clients.forEach(function (c, i) {
			clients.slice(i + 1).forEach(function (c2) {
				if (isPairDismissed(c.id, c2.id)) { return; }

				var matches = RM.DeduplicationService.check({ name: c.name, phone: c.phone, dob: c.dob }, null);
				var found = matches.find(function (m) { return m.client.id === c2.id && m.score >= 25; });
				if (found) {
					pairs.push({ a: c, b: c2, fields: found.matchedFields });
				}
			});
		});

		return pairs;
	}

	function renderPairList() {
		queueListEl.innerHTML = queuePairs.map(function (p, idx) {
			return renderPairCard(p, idx);
		}).join('');

		queueListEl.querySelectorAll('[data-compare-pair]').forEach(function (btn) {
			btn.addEventListener('click', function () {
				var idx = parseInt(btn.getAttribute('data-compare-pair'), 10);
				openCompareModal(queuePairs[idx], idx);
			});
		});
	}

	function formatMatchedFields(fields) {
		if (!fields.length) { return t('pages.adminDuplicates.similarDetails'); }
		return fields.map(function (f) {
			if (f === 'dob') { return t('pages.adminDuplicates.dateOfBirth'); }
			return f;
		}).join(', ');
	}

	function renderPairCard(pair, idx) {
		return '<article class="card dup-pair-card" data-pair-index="' + idx + '">' +
			'<div class="dup-pair-header">' +
			'<div><h2 class="dup-pair-title">' + RM.Components.escapeHtml(pair.a.name) + ' / ' + RM.Components.escapeHtml(pair.b.name) + '</h2>' +
			'<p class="dup-pair-meta">' + RM.Components.escapeHtml(t('pages.adminDuplicates.matchedOn')) + ' ' + RM.Components.escapeHtml(formatMatchedFields(pair.fields)) + '</p></div>' +
			'<button type="button" class="btn btn-secondary btn-sm" data-compare-pair="' + idx + '">' + RM.Components.escapeHtml(t('pages.adminDuplicates.compareRecords')) + '</button></div>' +
			'</article>';
	}

	function openCompareModal(pair, idx) {
		var modalBody =
			'<p class="dup-pair-meta">' + RM.Components.escapeHtml(t('pages.adminDuplicates.matchedOn')) + ' ' + RM.Components.escapeHtml(formatMatchedFields(pair.fields)) + '</p>' +
			'<div class="dup-compare-columns dup-compare-modal" data-pair-index="' + idx + '">' +
			renderCompareColumn(pair.a, pair, 'a', true, idx) +
			renderCompareColumn(pair.b, pair, 'b', true, idx) +
			'</div>' +
			'<div class="dup-modal-actions">' +
			'<button type="button" class="btn btn-primary" id="dup-modal-merge">' + RM.Components.escapeHtml(t('pages.adminDuplicates.mergeRecords')) + '</button>' +
			'<button type="button" class="btn btn-secondary" id="dup-modal-dismiss">' + RM.Components.escapeHtml(t('pages.adminDuplicates.dismissMatch')) + '</button>' +
			'</div>';

		RM.Components.openModal(pair.a.name + ' / ' + pair.b.name, modalBody, null, { wide: true });

		var modal = RM.Components._activeModal;
		if (!modal) { return; }

		var root = modal.overlay.querySelector('.modal-body');
		if (!root) { return; }

		root.querySelectorAll('.dup-column-selectable').forEach(function (col) {
			col.addEventListener('click', function (e) {
				if (e.target.tagName === 'INPUT') { return; }
				var radio = col.querySelector('input[type="radio"]');
				if (radio) { radio.checked = true; }
				updateKeepSelection(root.querySelector('.dup-compare-columns'));
			});
		});

		root.querySelectorAll('input[name^="dup-keep-"]').forEach(function (radio) {
			radio.addEventListener('change', function () {
				updateKeepSelection(root.querySelector('.dup-compare-columns'));
			});
		});

		updateKeepSelection(root.querySelector('.dup-compare-columns'));

		root.querySelector('#dup-modal-merge').addEventListener('click', function () {
			mergePair(pair, idx, root);
		});

		root.querySelector('#dup-modal-dismiss').addEventListener('click', function () {
			dismissPair(pair.a.id, pair.b.id);
			RM.Components.showToast(t('pages.adminDuplicates.dismissSuccess'), 'success');
			RM.Components.closeModal();
			refreshQueueList();
		});
	}

	function renderCompareColumn(client, pair, side, selectable, pairIndex) {
		var snapshot = getClientSnapshot(client);
		var selected = side === 'a' ? ' checked' : '';
		var radioName = 'dup-keep-' + pairIndex;
		var selectHtml = selectable
			? '<label class="dup-keep-choice">' +
				'<input type="radio" name="' + radioName + '" value="' + side + '"' + selected + '>' +
				'<span>' + RM.Components.escapeHtml(t('pages.adminDuplicates.keepThisRecord')) + '</span></label>'
			: '';

		return '<div class="dup-column' + (selectable ? ' dup-column-selectable' : '') + '" data-side="' + side + '">' +
			selectHtml +
			'<div class="dup-column-head">' +
			'<span class="dup-column-label">' + RM.Components.escapeHtml(t('pages.adminDuplicates.recordLabel', { side: side.toUpperCase() })) + '</span>' +
			RM.Components.workflowStageBadge(client) +
			(client.incompleteIntake ? '<span class="incomplete-badge">' + RM.Components.escapeHtml(t('components.incompleteIntake')) + '</span>' : '') +
			'</div>' +
			renderField(t('pages.adminDuplicates.fieldName'), client.name, pair.fields.indexOf('name') !== -1) +
			renderField(t('pages.adminDuplicates.fieldDob'), RM.Components.formatDate(client.dob), pair.fields.indexOf('dob') !== -1) +
			renderField(t('pages.adminDuplicates.fieldPhone'), client.phone, pair.fields.indexOf('phone') !== -1) +
			renderField(t('pages.adminDuplicates.fieldAddress'), client.address, false) +
			renderField(t('pages.adminDuplicates.fieldCategory'), RM.Components.caseCategoryLabel(client), false) +
			renderField(t('pages.adminDuplicates.fieldReferral'), snapshot.referralSummary, false) +
			renderField(t('pages.adminDuplicates.fieldIntake'), snapshot.intakeSummary, false) +
			renderField(t('pages.adminDuplicates.fieldRisk'), snapshot.riskSummary, false) +
			(selectable ? renderField(t('pages.adminDuplicates.fieldNotes'), t('pages.adminDuplicates.notesLogged', { count: snapshot.noteCount }), false) : '') +
			'</div>';
	}

	function renderField(label, value, isMatch) {
		return '<div class="dup-field' + (isMatch ? ' dup-field-match' : '') + '">' +
			'<span class="dup-field-label">' + RM.Components.escapeHtml(label) + '</span>' +
			'<span class="dup-field-value">' + RM.Components.escapeHtml(value || '—') + '</span></div>';
	}

	function getClientSnapshot(client) {
		var referral = RM.ReferralRepository.findByClientId(client.id)[0];
		var intake = RM.IntakeRepository.findByClientId(client.id);
		var assessment = RM.RiskAssessmentRepository.findLatest(client.id);
		var notes = RM.CaseNoteRepository.findByClientId(client.id);

		return {
			referralSummary: referral
				? RM.I18n.referralSourceLabel(referral.source) + ' · ' + RM.Components.formatDate(referral.dateReceived)
				: t('pages.adminDuplicates.noReferral'),
			intakeSummary: intake
				? RM.I18n.intakeCompletenessLabel(intake.completeness || 'unknown') + (intake.consentOnFile ? ' · ' + t('pages.adminDuplicates.consentOnFile') : ' · ' + t('pages.adminDuplicates.consentMissing'))
				: t('pages.adminDuplicates.noIntake'),
			riskSummary: assessment ? RM.I18n.riskLabel(assessment.overallRisk) + ' (' + RM.Components.formatDate(assessment.date) + ')' : t('pages.adminDuplicates.notAssessed'),
			noteCount: notes.length
		};
	}

	function mergePair(pair, pairIndex, root) {
		var keepSide = root.querySelector('input[name="dup-keep-' + pairIndex + '"]:checked');
		if (!keepSide) { return; }
		var keepClient = keepSide.value === 'a' ? pair.a : pair.b;
		var removeClient = keepSide.value === 'a' ? pair.b : pair.a;
		if (!window.confirm(t('pages.adminDuplicates.mergeConfirm', {
			remove: removeClient.name,
			keep: keepClient.name
		}))) { return; }

		RM.ClientService.mergeInto(keepClient.id, removeClient.id);
		RM.Components.showToast(t('pages.adminDuplicates.mergeSuccess', { name: keepClient.name }), 'success');
		RM.Components.closeModal();
		refreshQueueList();
	}

	function updateKeepSelection(container) {
		if (!container) { return; }
		container.querySelectorAll('.dup-column-selectable').forEach(function (col) {
			var radio = col.querySelector('input[type="radio"]');
			col.classList.toggle('dup-column-keep', !!(radio && radio.checked));
		});
	}
})();
