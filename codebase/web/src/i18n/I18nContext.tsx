import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import en from './locales/en.json';
import es from './locales/es.json';
import { USE_MOCK_AUTH } from '../auth/AuthContext';
import { authApi, type AuthLocaleItem } from '../api/authApi';
import { adminApi } from '../api/adminApi';
import { TOKEN_KEY } from '../api/client';

export type Locale = string;

export type LocaleDescriptor = AuthLocaleItem & { label: string; flag: string };

const FALLBACK_LOCALES: LocaleDescriptor[] = [
  { code: 'en', name: 'English', rtl: false, label: 'EN', flag: '\u{1F1FA}\u{1F1F8}' },
  { code: 'es', name: 'Espa\u00f1ol', rtl: false, label: 'ES', flag: '\u{1F1EA}\u{1F1F8}' },
];

const LOCALE_FLAGS: Record<string, string> = {
  en: '\u{1F1FA}\u{1F1F8}',
  es: '\u{1F1EA}\u{1F1F8}',
  fr: '\u{1F1EB}\u{1F1F7}',
  de: '\u{1F1E9}\u{1F1EA}',
  pt: '\u{1F1F5}\u{1F1F9}',
};

function localeLabel(code: string): string {
  return code.length <= 3 ? code.toUpperCase() : code.slice(0, 2).toUpperCase();
}

function toDescriptor(item: AuthLocaleItem): LocaleDescriptor {
  return {
    ...item,
    label: localeLabel(item.code),
    flag: LOCALE_FLAGS[item.code] ?? '\u{1F310}',
  };
}

type Messages = Record<string, unknown>;

const STATIC_BUNDLES: Record<string, Messages> = {
  en: en as Messages,
  es: es as Messages,
};

const STORAGE_KEY = 'rm.locale';

function lookup(messages: Messages | undefined, key: string): string | null {
  if (!messages) return null;
  let value: unknown = messages;
  for (const part of key.split('.')) {
    if (!value || typeof value !== 'object' || !Object.prototype.hasOwnProperty.call(value, part)) {
      return null;
    }
    value = (value as Record<string, unknown>)[part];
  }
  return typeof value === 'string' ? value : null;
}

function lookupNode(messages: Messages | undefined, key: string): unknown {
  if (!messages) return null;
  let value: unknown = messages;
  for (const part of key.split('.')) {
    if (!value || typeof value !== 'object' || !Object.prototype.hasOwnProperty.call(value, part)) {
      return null;
    }
    value = (value as Record<string, unknown>)[part];
  }
  return value;
}

function detectDefaultLocale(available: LocaleDescriptor[]): string {
  const codes = new Set(available.map((l) => l.code));
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored && codes.has(stored)) return stored;
  } catch {
    /* sessionStorage unavailable */
  }
  const browser = (navigator.language || 'en').slice(0, 2).toLowerCase();
  if (codes.has(browser)) return browser;
  return available[0]?.code ?? 'en';
}

export type TranslateParams = Record<string, string | number>;

export type I18nApi = {
  locale: Locale;
  availableLocales: LocaleDescriptor[];
  localesLoading: boolean;
  setLocale: (locale: Locale) => void;
  refreshLocales: (organizationCode?: string) => Promise<void>;
  refreshTranslations: () => Promise<void>;
  t: (key: string, params?: TranslateParams) => string;
  tOr: (key: string, fallback: string) => string;
  tNode: <T>(key: string) => T | null;
  riskLabel: (level?: string) => string;
  stepStatusLabel: (status?: string) => string;
  enumLabel: (category: string, value?: string) => string;
  picklistLabel: (category: string, value?: string) => string;
  clientStatusLabel: (status?: string) => string;
  intakeCompletenessLabel: (value?: string) => string;
  cadenceLabel: (key?: string) => string;
  eventLabel: (eventId?: string) => string;
  programLabel: (programId?: string) => string;
  referralSourceLabel: (value?: string) => string;
  referralReasonLabel: (value?: string) => string;
  noteTypeLabel: (value?: string) => string;
  domainLabel: (domainKey: string) => string;
  formatDate: (iso?: string) => string;
};

const I18nContext = createContext<I18nApi | null>(null);

export function useI18n(): I18nApi {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>');
  return ctx;
}

export function useT(): I18nApi['t'] {
  return useI18n().t;
}

/** @deprecated use availableLocales from useI18n */
export const SUPPORTED_LOCALES = ['en', 'es'] as const;

