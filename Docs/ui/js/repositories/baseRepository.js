/* global RM */
(function () {
	'use strict';

	var RM = window.RM = window.RM || {};

	function generateId(prefix) {
		return prefix + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
	}

	RM.BaseRepository = {
		createBase: function (entityType) {
			return {
				entityType: entityType,

				_key: function (id) {
					return entityType + ':' + id;
				},

				_listKey: function () {
					return entityType + ':ids';
				},

				_getIds: function () {
					return RM.Store.get(this._listKey()) || [];
				},

				_setIds: function (ids) {
					RM.Store.set(this._listKey(), ids);
				},

				findById: function (id) {
					if (!id) { return null; }
					return RM.Store.get(this._key(id));
				},

				findAll: function () {
					var self = this;
					return this._getIds().map(function (id) {
						return self.findById(id);
					}).filter(Boolean);
				},

				save: function (entity) {
					if (!entity) { return null; }
					if (!entity.id) {
						entity.id = generateId(entityType.slice(0, 3));
					}
					var existing = this.findById(entity.id);
					var merged = existing ? Object.assign({}, existing, entity) : entity;
					var ids = this._getIds();
					if (ids.indexOf(merged.id) === -1) {
						ids.push(merged.id);
						this._setIds(ids);
					}
					RM.Store.set(this._key(merged.id), merged);
					return merged;
				},

				update: function (id, changes) {
					var existing = this.findById(id);
					if (!existing) { return null; }
					return this.save(Object.assign({}, existing, changes, { id: id }));
				},

				remove: function (id) {
					if (!id) { return; }
					var ids = this._getIds().filter(function (x) { return x !== id; });
					this._setIds(ids);
					RM.Store.remove(this._key(id));
				},

				removeByClientId: function (clientId) {
					var self = this;
					this.findAll().forEach(function (entity) {
						if (entity.clientId === clientId) {
							self.remove(entity.id);
						}
					});
				},

				removeByCaseId: function (caseId) {
					var self = this;
					this.findAll().forEach(function (entity) {
						if (entity.caseId === caseId) {
							self.remove(entity.id);
						}
					});
				}
			};
		}
	};
})();
