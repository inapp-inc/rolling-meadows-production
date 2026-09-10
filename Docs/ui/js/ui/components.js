/* global RM */
(function () {
	'use strict';

	function t(key, params) { return RM.I18n.t(key, params); }

	RM.Components = {
		ICONS: {
			users: '<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
			clock: '<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
			clipboard: '<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>',
			link: '<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
			bell: '<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>',
			chart: '<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>',
			check: '<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>',
			download: '<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
			trendUp: '<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>',
			image: '<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
			spreadsheet: '<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>',
			plus: '<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
			save: '<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>',
			play: '<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polygon points="5 3 19 12 5 21 5 3"/></svg>'
		},

		icon: function (name) {
			return this.ICONS[name] || this.ICONS.chart;
		},

		escapeHtml: function (str) {
			var div = document.createElement('div');
			div.textContent = str == null ? '' : String(str);
			return div.innerHTML;
		},

		tableResponsive: function (tableHtml) {
			return '<div class="table-responsive">' + tableHtml + '</div>';
		},

		riskBadge: function (level) {
			var cls = 'risk-badge risk-' + (level || 'unknown').toLowerCase();
			var icon = level === 'High' ? '●' : level === 'Medium' || level === 'Moderate' ? '◐' : '○';
			var label = RM.I18n.riskLabel(level);
			return '<span class="' + cls + '" aria-label="' + this.escapeHtml(t('risk.riskLevelAria', { level: label })) + '">' +
				'<span class="risk-icon" aria-hidden="true">' + icon + '</span> ' +
				this.escapeHtml(label) + '</span>';
		},

		workflowStageBadge: function (client) {
			if (!client || !RM.Workflow) {
				return '';
			}
			var status = RM.Workflow.getStatus(client);
			return '<span class="workflow-stage-badge" data-stage="' + status.stage + '" title="' + this.escapeHtml(t('components.processStageTitle')) + '">' +
				this.escapeHtml(status.shortLabel || status.label) + '</span>';
		},

		processStageBadge: function (client) {
			return this.workflowStageBadge(client);
		},

		workflowStageLabel: function (client) {
			if (!client || !RM.Workflow) {
				return '';
			}
			return RM.Workflow.getStatus(client).label;
		},

		caseCategoryLabel: function (client) {
			if (!client || !RM.CaseCategories) {
				return '—';
			}
			var cat = RM.CaseCategories.categoryLabel(client.caseCategoryId);
			var sub = RM.CaseCategories.subcategoryLabel(client.caseSubcategoryId);
			return cat + ' · ' + sub;
		},

		caseCategoryBadge: function (client) {
			if (!client || !client.caseCategoryId) {
				return '';
			}
			return '<span class="case-category-badge" title="' + this.escapeHtml(t('components.caseCategoryTitle')) + '">' +
				this.escapeHtml(this.caseCategoryLabel(client)) + '</span>';
		},

		stepStatusPill: function (status, label) {
			return '<span class="step-status-pill step-status-' + (status || 'not_started') + '">' +
				this.escapeHtml(label != null && label !== '' ? label : RM.I18n.stepStatusLabel(status)) + '</span>';
		},

		emptyState: function (title, message) {
			return '<div class="empty-state" role="status">' +
				'<h3>' + this.escapeHtml(title) + '</h3>' +
				'<p>' + this.escapeHtml(message) + '</p></div>';
		},

		pageHeader: function (title, options) {
			options = options || {};
			var moduleCrumb = options.moduleId && RM.Modules
				? '<p class="page-module-crumb">' + this.escapeHtml(RM.Modules.labelForModule(options.moduleId)) + '</p>'
				: (options.moduleLabel
					? '<p class="page-module-crumb">' + this.escapeHtml(options.moduleLabel) + '</p>'
					: '');
			var lead = options.lead
				? '<p class="page-lead">' + this.escapeHtml(options.lead) + '</p>'
				: '';
			return '<div class="page-header"><div>' + moduleCrumb +
				'<h1>' + this.escapeHtml(title) + '</h1>' + lead +
				'</div></div>';
		},

		modulePageHeader: function (navId, titleOverride) {
			var item = RM.Modules && RM.Modules.navItem(navId);
			var title = titleOverride || (item ? item.label : '');
			var moduleId = item ? item.moduleId : null;
			return this.pageHeader(title, { moduleId: moduleId });
		},

		statCard: function (value, label, iconName, variant, goHref) {
			var goAttr = goHref ? ' data-go="' + goHref + '"' : '';
			return '<div class="stat-card stat-' + (variant || 'primary') + '"' + goAttr + '>' +
				'<div class="stat-card-inner">' +
				'<div><div class="stat-value">' + value + '</div>' +
				'<div class="stat-label">' + this.escapeHtml(label) + '</div></div>' +
				'<div class="stat-icon">' + this.icon(iconName) + '</div>' +
				'</div></div>';
		},

		showToast: function (message, type) {
			type = type || 'success';
			var container = document.getElementById('toast-container');
			if (!container) {
				container = document.createElement('div');
				container.id = 'toast-container';
				container.className = 'toast-container';
				container.setAttribute('aria-live', 'polite');
				container.setAttribute('aria-atomic', 'true');
				document.body.appendChild(container);
			}
			var toast = document.createElement('div');
			toast.className = 'toast toast-' + type;
			toast.innerHTML = (type === 'success' ? this.icon('check') : '') +
				'<span>' + this.escapeHtml(message) + '</span>';
			container.appendChild(toast);
			window.requestAnimationFrame(function () { toast.classList.add('show'); });
			window.setTimeout(function () {
				toast.classList.remove('show');
				window.setTimeout(function () {
					if (toast.parentNode) { toast.parentNode.removeChild(toast); }
				}, 300);
			}, 3200);
		},

		alert: function (type, message) {
			return '<div class="alert alert-' + type + '" role="alert">' + this.escapeHtml(message) + '</div>';
		},

		alertHtml: function (type, html) {
			return '<div class="alert alert-' + type + '" role="alert">' + html + '</div>';
		},

		matchConfidenceBadge: function (score) {
			var label = score >= 50 ? t('components.matchStrong') : score >= 35 ? t('components.matchLikely') : t('components.matchPossible');
			var cls = score >= 50 ? 'confidence-high' : score >= 35 ? 'confidence-medium' : 'confidence-low';
			return '<span class="match-confidence ' + cls + '" title="' + this.escapeHtml(t('components.matchScoreTitle', { score: score })) + '">' +
				this.escapeHtml(label) + ' ' + t('components.matchSuffix') + '</span>';
		},

		renderDedupMatches: function (matches, options) {
			options = options || {};
			if (!matches.length) { return ''; }
			var self = this;
			var items = matches.map(function (m) {
				return '<li><strong>' + self.escapeHtml(m.client.name) + '</strong> ' +
					self.matchConfidenceBadge(m.score) + ' · ' + t('components.matchedOn') + ' ' +
					self.escapeHtml(m.matchedFields.join(', ')) +
					(options.linkClient ?
						' · <a href="#" class="dedup-open-link" data-client-id="' + self.escapeHtml(m.client.id) + '">' + t('components.openRecord') + '</a>' :
						'') +
					'</li>';
			}).join('');
			return this.alertHtml('warning',
				'<strong>' + (matches.length > 1 ? t('components.possibleDuplicates') : t('components.possibleDuplicate')) + '</strong>' +
				'<ul class="dedup-match-list">' + items + '</ul>');
		},

		renderCrossProgramFlag: function (flag) {
			if (!flag) { return ''; }
			return this.alertHtml('warning',
				'<strong>' + t('components.crossProgramFlag') + '</strong> — ' + this.escapeHtml(RM.CrossProgramFlagService.formatMessage(flag)));
		},

		voidedLabel: function (item) {
			if (!item || !item.voided) { return ''; }
			return ' <span class="voided-label">' + this.escapeHtml(t('components.voidedPrefix')) + ' ' +
				this.escapeHtml(item.voidReason || t('components.noReason')) + '</span>';
		},

		renderActivityLog: function (entries) {
			if (!entries.length) {
				return this.emptyState(t('components.noActivityTitle'), t('components.noActivityMessage'));
			}
			var self = this;
			return '<ul class="activity-log">' + entries.map(function (entry) {
				return '<li class="activity-entry">' +
					'<span class="activity-action">' + self.escapeHtml(entry.actionLabel || entry.action) + '</span>' +
					'<span class="activity-meta">' + self.escapeHtml(entry.actorName) + ' · ' +
					self.formatDate(entry.timestamp) +
					(entry.reason ? ' · ' + t('components.reasonPrefix') + ' ' + self.escapeHtml(entry.reason) : '') +
					'</span></li>';
			}).join('') + '</ul>';
		},

		renderRatingsCompare: function (previousRatings, newRatings, client) {
			var self = this;
			var domains = client && RM.CaseForm
				? RM.CaseForm.ratingDomainKeys(client, previousRatings || newRatings)
				: RM.FormHelpers.DOMAINS;
			var rows = domains.map(function (domain) {
				var prev = previousRatings ? previousRatings[domain] : null;
				var curr = newRatings ? newRatings[domain] : null;
				if (!prev && !curr) { return ''; }
				var changed = prev && curr && prev !== curr;
				function cell(val) {
					return val ? self.riskBadge(val) : '—';
				}
				var label = RM.CaseForm ? RM.CaseForm.domainLabel(domain) : RM.FormHelpers.formatDomain(domain);
				return '<tr class="' + (changed ? 'compare-changed' : '') + '">' +
					'<td>' + self.escapeHtml(label) + '</td>' +
					'<td>' + cell(prev) + '</td><td>' + cell(curr) + '</td>' +
					'<td>' + (changed ? '<span class="compare-delta">' + t('components.changed') + '</span>' : '') + '</td></tr>';
			}).join('');
			return '<table class="data-table compare-table"><thead><tr><th>' + t('components.domain') + '</th><th>' +
				t('components.previous') + '</th><th>' + t('components.current') + '</th><th></th></tr></thead><tbody>' +
				rows + '</tbody></table>';
		},

		exportCsv: function (filename, rows, columns) {
			if (!rows.length) {
				this.showToast(t('components.noDataExport'), 'warning');
				return;
			}
			var header = columns.map(function (c) { return c.label; }).join(',');
			var lines = rows.map(function (row) {
				return columns.map(function (c) {
					var val = row[c.key];
					val = val == null ? '' : String(val);
					if (val.indexOf(',') !== -1 || val.indexOf('"') !== -1) {
						val = '"' + val.replace(/"/g, '""') + '"';
					}
					return val;
				}).join(',');
			});
			var csv = [header].concat(lines).join('\n');
			var blob = new Blob([csv], { type: 'text/csv' });
			var a = document.createElement('a');
			a.href = URL.createObjectURL(blob);
			a.download = filename;
			a.click();
			URL.revokeObjectURL(a.href);
		},

		exportXlsx: function (filename, rows, columns, options) {
			options = options || {};
			if (!rows.length) {
				this.showToast(t('components.noDataExport'), 'warning');
				return;
			}
			if (typeof ExcelJS === 'undefined') {
				this.exportCsv(String(filename).replace(/\.xlsx$/i, '.csv'), rows, columns);
				this.showToast(t('components.spreadsheetUnavailable'), 'warning');
				return;
			}

			var self = this;
			var workbook = new ExcelJS.Workbook();
			workbook.creator = 'Rolling Meadows Case Management';
			workbook.created = new Date();
			var sheet = workbook.addWorksheet((options.sheetName || 'Data').substring(0, 31));
			var startRow = 1;

			if (options.title) {
				sheet.mergeCells(1, 1, 1, columns.length);
				var titleCell = sheet.getCell(1, 1);
				titleCell.value = options.title;
				titleCell.font = { bold: true, size: 14, color: { argb: 'FF1A3A5C' } };
				titleCell.alignment = { vertical: 'middle' };
				sheet.getRow(1).height = 28;
				startRow = 2;
			}

			sheet.columns = columns.map(function (c) {
				return {
					key: c.key,
					width: Math.min(Math.max(String(c.label).length + 4, 14), 42)
				};
			});

			var headerRow = sheet.getRow(startRow);
			columns.forEach(function (c, index) {
				var cell = headerRow.getCell(index + 1);
				cell.value = c.label;
				cell.font = { bold: true, color: { argb: 'FF1A3A5C' } };
				cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEF4FB' } };
				cell.border = { bottom: { style: 'thin', color: { argb: 'FFC5D4E8' } } };
				cell.alignment = { vertical: 'middle' };
			});
			headerRow.height = 22;

			rows.forEach(function (row, rowIndex) {
				var dataRow = sheet.getRow(startRow + 1 + rowIndex);
				columns.forEach(function (c, index) {
					var value = row[c.key];
					dataRow.getCell(index + 1).value = value == null ? '' : value;
				});
				if (rowIndex % 2 === 1) {
					dataRow.eachCell({ includeEmpty: true }, function (cell) {
						cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
					});
				}
			});

			if (rows.length) {
				sheet.autoFilter = {
					from: { row: startRow, column: 1 },
					to: { row: startRow + rows.length, column: columns.length }
				};
			}
			sheet.views = [{ state: 'frozen', ySplit: startRow }];

			workbook.xlsx.writeBuffer().then(function (buffer) {
				var blob = new Blob([buffer], {
					type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
				});
				var outName = String(filename);
				if (!/\.xlsx$/i.test(outName)) {
					outName = outName.replace(/\.csv$/i, '').replace(/\.xlsx$/i, '') + '.xlsx';
				}
				var a = document.createElement('a');
				a.href = URL.createObjectURL(blob);
				a.download = outName;
				a.click();
				URL.revokeObjectURL(a.href);
			}).catch(function () {
				self.showToast(t('components.exportSpreadsheetFailed'), 'warning');
			});
		},

		downloadActionMarkup: function (kind) {
			var download = this.icon('download');
			if (kind === 'image') {
				return '<span class="download-icon-combo" aria-hidden="true">' +
					'<span class="download-icon-combo-item">' + download + '</span>' +
					'<span class="download-icon-combo-item">' + this.icon('image') + '</span>' +
					'</span>';
			}
			return '<span class="download-icon-combo" aria-hidden="true">' +
				'<span class="download-icon-combo-item">' + download + '</span>' +
				'<span class="download-icon-combo-label">XLSX</span>' +
				'</span>';
		},

		downloadBar: function (options) {
			options = options || {};
			var parts = [];
			var spreadsheetId = options.spreadsheetId || options.csvId;
			if (options.imageTarget) {
				parts.push('<button type="button" class="download-icon-btn download-icon-btn--combo" data-download-image="' +
					this.escapeHtml(options.imageTarget) + '" aria-label="' + this.escapeHtml(RM.I18n.t('export.downloadImage')) +
					'" title="' + this.escapeHtml(RM.I18n.t('export.downloadImage')) + '">' +
					this.downloadActionMarkup('image') + '</button>');
			}
			if (spreadsheetId) {
				parts.push('<button type="button" class="download-icon-btn download-icon-btn--combo" data-download-spreadsheet="' +
					this.escapeHtml(spreadsheetId) + '" aria-label="' + this.escapeHtml(RM.I18n.t('export.downloadXlsx')) +
					'" title="' + this.escapeHtml(RM.I18n.t('export.downloadXlsx')) + '">' +
					this.downloadActionMarkup('spreadsheet') + '</button>');
			}
			if (!parts.length) { return ''; }
			return '<div class="download-actions">' + parts.join('') + '</div>';
		},

		wireDownloadActions: function (root, handlers) {
			root = root || document;
			handlers = handlers || {};
			var spreadsheetHandlers = handlers.spreadsheet || handlers.csv || {};
			root.querySelectorAll('[data-download-image]').forEach(function (btn) {
				btn.addEventListener('click', function () {
					var targetId = btn.getAttribute('data-download-image');
					if (handlers.images && handlers.images[targetId]) {
						handlers.images[targetId]();
						return;
					}
					var el = document.getElementById(targetId);
					RM.Components.exportElementAsPng(el, targetId + '.png');
				});
			});
			root.querySelectorAll('[data-download-spreadsheet]').forEach(function (btn) {
				btn.addEventListener('click', function () {
					var id = btn.getAttribute('data-download-spreadsheet');
					if (spreadsheetHandlers[id]) {
						spreadsheetHandlers[id]();
					}
				});
			});
		},

		_downloadBlob: function (blob, filename) {
			var a = document.createElement('a');
			a.href = URL.createObjectURL(blob);
			a.download = filename;
			a.click();
			URL.revokeObjectURL(a.href);
		},

		exportCanvasAsPng: function (canvas, filename) {
			var self = this;
			try {
				canvas.toBlob(function (blob) {
					if (blob) {
						self._downloadBlob(blob, filename);
						return;
					}
					self._downloadCanvasDataUrl(canvas, filename);
				}, 'image/png');
			} catch (e) {
				self._downloadCanvasDataUrl(canvas, filename);
			}
		},

		_downloadCanvasDataUrl: function (canvas, filename) {
			try {
				this._downloadBlob(this._dataUrlToBlob(canvas.toDataURL('image/png')), filename);
			} catch (e) {
				this.showToast(t('components.exportImageFailed'), 'warning');
			}
		},

		_dataUrlToBlob: function (dataUrl) {
			var parts = dataUrl.split(',');
			var mime = parts[0].match(/:(.*?);/)[1];
			var binary = atob(parts[1]);
			var len = binary.length;
			var buffer = new Uint8Array(len);
			var i;
			for (i = 0; i < len; i++) {
				buffer[i] = binary.charCodeAt(i);
			}
			return new Blob([buffer], { type: mime });
		},

		_measureCanvasText: function (ctx, text, maxWidth) {
			text = text == null ? '' : String(text);
			if (!maxWidth || ctx.measureText(text).width <= maxWidth) {
				return text;
			}
			while (text.length > 1 && ctx.measureText(text + '…').width > maxWidth) {
				text = text.slice(0, -1);
			}
			return text + '…';
		},

		exportDataTablePng: function (title, columns, rows, filename, options) {
			options = options || {};
			if (!rows.length) {
				this.showToast(t('components.noDataExport'), 'warning');
				return;
			}
			var pad = 24;
			var rowH = 34;
			var headerH = 36;
			var titleBlockH = options.subtitle ? 72 : 52;
			var colWidths = columns.map(function (c) {
				var max = String(c.label).length;
				rows.forEach(function (row) {
					var value = String(row[c.key] == null ? '' : row[c.key]);
					if (value.length > max) { max = value.length; }
				});
				return Math.min(Math.max(max * 7 + 28, 88), 240);
			});
			var width = Math.max(pad * 2 + colWidths.reduce(function (sum, w) { return sum + w; }, 0), 420);
			var height = titleBlockH + headerH + rows.length * rowH + pad;
			var scale = 2;
			var canvas = document.createElement('canvas');
			canvas.width = width * scale;
			canvas.height = height * scale;
			var ctx = canvas.getContext('2d');
			ctx.scale(scale, scale);
			ctx.fillStyle = '#ffffff';
			ctx.fillRect(0, 0, width, height);
			ctx.fillStyle = '#1a3a5c';
			ctx.font = '700 18px Arial';
			ctx.fillText(title, pad, 30);
			if (options.subtitle) {
				ctx.fillStyle = '#64748b';
				ctx.font = '600 13px Arial';
				ctx.fillText(options.subtitle, pad, 52);
			}
			var y = titleBlockH;
			var x = pad;
			columns.forEach(function (c, index) {
				ctx.fillStyle = '#eef4fb';
				ctx.fillRect(x, y, colWidths[index], headerH);
				ctx.fillStyle = '#1a3a5c';
				ctx.font = '700 12px Arial';
				ctx.fillText(c.label, x + 10, y + 22);
				x += colWidths[index];
			});
			rows.forEach(function (row, rowIndex) {
				var rowY = y + headerH + rowIndex * rowH;
				x = pad;
				columns.forEach(function (c, index) {
					if (rowIndex % 2 === 1) {
						ctx.fillStyle = '#f8fafc';
						ctx.fillRect(x, rowY, colWidths[index], rowH);
					}
					ctx.fillStyle = '#334155';
					ctx.font = '600 13px Arial';
					ctx.fillText(
						this._measureCanvasText(ctx, row[c.key], colWidths[index] - 16),
						x + 10,
						rowY + 22
					);
					x += colWidths[index];
				}, this);
			}, this);
			this.exportCanvasAsPng(canvas, filename);
		},

		exportSummaryPanelsPng: function (title, lead, panels, filename) {
			if (!panels.length) {
				this.showToast(t('components.noDataExport'), 'warning');
				return;
			}
			var pad = 24;
			var panelGap = 20;
			var panelWidth = 300;
			var rowH = 30;
			var headerH = 34;
			var width = pad * 2 + panels.length * panelWidth + (panels.length - 1) * panelGap;
			var panelHeights = panels.map(function (panel) {
				return 52 + headerH + panel.rows.length * rowH + 16;
			});
			var height = 72 + Math.max.apply(null, panelHeights) + pad;
			var scale = 2;
			var canvas = document.createElement('canvas');
			canvas.width = width * scale;
			canvas.height = height * scale;
			var ctx = canvas.getContext('2d');
			ctx.scale(scale, scale);
			ctx.fillStyle = '#ffffff';
			ctx.fillRect(0, 0, width, height);
			ctx.fillStyle = '#1a3a5c';
			ctx.font = '700 18px Arial';
			ctx.fillText(title, pad, 30);
			ctx.fillStyle = '#64748b';
			ctx.font = '600 13px Arial';
			ctx.fillText(lead, pad, 54);
			panels.forEach(function (panel, panelIndex) {
				var x = pad + panelIndex * (panelWidth + panelGap);
				var y = 72;
				ctx.fillStyle = '#1a3a5c';
				ctx.font = '700 14px Arial';
				ctx.fillText(panel.title, x, y + 18);
				y += 34;
				ctx.fillStyle = '#eef4fb';
				ctx.fillRect(x, y, panelWidth, headerH);
				ctx.fillStyle = '#1a3a5c';
				ctx.font = '700 12px Arial';
				ctx.fillText(t('components.exportItem'), x + 10, y + 22);
				ctx.fillText(t('components.exportCount'), x + panelWidth - 56, y + 22);
				panel.rows.forEach(function (row, rowIndex) {
					var rowY = y + headerH + rowIndex * rowH;
					if (rowIndex % 2 === 1) {
						ctx.fillStyle = '#f8fafc';
						ctx.fillRect(x, rowY, panelWidth, rowH);
					}
					ctx.fillStyle = '#334155';
					ctx.font = '600 13px Arial';
					ctx.fillText(this._measureCanvasText(ctx, row.label, panelWidth - 90), x + 10, rowY + 20);
					ctx.fillText(String(row.value), x + panelWidth - 56, rowY + 20);
				}, this);
			}, this);
			this.exportCanvasAsPng(canvas, filename);
		},

		exportProgramImpactPng: function (metrics, filename) {
			var width = 760;
			var height = 360;
			var scale = 2;
			var canvas = document.createElement('canvas');
			canvas.width = width * scale;
			canvas.height = height * scale;
			var ctx = canvas.getContext('2d');
			ctx.scale(scale, scale);
			ctx.fillStyle = '#ffffff';
			ctx.fillRect(0, 0, width, height);
			ctx.fillStyle = '#1a3a5c';
			ctx.font = '700 20px Arial';
			ctx.fillText(t('dashboard.programImpact'), 24, 32);
			var cx = 92;
			var cy = 132;
			var radius = 58;
			var pct = metrics.intakeCompletePct / 100;
			ctx.beginPath();
			ctx.arc(cx, cy, radius, 0, Math.PI * 2);
			ctx.strokeStyle = '#e2e8f0';
			ctx.lineWidth = 12;
			ctx.stroke();
			ctx.beginPath();
			ctx.arc(cx, cy, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct);
			ctx.strokeStyle = '#10b981';
			ctx.lineWidth = 12;
			ctx.stroke();
			ctx.fillStyle = '#1a3a5c';
			ctx.font = '700 24px Arial';
			ctx.textAlign = 'center';
			ctx.fillText(metrics.intakeCompletePct + '%', cx, cy + 4);
			ctx.font = '600 11px Arial';
			ctx.fillStyle = '#64748b';
			ctx.fillText(t('dashboard.intakesComplete'), cx, cy + 22);
			ctx.textAlign = 'left';
			ctx.fillStyle = '#1a3a5c';
			ctx.font = '700 18px Arial';
			ctx.fillText(t('dashboard.successTitle'), 180, 88);
			ctx.fillStyle = '#475569';
			ctx.font = '600 13px Arial';
			var highlights = [
				t('dashboard.activeEnrollments', { count: metrics.serviceEnrollments }),
				t('dashboard.activeGoals', { count: metrics.activeGoals }),
				metrics.riskImprovements === 1
					? t('dashboard.riskImprovementCount', { count: metrics.riskImprovements })
					: t('dashboard.riskImprovementCountPlural', { count: metrics.riskImprovements })
			];
			highlights.forEach(function (line, index) {
				ctx.fillStyle = '#10b981';
				ctx.beginPath();
				ctx.arc(188, 118 + index * 28, 5, 0, Math.PI * 2);
				ctx.fill();
				ctx.fillStyle = '#334155';
				ctx.fillText(line, 204, 122 + index * 28);
			});
			var progressRows = [
				{ label: t('dashboard.intakesComplete'), pct: metrics.intakeCompletePct },
				{ label: t('dashboard.followUpsOnTrack'), pct: metrics.followUpOnTrackPct },
				{ label: t('dashboard.clientsReceivingServices'), pct: metrics.servicesConnectedPct }
			];
			var barY = 228;
			progressRows.forEach(function (row) {
				ctx.fillStyle = '#334155';
				ctx.font = '600 13px Arial';
				ctx.fillText(row.label, 24, barY);
				ctx.fillStyle = '#e5e7eb';
				ctx.fillRect(260, barY - 12, 420, 16);
				ctx.fillStyle = '#10b981';
				ctx.fillRect(260, barY - 12, Math.max(420 * (row.pct / 100), 4), 16);
				ctx.fillStyle = '#1a3a5c';
				ctx.font = '700 13px Arial';
				ctx.fillText(row.pct + '%', 696, barY);
				barY += 36;
			});
			this.exportCanvasAsPng(canvas, filename);
		},

		exportProgramOverviewPng: function (metrics, riskReport, total, stats, filename) {
			stats = stats || {};
			var colors = { High: '#ef4444', Medium: '#f59e0b', Moderate: '#d97706', Low: '#10b981', Unknown: '#94a3b8' };
			var width = 760;
			var rowHeight = 44;
			var height = 250 + (riskReport.length ? riskReport.length * rowHeight + 40 : 80);
			var scale = 2;
			var canvas = document.createElement('canvas');
			canvas.width = width * scale;
			canvas.height = height * scale;
			var ctx = canvas.getContext('2d');
			ctx.scale(scale, scale);
			ctx.fillStyle = '#ffffff';
			ctx.fillRect(0, 0, width, height);
			ctx.fillStyle = '#1a3a5c';
			ctx.font = '700 18px Arial';
			ctx.fillText(t('dashboard.programOverview'), 24, 30);
			var snapshots = [
				{ value: metrics.intakeCompletePct + '%', label: t('dashboard.intakesComplete') },
				{ value: metrics.followUpOnTrackPct + '%', label: t('dashboard.followUpsOnTrack') },
				{ value: String(metrics.clientsWithServices), label: t('dashboard.receivingServices') },
				{ value: String(metrics.cboConfirmed), label: t('dashboard.cboPartnersConfirmed') },
				{ value: String(total), label: t('dashboard.totalActive') },
				{ value: String(stats.highCount || 0), label: t('dashboard.highRisk') },
				{ value: String(stats.overdueLen || 0), label: t('dashboard.needFollowUp') },
				{ value: String(stats.incompleteLen || 0), label: t('dashboard.incompleteIntake') }
			];
			var snapX = 24;
			var snapY = 48;
			snapshots.forEach(function (snap, index) {
				if (index === 4) {
					snapX = 24;
					snapY += 58;
				}
				ctx.fillStyle = index < 4 ? '#ecfdf5' : '#f8fafc';
				ctx.fillRect(snapX, snapY, 168, 48);
				ctx.fillStyle = '#1a3a5c';
				ctx.font = '700 18px Arial';
				ctx.fillText(snap.value, snapX + 12, snapY + 22);
				ctx.font = '600 11px Arial';
				ctx.fillStyle = '#64748b';
				ctx.fillText(snap.label, snapX + 12, snapY + 38);
				snapX += 180;
			});
			var chartY = snapY + 72;
			ctx.fillStyle = '#1a3a5c';
			ctx.font = '700 15px Arial';
			ctx.fillText(t('dashboard.caseloadByRisk'), 24, chartY);
			if (!riskReport.length) {
				ctx.fillStyle = '#64748b';
				ctx.font = '600 13px Arial';
				ctx.fillText(t('dashboard.noRiskData'), 24, chartY + 28);
			} else {
				riskReport.forEach(function (r, index) {
					var y = chartY + 16 + index * rowHeight;
					var pct = total ? (r.count / total) : 0;
					ctx.fillStyle = '#1a3a5c';
					ctx.font = '600 13px Arial';
					ctx.fillText(RM.I18n.riskLabel(r.riskLevel), 24, y + 18);
					ctx.fillStyle = '#e5e7eb';
					ctx.fillRect(120, y, 560, 22);
					ctx.fillStyle = colors[r.riskLevel] || colors.Unknown;
					ctx.fillRect(120, y, Math.max(560 * pct, 4), 22);
					ctx.fillStyle = '#374151';
					ctx.font = '700 14px Arial';
					ctx.fillText(String(r.count), 700, y + 18);
				});
			}
			this.exportCanvasAsPng(canvas, filename);
		},

		exportElementAsPng: function (element, filename, options) {
			options = options || {};
			if (!element) {
				this.showToast(t('components.nothingToDownload'), 'warning');
				return;
			}
			if (options.title && options.columns && options.rows) {
				this.exportDataTablePng(options.title, options.columns, options.rows, filename, options);
				return;
			}
			var tables = element.querySelectorAll('table.data-table');
			if (tables.length === 1) {
				var columns = [];
				var headers = tables[0].querySelectorAll('thead th');
				headers.forEach(function (th, index) {
					columns.push({ key: 'c' + index, label: th.textContent.trim() });
				});
				var rows = [];
				tables[0].querySelectorAll('tbody tr').forEach(function (tr) {
					var row = {};
					tr.querySelectorAll('td').forEach(function (td, index) {
						row['c' + index] = td.textContent.trim();
					});
					rows.push(row);
				});
				var title = options.title || filename.replace(/\.png$/i, '').replace(/[-_]+/g, ' ');
				this.exportDataTablePng(title, columns, rows, filename, options);
				return;
			}
			if (tables.length >= 2) {
				var leadEl = element.querySelector('.liaison-results-summary');
				var lead = leadEl ? leadEl.textContent.trim() : '';
				var panels = [];
				element.querySelectorAll('.auditor-summary-grid > div').forEach(function (panelEl) {
					var heading = panelEl.querySelector('h3');
					var panelRows = [];
					panelEl.querySelectorAll('tbody tr').forEach(function (tr) {
						var cells = tr.querySelectorAll('td');
						if (cells.length >= 2) {
							panelRows.push({
								label: cells[0].textContent.trim(),
								value: cells[1].textContent.trim()
							});
						}
					});
					panels.push({
						title: heading ? heading.textContent.trim() : t('components.summary'),
						rows: panelRows
					});
				});
				if (panels.length) {
					this.exportSummaryPanelsPng(
						options.title || filename.replace(/\.png$/i, '').replace(/[-_]+/g, ' '),
						lead,
						panels,
						filename
					);
					return;
				}
			}
			this.showToast(t('components.nothingToExport'), 'warning');
		},

		exportRiskBarChartPng: function (report, total, filename) {
			var colors = { High: '#ef4444', Medium: '#f59e0b', Moderate: '#d97706', Low: '#10b981', Unknown: '#94a3b8' };
			var width = 760;
			var rowHeight = 44;
			var height = 56 + report.length * rowHeight;
			var canvas = document.createElement('canvas');
			canvas.width = width * 2;
			canvas.height = height * 2;
			var ctx = canvas.getContext('2d');
			ctx.scale(2, 2);
			ctx.fillStyle = '#ffffff';
			ctx.fillRect(0, 0, width, height);
			ctx.fillStyle = '#1a3a5c';
			ctx.font = '700 16px Arial';
			ctx.fillText(t('dashboard.caseloadByRisk'), 24, 28);
			report.forEach(function (r, index) {
				var y = 40 + index * rowHeight;
				var pct = total ? (r.count / total) : 0;
				ctx.fillStyle = '#1a3a5c';
				ctx.font = '600 13px Arial';
				ctx.fillText(RM.I18n.riskLabel(r.riskLevel), 24, y + 18);
				ctx.fillStyle = '#e5e7eb';
				ctx.fillRect(120, y, 560, 22);
				ctx.fillStyle = colors[r.riskLevel] || colors.Unknown;
				ctx.fillRect(120, y, Math.max(560 * pct, 4), 22);
				ctx.fillStyle = '#374151';
				ctx.font = '700 14px Arial';
				ctx.fillText(String(r.count), 700, y + 18);
			});
			this.exportCanvasAsPng(canvas, filename);
		},

		exportProgramDistributionBarChartPng: function (report, total, title, filename) {
			var width = 760;
			var rowHeight = 44;
			var height = 56 + report.length * rowHeight;
			var canvas = document.createElement('canvas');
			canvas.width = width * 2;
			canvas.height = height * 2;
			var ctx = canvas.getContext('2d');
			ctx.scale(2, 2);
			ctx.fillStyle = '#ffffff';
			ctx.fillRect(0, 0, width, height);
			ctx.fillStyle = '#1a3a5c';
			ctx.font = '700 16px Arial';
			ctx.fillText(title || t('pages.reports.clientsByProgram'), 24, 28);
			report.forEach(function (r, index) {
				var y = 40 + index * rowHeight;
				var pct = total ? (r.count / total) : 0;
				ctx.fillStyle = '#1a3a5c';
				ctx.font = '600 13px Arial';
				ctx.fillText(r.programLabel, 24, y + 18);
				ctx.fillStyle = '#e5e7eb';
				ctx.fillRect(180, y, 500, 22);
				if (r.count > 0) {
					ctx.fillStyle = r.color || RM.ReportEngine.programChartColor(r.programId, index);
					ctx.fillRect(180, y, Math.max(500 * pct, 4), 22);
				}
				ctx.fillStyle = '#374151';
				ctx.font = '700 14px Arial';
				ctx.fillText(String(r.count), 700, y + 18);
			});
			this.exportCanvasAsPng(canvas, filename);
		},

		exportDonutChartPng: function (report, total, filename) {
			var colors = { High: '#ef4444', Medium: '#f59e0b', Moderate: '#d97706', Low: '#10b981', Unknown: '#94a3b8' };
			var width = 520;
			var height = 280;
			var canvas = document.createElement('canvas');
			canvas.width = width * 2;
			canvas.height = height * 2;
			var ctx = canvas.getContext('2d');
			ctx.scale(2, 2);
			ctx.fillStyle = '#ffffff';
			ctx.fillRect(0, 0, width, height);
			var cx = 110;
			var cy = 140;
			var outer = 88;
			var inner = 56;
			var start = -Math.PI / 2;
			report.forEach(function (r) {
				var slice = total ? (r.count / total) * Math.PI * 2 : 0;
				if (slice <= 0) { return; }
				ctx.beginPath();
				ctx.arc(cx, cy, outer, start, start + slice);
				ctx.arc(cx, cy, inner, start + slice, start, true);
				ctx.closePath();
				ctx.fillStyle = colors[r.riskLevel] || colors.Unknown;
				ctx.fill();
				start += slice;
			});
			ctx.beginPath();
			ctx.arc(cx, cy, inner, 0, Math.PI * 2);
			ctx.fillStyle = '#ffffff';
			ctx.fill();
			ctx.strokeStyle = '#e5e7eb';
			ctx.lineWidth = 1;
			ctx.stroke();
			ctx.fillStyle = '#1a3a5c';
			ctx.font = '700 24px Arial';
			ctx.textAlign = 'center';
			ctx.fillText(String(total), cx, cy + 4);
			ctx.font = '600 11px Arial';
			ctx.fillStyle = '#64748b';
			ctx.fillText(t('dashboard.donutActive'), cx, cy + 20);
			ctx.textAlign = 'left';
			var legendY = 48;
			report.forEach(function (r) {
				ctx.fillStyle = colors[r.riskLevel] || colors.Unknown;
				ctx.beginPath();
				ctx.arc(240, legendY, 6, 0, Math.PI * 2);
				ctx.fill();
				ctx.fillStyle = '#334155';
				ctx.font = '600 13px Arial';
				ctx.fillText(RM.I18n.riskLabel(r.riskLevel) + ' (' + r.count + ')', 256, legendY + 4);
				legendY += 28;
			});
			this.exportCanvasAsPng(canvas, filename);
		},

		formatDate: function (iso) {
			if (RM.I18n && RM.I18n.formatDate) {
				return RM.I18n.formatDate(iso);
			}
			if (!iso) { return '—'; }
			try {
				return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
			} catch (e) {
				return iso;
			}
		},

		promptVoid: function (callback) {
			var reason = window.prompt(t('referralIntake.voidPrompt'));
			if (reason && reason.trim()) {
				callback(reason.trim());
			}
		},

		clientChipList: function (clients) {
			if (!clients.length) {
				return this.emptyState(t('components.noClientsTitle'), t('components.noClientsAtRisk'));
			}
			return '<div class="client-chip-list">' + clients.map(function (c) {
				var phone = c.phone || t('common.noPhone');
				return '<div class="client-chip">' +
					'<div><a href="' + RM.Links.page('client-profile', { clientId: c.id }) + '">' +
					RM.Components.escapeHtml(c.name) + '</a>' +
					'<span class="client-chip-meta">' + RM.Components.escapeHtml(phone) +
					' · ' + RM.Components.workflowStageBadge(c) +
					(c.incompleteIntake ? ' · <span class="incomplete-badge">' + t('components.incompleteIntake') + '</span>' : '') +
					'</span></div>' +
					'<a href="' + RM.Links.page('case-workspace', { clientId: c.id }) + '" class="btn btn-sm btn-secondary">' +
					t('components.openCase') + '</a></div>';
			}).join('') + '</div>';
		},

		clientInitials: function (name) {
			return (name || 'C').split(' ').map(function (p) { return p[0]; }).slice(0, 2).join('').toUpperCase();
		},

		drawerMetaRow: function (label, value) {
			return '<div class="client-drawer-meta-row"><dt>' + this.escapeHtml(label) + '</dt>' +
				'<dd>' + this.escapeHtml(value == null || value === '' ? '—' : String(value)) + '</dd></div>';
		},

		drawerSection: function (title, bodyHtml) {
			return '<div class="client-drawer-section"><h4>' + this.escapeHtml(title) + '</h4>' + bodyHtml + '</div>';
		},

		clientCaseDrawer: function (client, options) {
			options = options || {};
			var self = this;
			var cfg = RM.CaseForm.configForClient(client);
			var intakeCtx = RM.CaseForm.stageContext(client, 'intake');
			var assessmentCtx = RM.CaseForm.stageContext(client, 'assessment');
			var riskCtx = RM.CaseForm.stageContext(client, 'risk');
			var carePlanCtx = RM.CaseForm.stageContext(client, 'careplan');
			var followupCtx = RM.CaseForm.stageContext(client, 'followup');
			var workflow = RM.CaseWorkflow.forClient(client);
			var assessment = RM.RiskAssessmentRepository.findLatest(client.id);
			var intake = RM.IntakeRepository.findByClientId(client.id);
			var referral = RM.ReferralRepository.findByClientId(client.id)[0];
			var notes = RM.CaseNoteRepository.findByClientId(client.id);
			var latestNote = notes.length
				? notes.slice().sort(function (a, b) { return b.date.localeCompare(a.date); })[0]
				: null;
			var carePlans = RM.CarePlanRepository.findByClientId(client.id);
			var cm = RM.UserRepository.findById(client.caseManagerId);
			var closure = RM.CaseClosureRepository.findByClientId(client.id);
			var workspaceUrl = RM.Links.page('case-workspace', {
				clientId: client.id,
				tab: options.workspaceTab || undefined
			});

			var html =
				'<div class="client-drawer-summary">' +
				'<div class="client-drawer-header">' +
				'<div class="profile-avatar client-drawer-avatar" aria-hidden="true">' + this.clientInitials(client.name) + '</div>' +
				'<div class="client-drawer-title">' +
				'<h3>' + this.escapeHtml(client.name) + '</h3>' +
				'<p class="client-drawer-workflow">' + this.escapeHtml(workflow.name) + '</p>' +
				'<div class="client-drawer-badges">' +
				(assessment ? this.riskBadge(assessment.overallRisk) : '') +
				this.workflowStageBadge(client) +
				(!options.hideStatusBadge ? '<span class="client-status-badge">' + this.escapeHtml(RM.I18n.clientStatusLabel(client.status)) + '</span>' : '') +
				(client.incompleteIntake ? '<span class="incomplete-badge">' + t('components.incompleteIntake') + '</span>' : '') +
				(options.badgeHtml || '') +
				'</div></div></div>';

			if (options.alert) {
				html += this.alert(options.alert.type || 'info', options.alert.message);
			}

			html += '<dl class="client-drawer-meta">';
			if (options.includeStandardMeta !== false) {
				html += this.drawerMetaRow(t('components.dob'), this.formatDate(client.dob)) +
					this.drawerMetaRow(t('components.phone'), client.phone) +
					this.drawerMetaRow(t('components.address'), client.address) +
					this.drawerMetaRow(RM.I18n.t('case.caseCategory'), RM.CaseCategories.categoryLabel(client.caseCategoryId)) +
					this.drawerMetaRow(t('common.processStage'), this.workflowStageLabel(client)) +
					this.drawerMetaRow(t('components.caseManager'), cm ? RM.Permissions.formatRoleLabel(cm.role) : '—');
			}
			if (options.metaRows) {
				options.metaRows.forEach(function (row) {
					html += self.drawerMetaRow(row.label, row.value);
				});
			}
			html += '</dl>';

			if (options.includeStandardSections !== false) {
				if (referral || intake) {
					var intakeBody = '';
					if (referral) {
						intakeBody +=
							'<p><strong>' + t('components.sourceLabel') + '</strong> ' + this.escapeHtml(RM.I18n.referralSourceLabel(referral.source)) + '</p>' +
							'<p><strong>' + t('components.reasonLabel') + '</strong> ' + this.escapeHtml(RM.I18n.referralReasonLabel(referral.reason)) + '</p>' +
							'<p><strong>' + t('components.receivedLabel') + '</strong> ' + this.formatDate(referral.dateReceived) + '</p>';
					}
					if (intake) {
						intakeBody +=
							'<p><strong>' + this.escapeHtml(cfg.livingLabel) + ':</strong> ' +
							this.escapeHtml(intake.livingArrangement || '—') + '</p>' +
							'<p><strong>' + this.escapeHtml(cfg.backgroundLabel) + ':</strong> ' +
							this.escapeHtml(intake.medicalHistory || '—') + '</p>' +
							'<p><strong>' + t('components.consentLabel') + '</strong> ' +
							(intake.consentOnFile ? t('components.consentOnFile') : t('components.consentMissing')) + '</p>' +
							'<p><strong>' + t('components.statusLabel') + '</strong> ' + this.escapeHtml(RM.I18n.intakeCompletenessLabel(intake.completeness) || '—') + '</p>';
					}
					html += this.drawerSection(intakeCtx.title, intakeBody);
				}
				if (intake && intake.comprehensiveAssessmentNotes) {
					html += this.drawerSection(assessmentCtx.title,
						'<p><strong>' + this.escapeHtml(cfg.assessmentNoteLabel) + ':</strong> ' +
						this.escapeHtml(intake.comprehensiveAssessmentNotes) + '</p>');
				}
				if (assessment) {
					html += this.drawerSection(riskCtx.title,
						'<p class="profile-inline-meta">' + this.formatDate(assessment.date) + ' · ' +
						t('components.composite') + ' ' +
						assessment.compositeScore + ' · ' + this.escapeHtml(RM.I18n.riskLabel(assessment.overallRisk)) + '</p>' +
						RM.CaseForm.formatRatingsList(assessment.ratings, client));
				}
				if (carePlans.length) {
					html += this.drawerSection(carePlanCtx.title,
						'<ul class="drawer-list">' + carePlans.slice(0, 3).map(function (cp) {
							return '<li><strong>' + self.escapeHtml(cp.issue) + '</strong> — ' +
								self.escapeHtml(cp.goal) + ' · ' + self.escapeHtml(RM.I18n.enumLabel('carePlanStatus', cp.status)) + '</li>';
						}).join('') +
						(carePlans.length > 3 ? '<li class="drawer-list-more">' +
							t('components.moreInWorkspace', { count: carePlans.length - 3 }) + '</li>' : '') +
						'</ul>');
				}
				if (latestNote) {
					html += this.drawerSection(followupCtx.title,
						'<div class="note-entry drawer-note">' +
						'<div class="note-meta">' + this.formatDate(latestNote.date) + ' · ' + this.escapeHtml(RM.I18n.noteTypeLabel(latestNote.type)) + '</div>' +
						'<p>' + this.escapeHtml(latestNote.text) + '</p></div>');
				}
			}

			if (options.sections) {
				options.sections.forEach(function (section) {
					html += self.drawerSection(section.title, section.body);
				});
			}

			if (closure) {
				html += this.alert('info', t('components.caseClosedReadOnly'));
			}

			html +=
				'<div class="drawer-actions">' +
				'<a href="' + workspaceUrl + '" class="btn btn-primary">' +
				this.escapeHtml(options.primaryActionLabel || t('components.openCaseWorkspace')) + '</a>' +
				'<a href="' + RM.Links.page('client-profile', { clientId: client.id }) + '" class="btn btn-secondary">' +
				t('components.view360') + '</a>' +
				'</div></div>';

			return html;
		},

		caseWorkflowDrawerBody: function (client) {
			var workflow = RM.CaseWorkflow.forClient(client);
			var statuses = RM.Workflow.getAllStageStatuses(client);
			var current = RM.Workflow.getStatus(client);
			var referral = client.caseId
				? (RM.ReferralRepository.findByCaseId(client.caseId)[0] || null)
				: RM.ReferralRepository.findByClientId(client.id)[0];
			var cm = RM.UserRepository.findById(client.caseManagerId);
			var focusHtml = workflow.focusAreas.length
				? '<ul class="case-focus-list">' + workflow.focusAreas.map(function (f) {
					return '<li>' + RM.Components.escapeHtml(f) + '</li>';
				}).join('') + '</ul>'
				: '<p class="text-muted">' + t('components.noFocusAreas') + '</p>';

			var stageRows = statuses.map(function (s) {
				var cls = 'case-stage-row case-stage-' + s.status + (s.stage === current.stage ? ' case-stage-current' : '');
				return '<div class="' + cls + '">' +
					'<span class="case-stage-num">' + (s.status === 'complete' ? '✓' : s.stage) + '</span>' +
					'<div class="case-stage-body">' +
					'<strong>' + RM.Components.escapeHtml(s.label) + '</strong>' +
					(s.deliverable ? '<span class="case-stage-deliverable">' + RM.Components.escapeHtml(s.deliverable) + '</span>' : '') +
					'</div>' +
					RM.Components.stepStatusPill(s.status) +
					'</div>';
			}).join('');

			return '<div class="case-drawer-summary">' +
				'<p class="case-detail-sub">' + RM.Components.escapeHtml(workflow.name) + '</p>' +
				'<div class="client-drawer-badges">' +
				RM.Components.caseCategoryBadge(client) +
				RM.Components.workflowStageBadge(client) +
				'</div>' +
				'<dl class="client-drawer-meta">' +
				this.drawerMetaRow(t('components.caseManager'), cm ? cm.name : '—') +
				this.drawerMetaRow(t('components.opened'), this.formatDate(client.createdAt)) +
				this.drawerMetaRow(t('common.status'), RM.I18n.clientStatusLabel(client.status)) +
				'</dl>' +
				'<p class="case-detail-desc">' + RM.Components.escapeHtml(workflow.description) + '</p>' +
				(referral ? '<p class="case-detail-example"><strong>' + t('components.referralLabel') + '</strong> ' +
					RM.Components.escapeHtml(RM.I18n.referralSourceLabel(referral.source)) + ' — ' + RM.Components.escapeHtml(RM.I18n.referralReasonLabel(referral.reason)) + '</p>' : '') +
				(workflow.exampleProgram ? '<p class="case-detail-example"><strong>' + t('components.programExample') + '</strong> ' +
					RM.Components.escapeHtml(workflow.exampleProgram) + '</p>' : '') +
				this.drawerSection(t('components.focusAreas'), focusHtml) +
				this.drawerSection(t('components.workflowProgress'), '<div class="case-stage-list">' + stageRows + '</div>') +
				'<div class="drawer-actions">' +
				'<a href="' + RM.Links.page('case-workspace', { clientId: client.id, caseId: client.caseId }) + '" class="btn btn-primary">' +
				t('components.openCaseWorkspaceLower') + '</a>' +
				'<a href="' + RM.Links.page('client-profile', { clientId: client.id, caseId: client.caseId }) + '" class="btn btn-secondary">' +
				t('components.view360Lower') + '</a>' +
				'</div></div>';
		},

		openCaseDrawer: function (client, tableEl, rowSelector) {
			this.openSideDrawer(client.name, this.caseWorkflowDrawerBody(client), function () {
				if (tableEl && rowSelector) {
					tableEl.querySelectorAll(rowSelector).forEach(function (r) { r.classList.remove('active'); });
				}
			});
		},

		wireInteractiveTable: function (tableEl, rowSelector, onActivate) {
			if (!tableEl) { return; }
			tableEl.querySelectorAll(rowSelector).forEach(function (row) {
				function activate() {
					tableEl.querySelectorAll(rowSelector).forEach(function (r) { r.classList.remove('active'); });
					row.classList.add('active');
					onActivate(row);
				}
				row.addEventListener('click', activate);
				row.addEventListener('keydown', function (e) {
					if (e.key === 'Enter' || e.key === ' ') {
						e.preventDefault();
						activate();
					}
				});
			});
		},

		openClientCasesDrawer: function (client, tableEl, rowSelector) {
			var self = this;
			this.openSideDrawer(client.name, this.clientCasesDrawerBody(client), function () {
				if (tableEl && rowSelector) {
					tableEl.querySelectorAll(rowSelector).forEach(function (r) { r.classList.remove('active'); });
				}
			});
		},

		clientCasesDrawerBody: function (client) {
			var self = this;
			var cases = RM.CaseService.casesForClient(client.id);
			var screening = client.screening || {};
			var reasonLabels = {
				information: 'pages.clientRegistration.reasonInformation',
				brochure: 'pages.clientRegistration.reasonBrochure',
				service_need: 'pages.clientRegistration.reasonServiceNeed',
				emergency: 'pages.clientRegistration.reasonEmergency'
			};
			var reasonLabel = screening.contactReason && reasonLabels[screening.contactReason]
				? t(reasonLabels[screening.contactReason])
				: (screening.contactReason || '');
			var screeningSummary = screening.contactReason
				? t('pages.clientSearch.screeningSummary', {
					reason: reasonLabel,
					date: this.formatDate(screening.date || client.registeredAt)
				})
				: t('pages.clientSearch.noScreening');

			var caseRows = cases.length ? cases.map(function (caseRecord) {
				var view = RM.CaseService.merge(client, caseRecord);
				return '<tr class="client-case-row" data-case-id="' + self.escapeHtml(caseRecord.id) + '" role="button" tabindex="0">' +
					'<td>' + self.escapeHtml(caseRecord.caseNumber || caseRecord.id) + '</td>' +
					'<td>' + self.caseCategoryBadge(view) + '</td>' +
					'<td>' + self.escapeHtml(RM.I18n.clientStatusLabel(caseRecord.status)) + '</td>' +
					'<td>' + self.workflowStageBadge(view) + '</td>' +
					'<td>' + self.formatDate(caseRecord.openDate) + '</td></tr>';
			}).join('') : '';

			var html = '<div class="client-drawer-summary">' +
				'<dl class="client-drawer-meta">' +
				this.drawerMetaRow(t('components.phone'), client.phone) +
				this.drawerMetaRow(t('components.address'), client.address) +
				this.drawerMetaRow(t('pages.clientSearch.tableRegistered'), this.formatDate(client.registeredAt)) +
				this.drawerMetaRow(t('pages.clientRegistration.screeningTitle'), screeningSummary) +
				'</dl>' +
				this.drawerSection(t('pages.clientSearch.casesTitle'), cases.length
					? '<table class="data-table data-table-interactive client-case-table"><thead><tr>' +
						'<th>' + this.escapeHtml(t('pages.clientSearch.tableCaseNumber')) + '</th>' +
						'<th>' + this.escapeHtml(t('pages.clientSearch.tableCategory')) + '</th>' +
						'<th>' + this.escapeHtml(t('pages.clientSearch.tableStatus')) + '</th>' +
						'<th>' + this.escapeHtml(t('pages.clientSearch.tableProcessStage')) + '</th>' +
						'<th>' + this.escapeHtml(t('pages.clientSearch.tableOpened')) + '</th></tr></thead><tbody>' +
						caseRows + '</tbody></table>'
					: '<p class="text-muted">' + t('pages.clientSearch.noCasesHint') + '</p>') +
				'<div class="drawer-actions">' +
				'<a href="' + RM.Links.page('case-creation', { clientId: client.id }) + '" class="btn btn-primary">' +
				this.escapeHtml(t('pages.clientSearch.createCase')) + '</a>' +
				'<a href="' + RM.Links.page('client-profile', { clientId: client.id }) + '" class="btn btn-secondary">' +
				t('components.view360') + '</a></div></div>';

			window.setTimeout(function () {
				document.querySelectorAll('.client-case-row').forEach(function (row) {
					function openCase() {
						var caseId = row.getAttribute('data-case-id');
						var view = RM.CaseService.view(caseId);
						if (!view) { return; }
						self.openCaseDrawer(view, null, null);
					}
					row.addEventListener('click', openCase);
					row.addEventListener('keydown', function (e) {
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault();
							openCase();
						}
					});
				});
			}, 0);

			return html;
		},

		openClientDrawer: function (title, client, options, tableEl, rowSelector) {
			var self = this;
			this.openSideDrawer(title || client.name, this.clientCaseDrawer(client, options), function () {
				if (tableEl && rowSelector) {
					tableEl.querySelectorAll(rowSelector).forEach(function (r) { r.classList.remove('active'); });
				}
			});
		},

		_activeDrawers: { left: null, right: null },

		_syncDrawerOpenClass: function () {
			if (this._activeDrawers.left || this._activeDrawers.right) {
				document.body.classList.add('drawer-open');
			} else {
				document.body.classList.remove('drawer-open');
			}
		},

		closeSideDrawer: function (side) {
			if (!side) {
				this.closeSideDrawer('left');
				this.closeSideDrawer('right');
				return;
			}
			var drawer = this._activeDrawers[side];
			if (drawer) {
				drawer.close();
			}
		},

		openDedupClientRecord: function (clientId) {
			var client = RM.ClientRepository.findById(clientId);
			if (!client) { return; }
			if (RM.CaseService && RM.CaseService.casesForClient) {
				this.openClientCasesDrawer(client);
				return;
			}
			this.openClientDrawer(client.name, client, {});
		},

		_activeModal: null,

		closeModal: function () {
			if (this._activeModal) {
				this._activeModal.close();
			}
		},

		openModal: function (title, bodyHtml, onClose, options) {
			options = options || {};
			this.closeModal();

			var modalClass = 'modal' + (options.wide ? ' modal-wide' : '');
			if (options.modalClass) {
				modalClass += ' ' + options.modalClass;
			}

			var overlay = document.createElement('div');
			overlay.className = 'modal-overlay';
			overlay.setAttribute('role', 'presentation');
			overlay.innerHTML =
				'<div class="' + modalClass + '" role="dialog" aria-modal="true" aria-labelledby="modal-title">' +
				'<div class="modal-header">' +
				'<h2 id="modal-title">' + this.escapeHtml(title) + '</h2>' +
				'<div class="modal-header-controls">' +
				(options.headerActionsHtml || '') +
				'<button type="button" class="modal-close" aria-label="' + this.escapeHtml(t('components.modalCloseAria')) + '">×</button>' +
				'</div></div>' +
				'<div class="modal-body">' + bodyHtml + '</div>' +
				'</div>';

			document.body.appendChild(overlay);
			document.body.classList.add('modal-open');

			var self = this;
			function close() {
				document.body.classList.remove('modal-open');
				document.removeEventListener('keydown', onKeydown);
				if (overlay.parentNode) {
					overlay.parentNode.removeChild(overlay);
				}
				if (self._activeModal && self._activeModal.overlay === overlay) {
					self._activeModal = null;
				}
				if (typeof onClose === 'function') {
					onClose();
				}
			}

			function onKeydown(e) {
				if (e.key === 'Escape') { close(); }
			}

			overlay.querySelector('.modal-close').addEventListener('click', close);
			overlay.addEventListener('click', function (e) {
				if (e.target === overlay) { close(); }
			});
			document.addEventListener('keydown', onKeydown);

			this._activeModal = {
				overlay: overlay,
				close: close
			};

			return this._activeModal;
		},

		openSideDrawer: function (title, bodyHtml, onClose, options) {
			options = options || {};
			var side = options.side === 'left' ? 'left' : 'right';
			var otherSide = side === 'left' ? 'right' : 'left';
			var hasOtherDrawer = !!this._activeDrawers[otherSide];
			this.closeSideDrawer(side);

			var sideClass = side === 'left' ? ' side-drawer-left' : '';
			var overlayClass = 'drawer-overlay';
			if (hasOtherDrawer && side === 'right') {
				overlayClass += ' drawer-overlay-no-backdrop';
			}

			var overlay = document.createElement('div');
			overlay.className = overlayClass;
			overlay.setAttribute('role', 'presentation');
			if (hasOtherDrawer && side === 'right') {
				overlay.style.zIndex = '1102';
			}
			overlay.innerHTML =
				'<aside class="side-drawer' + sideClass + '" role="dialog" aria-modal="true" aria-labelledby="drawer-title-' + side + '">' +
				'<div class="drawer-header">' +
				'<h2 id="drawer-title-' + side + '">' + this.escapeHtml(title) + '</h2>' +
				'<button type="button" class="drawer-close" aria-label="' + this.escapeHtml(t('components.drawerCloseAria')) + '">×</button>' +
				'</div>' +
				'<div class="drawer-body">' + bodyHtml + '</div>' +
				'</aside>';

			document.body.appendChild(overlay);
			this._syncDrawerOpenClass();

			var self = this;
			function close() {
				overlay.classList.remove('open');
				document.removeEventListener('keydown', onKeydown);
				window.setTimeout(function () {
					if (overlay.parentNode) {
						overlay.parentNode.removeChild(overlay);
					}
					if (self._activeDrawers[side] && self._activeDrawers[side].overlay === overlay) {
						self._activeDrawers[side] = null;
					}
					self._syncDrawerOpenClass();
					if (typeof onClose === 'function') {
						onClose();
					}
				}, 280);
			}

			function onKeydown(e) {
				if (e.key === 'Escape') { close(); }
			}

			overlay.querySelector('.drawer-close').addEventListener('click', close);
			overlay.addEventListener('click', function (e) {
				if (e.target === overlay && !overlay.classList.contains('drawer-overlay-no-backdrop')) {
					close();
				}
			});
			document.addEventListener('keydown', onKeydown);

			this._activeDrawers[side] = {
				overlay: overlay,
				close: close,
				kind: options.kind || null,
				side: side
			};

			window.requestAnimationFrame(function () {
				overlay.classList.add('open');
			});

			return this._activeDrawers[side];
		},

		renderDedupDrawerBody: function (matches, options) {
			options = options || {};
			var self = this;
			if (!matches.length) { return ''; }

			var items = matches.map(function (m) {
				return '<li class="dedup-drawer-item">' +
					'<div class="dedup-drawer-match">' +
					'<strong>' + self.escapeHtml(m.client.name) + '</strong> ' +
					self.matchConfidenceBadge(m.score) +
					'<div class="dedup-drawer-meta">' + t('components.matchedOn') + ' ' + self.escapeHtml(m.matchedFields.join(', ')) + '</div>' +
					'<div class="dedup-drawer-meta">' + t('components.dob') + ': ' + self.escapeHtml(m.client.dob || '—') +
					' · ' + t('components.phone') + ': ' + self.escapeHtml(m.client.phone || '—') + '</div>' +
					'</div>' +
					(options.showOpenButtons !== false ?
						'<button type="button" class="btn btn-primary btn-sm dedup-open-btn" data-client-id="' +
						self.escapeHtml(m.client.id) + '">' + t('components.openRecord') + '</button>' : '') +
					'</li>';
			}).join('');

			var actions = options.showContinue ?
				'<div class="dedup-drawer-actions">' +
				'<button type="button" class="btn btn-secondary" id="dedup-continue">' + t('components.continueAsNew') + '</button>' +
				'</div>' : '';

			return '<p class="dedup-drawer-lead">' + t('components.dedupDrawerLead') + '</p>' +
				'<ul class="dedup-drawer-list">' + items + '</ul>' + actions;
		},

		wireDedupDrawer: function (overlay, options) {
			options = options || {};
			if (!overlay) { return; }

			overlay.querySelectorAll('.dedup-open-btn').forEach(function (btn) {
				btn.addEventListener('click', function () {
					var clientId = btn.getAttribute('data-client-id');
					if (typeof options.onOpen === 'function') {
						options.onOpen(clientId);
					} else {
						RM.Components.openDedupClientRecord(clientId);
					}
				});
			});

			var continueBtn = overlay.querySelector('#dedup-continue');
			if (continueBtn && typeof options.onContinue === 'function') {
				continueBtn.addEventListener('click', function () {
					RM.Components.closeSideDrawer('left');
					RM.Components.closeSideDrawer('right');
					options.onContinue();
				});
			}
		},

		showDedupDrawer: function (matches, options) {
			options = options || {};
			if (!matches.length) {
				if (this._activeDrawers.left && this._activeDrawers.left.kind === 'dedup') {
					this.closeSideDrawer('left');
				}
				return;
			}

			var title = matches.length > 1 ? t('components.possibleDuplicates') : t('components.possibleDuplicate');
			var body = this.renderDedupDrawerBody(matches, options);
			var drawer = this._activeDrawers.left;

			if (drawer && drawer.kind === 'dedup' && drawer.overlay) {
				drawer.overlay.querySelector('.drawer-body').innerHTML = body;
				drawer.overlay.querySelector('#drawer-title-left').textContent = title;
				this.wireDedupDrawer(drawer.overlay, options);
				return;
			}

			drawer = this.openSideDrawer(title, body, null, { side: 'left', kind: 'dedup' });
			this.wireDedupDrawer(drawer.overlay, options);
		},

		showDuplicateModal: function (matches, onOpen, onContinue) {
			this.showDedupDrawer(matches, {
				showContinue: true,
				onOpen: onOpen,
				onContinue: onContinue
			});
		}
	};
})();