/** @deprecated use availableLocales from useI18n */
export const LOCALE_META: Record<string, { label: string; flag: string }> = Object.fromEntries(
  FALLBACK_LOCALES.map((l) => [l.code, { label: l.label, flag: l.flag }]),
);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [availableLocales, setAvailableLocales] = useState<LocaleDescriptor[]>(FALLBACK_LOCALES);
  const [localesLoading, setLocalesLoading] = useState(!USE_MOCK_AUTH);
  const [locale, setLocaleState] = useState<string>(() => detectDefaultLocale(FALLBACK_LOCALES));
  const [dynamicOverrides, setDynamicOverrides] = useState<Record<string, string>>({});
  const [translationReloadKey, setTranslationReloadKey] = useState(0);

  const refreshLocales = useCallback(async (organizationCode?: string) => {
    if (USE_MOCK_AUTH) {
      setAvailableLocales(FALLBACK_LOCALES);
      setLocalesLoading(false);
      return;
    }
    setLocalesLoading(true);
    try {
      const data = await authApi.listLocales(organizationCode?.trim() || undefined);
      const items = data.items.length ? data.items.map(toDescriptor) : FALLBACK_LOCALES;
      setAvailableLocales(items);
      setLocaleState((current) => {
        const codes = new Set(items.map((l) => l.code));
        if (codes.has(current)) return current;
        try {
          const stored = sessionStorage.getItem(STORAGE_KEY);
          if (stored && codes.has(stored)) return stored;
        } catch {
          /* sessionStorage unavailable */
        }
        if (codes.has(data.defaultLocale)) return data.defaultLocale;
        return items[0]?.code ?? 'en';
      });
    } catch {
      setAvailableLocales(FALLBACK_LOCALES);
    } finally {
      setLocalesLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshLocales();
  }, [refreshLocales]);

  useEffect(() => {
    document.documentElement.lang = locale;
    try {
      sessionStorage.setItem(STORAGE_KEY, locale);
    } catch {
      /* sessionStorage unavailable */
    }
  }, [locale]);

  const refreshTranslations = useCallback(async () => {
    setTranslationReloadKey((key) => key + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadDynamic() {
      if (USE_MOCK_AUTH) {
        setDynamicOverrides({});
        return;
      }
      try {
        const platform = await authApi.getTranslationBundle(locale);
        let tenantEntries: Record<string, string> = {};
        const token = sessionStorage.getItem(TOKEN_KEY);
        if (token) {
          try {
            const tenant = await adminApi.getTenantTranslationBundle(token, locale);
            tenantEntries = tenant.entries;
          } catch {
            /* tenant overrides optional */
          }
        }
        if (!cancelled) {
          setDynamicOverrides({ ...platform.entries, ...tenantEntries });
        }
      } catch {
        if (!cancelled) setDynamicOverrides({});
      }
    }
    loadDynamic();
    return () => {
      cancelled = true;
    };
  }, [locale, translationReloadKey]);

  const setLocale = useCallback(
    (next: Locale) => {
      const allowed = availableLocales.some((l) => l.code === next);
      setLocaleState(allowed ? next : availableLocales[0]?.code ?? 'en');
    },
    [availableLocales],
  );

  const api = useMemo<I18nApi>(() => {
    const messages = STATIC_BUNDLES[locale] ?? STATIC_BUNDLES.en;

    function t(key: string, params?: TranslateParams): string {
      let value: string | null = dynamicOverrides[key] ?? lookup(messages, key);
      if (value == null && locale !== 'en') value = lookup(STATIC_BUNDLES.en, key);
      let resolved = value ?? key;
      if (params) {
        for (const [name, replacement] of Object.entries(params)) {
          resolved = resolved.replace(new RegExp(`\\{${name}\\}`, 'g'), String(replacement));
        }
      }
      return resolved;
    }

    function tOr(key: string, fallback: string): string {
      const value = t(key);
      return value === key ? fallback : value;
    }

    function tNode<T>(key: string): T | null {
      const value = lookupNode(messages, key) ?? (locale !== 'en' ? lookupNode(STATIC_BUNDLES.en, key) : null);
      return (value as T) ?? null;
    }

    function enumLabel(category: string, value?: string): string {
      if (value == null || value === '') return value ?? '';
      return tOr(`enums.${category}.${value}`, value);
    }

    function picklistLabel(category: string, value?: string): string {
      if (value == null || value === '') return value ?? '';
      return tOr(`picklists.${category}.${value}`, value);
    }

    return {
      locale,
      availableLocales,
      localesLoading,
      setLocale,
      refreshLocales,
      refreshTranslations,
      t,
      tOr,
      tNode,
      riskLabel: (level) => (level ? tOr(`risk.${level}`, level) : t('risk.Unknown')),
      stepStatusLabel: (status) =>
        status ? tOr(`stepStatus.${status}`, status.replace(/_/g, ' ')) : '',
      enumLabel,
      picklistLabel,
      clientStatusLabel: (status) =>
        status == null || status === '' ? status ?? '' : enumLabel('clientStatus', String(status).toLowerCase()),
      intakeCompletenessLabel: (value) => enumLabel('intakeCompleteness', value),
      cadenceLabel: (key) => (key ? tOr(`cadence.${key}`, key) : ''),
      eventLabel: (eventId) => (eventId ? tOr(`events.${eventId}`, eventId) : ''),
      programLabel: (programId) => (programId ? tOr(`programs.${programId}`, programId) : ''),
      referralSourceLabel: (value) => picklistLabel('referralSources', value),
      referralReasonLabel: (value) => picklistLabel('referralReasons', value),
      noteTypeLabel: (value) => picklistLabel('noteTypes', value),
      domainLabel: (domainKey) =>
        tOr(
          `forms.domains.${domainKey}`,
          domainKey.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()),
        ),
      formatDate: (iso) => {
        if (!iso) return '\u2014';
        const date = new Date(iso);
        if (Number.isNaN(date.getTime())) return iso;
        return date.toLocaleDateString(locale === 'es' ? 'es-US' : 'en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
      },
    };
  }, [locale, availableLocales, localesLoading, setLocale, refreshLocales, refreshTranslations, dynamicOverrides]);

  return <I18nContext.Provider value={api}>{children}</I18nContext.Provider>;
}
