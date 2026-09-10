import { useI18n } from '../i18n/I18nContext';
import { moduleForNav, moduleLabelKey } from '../navigation/modules';

type PageHeaderProps = {
  title: string;
  lead?: string;
  moduleId?: string;
  navId?: string;
};

export function PageHeader({ title, lead, moduleId, navId }: PageHeaderProps) {
  const { t } = useI18n();
  const mod = moduleId ?? (navId ? moduleForNav(navId) : undefined);
  return (
    <div className="page-header">
      <div>
        {mod ? <p className="page-module-crumb">{t(moduleLabelKey(mod))}</p> : null}
        <h1>{title}</h1>
        {lead ? <p className="page-lead">{lead}</p> : null}
      </div>
    </div>
  );
}
