import type { CaseWorkspace } from '../../../api/client';
import { EmptyState } from '../../../components/EmptyState';
import { RiskBadge } from '../../../components/RiskBadge';
import { useI18n } from '../../../i18n/I18nContext';
import type { FamilyFormConfig } from '../../../mock/familyFormConfig';
import type { CaseloadView, MockAssessment, MockIntake } from '../../../mock/types';
import { RatingsCompare, RatingsList, RatingsTable, RiskScoreSummary } from './ProfileRatings';
import { ProfileSection, type ProfileSectionMeta } from './ProfileSection';
import { VoidedLabel } from './VoidedLabel';

type SectionProps = {
  section: ProfileSectionMeta;
  ws: CaseWorkspace;
};

type ConfiguredSectionProps = SectionProps & { cfg: FamilyFormConfig };

export function IntakeSection({ section, ws, cfg, intake }: ConfiguredSectionProps & { intake: MockIntake | null }) {
  const { t, formatDate, referralSourceLabel, referralReasonLabel, intakeCompletenessLabel } = useI18n();
  const referral = ws.referral;

  return (
    <ProfileSection section={section} caseId={ws.case.id}>
      {!referral && !intake ? (
        <EmptyState
          title={t('pages.clientProfile.noIntakeData')}
          hint={t('pages.clientProfile.noIntakeHint', { stage: section.title.toLowerCase() })}
        />
      ) : (
        <>
          {referral ? (
            <div className="profile-subblock">
              <p>
                <strong>{t('pages.clientProfile.source')}</strong> {referralSourceLabel(referral.source)}
              </p>
              <p>
                <strong>{t('pages.clientProfile.reason')}</strong> {referralReasonLabel(referral.reason)}
              </p>
              <p>
                <strong>{t('pages.clientProfile.date')}</strong> {formatDate(referral.dateReceived)}
              </p>
              <p>
                <strong>{t('pages.clientProfile.referredBy')}</strong> {referral.referrerName || '—'}
              </p>
            </div>
          ) : null}
          {intake ? (
            <div className="profile-subblock">
              <p>
                <strong>{cfg.livingLabel}:</strong> {intake.livingArrangement || '—'}
              </p>
              <p>
                <strong>{cfg.backgroundLabel}:</strong> {intake.medicalHistory || '—'}
              </p>
              {cfg.intakeQuestions.map((question) => (
                <p key={question.key}>
                  <strong>{question.label}:</strong> {intake.intakeQuestions?.[question.key] || '—'}
                </p>
              ))}
              <p>
                <strong>{t('pages.clientProfile.consentOnFile')}</strong>{' '}
                {intake.consentOnFile ? t('enums.consent.Yes') : t('enums.consent.No')}
              </p>
              <p>
                <strong>{t('pages.clientProfile.status')}</strong>{' '}
                {intakeCompletenessLabel(intake.completeness) || '—'}
              </p>
            </div>
          ) : null}
        </>
      )}
    </ProfileSection>
  );
}

export function AssessmentSection({
  section,
  ws,
  cfg,
  intake,
}: ConfiguredSectionProps & { intake: MockIntake | null }) {
  const { t } = useI18n();

  return (
    <ProfileSection section={section} caseId={ws.case.id}>
      {intake?.comprehensiveAssessmentNotes ? (
        <div className="profile-subblock">
          <p>
            <strong>{cfg.assessmentSummaryBackgroundLabel}:</strong> {intake.medicalHistory || '—'}
          </p>
          <p>
            <strong>{cfg.assessmentNoteLabel}:</strong> {intake.comprehensiveAssessmentNotes}
          </p>
        </div>
      ) : (
        <EmptyState
          title={t('pages.clientProfile.noAssessmentSummary')}
          hint={t('pages.clientProfile.noAssessmentHint', { stage: section.title.toLowerCase() })}
        />
      )}
    </ProfileSection>
  );
}

