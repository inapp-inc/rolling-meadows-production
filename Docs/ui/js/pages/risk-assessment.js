/* global RM */
(function () {
	'use strict';
	document.addEventListener('DOMContentLoaded', function () {
		var tab = 'risk';
		var clientId = RM.Navigation.getQueryParam('clientId') || RM.Session.getActiveClientId();
		var url = 'case-workspace.html' + (clientId ? '?clientId=' + encodeURIComponent(clientId) + '&tab=' + tab : '');
		window.location.replace(url);
	});
})();
