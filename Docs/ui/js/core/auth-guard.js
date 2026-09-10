/* global RM */
(function () {
	'use strict';

	if (!window.RM || !RM.Session || !RM.Session.isAuthenticated()) {
		if (RM.Navigate) {
			RM.Navigate.toSignIn();
		} else {
			window.location.href = 'index.src.html';
		}
		return;
	}

	document.documentElement.classList.remove('auth-pending');
})();
