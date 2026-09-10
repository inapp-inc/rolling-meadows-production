import { useAuth } from '../../auth/AuthContext';
import { AppLayout } from '../../components/AppLayout';
import { TranslationsManagerPanel } from '../../components/TranslationsManagerPanel';
import { useI18n } from '../../i18n/I18nContext';

export function PlatformTranslationsPage() {
  const { token } = useAuth();
  const { t } = useI18n();

  return (
    <AppLayout title={t('pages.platform.translations.title')} navId="platform-translations">
      <TranslationsManagerPanel mode="platform" token={token} leadKey="pages.platform.translations.lead" />
    </AppLayout>
  );
}
