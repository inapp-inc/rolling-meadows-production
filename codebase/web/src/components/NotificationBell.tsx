import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useI18n } from '../i18n/I18nContext';
import { useMockData } from '../mock/MockDataContext';
import { notificationsForUser } from '../mock/notificationService';

export function NotificationBell() {
  const { user } = useAuth();
  const { store } = useMockData();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const items = useMemo(() => (user ? notificationsForUser(store, user) : []), [store, user]);

  useEffect(() => {
    if (!open) return;
    function onDocumentClick(event: MouseEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('click', onDocumentClick);
    return () => document.removeEventListener('click', onDocumentClick);
  }, [open]);

  if (!user) return null;

  const label = t('shell.notifications');

  return (
    <div className="notification-wrap" ref={wrapRef}>
      <button
        type="button"
        className="notification-bell"
        id="btn-notifications"
        title={label}
        aria-label={label}
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((current) => !current);
        }}
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {items.length ? <span className="notification-count">{items.length}</span> : null}
      </button>
      <div className={`notification-dropdown${open ? '' : ' hidden'}`} id="notification-dropdown" role="menu">
        {!items.length ? (
          <div className="notification-empty">{t('shell.noAlerts')}</div>
        ) : (
          items.map((item, index) => (
            <Link
              key={`${item.type}-${index}`}
              className="notification-item"
              to={item.href}
              role="menuitem"
              onClick={() => setOpen(false)}
            >
              <span className="notification-item-title">{t(item.titleKey)}</span>
              <span className="notification-item-body">{t(item.bodyKey, item.bodyParams)}</span>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
