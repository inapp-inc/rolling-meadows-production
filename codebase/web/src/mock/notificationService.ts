import type { UserProfile } from '../api/client';
import { caseloadForUser, getDueFollowUps } from './caseService';
import { dedupCheck } from './clientService';
import type { MockStore } from './types';

export type MockNotification = {
  type: 'overdue' | 'intake' | 'duplicate';
  /** i18n key for the notification title. */
  titleKey: string;
  /** i18n key for the notification body. */
  bodyKey: string;
  bodyParams: Record<string, string | number>;
  href: string;
};

function pairKey(idA: string, idB: string): string {
  return [idA, idB].sort().join('::');
}

function pendingDuplicateCount(store: MockStore): number {
  const dismissed = new Set(store.meta?.dismissedDuplicatePairs ?? []);
  let count = 0;

  store.clients.forEach((client, index) => {
    store.clients.slice(index + 1).forEach((other) => {
      if (dismissed.has(pairKey(client.id, other.id))) return;
      const matches = dedupCheck(store, { name: client.name, phone: client.phone, dob: client.dob });
      if (matches.some((m) => m.client.id === other.id && m.score >= 25)) count += 1;
    });
  });

  return count;
}

export function notificationsForUser(store: MockStore, user: UserProfile | null): MockNotification[] {
  if (!user || user.role === 'auditor' || user.role === 'cross_program_liaison') return [];

  const items: MockNotification[] = [];
  const caseload = caseloadForUser(store, user);
  const overdue = getDueFollowUps(caseload, user.role === 'case_manager' ? user.id : null);

  overdue.slice(0, 3).forEach((due) => {
    items.push({
      type: 'overdue',
      titleKey: 'notifications.overdueFollowUp',
      bodyKey:
        due.daysOverdue === 1 ? 'notifications.daysOverdueBody' : 'notifications.daysOverdueBodyPlural',
      bodyParams: { name: due.client.name, count: due.daysOverdue },
      href: `/cases/${due.client.caseId}?tab=followup`,
    });
  });

  caseload
    .filter((c) => c.incompleteIntake)
    .slice(0, 2)
    .forEach((c) => {
      items.push({
        type: 'intake',
        titleKey: 'notifications.incompleteIntake',
        bodyKey: 'notifications.consentDobMissingBody',
        bodyParams: { name: c.name },
        href: `/cases/${c.caseId}?tab=intake`,
      });
    });

  if (user.role === 'supervisor') {
    const dupCount = pendingDuplicateCount(store);
    if (dupCount) {
      items.push({
        type: 'duplicate',
        titleKey: 'notifications.duplicateReview',
        bodyKey:
          dupCount === 1 ? 'notifications.duplicatePairsBody' : 'notifications.duplicatePairsBodyPlural',
        bodyParams: { count: dupCount },
        href: '/clients/duplicates',
      });
    }
  }

  return items.slice(0, 8);
}
