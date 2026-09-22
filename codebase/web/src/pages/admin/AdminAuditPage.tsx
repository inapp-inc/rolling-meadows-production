import { useCallback, useEffect, useState } from 'react';
import { useAuth, USE_MOCK_AUTH } from '../../auth/AuthContext';
import { AppLayout } from '../../components/AppLayout';
import { useI18n } from '../../i18n/I18nContext';
import { adminApi, type AuditEntry, type PhiAccessEntry } from '../../api/adminApi';

export function AdminAuditPage() {
  const { token } = useAuth();
  const { t } = useI18n();
  const [securityEntries, setSecurityEntries] = useState<AuditEntry[]>([]);
  const [phiEntries, setPhiEntries] = useState<PhiAccessEntry[]>([]);

  const load = useCallback(async () => {
    if (USE_MOCK_AUTH) {
      setSecurityEntries([]);
      setPhiEntries([]);
      return;
    }
    if (!token) return;
    const [security, phi] = await Promise.all([
      adminApi.auditLog(token),
      adminApi.phiAccessLog(token),
    ]);
    setSecurityEntries(security.items);
    setPhiEntries(phi.items);
  }, [token]);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  return (
    <AppLayout title={t('pages.admin.audit.title')} navId="admin-audit">
      <p className="lead">{t('pages.admin.audit.lead')}</p>

      <h2 className="section-heading">{t('pages.admin.audit.phiSectionTitle')}</h2>
      <table className="data-table">
        <thead>
          <tr>
            <th>{t('pages.admin.audit.colTime')}</th>
            <th>{t('pages.admin.audit.colAction')}</th>
            <th>{t('pages.admin.audit.colResource')}</th>
            <th>{t('pages.admin.audit.colActor')}</th>
            <th>{t('pages.admin.audit.colIp')}</th>
          </tr>
        </thead>
        <tbody>
          {phiEntries.length === 0 ? (
            <tr><td colSpan={5} className="muted">{t('pages.admin.audit.phiEmpty')}</td></tr>
          ) : phiEntries.map((e, i) => (
            <tr key={`phi-${e.timestamp}-${i}`}>
              <td>{e.timestamp ? new Date(e.timestamp).toLocaleString() : '—'}</td>
              <td>{e.action}</td>
              <td>{e.resourceType}{e.resourceId ? ` / ${e.resourceId}` : ''}</td>
              <td>{e.actorId ?? '—'}</td>
              <td>{e.ipAddress ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="section-heading">{t('pages.admin.audit.securitySectionTitle')}</h2>
      <table className="data-table">
        <thead>
          <tr>
            <th>{t('pages.admin.audit.colTime')}</th>
            <th>{t('pages.admin.audit.colAction')}</th>
            <th>{t('pages.admin.audit.colResource')}</th>
            <th>{t('pages.admin.audit.colActor')}</th>
          </tr>
        </thead>
        <tbody>
          {securityEntries.length === 0 ? (
            <tr><td colSpan={4} className="muted">{t('pages.admin.audit.empty')}</td></tr>
          ) : securityEntries.map((e, i) => (
            <tr key={`sec-${e.timestamp}-${i}`}>
              <td>{e.timestamp ? new Date(e.timestamp).toLocaleString() : '—'}</td>
              <td>{e.action}</td>
              <td>{e.resourceType}{e.resourceId ? ` / ${e.resourceId}` : ''}</td>
              <td>{e.actorId ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </AppLayout>
  );
}
