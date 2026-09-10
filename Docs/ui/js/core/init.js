/* global RM */
(function () {
	'use strict';

	RM.Init = {
		SEED_VERSION: 14,

		bootstrap: function () {
			if (typeof RM.Seed === 'undefined') {
				return;
			}
			RM.Seed.ensureLoaded();
		}
	};
})();
