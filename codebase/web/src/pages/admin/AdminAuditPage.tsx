import { useCallback, useEffect, useState } from 'react';
import { useAuth, USE_MOCK_AUTH } from '../../auth/AuthContext';
import { AppLayout } from '../../components/AppLayout';
import { useI18n } from '../../i18n/I18nContext';
import { adminApi, type AuditEntry } from '../../api/adminApi';

export function AdminAuditPage() {
  const { token } = useAuth();
  const { t } = useI18n();
  const [entries, setEntries] = useState<AuditEntry[]>([]);

  const load = useCallback(async () => {
    if (USE_MOCK_AUTH) {
      setEntries([]);
      return;
    }
    if (!token) return;
    const data = await adminApi.auditLog(token);
    setEntries(data.items);
  }, [token]);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  return (
    <AppLayout title={t('pages.admin.audit.title')} navId="admin-audit">
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
          {entries.length === 0 ? (
            <tr><td colSpan={4} className="muted">{t('pages.admin.audit.empty')}</td></tr>
          ) : entries.map((e, i) => (
            <tr key={`${e.timestamp}-${i}`}>
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
