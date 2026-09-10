import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useI18n, type I18nApi } from '../../../i18n/I18nContext';
import { stagesForClient } from '../../../mock/caseWorkflow';
import type { CaseloadView } from '../../../mock/types';

export type ProfileSectionMeta = {
  tabId: string;
  title: string;
  deliverable: string;
  stageNum: number | null;
};

/**
 * One section per workflow stage followed by the supplemental record tabs,
 * mirroring the prototype's `RM.CaseForm.profileSections`.
 */
export function profileSections(client: CaseloadView, i18n: I18nApi): ProfileSectionMeta[] {
  const stages = stagesForClient(client, i18n).map((stage) => ({
    tabId: stage.tabId,
    title: stage.label,
    deliverable: stage.deliverable ?? '',
    stageNum: stage.stage,
  }));
  return [
    ...stages,
    {
      tabId: 'documents',
      title: i18n.t('forms.common.documentsTitle'),
      deliverable: i18n.t('forms.common.documentsDeliverable'),
      stageNum: null,
    },
    {
      tabId: 'activity',
      title: i18n.t('workflow.tabs.activity'),
      deliverable: '',
      stageNum: null,
    },
  ];
}

export function findSection(sections: ProfileSectionMeta[], tabId: string): ProfileSectionMeta {
  return (
    sections.find((section) => section.tabId === tabId) ?? {
      tabId,
      title: tabId,
      deliverable: '',
      stageNum: null,
    }
  );
}

type ProfileSectionProps = {
  section: ProfileSectionMeta;
  caseId: string;
  workspaceLinkLabel?: string;
  children: ReactNode;
};

export function ProfileSection({ section, caseId, workspaceLinkLabel, children }: ProfileSectionProps) {
  const { t } = useI18n();
  return (
    <section className="profile-360-section" id={`profile-section-${section.tabId}`}>
      <header className="profile-360-section-header">
        <div className="profile-360-section-heading">
          {section.stageNum ? (
            <span className="profile-360-section-num" aria-hidden="true">
              {section.stageNum}
            </span>
          ) : null}
          <div>
            <h2 className="profile-360-section-title">{section.title}</h2>
            {section.deliverable ? (
              <p className="profile-360-section-deliverable">{section.deliverable}</p>
            ) : null}
          </div>
        </div>
        <Link to={`/cases/${caseId}?tab=${section.tabId}`} className="btn btn-sm btn-secondary">
          {workspaceLinkLabel ?? t('forms.common.openInWorkspace')}
        </Link>
      </header>
      <div className="profile-360-section-body">{children}</div>
    </section>
  );
}
