import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useI18n } from '../i18n/I18nContext';
import { LocaleSwitcher } from '../i18n/LocaleSwitcher';
import { withBasePath } from '../utils/basePath';

export function LoginPage() {
  const { login } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [email, setEmail] = useState('tenant.admin@demo.rmhs.app');
  const [password, setPassword] = useState('ChangeMe123!');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email.trim(), password);
      navigate(user.landingPath, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('signIn.loginFailed'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="sign-in-page">
      <section className="sign-in-hero" aria-label={t('signIn.welcomeAria')}>
        <div className="sign-in-hero-content">
          <img src={withBasePath('/assets/logo.svg')} alt="City of Rolling Meadows" className="hero-logo" />
          <h1>{t('signIn.heroTitle')}</h1>
          <p className="hero-tagline">{t('signIn.heroTagline')}</p>
          <ul className="sign-in-features">
            <li>{t('signIn.feature1')}</li>
            <li>{t('signIn.feature2')}</li>
            <li>{t('signIn.feature3')}</li>
          </ul>
          <div className="hero-built-by">
            <span className="built-by-label">{t('signIn.builtByFoundry')}</span>
          </div>
        </div>
      </section>

      <section className="sign-in-panel">
        <div className="sign-in-card">
          <div className="sign-in-card-top">
            <div>
              <h2 id="sign-in-title">{t('signIn.title')}</h2>
              <p className="subtitle">{t('signIn.subtitleCredentials')}</p>
            </div>
            <LocaleSwitcher compact />
          </div>

          <form id="sign-in-form" onSubmit={onSubmit}>
            <div className="form-group">
              <label htmlFor="email-input">{t('signIn.emailLabel')}</label>
              <input
                id="email-input"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="password-input">{t('signIn.passwordLabel')}</label>
              <input
                id="password-input"
                type="password"
                autoComplete="current-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error ? (
              <div className="alert alert-danger" role="alert">
                {error}
              </div>
            ) : null}
            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? t('signIn.signingIn') : t('signIn.signInButton')}
              </button>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}
