import { ReactNode } from 'react';
import { PageHeader } from './PageHeader';
import { useI18n } from '../i18n/I18nContext';
import { moduleForNav, pageTitleKeyForNav } from '../navigation/modules';

type AppLayoutProps = {
  title?: string;
  lead?: string;
  moduleId?: string;
  navId?: string;
  children: ReactNode;
};

/** Page frame inside AppShell — matches prototype modulePageHeader + content. */
export function AppLayout({ title, lead, moduleId, navId, children }: AppLayoutProps) {
  const { t } = useI18n();
  const resolvedTitle = title ?? (navId ? t(pageTitleKeyForNav(navId)) : '');
  const resolvedModule = moduleId ?? (navId ? moduleForNav(navId) : undefined);
  return (
    <>
      <PageHeader title={resolvedTitle} lead={lead} moduleId={resolvedModule} navId={navId} />
      {children}
    </>
  );
}
