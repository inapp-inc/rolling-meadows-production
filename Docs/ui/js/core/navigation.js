/* global RM */
(function () {
	'use strict';

	var RM = window.RM = window.RM || {};

	RM.Navigation = {
		getQueryParam: function (name) {
			var query = window.location.search.slice(1);
			if (!query) { return null; }
			return new URLSearchParams(query).get(name);
		},

		clientUrl: function (page, clientId) {
			var id = clientId || RM.Session.getActiveClientId();
			if (!id) {
				return RM.Links.page(page);
			}
			return RM.Links.page(page, { clientId: id });
		},

		resolveClientId: function () {
			var fromUrl = this.getQueryParam('clientId');
			if (fromUrl) {
				RM.Session.setActiveClientId(fromUrl);
				return fromUrl;
			}
			return RM.Session.getActiveClientId();
		},

		goToClientProfile: function (clientId) {
			RM.Session.setActiveClientId(clientId);
			RM.Links.go('client-profile', { clientId: clientId });
		},

		goToStage: function (page, clientId) {
			var id = clientId || RM.Session.getActiveClientId();
			RM.Session.setActiveClientId(id);
			RM.Links.go(page, { clientId: id });
		}
	};
})();
