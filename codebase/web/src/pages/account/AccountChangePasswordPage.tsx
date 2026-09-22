import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { AppLayout } from '../../components/AppLayout';
import { useToast } from '../../components/ToastContext';
import { useI18n } from '../../i18n/I18nContext';

export function AccountChangePasswordPage() {
  const { token, user, refreshUser } = useAuth();
  const { t } = useI18n();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);

  if (!user || !token) {
    return null;
  }

  const accessToken = token;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast(t('pages.account.changePassword.mismatch'), 'error');
      return;
    }
    setBusy(true);
    try {
      await api.changePassword(accessToken, currentPassword, newPassword);
      const profile = await refreshUser();
      showToast(t('pages.account.changePassword.success'), 'success');
      navigate(profile?.landingPath ?? '/dashboard', { replace: true });
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('pages.account.changePassword.error'), 'error');
    } finally {
      setBusy(false);
    }
  }

  const daysRemaining = user.passwordDaysRemaining;
  const showExpiryHint =
    typeof daysRemaining === 'number' && daysRemaining >= 0 && !user.passwordChangeRequired;

  return (
    <AppLayout title={t('pages.account.changePassword.title')}>
      <form className="card form-card" onSubmit={onSubmit} style={{ maxWidth: '32rem' }}>
        {user.passwordChangeRequired ? (
          <p className="form-lead">{t('pages.account.changePassword.requiredLead')}</p>
        ) : null}
        {showExpiryHint ? (
          <p className="muted">{t('pages.account.changePassword.expiresIn', { days: daysRemaining })}</p>
        ) : null}
        <div className="form-group">
          <label htmlFor="current-password">{t('pages.account.changePassword.current')}</label>
          <input
            id="current-password"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            disabled={busy}
          />
        </div>
        <div className="form-group">
          <label htmlFor="new-password">{t('pages.account.changePassword.new')}</label>
          <input
            id="new-password"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            disabled={busy}
          />
        </div>
        <div className="form-group">
          <label htmlFor="confirm-password">{t('pages.account.changePassword.confirm')}</label>
          <input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            disabled={busy}
          />
        </div>
        <div className="form-actions">
          {!user.passwordChangeRequired ? (
            <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => navigate(-1)}>
              {t('common.cancel')}
            </button>
          ) : null}
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {t('pages.account.changePassword.submit')}
          </button>
        </div>
      </form>
    </AppLayout>
  );
}
