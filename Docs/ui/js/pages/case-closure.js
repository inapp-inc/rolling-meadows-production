/* global RM */
(function () {
	'use strict';
	document.addEventListener('DOMContentLoaded', function () {
		var clientId = RM.Navigation.getQueryParam('clientId') || RM.Session.getActiveClientId();
		var url = 'case-workspace.html' + (clientId ? '?clientId=' + encodeURIComponent(clientId) + '&tab=closure' : '');
		window.location.replace(url);
	});
})();
