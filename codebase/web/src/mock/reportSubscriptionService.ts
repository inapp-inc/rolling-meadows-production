import { saveStore } from './store';
import type { MockReportSubscription, MockStore } from './types';

export const SUBSCRIBE_FREQUENCIES = ['daily', 'weekly', 'monthly'] as const;

export type UpsertSubscriptionPayload = {
  userId: string;
  reportKey: string;
  reportKind: string;
  reportLabel: string;
  email: string;
  frequency: (typeof SUBSCRIBE_FREQUENCIES)[number];
};

export function findSubscription(
  store: MockStore,
  userId: string,
  reportKey: string,
  reportKind: string,
): MockReportSubscription | null {
  return (
    store.reportSubscriptions.find(
      (sub) => sub.userId === userId && sub.reportKey === reportKey && sub.reportKind === reportKind,
    ) ?? null
  );
}

export function upsertSubscription(store: MockStore, payload: UpsertSubscriptionPayload): MockReportSubscription {
  const existing = findSubscription(store, payload.userId, payload.reportKey, payload.reportKind);
  const now = new Date().toISOString();
  const record: MockReportSubscription = {
    id: existing?.id ?? `rsub-${Date.now()}`,
    userId: payload.userId,
    reportKey: payload.reportKey,
    reportKind: payload.reportKind,
    reportLabel: payload.reportLabel,
    email: payload.email.trim(),
    frequency: payload.frequency,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  if (existing) {
    const idx = store.reportSubscriptions.findIndex((s) => s.id === existing.id);
    store.reportSubscriptions[idx] = record;
  } else {
    store.reportSubscriptions.push(record);
  }
  saveStore(store);
  return record;
}

export function listSubscriptionsForUser(store: MockStore, userId: string): MockReportSubscription[] {
  return store.reportSubscriptions
    .filter((sub) => sub.userId === userId)
    .sort((a, b) => a.reportLabel.localeCompare(b.reportLabel));
}
