import { apiRequest } from './http';

export type AppNotification = {
  type: 'overdue' | 'intake' | 'duplicate';
  titleKey: string;
  bodyKey: string;
  bodyParams: Record<string, string | number>;
  href: string;
};

export const notificationsApi = {
  list(token: string) {
    return apiRequest<{ items: AppNotification[] }>('/notifications', {}, token);
  },
};
