import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ApiError, catalogApi, type Workflow } from '../../api/client';
import { USE_MOCK_AUTH, useAuth } from '../../auth/AuthContext';
import { AppLayout } from '../../components/AppLayout';
import { getClient } from '../../mock/clientService';
import { workflowPreviewForSubcategory } from '../../mock/caseCreationService';
import { useMockData } from '../../mock/MockDataContext';
import { clearPendingClientId, setPendingCase, setPendingClientId } from '../../mock/session';
import { useI18n } from '../../i18n/I18nContext';

const DEFAULT_CATEGORY_ID = 'cat-senior-services';
const DEFAULT_SUBCATEGORY_ID = 'sub-seniors-at-risk';

export function CaseCreationPage() {
  const { token, user } = useAuth();
  const { store } = useMockData();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const clientIdParam = params.get('clientId');
  const urgent = params.get('urgent') === '1';

  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const linkedClient = useMemo(() => {
    if (!clientIdParam) return null;
    if (USE_MOCK_AUTH) return getClient(store, clientIdParam);
    return null;
  }, [clientIdParam, store]);

  useEffect(() => {
    if (USE_MOCK_AUTH) {
      setWorkflow(workflowPreviewForSubcategory(DEFAULT_SUBCATEGORY_ID));
      return;
    }
    if (!token) return;
    catalogApi.workflow(token, DEFAULT_SUBCATEGORY_ID).then(setWorkflow);
  }, [token]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (!USE_MOCK_AUTH && !token) return;
      if (USE_MOCK_AUTH && !user) throw new Error('Sign in required.');
      setPendingCase({ categoryId: DEFAULT_CATEGORY_ID, subcategoryId: DEFAULT_SUBCATEGORY_ID });
      if (clientIdParam) setPendingClientId(clientIdParam);
      else clearPendingClientId();
      navigate(clientIdParam ? `/cases/intake?clientId=${clientIdParam}` : '/cases/intake');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Case creation failed.');
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setError('');
    if (clientIdParam) {
      navigate('/cases/new');
      return;
    }
    clearPendingClientId();
  }

  return (
    <AppLayout title="Case Creation" navId="case-creation">
      <p className="page-lead">{t('caseCreation.stepLead')}</p>

      {urgent ? (
        <div className="alert alert-warning">
          <strong>{t('pages.caseCreation.urgentCase')}</strong> — client flagged during registration. Prioritize referral &amp; intake.
        </div>
      ) : null}

      {linkedClient ? (
        <div className="case-category-banner">
          <strong>{t('pages.caseCreation.existingClient')}</strong> {linkedClient.name} · {linkedClient.phone}
          {urgent ? (
            <>
              {' '}
              · <span className="incomplete-badge">{t('pages.caseCreation.urgentCase')}</span>
            </>
          ) : null}
        </div>
      ) : null}

      <form className="card" onSubmit={onSubmit}>
        {workflow ? (
          <div id="workflow-preview" className="workflow-preview card">
            <h3>{workflow.name}</h3>
            <p>{workflow.description}</p>
            <ol className="workflow-preview-stages">
              {workflow.stages.map((s) => (
                <li key={s.tabId}>
                  <strong>{s.label}</strong>
                  {s.deliverable ? ` — ${s.deliverable}` : ''}
                </li>
              ))}
            </ol>
          </div>
        ) : null}

        {error ? <div className="alert alert-danger">{error}</div> : null}

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Creating…' : t('case.continueReferral')}
          </button>
          <button type="button" className="btn btn-secondary" id="case-creation-reset" onClick={resetForm}>
            {t('pages.caseCreation.reset')}
          </button>
          {!clientIdParam ? (
            <Link to="/clients/search" className="btn btn-secondary">
              {t('pages.caseCreation.linkExistingClientOptional')}
            </Link>
          ) : null}
        </div>
      </form>
    </AppLayout>
  );
}
