import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { USE_MOCK_AUTH } from '../auth/AuthContext';
import { adminApi } from '../api/adminApi';
import { platformApi, type LocaleItem, type TranslationEntry } from '../api/platformApi';
import { Modal } from './Modal';
import { UiIcon } from './UiIcon';
import { useToast } from './ToastContext';
import { useI18n } from '../i18n/I18nContext';

const PAGE_SIZE = 50;
const PROTECTED_LOCALES = new Set(['en']);

type ManagerMode = 'admin' | 'platform';

type Props = {
  mode: ManagerMode;
  token: string | null;
  leadKey: string;
};

type LocaleFormState = {
  code: string;
  name: string;
  rtl: boolean;
  active: boolean;
};

export function TranslationsManagerPanel({ mode, token, leadKey }: Props) {
  const { t, refreshLocales, refreshTranslations } = useI18n();
  const { showToast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [locales, setLocales] = useState<LocaleItem[]>([]);
  const [entries, setEntries] = useState<TranslationEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [showLocaleModal, setShowLocaleModal] = useState(false);
  const [editingLocaleCode, setEditingLocaleCode] = useState<string | null>(null);
  const [localeForm, setLocaleForm] = useState<LocaleFormState>({
    code: '',
    name: '',
    rtl: false,
    active: true,
  });
  const [editEntry, setEditEntry] = useState<{ key: string; locale: string; value: string } | null>(null);

  const load = useCallback(async () => {
    if (USE_MOCK_AUTH) {
      setLocales([
        { code: 'en', name: 'English', rtl: false, active: true },
        { code: 'es', name: 'Español', rtl: false, active: true },
      ]);
      setEntries([]);
      setTotal(0);
      return;
    }
    if (!token) return;
    setLoading(true);
    try {
      const params = { q: query || undefined, limit: PAGE_SIZE, offset };
      const [locData, transData] = await Promise.all([
        mode === 'admin' ? adminApi.listLocales(token) : platformApi.listLocales(token),
        mode === 'admin'
          ? adminApi.listTranslations(token, params)
          : platformApi.listTranslations(token, params),
      ]);
      setLocales(locData.items);
      setEntries(transData.items);
      setTotal(transData.total);
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('pages.admin.labels.loadError'), 'error');
    } finally {
      setLoading(false);
    }
  }, [token, mode, query, offset, showToast, t]);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  useEffect(() => {
    setOffset(0);
  }, [query]);

  function openAddLocale() {
    setEditingLocaleCode(null);
    setLocaleForm({ code: '', name: '', rtl: false, active: true });
    setShowLocaleModal(true);
  }

  function openEditLocale(loc: LocaleItem) {
    setEditingLocaleCode(loc.code);
    setLocaleForm({
      code: loc.code,
      name: loc.name,
      rtl: loc.rtl,
      active: loc.active !== false,
    });
    setShowLocaleModal(true);
  }

  async function onSaveLocale(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    try {
      if (editingLocaleCode) {
        if (mode === 'admin') {
          await adminApi.updateLocale(token, editingLocaleCode, {
            name: localeForm.name,
            rtl: localeForm.rtl,
            active: localeForm.active,
          });
        } else {
          await platformApi.updateLocale(token, editingLocaleCode, {
            name: localeForm.name,
            rtl: localeForm.rtl,
            active: localeForm.active,
          });
        }
        showToast(t('pages.admin.labels.localeUpdated'), 'success');
      } else {
        if (mode === 'admin') {
          await adminApi.createLocale(token, {
            code: localeForm.code,
            name: localeForm.name,
            rtl: localeForm.rtl,
          });
        } else {
          await platformApi.createLocale(token, {
            code: localeForm.code,
            name: localeForm.name,
            rtl: localeForm.rtl,
          });
        }
        showToast(t('pages.admin.labels.localeAdded'), 'success');
      }
      setShowLocaleModal(false);
      setEditingLocaleCode(null);
      setLocaleForm({ code: '', name: '', rtl: false, active: true });
      await refreshLocales();
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('pages.admin.labels.localeError'), 'error');
    }
  }

  async function onDeleteLocale(code: string) {
    if (!token || PROTECTED_LOCALES.has(code)) return;
    if (!window.confirm(t('pages.admin.labels.localeDeleteConfirm', { code }))) return;
    try {
      if (mode === 'admin') {
        await adminApi.deleteLocale(token, code);
      } else {
        await platformApi.deleteLocale(token, code);
      }
      showToast(t('pages.admin.labels.localeDeleted'), 'success');
      await refreshLocales();
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('pages.admin.labels.localeDeleteError'), 'error');
    }
  }

  async function onExport() {
    if (!token || USE_MOCK_AUTH) {
      showToast(t('pages.admin.labels.mockExport'), 'warning');
      return;
    }
    try {
      if (mode === 'admin') {
        await adminApi.exportTranslations(token);
      } else {
        await platformApi.exportTranslations(token);
      }
      showToast(t('pages.admin.labels.exportSuccess'), 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('pages.admin.labels.exportError'), 'error');
    }
  }

  async function onImport(file: File) {
    if (!token) return;
    try {
      const result =
        mode === 'admin'
          ? await adminApi.importTranslations(token, file)
          : await platformApi.importTranslations(token, file);
      showToast(t('pages.admin.labels.importSuccess', { count: result.imported }), 'success');
      await refreshLocales();
      await refreshTranslations();
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('pages.admin.labels.importError'), 'error');
    }
  }

  async function onSaveEdit(e: FormEvent) {
    e.preventDefault();
    if (!token || !editEntry) return;
    try {
      if (mode === 'admin') {
        await adminApi.patchTranslation(token, editEntry);
      } else {
        await platformApi.patchTranslation(token, editEntry);
      }
      showToast(t('pages.admin.labels.saved'), 'success');
      setEditEntry(null);
      await refreshTranslations();
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('pages.admin.labels.saveError'), 'error');
    }
  }

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;
  const activeLocales = locales.filter((loc) => loc.active !== false);

  return (
    <>
      <p className="muted">{t(leadKey)}</p>

      <div className="page-toolbar translations-toolbar">
        <input
          type="search"
          className="translations-search"
          placeholder={t('pages.admin.labels.search')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') setQuery(search.trim());
          }}
        />
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setQuery(search.trim())}>
          {t('pages.admin.labels.searchBtn')}
        </button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={openAddLocale}>
          {t('pages.admin.labels.addLocale')}
        </button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={onExport}>
          {t('pages.admin.labels.export')}
        </button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => fileRef.current?.click()}>
          {t('pages.admin.labels.import')}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onImport(file);
            e.target.value = '';
          }}
        />
      </div>

      <section className="card translations-locales-card">
        <h3>{t('pages.admin.labels.localesHeading')}</h3>
        <div className="table-responsive">
          <table className="data-table locales-table">
            <thead>
              <tr>
                <th>{t('pages.admin.labels.localeCodeCol')}</th>
                <th>{t('pages.admin.labels.localeNameCol')}</th>
                <th>{t('pages.admin.labels.localeRtlCol')}</th>
                <th>{t('pages.admin.labels.localeActiveCol')}</th>
                <th>{t('pages.admin.labels.colActions')}</th>
              </tr>
            </thead>
            <tbody>
              {locales.length === 0 ? (
                <tr>
                  <td colSpan={5} className="muted">{t('pages.admin.labels.localesEmpty')}</td>
                </tr>
              ) : (
                locales.map((loc) => (
                  <tr key={loc.code} className={loc.active === false ? 'locale-row-inactive' : undefined}>
                    <td><code>{loc.code}</code></td>
                    <td>{loc.name}</td>
                    <td>{loc.rtl ? t('common.yes') : t('common.no')}</td>
                    <td>{loc.active !== false ? t('common.yes') : t('common.no')}</td>
                    <td>
                      <div className="icon-action-group">
                        <button
                          type="button"
                          className="download-icon-btn"
                          title={t('common.edit')}
                          aria-label={t('pages.admin.labels.editLocaleAria', { code: loc.code })}
                          onClick={() => openEditLocale(loc)}
                        >
                          <UiIcon name="edit" />
                        </button>
                        <button
                          type="button"
                          className="download-icon-btn download-icon-btn--danger"
                          title={t('pages.admin.labels.deleteLocale')}
                          aria-label={t('pages.admin.labels.deleteLocaleAria', { code: loc.code })}
                          disabled={PROTECTED_LOCALES.has(loc.code)}
                          onClick={() => onDeleteLocale(loc.code)}
                        >
                          <UiIcon name="trash" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <p className="text-muted translations-summary">
          {t('pages.admin.labels.summary', { total, shown: entries.length, page: currentPage, pages: pageCount })}
        </p>
      </section>

      <div className="table-responsive">
        <table className="data-table translations-table">
          <thead>
            <tr>
              <th>{t('pages.admin.labels.colKey')}</th>
              {activeLocales.map((loc) => (
                <th key={loc.code}>{loc.code.toUpperCase()}</th>
              ))}
              <th>{t('pages.admin.labels.colActions')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={activeLocales.length + 2} className="muted">
                  {t('common.loading')}
                </td>
              </tr>
            ) : entries.length === 0 ? (
              <tr>
                <td colSpan={activeLocales.length + 2} className="muted">
                  {t('pages.admin.labels.empty')}
                </td>
              </tr>
            ) : (
              entries.map((entry) => (
                <tr key={entry.key}>
                  <td><code className="translation-key">{entry.key}</code></td>
                  {activeLocales.map((loc) => (
                    <td key={loc.code} className="translation-value-cell">
                      {entry.values[loc.code] ? (
                        <span title={entry.values[loc.code]}>{entry.values[loc.code]}</span>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                  ))}
                  <td>
                    <div className="icon-action-group">
                      <button
                        type="button"
                        className="download-icon-btn"
                        title={t('common.edit')}
                        aria-label={t('pages.admin.labels.editTranslationAria', { key: entry.key })}
                        onClick={() =>
                          setEditEntry({
                            key: entry.key,
                            locale: activeLocales[0]?.code ?? 'en',
                            value: entry.values[activeLocales[0]?.code ?? 'en'] ?? '',
                          })
                        }
                      >
                        <UiIcon name="edit" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {total > PAGE_SIZE ? (
        <div className="pagination-toolbar">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={offset <= 0}
            onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
          >
            {t('pages.admin.labels.prevPage')}
          </button>
          <span className="text-muted">
            {t('pages.admin.labels.pageOf', { page: currentPage, pages: pageCount })}
          </span>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={offset + PAGE_SIZE >= total}
            onClick={() => setOffset(offset + PAGE_SIZE)}
          >
            {t('pages.admin.labels.nextPage')}
          </button>
        </div>
      ) : null}

      {showLocaleModal ? (
        <Modal
          open
          title={editingLocaleCode ? t('pages.admin.labels.editLocaleTitle') : t('pages.admin.labels.addLocaleTitle')}
          onClose={() => setShowLocaleModal(false)}
        >
          <form onSubmit={onSaveLocale}>
            <div className="form-group">
              <label>{t('pages.admin.labels.localeCode')}</label>
              <input
                required
                readOnly={Boolean(editingLocaleCode)}
                pattern="[a-zA-Z]{2,8}"
                placeholder="fr"
                value={localeForm.code}
                onChange={(e) => setLocaleForm({ ...localeForm, code: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>{t('pages.admin.labels.localeName')}</label>
              <input
                required
                placeholder="Français"
                value={localeForm.name}
                onChange={(e) => setLocaleForm({ ...localeForm, name: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="checkbox-inline">
                <input
                  type="checkbox"
                  checked={localeForm.rtl}
                  onChange={(e) => setLocaleForm({ ...localeForm, rtl: e.target.checked })}
                />
                {t('pages.admin.labels.localeRtlLabel')}
              </label>
            </div>
            {editingLocaleCode ? (
              <div className="form-group">
                <label className="checkbox-inline">
                  <input
                    type="checkbox"
                    checked={localeForm.active}
                    disabled={PROTECTED_LOCALES.has(editingLocaleCode)}
                    onChange={(e) => setLocaleForm({ ...localeForm, active: e.target.checked })}
                  />
                  {t('pages.admin.labels.localeActiveLabel')}
                </label>
              </div>
            ) : null}
            <div className="form-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setShowLocaleModal(false)}>
                {t('common.cancel')}
              </button>
              <button type="submit" className="btn btn-primary">
                {t('common.save')}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {editEntry ? (
        <Modal open title={t('pages.admin.labels.editTitle')} onClose={() => setEditEntry(null)}>
          <form onSubmit={onSaveEdit}>
            <p><code>{editEntry.key}</code></p>
            <div className="form-group">
              <label>{t('pages.admin.labels.locale')}</label>
              <select
                value={editEntry.locale}
                onChange={(e) => {
                  const locale = e.target.value;
                  const row = entries.find((item) => item.key === editEntry.key);
                  setEditEntry({
                    ...editEntry,
                    locale,
                    value: row?.values[locale] ?? '',
                  });
                }}
              >
                {activeLocales.map((loc) => (
                  <option key={loc.code} value={loc.code}>
                    {loc.name} ({loc.code})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <textarea
                rows={4}
                value={editEntry.value}
                onChange={(e) => setEditEntry({ ...editEntry, value: e.target.value })}
              />
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setEditEntry(null)}>
                {t('common.cancel')}
              </button>
              <button type="submit" className="btn btn-primary">
                {t('common.save')}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
    </>
  );
}
