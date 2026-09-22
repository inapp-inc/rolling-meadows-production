import { apiRequest } from './http';

export type PhiExportPayload = {
  resourceType: 'report' | 'custom_report' | 'dashboard' | 'document' | 'caseload';
  resourceId?: string | null;
  exportFormat: 'csv' | 'xlsx' | 'png' | 'pdf' | 'file' | 'link';
};

export const complianceApi = {
  recordExport(token: string, body: PhiExportPayload) {
    return apiRequest<void>('/compliance/phi-export', { method: 'POST', body: JSON.stringify(body) }, token);
  },
};
