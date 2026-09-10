import { useI18n } from '../i18n/I18nContext';
import type { FamilyFormConfig } from '../mock/familyFormConfig';
import type { IntakeQuestionAnswers } from '../mock/types';

export type IntakeFormValues = {
  refSource: string;
  refReason: string;
  refBy: string;
  clientName: string;
  clientDob: string;
  clientPhone: string;
  clientAddress: string;
  living: string;
  medical: string;
  consent: boolean;
  intakeQuestions: IntakeQuestionAnswers;
};

export function emptyIntakeValues(): IntakeFormValues {
  return {
    refSource: '',
    refReason: '',
    refBy: '',
    clientName: '',
    clientDob: '',
    clientPhone: '',
    clientAddress: '',
    living: '',
    medical: '',
    consent: false,
    intakeQuestions: {},
  };
}

type IntakeFormFieldsProps = {
  config: FamilyFormConfig;
  values: IntakeFormValues;
  onChange: (patch: Partial<IntakeFormValues>) => void;
  /** Disables everything (auditor / closed case). */
  readOnly?: boolean;
  /** Locks only identity fields, used when adding a case for an existing client. */
  readOnlyClient?: boolean;
  onIdentityInput?: () => void;
  onIdentityBlur?: () => void;
};

/**
 * Referral + intake + screening fields, driven by the program family's form
 * config. Mirrors the prototype's `RM.CaseForm.intakeFormHtml`.
 */
export function IntakeFormFields({
  config,
  values,
  onChange,
  readOnly,
  readOnlyClient,
  onIdentityInput,
  onIdentityBlur,
}: IntakeFormFieldsProps) {
  const { t, picklistLabel } = useI18n();
  const clientDisabled = readOnly || readOnlyClient;

  return (
    <>
      <h3 className="form-section-title">{config.referralSectionTitle}</h3>
      <div className="form-row form-row-2">
        <div className="form-group">
          <label htmlFor="ref-source">{t('forms.common.referralSource')}</label>
          <select
            id="ref-source"
            required
            disabled={readOnly}
            value={values.refSource}
            onChange={(e) => onChange({ refSource: e.target.value })}
          >
            <option value="">{t('forms.common.select')}</option>
            {config.sources.map((source) => (
              <option key={source} value={source}>
                {picklistLabel('referralSources', source)}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="ref-reason">{t('forms.common.reason')}</label>
          <select
            id="ref-reason"
            required
            disabled={readOnly}
            value={values.refReason}
            onChange={(e) => onChange({ refReason: e.target.value })}
          >
            <option value="">{t('forms.common.select')}</option>
            {config.reasons.map((reason) => (
              <option key={reason} value={reason}>
                {picklistLabel('referralReasons', reason)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="ref-by">{t('forms.common.referredBy')}</label>
        <input
          type="text"
          id="ref-by"
          required
          disabled={readOnly}
          value={values.refBy}
          onChange={(e) => onChange({ refBy: e.target.value })}
        />
      </div>

      <h3 className="form-section-title">{config.intakeSectionTitle}</h3>
      <div className="form-row form-row-2">
        <div className="form-group">
          <label htmlFor="client-name">{t('forms.common.clientName')}</label>
          <input
            type="text"
            id="client-name"
            required
            autoComplete="name"
            disabled={clientDisabled}
            value={values.clientName}
            onChange={(e) => {
              onChange({ clientName: e.target.value });
              onIdentityInput?.();
            }}
            onBlur={onIdentityBlur}
          />
        </div>
        <div className="form-group">
          <label htmlFor="client-dob">{t('forms.common.dateOfBirth')}</label>
          <input
            type="date"
            id="client-dob"
            disabled={clientDisabled}
            value={values.clientDob}
            onChange={(e) => {
              onChange({ clientDob: e.target.value });
              onIdentityInput?.();
            }}
            onBlur={onIdentityBlur}
          />
        </div>
      </div>

      <div className="form-row form-row-2">
        <div className="form-group">
          <label htmlFor="client-phone">{t('forms.common.phone')}</label>
          <input
            type="tel"
            id="client-phone"
            autoComplete="tel"
            disabled={clientDisabled}
            value={values.clientPhone}
            onChange={(e) => {
              onChange({ clientPhone: e.target.value });
              onIdentityInput?.();
            }}
            onBlur={onIdentityBlur}
          />
        </div>
        <div className="form-group">
          <label htmlFor="client-address">{t('forms.common.address')}</label>
          <input
            type="text"
            id="client-address"
            disabled={readOnly}
            value={values.clientAddress}
            onChange={(e) => onChange({ clientAddress: e.target.value })}
          />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="living">{config.livingLabel}</label>
        <input
          type="text"
          id="living"
          disabled={readOnly}
          value={values.living}
          onChange={(e) => onChange({ living: e.target.value })}
        />
      </div>

      <div className="form-group">
        <label htmlFor="medical">{config.backgroundLabel}</label>
        <textarea
          id="medical"
          rows={3}
          disabled={readOnly}
          value={values.medical}
          onChange={(e) => onChange({ medical: e.target.value })}
        />
      </div>

      <h3 className="form-section-title" style={{ fontSize: '0.9375rem', marginTop: '1rem' }}>
        {config.screeningSectionTitle}
      </h3>
      <div className="form-row form-row-2 form-intake-grid">
        {config.intakeQuestions.map((q) => (
          <div className="form-group" key={q.key}>
            <label htmlFor={q.fieldId}>{q.label}</label>
            <textarea
              id={q.fieldId}
              rows={2}
              disabled={readOnly}
              value={values.intakeQuestions[q.key] ?? ''}
              onChange={(e) =>
                onChange({
                  intakeQuestions: { ...values.intakeQuestions, [q.key]: e.target.value },
                })
              }
            />
          </div>
        ))}
      </div>

      <div className="form-check-row">
        <label className="checkbox-label" htmlFor="consent">
          <input
            type="checkbox"
            id="consent"
            disabled={readOnly}
            checked={values.consent}
            onChange={(e) => onChange({ consent: e.target.checked })}
          />
          <span>{t('forms.common.consentOnFile')}</span>
        </label>
      </div>
    </>
  );
}
