/* global RM */
(function () {
	'use strict';

	var SUPPORTED = ['en', 'es'];
	var LOCALE_META = {
		en: { label: 'EN', flag: '\uD83C\uDDFA\uD83C\uDDF8' },
		es: { label: 'ES', flag: '\uD83C\uDDEA\uD83C\uDDF8' }
	};
	var _locale = 'en';
	var _messages = {};
	var _switcherWired = false;

	function lookup(messages, key) {
		var parts = key.split('.');
		var val = messages;
		var i;
		for (i = 0; i < parts.length; i++) {
			if (!val || typeof val !== 'object' || !Object.prototype.hasOwnProperty.call(val, parts[i])) {
				return null;
			}
			val = val[parts[i]];
		}
		return typeof val === 'string' ? val : null;
	}

	function detectDefaultLocale() {
		var stored = RM.Store && RM.Store.getMeta('locale');
		if (stored && SUPPORTED.indexOf(stored) !== -1) {
			return stored;
		}
		var browser = (navigator.language || navigator.userLanguage || 'en').slice(0, 2).toLowerCase();
		return SUPPORTED.indexOf(browser) !== -1 ? browser : 'en';
	}

	function shouldSkipNode(node) {
		if (!node || !node.parentElement) { return true; }
		if (node.parentElement.closest('[data-i18n-skip], script, style, noscript, svg, .locale-switcher')) {
			return true;
		}
		var tag = node.parentElement.tagName;
		return tag === 'SCRIPT' || tag === 'STYLE';
	}

	function getFallbackMap() {
		var map = _messages.fallback;
		if (!map || typeof map !== 'object') { return null; }
		return map;
	}

	RM.I18n = {
		SUPPORTED: SUPPORTED,
		LOCALE_META: LOCALE_META,

		init: function () {
			this.setLocale(detectDefaultLocale(), true);
			this.wireSwitcher();
		},

		getLocale: function () {
			return _locale;
		},

		setLocale: function (locale, silent) {
			if (SUPPORTED.indexOf(locale) === -1) {
				locale = 'en';
			}
			_locale = locale;
			_messages = (window.RM._LOCALES && window.RM._LOCALES[locale]) || {};
			if (RM.Store) {
				RM.Store.setMeta('locale', locale);
			}
			document.documentElement.lang = locale;
			if (!silent) {
				document.dispatchEvent(new CustomEvent('rm:locale-changed'));
			}
		},

		t: function (key, params) {
			var val = lookup(_messages, key);
			if (val == null && _locale !== 'en') {
				val = lookup(window.RM._LOCALES && window.RM._LOCALES.en, key);
			}
			if (val == null) {
				val = key;
			}
			if (params) {
				Object.keys(params).forEach(function (name) {
					val = val.replace(new RegExp('\\{' + name + '\\}', 'g'), params[name]);
				});
			}
			return val;
		},

		tOr: function (key, fallback) {
			var val = this.t(key);
			return val === key ? fallback : val;
		},

		riskLabel: function (level) {
			if (!level) { return this.t('risk.Unknown'); }
			return this.tOr('risk.' + level, level);
		},

		stepStatusLabel: function (status) {
			if (!status) { return ''; }
			return this.tOr('stepStatus.' + status, String(status).replace(/_/g, ' '));
		},

		enumLabel: function (category, value) {
			if (value == null || value === '') { return value; }
			return this.tOr('enums.' + category + '.' + value, value);
		},

		picklistLabel: function (category, value) {
			if (value == null || value === '') { return value; }
			return this.tOr('picklists.' + category + '.' + value, value);
		},

		formsMessages: function () {
			var forms = _messages && _messages.forms;
			if (!forms && _locale !== 'en') {
				var en = window.RM._LOCALES && window.RM._LOCALES.en;
				forms = en && en.forms;
			}
			return forms || {};
		},

		familyFormConfig: function (family) {
			var forms = this.formsMessages();
			var base = forms.base || {};
			var families = forms.families || {};
			var general = families.general || {};
			var familyCfg = families[family] || general;
			var merged = Object.assign({}, base, familyCfg);
			var labelKeys = [
				'referralSectionTitle', 'intakeSectionTitle', 'screeningSectionTitle',
				'livingLabel', 'backgroundLabel'
			];
			labelKeys.forEach(function (key) {
				if (!merged[key] && base[key]) {
					merged[key] = base[key];
				}
			});
			var picklistKeys = ['sources', 'reasons', 'intakeQuestions', 'noteTypes', 'reassessmentTriggers'];
			var i;
			for (i = 0; i < picklistKeys.length; i++) {
				var key = picklistKeys[i];
				if (!merged[key] || !merged[key].length) {
					merged[key] = (familyCfg[key] && familyCfg[key].length ? familyCfg[key] : null) ||
						(general[key] && general[key].length ? general[key] : null) ||
						[];
				}
			}
			if ((!merged.sources || !merged.sources.length) && RM.FormHelpers) {
				merged.sources = RM.FormHelpers.SOURCES.slice();
			}
			if ((!merged.reasons || !merged.reasons.length) && RM.FormHelpers) {
				merged.reasons = RM.FormHelpers.REASONS.slice();
			}
			if ((!merged.intakeQuestions || !merged.intakeQuestions.length) && general.intakeQuestions) {
				merged.intakeQuestions = general.intakeQuestions.slice();
			}
			if ((!merged.noteTypes || !merged.noteTypes.length) && RM.FormHelpers) {
				merged.noteTypes = RM.FormHelpers.NOTE_TYPES.slice();
			}
			if ((!merged.reassessmentTriggers || !merged.reassessmentTriggers.length) && RM.FormHelpers) {
				merged.reassessmentTriggers = RM.FormHelpers.REASSESSMENT_TRIGGERS.slice();
			}
			return merged;
		},

		domainLabel: function (domainKey) {
			var domains = this.formsMessages().domains || {};
			if (domains[domainKey]) { return domains[domainKey]; }
			return domainKey.replace(/([A-Z])/g, ' $1').replace(/^./, function (s) {
				return s.toUpperCase();
			});
		},

		clientStatusLabel: function (status) {
			if (status == null || status === '') { return status; }
			return this.enumLabel('clientStatus', String(status).toLowerCase());
		},

		intakeCompletenessLabel: function (value) {
			return this.enumLabel('intakeCompleteness', value);
		},

		cadenceLabel: function (key) {
			if (!key) { return key; }
			return this.tOr('cadence.' + key, key);
		},

		eventLabel: function (eventId) {
			if (!eventId) { return eventId; }
			return this.tOr('events.' + eventId, eventId);
		},

		programLabel: function (programId) {
			if (!programId) { return programId; }
			return this.tOr('programs.' + programId, programId);
		},

		referralSourceLabel: function (value) {
			return this.picklistLabel('referralSources', value);
		},

		referralReasonLabel: function (value) {
			return this.picklistLabel('referralReasons', value);
		},

		noteTypeLabel: function (value) {
			return this.picklistLabel('noteTypes', value);
		},

		setPageTitle: function (navId) {
			var suffix = this.t('htmlTitle.suffix');
			var title = navId ? this.tOr('htmlTitle.' + navId, '') : '';
			if (!title && navId && RM.Modules) {
				var item = RM.Modules.navItem(navId);
				title = item ? item.label : '';
			}
			document.title = title ? title + suffix : 'Rolling Meadows';
		},

		formatDate: function (iso) {
			if (!iso) { return '—'; }
			try {
				return new Date(iso).toLocaleDateString(_locale === 'es' ? 'es-US' : 'en-US', {
					year: 'numeric',
					month: 'short',
					day: 'numeric'
				});
			} catch (e) {
				return iso;
			}
		},

		renderSwitcher: function () {
			var self = this;
			var ariaLabel = String(this.t('shell.language')).replace(/"/g, '&quot;');
			return '<div class="locale-switcher" role="group" aria-label="' + ariaLabel + '">' +
				SUPPORTED.map(function (code) {
					var meta = LOCALE_META[code] || { label: code.toUpperCase(), flag: '' };
					return '<button type="button" class="locale-btn' +
						(code === self.getLocale() ? ' is-active' : '') +
						'" data-locale="' + code + '" title="' + meta.label + '">' +
						'<span class="locale-flag" aria-hidden="true">' + meta.flag + '</span>' +
						'<span class="locale-code">' + meta.label + '</span></button>';
				}).join('') +
				'</div>';
		},

		wireSwitcher: function () {
			if (_switcherWired) { return; }
			var self = this;
			document.addEventListener('click', function (e) {
				var btn = e.target.closest('.locale-switcher [data-locale]');
				if (!btn) { return; }
				var locale = btn.getAttribute('data-locale');
				if (locale && locale !== self.getLocale()) {
					self.setLocale(locale);
				}
			});
			_switcherWired = true;
		},

		applyDomKeys: function (root) {
			root = root || document;
			root.querySelectorAll('[data-i18n]').forEach(function (el) {
				var key = el.getAttribute('data-i18n');
				if (!key) { return; }
				el.textContent = this.t(key);
			}, this);
			root.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
				el.setAttribute('placeholder', this.t(el.getAttribute('data-i18n-placeholder')));
			}, this);
			root.querySelectorAll('[data-i18n-title]').forEach(function (el) {
				el.setAttribute('title', this.t(el.getAttribute('data-i18n-title')));
			}, this);
			root.querySelectorAll('[data-i18n-aria-label]').forEach(function (el) {
				el.setAttribute('aria-label', this.t(el.getAttribute('data-i18n-aria-label')));
			}, this);
		},

		applyFallbackTranslations: function (root) {
			if (_locale === 'en') { return 0; }
			var fallback = getFallbackMap();
			if (!fallback) { return 0; }
			root = root || document.getElementById('page-content') || document.body;
			var phrases = Object.keys(fallback).sort(function (a, b) {
				return b.length - a.length;
			});
			var replaced = 0;
			var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
			var node;
			while ((node = walker.nextNode())) {
				if (shouldSkipNode(node)) { continue; }
				var text = node.nodeValue;
				if (!text || !text.trim()) { continue; }
				var nextText = text;
				phrases.forEach(function (phrase) {
					if (nextText.indexOf(phrase) !== -1) {
						nextText = nextText.split(phrase).join(fallback[phrase]);
					}
				});
				if (nextText !== text) {
					node.nodeValue = nextText;
					replaced += 1;
				}
			}
			root.querySelectorAll('[title]').forEach(function (el) {
				if (el.closest('[data-i18n-skip], .locale-switcher')) { return; }
				var title = el.getAttribute('title');
				if (title && fallback[title]) {
					el.setAttribute('title', fallback[title]);
					replaced += 1;
				}
			});
			root.querySelectorAll('[aria-label]').forEach(function (el) {
				if (el.closest('[data-i18n-skip], .locale-switcher')) { return; }
				var label = el.getAttribute('aria-label');
				if (label && fallback[label]) {
					el.setAttribute('aria-label', fallback[label]);
					replaced += 1;
				}
			});
			return replaced;
		},

		applyPageTranslations: function (root) {
			this.applyDomKeys(root);
			return this.applyFallbackTranslations(root);
		},

		auditPage: function (root) {
			root = root || document.getElementById('page-content') || document.body;
			var seen = {};
			var samples = [];
			var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
			var node;
			while ((node = walker.nextNode())) {
				if (shouldSkipNode(node)) { continue; }
				var text = (node.nodeValue || '').replace(/\s+/g, ' ').trim();
				if (!text || text.length < 2 || seen[text]) { continue; }
				if (/^[\d\s%.,:;+\-()/]+$/.test(text)) { continue; }
				seen[text] = true;
				samples.push(text);
			}
			console.group('RM.I18n audit — ' + samples.length + ' visible strings');
			samples.sort().forEach(function (text) {
				console.log(text);
			});
			console.groupEnd();
			console.info('Switch locale: RM.I18n.setLocale("es") or RM.I18n.setLocale("en")');
			console.info('Re-translate page: RM.I18n.applyPageTranslations()');
			return samples;
		}
	};
})();
