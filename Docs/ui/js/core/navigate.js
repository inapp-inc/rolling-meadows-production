/* global RM */
(function () {
	'use strict';

	var RM = window.RM = window.RM || {};

	function signInTarget() {
		if (window.location.protocol === 'file:') {
			return 'index.src.html';
		}
		return 'index.html';
	}

	RM.Navigate = {
		go: function (url) {
			url = url || signInTarget();
			try {
				if (window.self !== window.top && window.top && window.top.location) {
					window.top.location.href = url;
					return;
				}
			} catch (err) {
				/* Sandboxed iframe — fall through to same-frame navigation. */
			}
			window.location.href = url;
		},

		toSignIn: function () {
			this.go(signInTarget());
		}
	};
})();
