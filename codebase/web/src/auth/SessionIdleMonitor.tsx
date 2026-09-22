import { useEffect, useRef } from 'react';
import { useAuth, USE_MOCK_AUTH } from './AuthContext';
import { useToast } from '../components/ToastContext';
import { useI18n } from '../i18n/I18nContext';

const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'scroll', 'touchstart'] as const;
const CHECK_MS = 30_000;

/**
 * Signs the user out after configured idle time (HIPAA automatic logoff).
 */
export function SessionIdleMonitor() {
  const { user, logout, sessionPolicy } = useAuth();
  const { showToast } = useToast();
  const { t } = useI18n();
  const lastActivity = useRef(Date.now());

  useEffect(() => {
    if (USE_MOCK_AUTH || !user || !sessionPolicy) return;

    const idleMs = sessionPolicy.idleTimeoutMinutes * 60 * 1000;
    const bump = () => {
      lastActivity.current = Date.now();
    };
    for (const ev of ACTIVITY_EVENTS) {
      window.addEventListener(ev, bump, { passive: true });
    }

    const timer = window.setInterval(() => {
      if (Date.now() - lastActivity.current >= idleMs) {
        logout()
          .then(() => showToast(t('auth.sessionExpired'), 'warning'))
          .catch(() => undefined);
      }
    }, CHECK_MS);

    return () => {
      window.clearInterval(timer);
      for (const ev of ACTIVITY_EVENTS) {
        window.removeEventListener(ev, bump);
      }
    };
  }, [user, sessionPolicy, logout, showToast, t]);

  return null;
}
