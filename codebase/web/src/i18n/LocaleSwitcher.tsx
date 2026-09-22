import { useI18n } from './I18nContext';

type LocaleSwitcherProps = {
  compact?: boolean;
};

export function LocaleSwitcher({ compact = false }: LocaleSwitcherProps) {
  const { locale, availableLocales, localesLoading, setLocale, t } = useI18n();

  if (localesLoading && !availableLocales.length) {
    return null;
  }

  return (
    <div
      className="locale-switcher"
      role="group"
      aria-label={t('shell.language')}
      id={compact ? 'sign-in-locale-wrap' : undefined}
    >
      {availableLocales.map((item) => (
        <button
          key={item.code}
          type="button"
          className={`locale-btn${item.code === locale ? ' is-active' : ''}`}
          title={item.name}
          aria-pressed={item.code === locale}
          onClick={() => setLocale(item.code)}
        >
          <span className="locale-flag" aria-hidden="true">
            {item.flag}
          </span>
          <span className="locale-code">{item.label}</span>
        </button>
      ))}
    </div>
  );
}
