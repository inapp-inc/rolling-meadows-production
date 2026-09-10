/* global RM */
(function () {
	'use strict';

	function field(id, type, labelKey, options) {
		options = options || {};
		return Object.assign({ id: id, type: type, labelKey: labelKey }, options);
	}

	var ENTITIES = {
		client: {
			id: 'client',
			labelKey: 'pages.reportBuilder.entities.client',
			repository: 'ClientRepository',
			fields: [
				field('id', 'id', 'pages.reportBuilder.fields.id'),
				field('name', 'text', 'pages.reportBuilder.fields.name'),
				field('dob', 'date', 'pages.reportBuilder.fields.dob'),
				field('phone', 'text', 'pages.reportBuilder.fields.phone'),
				field('address', 'text', 'pages.reportBuilder.fields.address'),
				field('registeredAt', 'date', 'pages.reportBuilder.fields.registeredAt'),
				field('registrationSource', 'text', 'pages.reportBuilder.fields.registrationSource')
			],
			relations: {
				cases: { entity: 'case', type: 'hasMany', localKey: 'id', foreignKey: 'clientId', labelKey: 'pages.reportBuilder.relations.cases' },
				referrals: { entity: 'referral', type: 'hasMany', localKey: 'id', foreignKey: 'clientId', labelKey: 'pages.reportBuilder.relations.referrals' },
				intakes: { entity: 'intake', type: 'hasMany', localKey: 'id', foreignKey: 'clientId', labelKey: 'pages.reportBuilder.relations.intakes' },
				riskAssessments: { entity: 'riskAssessment', type: 'hasMany', localKey: 'id', foreignKey: 'clientId', labelKey: 'pages.reportBuilder.relations.riskAssessments' },
				serviceEnrollments: { entity: 'serviceEnrollment', type: 'hasMany', localKey: 'id', foreignKey: 'clientId', labelKey: 'pages.reportBuilder.relations.serviceEnrollments' },
				cboReferrals: { entity: 'cboReferral', type: 'hasMany', localKey: 'id', foreignKey: 'clientId', labelKey: 'pages.reportBuilder.relations.cboReferrals' },
				caseNotes: { entity: 'caseNote', type: 'hasMany', localKey: 'id', foreignKey: 'clientId', labelKey: 'pages.reportBuilder.relations.caseNotes' },
				carePlans: { entity: 'carePlan', type: 'hasMany', localKey: 'id', foreignKey: 'clientId', labelKey: 'pages.reportBuilder.relations.carePlans' },
				documents: { entity: 'document', type: 'hasMany', localKey: 'id', foreignKey: 'clientId', labelKey: 'pages.reportBuilder.relations.documents' }
			}
		},
		case: {
			id: 'case',
			labelKey: 'pages.reportBuilder.entities.case',
			repository: 'CaseRepository',
			fields: [
				field('id', 'id', 'pages.reportBuilder.fields.id'),
				field('caseNumber', 'text', 'pages.reportBuilder.fields.caseNumber'),
				field('clientId', 'id', 'pages.reportBuilder.fields.clientId'),
				field('programId', 'program', 'pages.reportBuilder.fields.programId'),
				field('caseManagerId', 'id', 'pages.reportBuilder.fields.caseManagerId'),
				field('status', 'text', 'pages.reportBuilder.fields.status'),
				field('currentStage', 'number', 'pages.reportBuilder.fields.currentStage'),
				field('incompleteIntake', 'boolean', 'pages.reportBuilder.fields.incompleteIntake'),
				field('openDate', 'date', 'pages.reportBuilder.fields.openDate')
			],
			relations: {
				client: { entity: 'client', type: 'belongsTo', localKey: 'clientId', foreignKey: 'id', labelKey: 'pages.reportBuilder.relations.client' },
				caseManager: { entity: 'user', type: 'belongsTo', localKey: 'caseManagerId', foreignKey: 'id', labelKey: 'pages.reportBuilder.relations.caseManager' },
				referrals: { entity: 'referral', type: 'hasMany', localKey: 'id', foreignKey: 'caseId', labelKey: 'pages.reportBuilder.relations.referrals' },
				intakes: { entity: 'intake', type: 'hasMany', localKey: 'id', foreignKey: 'caseId', labelKey: 'pages.reportBuilder.relations.intakes' },
				serviceEnrollments: { entity: 'serviceEnrollment', type: 'hasMany', localKey: 'id', foreignKey: 'caseId', labelKey: 'pages.reportBuilder.relations.serviceEnrollments' },
				riskAssessments: { entity: 'riskAssessment', type: 'hasMany', localKey: 'clientId', foreignKey: 'clientId', labelKey: 'pages.reportBuilder.relations.riskAssessments' },
				cboReferrals: { entity: 'cboReferral', type: 'hasMany', localKey: 'clientId', foreignKey: 'clientId', labelKey: 'pages.reportBuilder.relations.cboReferrals' },
				caseNotes: { entity: 'caseNote', type: 'hasMany', localKey: 'clientId', foreignKey: 'clientId', labelKey: 'pages.reportBuilder.relations.caseNotes' },
				carePlans: { entity: 'carePlan', type: 'hasMany', localKey: 'clientId', foreignKey: 'clientId', labelKey: 'pages.reportBuilder.relations.carePlans' }
			}
		},
		referral: {
			id: 'referral',
			labelKey: 'pages.reportBuilder.entities.referral',
			repository: 'ReferralRepository',
			fields: [
				field('id', 'id', 'pages.reportBuilder.fields.id'),
				field('clientId', 'id', 'pages.reportBuilder.fields.clientId'),
				field('caseId', 'id', 'pages.reportBuilder.fields.caseId'),
				field('source', 'text', 'pages.reportBuilder.fields.source'),
				field('reason', 'text', 'pages.reportBuilder.fields.reason'),
				field('dateReceived', 'date', 'pages.reportBuilder.fields.dateReceived'),
				field('referredBy', 'text', 'pages.reportBuilder.fields.referredBy')
			],
			relations: {
				client: { entity: 'client', type: 'belongsTo', localKey: 'clientId', foreignKey: 'id', labelKey: 'pages.reportBuilder.relations.client' },
				case: { entity: 'case', type: 'belongsTo', localKey: 'caseId', foreignKey: 'id', labelKey: 'pages.reportBuilder.relations.case' }
			}
		},
		intake: {
			id: 'intake',
			labelKey: 'pages.reportBuilder.entities.intake',
			repository: 'IntakeRepository',
			fields: [
				field('id', 'id', 'pages.reportBuilder.fields.id'),
				field('clientId', 'id', 'pages.reportBuilder.fields.clientId'),
				field('caseId', 'id', 'pages.reportBuilder.fields.caseId'),
				field('completeness', 'text', 'pages.reportBuilder.fields.completeness'),
				field('consentOnFile', 'boolean', 'pages.reportBuilder.fields.consentOnFile'),
				field('livingArrangement', 'text', 'pages.reportBuilder.fields.livingArrangement')
			],
			relations: {
				client: { entity: 'client', type: 'belongsTo', localKey: 'clientId', foreignKey: 'id', labelKey: 'pages.reportBuilder.relations.client' },
				case: { entity: 'case', type: 'belongsTo', localKey: 'caseId', foreignKey: 'id', labelKey: 'pages.reportBuilder.relations.case' }
			}
		},
		riskAssessment: {
			id: 'riskAssessment',
			labelKey: 'pages.reportBuilder.entities.riskAssessment',
			repository: 'RiskAssessmentRepository',
			fields: [
				field('id', 'id', 'pages.reportBuilder.fields.id'),
				field('clientId', 'id', 'pages.reportBuilder.fields.clientId'),
				field('date', 'date', 'pages.reportBuilder.fields.date'),
				field('overallRisk', 'risk', 'pages.reportBuilder.fields.overallRisk'),
				field('compositeScore', 'number', 'pages.reportBuilder.fields.compositeScore')
			],
			relations: {
				client: { entity: 'client', type: 'belongsTo', localKey: 'clientId', foreignKey: 'id', labelKey: 'pages.reportBuilder.relations.client' }
			}
		},
		serviceEnrollment: {
			id: 'serviceEnrollment',
			labelKey: 'pages.reportBuilder.entities.serviceEnrollment',
			repository: 'ServiceEnrollmentRepository',
			fields: [
				field('id', 'id', 'pages.reportBuilder.fields.id'),
				field('clientId', 'id', 'pages.reportBuilder.fields.clientId'),
				field('caseId', 'id', 'pages.reportBuilder.fields.caseId'),
				field('serviceOrEventId', 'event', 'pages.reportBuilder.fields.serviceOrEventId'),
				field('dateEnrolled', 'date', 'pages.reportBuilder.fields.dateEnrolled'),
				field('voided', 'boolean', 'pages.reportBuilder.fields.voided')
			],
			relations: {
				client: { entity: 'client', type: 'belongsTo', localKey: 'clientId', foreignKey: 'id', labelKey: 'pages.reportBuilder.relations.client' },
				case: { entity: 'case', type: 'belongsTo', localKey: 'caseId', foreignKey: 'id', labelKey: 'pages.reportBuilder.relations.case' }
			}
		},
		cboReferral: {
			id: 'cboReferral',
			labelKey: 'pages.reportBuilder.entities.cboReferral',
			repository: 'CBOReferralRepository',
			fields: [
				field('id', 'id', 'pages.reportBuilder.fields.id'),
				field('clientId', 'id', 'pages.reportBuilder.fields.clientId'),
				field('cboName', 'text', 'pages.reportBuilder.fields.cboName'),
				field('status', 'cboStatus', 'pages.reportBuilder.fields.status'),
				field('date', 'date', 'pages.reportBuilder.fields.date')
			],
			relations: {
				client: { entity: 'client', type: 'belongsTo', localKey: 'clientId', foreignKey: 'id', labelKey: 'pages.reportBuilder.relations.client' }
			}
		},
		caseNote: {
			id: 'caseNote',
			labelKey: 'pages.reportBuilder.entities.caseNote',
			repository: 'CaseNoteRepository',
			fields: [
				field('id', 'id', 'pages.reportBuilder.fields.id'),
				field('clientId', 'id', 'pages.reportBuilder.fields.clientId'),
				field('date', 'date', 'pages.reportBuilder.fields.date'),
				field('type', 'text', 'pages.reportBuilder.fields.noteType'),
				field('text', 'text', 'pages.reportBuilder.fields.noteText')
			],
			relations: {
				client: { entity: 'client', type: 'belongsTo', localKey: 'clientId', foreignKey: 'id', labelKey: 'pages.reportBuilder.relations.client' }
			}
		},
		carePlan: {
			id: 'carePlan',
			labelKey: 'pages.reportBuilder.entities.carePlan',
			repository: 'CarePlanRepository',
			fields: [
				field('id', 'id', 'pages.reportBuilder.fields.id'),
				field('clientId', 'id', 'pages.reportBuilder.fields.clientId'),
				field('issue', 'text', 'pages.reportBuilder.fields.issue'),
				field('goal', 'text', 'pages.reportBuilder.fields.goal'),
				field('service', 'text', 'pages.reportBuilder.fields.service'),
				field('status', 'text', 'pages.reportBuilder.fields.status')
			],
			relations: {
				client: { entity: 'client', type: 'belongsTo', localKey: 'clientId', foreignKey: 'id', labelKey: 'pages.reportBuilder.relations.client' }
			}
		},
		user: {
			id: 'user',
			labelKey: 'pages.reportBuilder.entities.user',
			repository: 'UserRepository',
			fields: [
				field('id', 'id', 'pages.reportBuilder.fields.id'),
				field('name', 'text', 'pages.reportBuilder.fields.name'),
				field('role', 'role', 'pages.reportBuilder.fields.role'),
				field('programId', 'program', 'pages.reportBuilder.fields.programId'),
				field('status', 'text', 'pages.reportBuilder.fields.status')
			],
			relations: {}
		},
		document: {
			id: 'document',
			labelKey: 'pages.reportBuilder.entities.document',
			repository: 'DocumentRepository',
			fields: [
				field('id', 'id', 'pages.reportBuilder.fields.id'),
				field('clientId', 'id', 'pages.reportBuilder.fields.clientId'),
				field('kind', 'text', 'pages.reportBuilder.fields.documentKind'),
				field('title', 'text', 'pages.reportBuilder.fields.title')
			],
			relations: {
				client: { entity: 'client', type: 'belongsTo', localKey: 'clientId', foreignKey: 'id', labelKey: 'pages.reportBuilder.relations.client' }
			}
		},
		initiative: {
			id: 'initiative',
			labelKey: 'pages.reportBuilder.entities.initiative',
			repository: 'InitiativeRepository',
			fields: [
				field('id', 'id', 'pages.reportBuilder.fields.id'),
				field('name', 'text', 'pages.reportBuilder.fields.name'),
				field('startDate', 'date', 'pages.reportBuilder.fields.startDate'),
				field('endDate', 'date', 'pages.reportBuilder.fields.endDate'),
				field('targetOutreach', 'number', 'pages.reportBuilder.fields.targetOutreach'),
				field('referralsGenerated', 'number', 'pages.reportBuilder.fields.referralsGenerated'),
				field('enrollments', 'number', 'pages.reportBuilder.fields.enrollments'),
				field('completions', 'number', 'pages.reportBuilder.fields.completions')
			],
			relations: {}
		},
		serviceUtil: {
			id: 'serviceUtil',
			labelKey: 'pages.reportBuilder.entities.serviceUtil',
			repository: 'ServiceUtilizationRepository',
			fields: [
				field('id', 'id', 'pages.reportBuilder.fields.id'),
				field('month', 'text', 'pages.reportBuilder.fields.month'),
				field('category', 'serviceCategory', 'pages.reportBuilder.fields.category'),
				field('units', 'number', 'pages.reportBuilder.fields.units')
			],
			relations: {}
		}
	};

	var DIAGRAM_LAYOUT = [
		{ entity: 'user', row: 0, col: 1 },
		{ entity: 'case', row: 1, col: 1 },
		{ entity: 'client', row: 1, col: 0 },
		{ entity: 'referral', row: 1, col: 2 },
		{ entity: 'intake', row: 2, col: 0 },
		{ entity: 'riskAssessment', row: 2, col: 1 },
		{ entity: 'serviceEnrollment', row: 2, col: 2 },
		{ entity: 'cboReferral', row: 3, col: 0 },
		{ entity: 'caseNote', row: 3, col: 1 },
		{ entity: 'carePlan', row: 3, col: 2 },
		{ entity: 'document', row: 4, col: 0 },
		{ entity: 'initiative', row: 4, col: 2 },
		{ entity: 'serviceUtil', row: 4, col: 1 }
	];

	var DIAGRAM_EDGES = [
		{ from: 'user', to: 'case', relationKey: 'caseManager' },
		{ from: 'client', to: 'case', relationKey: 'cases' },
		{ from: 'client', to: 'referral', relationKey: 'referrals' },
		{ from: 'client', to: 'intake', relationKey: 'intakes' },
		{ from: 'client', to: 'riskAssessment', relationKey: 'riskAssessments' },
		{ from: 'client', to: 'serviceEnrollment', relationKey: 'serviceEnrollments' },
		{ from: 'client', to: 'cboReferral', relationKey: 'cboReferrals' },
		{ from: 'client', to: 'caseNote', relationKey: 'caseNotes' },
		{ from: 'client', to: 'carePlan', relationKey: 'carePlans' },
		{ from: 'client', to: 'document', relationKey: 'documents' }
	];

	var BUILDER_ENTITY_ORDER = [
		'client',
		'case',
		'referral',
		'intake',
		'riskAssessment',
		'serviceEnrollment',
		'cboReferral',
		'caseNote',
		'carePlan',
		'document',
		'user',
		'initiative',
		'serviceUtil'
	];

	var GRAIN_INFERENCE_PRIORITY = [
		'case',
		'serviceEnrollment',
		'cboReferral',
		'referral',
		'client',
		'riskAssessment',
		'intake',
		'caseNote',
		'carePlan',
		'document',
		'user',
		'initiative',
		'serviceUtil'
	];

	RM.ReportDataModel = {
		entities: ENTITIES,
		diagramLayout: DIAGRAM_LAYOUT,
		diagramEdges: DIAGRAM_EDGES,

		entityIds: function () {
			return Object.keys(ENTITIES);
		},

		builderEntityIds: function () {
			return BUILDER_ENTITY_ORDER.filter(function (entityId) {
				return !!ENTITIES[entityId];
			});
		},

		collectFieldRefsFromConfig: function (config) {
			config = config || {};
			var refs = [];
			(config.columns || []).forEach(function (column) {
				refs.push({ entity: column.entity, field: column.field });
			});
			if (config.chart) {
				if (config.chart.xAxis) { refs.push(config.chart.xAxis); }
				if (config.chart.yAxis && config.chart.yAxis.field) { refs.push(config.chart.yAxis); }
			}
			(config.filters || []).forEach(function (filter) {
				refs.push({ entity: filter.entity, field: filter.field });
			});
			return refs;
		},

		inferPrimaryEntity: function (refs, fallback) {
			fallback = fallback || 'client';
			if (!refs || !refs.length) { return fallback; }
			var counts = {};
			refs.forEach(function (ref) {
				if (!ref || !ref.entity || ref.field === '__count') { return; }
				counts[ref.entity] = (counts[ref.entity] || 0) + 1;
			});
			var keys = Object.keys(counts);
			if (!keys.length) { return fallback; }
			keys.sort(function (a, b) {
				if (counts[b] !== counts[a]) { return counts[b] - counts[a]; }
				var pa = GRAIN_INFERENCE_PRIORITY.indexOf(a);
				var pb = GRAIN_INFERENCE_PRIORITY.indexOf(b);
				pa = pa === -1 ? 999 : pa;
				pb = pb === -1 ? 999 : pb;
				return pa - pb;
			});
			return keys[0];
		},

		builderFieldRefs: function (options) {
			return this.allFieldRefs(this.builderEntityIds(), options || {});
		},

		getEntity: function (entityId) {
			return ENTITIES[entityId] || null;
		},

		label: function (entityOrField, labelKey) {
			if (labelKey) {
				return RM.I18n ? RM.I18n.t(labelKey) : labelKey;
			}
			var entity = typeof entityOrField === 'string' ? ENTITIES[entityOrField] : entityOrField;
			return entity && RM.I18n ? RM.I18n.t(entity.labelKey) : (entity ? entity.id : '');
		},

		fieldLabel: function (entityId, fieldId) {
			var entity = ENTITIES[entityId];
			if (!entity) { return fieldId; }
			var match = entity.fields.find(function (f) { return f.id === fieldId; });
			return match ? this.label(null, match.labelKey) : fieldId;
		},

		getRepository: function (entityId) {
			var entity = ENTITIES[entityId];
			if (!entity || !entity.repository || !RM[entity.repository]) { return null; }
			return RM[entity.repository];
		},

		getRelation: function (fromEntityId, relationKey) {
			var entity = ENTITIES[fromEntityId];
			return entity && entity.relations ? entity.relations[relationKey] : null;
		},

		resolveRelationKey: function (fromEntityId, toEntityId) {
			var entity = ENTITIES[fromEntityId];
			if (!entity || !entity.relations) { return null; }
			var keys = Object.keys(entity.relations);
			for (var i = 0; i < keys.length; i++) {
				if (entity.relations[keys[i]].entity === toEntityId) {
					return keys[i];
				}
			}
			return null;
		},

		availableJoins: function (primaryEntityId) {
			var entity = ENTITIES[primaryEntityId];
			if (!entity) { return []; }
			return Object.keys(entity.relations).map(function (key) {
				var rel = entity.relations[key];
				return {
					key: key,
					entity: rel.entity,
					type: rel.type,
					label: RM.I18n ? RM.I18n.t(rel.labelKey) : key
				};
			});
		},

		columnKey: function (entityId, fieldId) {
			return entityId + '.' + fieldId;
		},

		parseColumnKey: function (key) {
			var parts = String(key).split('.');
			return { entity: parts[0], field: parts.slice(1).join('.') };
		},

		fieldMeta: function (entityId, fieldId) {
			var entity = ENTITIES[entityId];
			if (!entity) { return null; }
			return entity.fields.find(function (f) { return f.id === fieldId; }) || null;
		},

		fieldRole: function (entityId, fieldId) {
			if (fieldId === '__count') { return 'measure'; }
			var field = this.fieldMeta(entityId, fieldId);
			if (!field) { return 'dimension'; }
			if (field.type === 'number') { return 'measure'; }
			return 'dimension';
		},

		isReportableField: function (entityId, fieldId) {
			if (fieldId === '__count') { return false; }
			var meta = this.fieldMeta(entityId, fieldId);
			if (!meta) { return false; }
			if (meta.reportable === false) { return false; }
			if (meta.type === 'id' || fieldId === 'id') { return false; }
			return true;
		},

		reportableFieldRefs: function (primaryEntityId, options) {
			return this.paletteFieldRefs(primaryEntityId, Object.assign({
				reportableOnly: true,
				includeRelatedCounts: false
			}, options || {}));
		},

		reachableEntityIds: function (primaryEntityId) {
			var seen = {};
			var ordered = [primaryEntityId];
			seen[primaryEntityId] = true;
			this.availableJoins(primaryEntityId).forEach(function (join) {
				if (!seen[join.entity]) {
					seen[join.entity] = true;
					ordered.push(join.entity);
				}
			});
			return ordered;
		},

		relatedCountRefs: function (primaryEntityId) {
			var self = this;
			return this.availableJoins(primaryEntityId)
				.filter(function (join) { return join.type === 'hasMany'; })
				.map(function (join) {
					return {
						entity: join.entity,
						field: '__count',
						key: self.fieldRefKey(join.entity, '__count'),
						label: RM.I18n ? RM.I18n.t('pages.reportBuilder.relatedCount', {
							entity: self.label(join.entity)
						}) : (self.label(join.entity) + ' count'),
						entityLabel: self.label(join.entity),
						role: 'measure',
						type: 'count',
						isRelatedCount: true
					};
				});
		},

		paletteFieldRefs: function (primaryEntityId, options) {
			options = options || {};
			var refs = this.allFieldRefs(this.reachableEntityIds(primaryEntityId), options);
			if (options.includeRelatedCounts !== false) {
				refs = refs.concat(this.relatedCountRefs(primaryEntityId));
			}
			return refs;
		},

		fieldDisplayLabel: function (entityId, fieldId) {
			if (fieldId === '__count') {
				return RM.I18n ? RM.I18n.t('pages.reportBuilder.relatedCount', {
					entity: this.label(entityId)
				}) : (this.label(entityId) + ' count');
			}
			return this.fieldLabel(entityId, fieldId);
		},

		syncJoinsFromReportConfig: function (config) {
			config = config || {};
			var primaryEntityId = config.primaryEntity || 'client';
			var joins = (config.joins || []).slice();
			var joinAggregates = Object.assign({}, config.joinAggregates || {});
			var fieldRefs = [];

			(config.columns || []).forEach(function (column) {
				fieldRefs.push({ entity: column.entity, field: column.field });
			});
			if (config.chart) {
				if (config.chart.xAxis) { fieldRefs.push(config.chart.xAxis); }
				if (config.chart.yAxis && config.chart.yAxis.field) { fieldRefs.push(config.chart.yAxis); }
			}
			(config.filters || []).forEach(function (filter) {
				fieldRefs.push({ entity: filter.entity, field: filter.field });
			});
			(config.parameters || []).forEach(function (param) {
				fieldRefs.push({ entity: param.entity, field: param.field });
			});

			fieldRefs.forEach(function (ref) {
				if (!ref || !ref.entity) { return; }
				if (ref.field === '__count' && ref.entity !== primaryEntityId) {
					joinAggregates[ref.entity] = 'count';
				}
				if (ref.entity !== primaryEntityId && joins.indexOf(ref.entity) === -1) {
					if (this.resolveRelationKey(primaryEntityId, ref.entity)) {
						joins.push(ref.entity);
					}
				}
			}, this);

			return { joins: joins, joinAggregates: joinAggregates };
		},

		fieldRefKey: function (entityId, fieldId) {
			return entityId + '.' + fieldId;
		},

		parseFieldRef: function (refKey) {
			return this.parseColumnKey(refKey);
		},

		allFieldRefs: function (entityIds, options) {
			options = options || {};
			var self = this;
			var refs = [];
			(entityIds || []).forEach(function (entityId) {
				var entity = ENTITIES[entityId];
				if (!entity) { return; }
				entity.fields.forEach(function (field) {
					if (options.reportableOnly && !self.isReportableField(entityId, field.id)) { return; }
					refs.push({
						entity: entityId,
						field: field.id,
						key: self.fieldRefKey(entityId, field.id),
						label: self.fieldLabel(entityId, field.id),
						entityLabel: self.label(entityId),
						role: self.fieldRole(entityId, field.id),
						type: field.type
					});
				});
			});
			return refs;
		},

		ensureJoinsForFields: function (primaryEntityId, fieldRefs, currentJoins) {
			var joins = (currentJoins || []).slice();
			(fieldRefs || []).forEach(function (ref) {
				if (!ref || !ref.entity || ref.entity === primaryEntityId) { return; }
				if (joins.indexOf(ref.entity) === -1) {
					var relationKey = this.resolveRelationKey(primaryEntityId, ref.entity);
					if (relationKey) { joins.push(ref.entity); }
				}
			}, this);
			return joins;
		}
	};
})();
