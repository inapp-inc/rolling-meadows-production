/* global RM */
(function () {
	'use strict';

	var RM = window.RM = window.RM || {};

	function storage() {
		try {
			return window.localStorage;
		} catch (e) {
			return null;
		}
	}

	function read(key) {
		var store = storage();
		if (!store) { return null; }
		try {
			var raw = store.getItem(key);
			return raw ? JSON.parse(raw) : null;
		} catch (e) {
			return null;
		}
	}

	function write(key, value) {
		var store = storage();
		if (!store) { return; }
		store.setItem(key, JSON.stringify(value));
	}

	function removeKey(key) {
		var store = storage();
		if (!store) { return; }
		store.removeItem(key);
	}

	RM.Store = {
		prefix: 'rm:',

		get: function (key) {
			return read(this.prefix + key);
		},

		set: function (key, value) {
			write(this.prefix + key, value);
			document.dispatchEvent(new CustomEvent('rm:store-changed', { detail: { key: key } }));
		},

		remove: function (key) {
			removeKey(this.prefix + key);
			document.dispatchEvent(new CustomEvent('rm:store-changed', { detail: { key: key } }));
		},

		getMeta: function (key) {
			return read('rm:meta:' + key);
		},

		setMeta: function (key, value) {
			write('rm:meta:' + key, value);
		},

		clearAll: function () {
			var store = storage();
			if (!store) { return; }
			var keys = [];
			for (var i = 0; i < store.length; i++) {
				var k = store.key(i);
				if (k && k.indexOf('rm:') === 0) {
					keys.push(k);
				}
			}
			keys.forEach(function (k) { store.removeItem(k); });
		},

		listKeys: function (pattern) {
			var store = storage();
			if (!store) { return []; }
			var result = [];
			for (var i = 0; i < store.length; i++) {
				var k = store.key(i);
				if (k && k.indexOf('rm:' + pattern) === 0) {
					result.push(k.replace('rm:', ''));
				}
			}
			return result;
		}
	};
})();