export function RiskSection({
  section,
  client,
  ws,
  assessments,
}: SectionProps & { client: CaseloadView; assessments: MockAssessment[] }) {
  const { t, formatDate } = useI18n();

  return (
    <ProfileSection section={section} caseId={ws.case.id}>
      {assessments.length ? (
        <>
          <RiskScoreSummary
            compositeScore={ws.riskAssessment?.compositeScore}
            overallRisk={ws.riskAssessment?.overallRisk}
            assessedDate={ws.riskAssessment?.date}
          />
          {assessments.map((assessment) => (
            <div className="profile-subblock" key={assessment.id}>
              <p className="profile-inline-meta">
                {formatDate(assessment.date)}
                {assessment.compositeScore != null
                  ? ` · ${t('pages.clientProfile.composite')} ${assessment.compositeScore}`
                  : ''}{' '}
                · {t('pages.clientProfile.overall')} <RiskBadge level={assessment.overallRisk} />
              </p>
              <RatingsTable client={client} ratings={assessment.ratings} />
            </div>
          ))}
        </>
      ) : (
        <EmptyState
          title={t('pages.clientProfile.noRatings')}
          hint={t('pages.clientProfile.noRatingsHint', { stage: section.title.toLowerCase() })}
        />
      )}
    </ProfileSection>
  );
}

