import { useAuth } from '../../auth/AuthContext';
import { AppLayout } from '../../components/AppLayout';
import { TranslationsManagerPanel } from '../../components/TranslationsManagerPanel';
import { useI18n } from '../../i18n/I18nContext';

export function AdminLabelsPage() {
  const { token } = useAuth();
  const { t } = useI18n();

  return (
    <AppLayout title={t('pages.admin.labels.title')} navId="admin-labels">
      <TranslationsManagerPanel mode="admin" token={token} leadKey="pages.admin.labels.lead" />
    </AppLayout>
  );
}
