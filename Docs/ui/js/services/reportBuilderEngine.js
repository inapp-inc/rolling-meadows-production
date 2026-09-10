/* global RM */
(function () {
	'use strict';

	function normalizeText(value) {
		return String(value == null ? '' : value).toLowerCase();
	}

	function compareValues(a, b) {
		if (a == null && b == null) { return 0; }
		if (a == null) { return -1; }
		if (b == null) { return 1; }
		if (typeof a === 'number' && typeof b === 'number') { return a - b; }
		return String(a).localeCompare(String(b));
	}

	function parseDateOnly(value) {
		if (value == null || value === '') { return null; }
		var d = new Date(String(value).slice(0, 10));
		return isNaN(d.getTime()) ? null : d;
	}

	RM.ReportBuilderEngine = {
		formatValue: function (entityId, fieldId, rawValue) {
			if (rawValue == null || rawValue === '') { return ''; }
			var entity = RM.ReportDataModel.getEntity(entityId);
			var field = entity && entity.fields.find(function (f) { return f.id === fieldId; });
			var type = field ? field.type : 'text';

			if (type === 'boolean') { return rawValue ? 'Yes' : 'No'; }
			if (type === 'program' && RM.I18n) { return RM.I18n.programLabel(rawValue); }
			if (type === 'event' && RM.I18n) { return RM.I18n.eventLabel(rawValue); }
			if (type === 'risk' && RM.I18n) { return RM.I18n.riskLabel(rawValue); }
			if (type === 'role' && RM.Permissions) { return RM.Permissions.formatRoleLabel(rawValue); }
			if (type === 'cboStatus' && RM.I18n) { return RM.I18n.enumLabel('cboStatus', rawValue); }
			if (type === 'serviceCategory' && RM.I18n) {
				return RM.I18n.tOr('pages.reports.serviceUtil.' + rawValue, rawValue);
			}
			return rawValue;
		},

		_caseloadClientIds: function (user) {
			var ids = {};
			if (!user || user.role !== 'case_manager' || !RM.CaseRepository) { return ids; }
			RM.CaseRepository.findByCaseManager(user.id).forEach(function (caseRecord) {
				ids[caseRecord.clientId] = true;
			});
			return ids;
		},

		_scopePrimaryRows: function (entityId, rows, user) {
			if (!user || user.role !== 'case_manager') { return rows; }
			if (entityId === 'case') {
				return rows.filter(function (row) { return row.caseManagerId === user.id; });
			}
			if (entityId === 'client') {
				var ids = this._caseloadClientIds(user);
				return rows.filter(function (row) { return ids[row.id]; });
			}
			var clientIds = this._caseloadClientIds(user);
			if (rows[0] && rows[0].clientId != null) {
				return rows.filter(function (row) { return clientIds[row.clientId]; });
			}
			if (entityId === 'user') {
				return rows.filter(function (row) { return row.id === user.id; });
			}
			return rows;
		},

		_getRepoRows: function (entityId) {
			var repo = RM.ReportDataModel.getRepository(entityId);
			return repo ? repo.findAll().filter(function (row) { return !!row; }) : [];
		},

		_filterRows: function (rows, filters, entityResolver) {
			if (!filters || !filters.length) { return rows; }
			var self = this;
			return rows.filter(function (row) {
				return filters.every(function (filter) {
					var target = entityResolver(filter.entity, row) || row;
					if (!target) { return false; }
					return self._matchesFilter(target[filter.field], filter);
				});
			});
		},

		_matchesFilter: function (raw, filter) {
			var value = normalizeText(filter.value);
			var current = normalizeText(raw);

			if (filter.op === 'empty') { return raw == null || raw === ''; }
			if (filter.op === 'notEmpty') { return raw != null && raw !== ''; }
			if (filter.op === 'eq') { return current === value; }
			if (filter.op === 'neq') { return current !== value; }
			if (filter.op === 'contains') { return current.indexOf(value) !== -1; }
			if (filter.op === 'gt') { return Number(raw) > Number(filter.value); }
			if (filter.op === 'lt') { return Number(raw) < Number(filter.value); }
			if (filter.op === 'gte' || filter.op === 'lte') {
				if (raw == null || raw === '' || !filter.value) { return false; }
				var rawDate = parseDateOnly(raw);
				var filterDate = parseDateOnly(filter.value);
				if (!rawDate || !filterDate) { return false; }
				if (filter.op === 'gte') { return rawDate >= filterDate; }
				filterDate.setHours(23, 59, 59, 999);
				return parseDateOnly(raw) <= filterDate;
			}
			if (filter.op === 'true') { return !!raw; }
			if (filter.op === 'false') { return !raw; }
			return true;
		},

		_resolveRelated: function (primaryEntityId, primaryRow, joinEntityId, relationKey, aggregate) {
			var relation = RM.ReportDataModel.getRelation(primaryEntityId, relationKey);
			if (!relation) { return null; }

			var repo = RM.ReportDataModel.getRepository(joinEntityId);
			if (!repo) { return null; }

			if (relation.type === 'belongsTo') {
				return repo.findById(primaryRow[relation.localKey]) || null;
			}

			var matches = repo.findAll().filter(function (row) {
				return row && row[relation.foreignKey] === primaryRow[relation.localKey || 'id'];
			});

			if (joinEntityId === 'riskAssessment' && RM.RiskAssessmentRepository.findLatest && primaryRow.clientId) {
				return RM.RiskAssessmentRepository.findLatest(primaryRow.clientId) || matches[0] || null;
			}

			if (!matches.length) { return aggregate === 'count' ? [] : null; }
			if (aggregate === 'count') { return matches; }
			if (aggregate === 'latest') {
				return matches.slice().sort(function (a, b) {
					return new Date(b.date || b.dateEnrolled || b.openDate || 0) -
						new Date(a.date || a.dateEnrolled || a.openDate || 0);
				})[0];
			}
			return matches[0];
		},

		_buildContext: function (primaryEntityId, primaryRow, joins, joinAggregates, filters) {
			var self = this;
			var context = {};
			context[primaryEntityId] = primaryRow;

			(joins || []).forEach(function (joinEntityId) {
				var relationKey = RM.ReportDataModel.resolveRelationKey(primaryEntityId, joinEntityId);
				if (!relationKey) { return; }
				var aggregate = (joinAggregates && joinAggregates[joinEntityId]) || 'latest';
				var relation = RM.ReportDataModel.getRelation(primaryEntityId, relationKey);
				if (relation.type === 'hasMany' && aggregate === 'count') {
					var matches = self._resolveRelated(primaryEntityId, primaryRow, joinEntityId, relationKey, 'count') || [];
					matches = self._filterEntityRows(matches, filters, joinEntityId);
					context[joinEntityId] = { __count: matches.length };
					return;
				}
				context[joinEntityId] = self._resolveRelated(primaryEntityId, primaryRow, joinEntityId, relationKey, aggregate);
			});

			return context;
		},

		_filterEntityRows: function (rows, filters, entityId) {
			if (!rows || !rows.length || !filters || !filters.length) { return rows || []; }
			var entityFilters = filters.filter(function (filter) { return filter.entity === entityId; });
			if (!entityFilters.length) { return rows; }
			var self = this;
			return rows.filter(function (row) {
				return entityFilters.every(function (filter) {
					return self._matchesFilter(row[filter.field], filter);
				});
			});
		},

		_readColumnValue: function (column, context, primaryEntityId) {
			if (column.field === '__count') {
				var bucket = context[column.entity];
				if (bucket && bucket.__count != null) { return bucket.__count; }
				if (primaryEntityId && column.entity === primaryEntityId && bucket && bucket.id != null) {
					return 1;
				}
				return '';
			}
			var source = context[column.entity];
			if (!source) { return ''; }
			return source[column.field];
		},

		run: function (config, user, parameterValues) {
			config = RM.ReportBuilderParams
				? RM.ReportBuilderParams.applyToConfig(config, parameterValues)
				: config;
			config = config || {};
			var synced = RM.ReportDataModel.syncJoinsFromReportConfig(config);
			config = Object.assign({}, config, synced);
			var primaryEntityId = config.primaryEntity || 'client';
			var joins = config.joins || [];
			var columns = config.columns || [];
			var filters = config.filters || [];
			var sortBy = config.sortBy || null;
			var joinAggregates = config.joinAggregates || {};

			if (!columns.length) {
				var entity = RM.ReportDataModel.getEntity(primaryEntityId);
				columns = (entity ? entity.fields.slice(0, 4) : []).map(function (field) {
					return { entity: primaryEntityId, field: field.id };
				});
			}

			var primaryRows = this._scopePrimaryRows(primaryEntityId, this._getRepoRows(primaryEntityId), user);
			var self = this;

			function entityResolver(entityId, primaryRow) {
				if (entityId === primaryEntityId) { return primaryRow; }
				var relationKey = RM.ReportDataModel.resolveRelationKey(primaryEntityId, entityId);
				if (!relationKey) { return null; }
				return self._resolveRelated(
					primaryEntityId,
					primaryRow,
					entityId,
					relationKey,
					(joinAggregates && joinAggregates[entityId]) || 'latest'
				);
			}

			primaryRows = this._filterRows(primaryRows, filters.filter(function (f) {
				return f.entity === primaryEntityId;
			}), entityResolver);

			var outputColumns = columns.map(function (column) {
				var key = column.key || RM.ReportDataModel.columnKey(column.entity, column.field);
				return {
					key: key,
					label: column.label || RM.ReportDataModel.fieldDisplayLabel(column.entity, column.field)
				};
			});

			var outputRows = [];

			primaryRows.forEach(function (primaryRow) {
				var context = self._buildContext(primaryEntityId, primaryRow, joins, joinAggregates, filters);
				var joinedFilters = filters.filter(function (filter) {
					return filter.entity !== primaryEntityId && joinAggregates[filter.entity] !== 'count';
				});
				if (joinedFilters.length) {
					var passes = joinedFilters.every(function (filter) {
						var source = context[filter.entity];
						if (!source) { return false; }
						return self._matchesFilter(source[filter.field], filter);
					});
					if (!passes) { return; }
				}

				var row = {};
				columns.forEach(function (column, index) {
					var key = outputColumns[index].key;
					var raw = self._readColumnValue(column, context, primaryEntityId);
					row[key] = self.formatValue(column.entity, column.field, raw);
				});
				outputRows.push(row);
			});

			if (sortBy && sortBy.field) {
				var sortKey = sortBy.entity
					? RM.ReportDataModel.columnKey(sortBy.entity, sortBy.field)
					: sortBy.field;
				outputRows.sort(function (a, b) {
					var cmp = compareValues(a[sortKey], b[sortKey]);
					return sortBy.dir === 'desc' ? -cmp : cmp;
				});
			}

			return {
				columns: outputColumns,
				rows: outputRows,
				meta: {
					primaryEntity: primaryEntityId,
					rowCount: outputRows.length
				}
			};
		},

		collectContexts: function (config, user) {
			config = config || {};
			var primaryEntityId = config.primaryEntity || 'client';
			var joins = config.joins || [];
			var filters = config.filters || [];
			var joinAggregates = config.joinAggregates || {};
			var primaryRows = this._scopePrimaryRows(primaryEntityId, this._getRepoRows(primaryEntityId), user);
			var self = this;
			var contexts = [];

			function entityResolver(entityId, primaryRow) {
				if (entityId === primaryEntityId) { return primaryRow; }
				var relationKey = RM.ReportDataModel.resolveRelationKey(primaryEntityId, entityId);
				if (!relationKey) { return null; }
				return self._resolveRelated(
					primaryEntityId,
					primaryRow,
					entityId,
					relationKey,
					(joinAggregates && joinAggregates[entityId]) || 'latest'
				);
			}

			primaryRows = this._filterRows(primaryRows, filters.filter(function (f) {
				return f.entity === primaryEntityId;
			}), entityResolver);

			primaryRows.forEach(function (primaryRow) {
				var context = self._buildContext(primaryEntityId, primaryRow, joins, joinAggregates, filters);
				var joinedFilters = filters.filter(function (filter) {
					return filter.entity !== primaryEntityId && joinAggregates[filter.entity] !== 'count';
				});
				if (joinedFilters.length) {
					var passes = joinedFilters.every(function (filter) {
						var source = context[filter.entity];
						if (!source) { return false; }
						return self._matchesFilter(source[filter.field], filter);
					});
					if (!passes) { return; }
				}
				contexts.push(context);
			});

			return contexts;
		},

		suggestChartType: function (xAxis, yAxis) {
			if (!xAxis) { return 'bar'; }
			var xField = RM.ReportDataModel.fieldMeta(xAxis.entity, xAxis.field);
			var aggregate = (yAxis && yAxis.aggregate) || 'count';
			if (yAxis && yAxis.cumulative) { return 'line'; }
			if (xField && xField.type === 'date') { return 'line'; }
			if (aggregate === 'count' && xField && xField.type !== 'number') { return 'bar'; }
			return 'bar';
		},

		suggestAggregate: function (yAxis) {
			if (!yAxis || !yAxis.field) { return 'count'; }
			if (yAxis.field === '__count') { return 'sum'; }
			return RM.ReportDataModel.fieldRole(yAxis.entity, yAxis.field) === 'measure' ? 'sum' : 'count';
		},

		aggregateDefinitions: function () {
			return [
				{ id: 'count', needsMeasure: false, supportsCumulative: true },
				{ id: 'distinct', needsMeasure: false, supportsCumulative: false },
				{ id: 'sum', needsMeasure: true, supportsCumulative: true },
				{ id: 'avg', needsMeasure: true, supportsCumulative: false },
				{ id: 'min', needsMeasure: true, supportsCumulative: false },
				{ id: 'max', needsMeasure: true, supportsCumulative: false }
			];
		},

		aggregateNeedsMeasure: function (aggregate) {
			var match = this.aggregateDefinitions().find(function (item) { return item.id === aggregate; });
			return match ? match.needsMeasure : false;
		},

		aggregateSupportsCumulative: function (aggregate) {
			var match = this.aggregateDefinitions().find(function (item) { return item.id === aggregate; });
			return match ? match.supportsCumulative : false;
		},

		_resolveXBucket: function (xRaw, xAxis, xGrouping) {
			var xField = RM.ReportDataModel.fieldMeta(xAxis.entity, xAxis.field);
			var formatted = this.formatValue(xAxis.entity, xAxis.field, xRaw);
			if (formatted === '') { formatted = '(blank)'; }

			if (!xGrouping || xGrouping === 'none' || !xField || xField.type !== 'date' || xRaw == null || xRaw === '') {
				return { label: formatted, sortKey: xRaw };
			}

			var parsed = new Date(xRaw);
			if (isNaN(parsed.getTime())) {
				return { label: formatted, sortKey: xRaw };
			}

			if (xGrouping === 'month') {
				var monthKey = parsed.getFullYear() + '-' + String(parsed.getMonth() + 1).padStart(2, '0');
				return { label: monthKey, sortKey: monthKey };
			}

			if (xGrouping === 'year') {
				var year = parsed.getFullYear();
				return { label: String(year), sortKey: year };
			}

			return { label: formatted, sortKey: xRaw };
		},

		_createChartBucket: function (label, sortKey) {
			return {
				label: label,
				sortKey: sortKey,
				n: 0,
				sum: 0,
				count: 0,
				min: null,
				max: null,
				distinctKeys: {}
			};
		},

		_addChartBucketRow: function (bucket, aggregate, yAxis, context, primaryEntityId) {
			bucket.n += 1;

			if (aggregate === 'count') {
				return;
			}

			if (aggregate === 'distinct') {
				var distinctKey;
				if (yAxis.field) {
					distinctKey = this._readColumnValue({ entity: yAxis.entity, field: yAxis.field }, context, primaryEntityId);
				} else {
					var primaryRow = context[primaryEntityId];
					distinctKey = primaryRow && primaryRow.id != null ? primaryRow.id : bucket.n;
				}
				bucket.distinctKeys[String(distinctKey)] = true;
				return;
			}

			if (!yAxis.field) { return; }

			var yRaw = this._readColumnValue({ entity: yAxis.entity, field: yAxis.field }, context, primaryEntityId);
			var num = Number(yRaw);
			if (isNaN(num)) { return; }

			bucket.sum += num;
			bucket.count += 1;
			if (bucket.min === null || num < bucket.min) { bucket.min = num; }
			if (bucket.max === null || num > bucket.max) { bucket.max = num; }
		},

		_finalizeChartBucket: function (bucket, aggregate) {
			if (aggregate === 'count') { return bucket.n; }
			if (aggregate === 'distinct') { return Object.keys(bucket.distinctKeys).length; }
			if (aggregate === 'sum') { return bucket.sum; }
			if (aggregate === 'avg') {
				return bucket.count ? Math.round((bucket.sum / bucket.count) * 10) / 10 : 0;
			}
			if (aggregate === 'min') { return bucket.min != null ? bucket.min : 0; }
			if (aggregate === 'max') { return bucket.max != null ? bucket.max : 0; }
			return bucket.n;
		},

		_applyCumulativePoints: function (points) {
			var running = 0;
			points.forEach(function (point) {
				running += point.value;
				point.value = running;
			});
		},

		_chartYLabel: function (aggregate, cumulative, yAxis, primaryEntityId) {
			var countLabel = RM.I18n ? RM.I18n.t('pages.reportBuilder.recordCount') : 'Record count';
			var entityLabel = RM.ReportDataModel.label(primaryEntityId);
			var fieldLabel = yAxis.field
				? RM.ReportDataModel.fieldDisplayLabel(yAxis.entity, yAxis.field)
				: countLabel;

			if (aggregate === 'count' || (!yAxis.field && aggregate !== 'distinct')) {
				if (cumulative) {
					return RM.I18n
						? RM.I18n.t('pages.reportBuilder.cumulativeCountLabel', { entity: entityLabel })
						: ('Cumulative ' + entityLabel + ' count');
				}
				return countLabel;
			}

			if (aggregate === 'distinct') {
				return yAxis.field
					? (RM.I18n ? RM.I18n.t('pages.reportBuilder.distinctFieldLabel', { field: fieldLabel }) : ('Distinct ' + fieldLabel))
					: (RM.I18n ? RM.I18n.t('pages.reportBuilder.distinctRecordsLabel', { entity: entityLabel }) : ('Distinct ' + entityLabel));
			}

			var suffixKey = 'pages.reportBuilder.aggregateSuffix.' + aggregate;
			var suffix = RM.I18n ? RM.I18n.t(suffixKey) : aggregate;
			if (cumulative && aggregate === 'sum') {
				return RM.I18n
					? RM.I18n.t('pages.reportBuilder.cumulativeSumLabel', { field: fieldLabel })
					: ('Cumulative ' + fieldLabel);
			}
			return fieldLabel + ' (' + suffix + ')';
		},

		runChart: function (config, user, parameterValues) {
			config = RM.ReportBuilderParams
				? RM.ReportBuilderParams.applyToConfig(config, parameterValues)
				: (config || {});
			config = config || {};
			var synced = RM.ReportDataModel.syncJoinsFromReportConfig(config);
			config = Object.assign({}, config, synced);
			var chart = config.chart || {};
			var xAxis = chart.xAxis;
			var yAxis = chart.yAxis || { aggregate: 'count' };

			if (!xAxis) {
				return { error: 'missing_x', points: [], chartType: chart.chartType || 'bar' };
			}

			var aggregate = yAxis.aggregate || this.suggestAggregate(yAxis);
			var cumulative = !!(yAxis.cumulative && this.aggregateSupportsCumulative(aggregate));
			if (this.aggregateNeedsMeasure(aggregate) && !yAxis.field) {
				aggregate = 'count';
				cumulative = false;
			}
			var xGrouping = chart.xGrouping || 'none';
			var primaryEntityId = config.primaryEntity || 'client';
			var contexts = this.collectContexts(config, user);
			var groups = {};
			var self = this;

			contexts.forEach(function (context) {
				var xRaw = self._readColumnValue({ entity: xAxis.entity, field: xAxis.field }, context, primaryEntityId);
				var bucketInfo = self._resolveXBucket(xRaw, xAxis, xGrouping);
				var bucketKey = bucketInfo.label;

				if (!groups[bucketKey]) {
					groups[bucketKey] = self._createChartBucket(bucketInfo.label, bucketInfo.sortKey);
				}

				self._addChartBucketRow(groups[bucketKey], aggregate, yAxis, context, primaryEntityId);
			});

			var points = Object.keys(groups).map(function (key) {
				var bucket = groups[key];
				return {
					label: bucket.label,
					value: self._finalizeChartBucket(bucket, aggregate),
					sortKey: bucket.sortKey
				};
			});

			var chartType = chart.chartType || this.suggestChartType(xAxis, yAxis);
			if (chartType === 'pie') { chartType = 'donut'; }

			if (cumulative || chartType === 'line') {
				points.sort(function (a, b) { return compareValues(a.sortKey, b.sortKey); });
			} else {
				points.sort(function (a, b) { return b.value - a.value; });
			}

			if (cumulative) {
				this._applyCumulativePoints(points);
			}

			var colors = ['#2563eb', '#059669', '#7c3aed', '#db2777', '#d97706', '#0891b2', '#64748b', '#dc2626'];
			points.forEach(function (point, index) {
				point.color = colors[index % colors.length];
			});

			var xLabel = RM.ReportDataModel.fieldLabel(xAxis.entity, xAxis.field);
			if (xGrouping !== 'none') {
				var groupingLabel = RM.I18n ? RM.I18n.t('pages.reportBuilder.xGrouping.' + xGrouping) : xGrouping;
				xLabel += ' (' + groupingLabel + ')';
			}

			return {
				chartType: chartType,
				xLabel: xLabel,
				yLabel: this._chartYLabel(aggregate, cumulative, yAxis, primaryEntityId),
				aggregate: aggregate,
				cumulative: cumulative,
				xGrouping: xGrouping,
				points: points,
				meta: { rowCount: contexts.length, groupCount: points.length }
			};
		},

		previewFieldData: function (entityId, fieldId, user, options) {
			options = options || {};
			var self = this;
			var limit = options.limit || 25;
			var primaryEntityId = options.primaryEntityId || entityId;
			var meta = RM.ReportDataModel.fieldMeta(entityId, fieldId);

			if (fieldId === '__count__') {
				var primaryRows = this._scopePrimaryRows(primaryEntityId, this._getRepoRows(primaryEntityId), user);
				return {
					label: RM.I18n ? RM.I18n.t('pages.reportBuilder.recordCount') : 'Record count',
					entityLabel: RM.ReportDataModel.label(primaryEntityId),
					role: 'measure',
					type: 'count',
					totalRows: primaryRows.length,
					emptyCount: 0,
					distinctCount: 1,
					isRecordCount: true,
					values: [{
						value: String(primaryRows.length),
						count: primaryRows.length
					}]
				};
			}

			if (fieldId === '__count') {
				var scopedPrimary = this._scopePrimaryRows(primaryEntityId, this._getRepoRows(primaryEntityId), user);
				var countBuckets = {};
				scopedPrimary.forEach(function (row) {
					var ctx = self._buildContext(primaryEntityId, row, [entityId], { [entityId]: 'count' });
					var n = ctx[entityId] && ctx[entityId].__count != null ? ctx[entityId].__count : 0;
					var key = String(n);
					countBuckets[key] = (countBuckets[key] || 0) + 1;
				});
				var countValues = Object.keys(countBuckets).map(function (key) {
					return { value: key, count: countBuckets[key] };
				}).sort(function (a, b) { return b.count - a.count; });
				return {
					label: RM.ReportDataModel.fieldDisplayLabel(entityId, fieldId),
					entityLabel: RM.ReportDataModel.label(entityId),
					role: 'measure',
					type: 'count',
					totalRows: scopedPrimary.length,
					emptyCount: 0,
					distinctCount: countValues.length,
					values: countValues.slice(0, limit)
				};
			}

			var rows = this._scopePrimaryRows(entityId, this._getRepoRows(entityId), user);
			var emptyCount = 0;
			var valueCounts = {};

			rows.forEach(function (row) {
				var raw = row[fieldId];
				if (raw == null || raw === '') {
					emptyCount++;
					return;
				}
				var formatted = self.formatValue(entityId, fieldId, raw);
				var key = String(formatted);
				if (!valueCounts[key]) {
					valueCounts[key] = { value: formatted, count: 0 };
				}
				valueCounts[key].count++;
			});

			var values = Object.keys(valueCounts).map(function (key) {
				return valueCounts[key];
			}).sort(function (a, b) {
				return b.count - a.count || compareValues(a.value, b.value);
			});

			return {
				label: RM.ReportDataModel.fieldDisplayLabel(entityId, fieldId),
				entityLabel: RM.ReportDataModel.label(entityId),
				role: RM.ReportDataModel.fieldRole(entityId, fieldId),
				type: meta ? meta.type : 'text',
				totalRows: rows.length,
				emptyCount: emptyCount,
				distinctCount: values.length,
				values: values.slice(0, limit)
			};
		}
	};
})();
