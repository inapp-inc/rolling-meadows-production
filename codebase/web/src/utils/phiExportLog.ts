import { USE_MOCK_AUTH } from '../auth/AuthContext';
import { complianceApi, type PhiExportPayload } from '../api/complianceApi';

export async function logPhiExport(token: string | null | undefined, payload: PhiExportPayload): Promise<void> {
  if (USE_MOCK_AUTH || !token) return;
  try {
    await complianceApi.recordExport(token, payload);
  } catch {
    /* export proceeds; audit failure should not block user download */
  }
}