export function CarePlanSection({ section, ws, cfg }: ConfiguredSectionProps) {
  const { t, enumLabel } = useI18n();
  const items = ws.carePlanItems ?? [];

  return (
    <ProfileSection section={section} caseId={ws.case.id}>
      {items.length ? (
        <table className="data-table">
          <thead>
            <tr>
              <th>{cfg.carePlanIssueLabel}</th>
              <th>{cfg.carePlanGoalLabel}</th>
              <th>{cfg.carePlanServiceLabel}</th>
              <th>{t('pages.clientProfile.status')}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className={item.voided ? 'voided-row' : undefined}>
                <td>
                  {item.issue}
                  <VoidedLabel voided={item.voided} voidReason={item.voidReason} />
                </td>
                <td>{item.goal}</td>
                <td>{item.service}</td>
                <td>{enumLabel('carePlanStatus', item.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <EmptyState
          title={t('pages.clientProfile.noPlanItems')}
          hint={t('pages.clientProfile.noPlanHint', { list: cfg.carePlanListTitle.toLowerCase() })}
        />
      )}
    </ProfileSection>
  );
}

export function ServicesSection({ section, ws, cfg }: ConfiguredSectionProps) {
  const { t, formatDate, enumLabel, eventLabel } = useI18n();
  const enrollments = ws.enrollments ?? [];
  const cboReferrals = ws.cboReferrals ?? [];

  return (
    <ProfileSection section={section} caseId={ws.case.id}>
      {!enrollments.length && !cboReferrals.length ? (
        <EmptyState
          title={t('pages.clientProfile.noServices')}
          hint={t('pages.clientProfile.noServicesHint', { services: cfg.servicesTitle.toLowerCase() })}
        />
      ) : (
        <>
          {enrollments.length ? (
            <>
              <h3 className="profile-subheading">{cfg.servicesTitle}</h3>
              <ul className="profile-list">
                {enrollments.map((enrollment) => (
                  <li key={enrollment.id} className={enrollment.voided ? 'voided-row' : undefined}>
                    {eventLabel(enrollment.serviceOrEventId)} — {formatDate(enrollment.dateEnrolled)}
                    <VoidedLabel voided={enrollment.voided} voidReason={enrollment.voidReason} />
                  </li>
                ))}
              </ul>
            </>
          ) : null}
          {cboReferrals.length ? (
            <>
              <h3 className="profile-subheading">{cfg.cboTitle}</h3>
              <ul className="profile-list">
                {cboReferrals.map((referral) => (
                  <li key={referral.id}>
                    {referral.cboName} — {enumLabel('cboStatus', referral.status)}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </>
      )}
    </ProfileSection>
  );
}

export function FollowUpSection({ section, ws, cfg }: ConfiguredSectionProps) {
  const { t, formatDate, noteTypeLabel } = useI18n();
  const notes = ws.notes ?? [];

  return (
    <ProfileSection section={section} caseId={ws.case.id}>
      {notes.length ? (
        notes.map((note) => (
          <div className={`note-entry${note.voided ? ' voided-row' : ''}`} key={note.id}>
            <div className="note-meta">
              {formatDate(note.date)} · {noteTypeLabel(note.type)}
              <VoidedLabel voided={note.voided} voidReason={note.voidReason} />
            </div>
            <p>{note.text}</p>
          </div>
        ))
      ) : (
        <EmptyState
          title={t('pages.clientProfile.noFollowUpNotes')}
          hint={t('pages.clientProfile.noFollowUpHint', { monitoring: cfg.followupMonitoringTitle })}
        />
      )}
    </ProfileSection>
  );
}

export function ReassessmentSection({ section, client, ws }: SectionProps & { client: CaseloadView }) {
  const { t, formatDate, picklistLabel } = useI18n();
  const reassessments = ws.reassessments ?? [];

  return (
    <ProfileSection section={section} caseId={ws.case.id}>
      {reassessments.length ? (
        reassessments.map((reassessment) => (
          <div className="profile-subblock" key={reassessment.id}>
            <p className="profile-inline-meta">
              {formatDate(reassessment.date)} · {t('pages.clientProfile.trigger')}{' '}
              {picklistLabel('reassessmentTriggers', reassessment.trigger)}
            </p>
            <div className="compare-grid">
              <div>
                <h4>{t('pages.clientProfile.previous')}</h4>
                <RatingsList client={client} ratings={reassessment.previousRatings} />
              </div>
              <div>
                <h4>{t('pages.clientProfile.current')}</h4>
                <RatingsList client={client} ratings={reassessment.newRatings} />
              </div>
            </div>
            <RatingsCompare
              client={client}
              previousRatings={reassessment.previousRatings}
              newRatings={reassessment.newRatings}
            />
          </div>
        ))
      ) : (
        <EmptyState
          title={t('pages.clientProfile.noRecordedReviews')}
          hint={t('pages.clientProfile.noReviewsHint', { stage: section.title.toLowerCase() })}
        />
      )}
    </ProfileSection>
  );
}

export function ClosureSection({ section, ws, cfg }: ConfiguredSectionProps) {
  const { t, formatDate, enumLabel } = useI18n();
  const closure = ws.closure;
  const outcomes = closure?.outcomesSummary ?? {};

  return (
    <ProfileSection section={section} caseId={ws.case.id}>
      {closure ? (
        <div className="profile-subblock">
          <p>
            <strong>{t('pages.clientProfile.closed')}</strong> {formatDate(closure.date)}
          </p>
          <p>
            <strong>{t('pages.clientProfile.reasonLabel')}</strong> {enumLabel('closureReason', closure.reason)}
          </p>
          <p>
            <strong>{cfg.closureServicesLabel}:</strong> {outcomes.servicesProvided || '—'}
          </p>
          <p>
            <strong>{cfg.closureOutcomesLabel}:</strong> {outcomes.outcomesAchieved || '—'}
          </p>
          <p>
            <strong>{cfg.closureRisksLabel}:</strong> {outcomes.remainingRisks || '—'}
          </p>
          <p>
            <strong>{cfg.closureReferralLabel}:</strong> {outcomes.referralForward || '—'}
          </p>
        </div>
      ) : (
        <EmptyState
          title={t('pages.clientProfile.caseOpen')}
          hint={t('pages.clientProfile.caseOpenHint', { stage: section.title })}
        />
      )}
    </ProfileSection>
  );
}
