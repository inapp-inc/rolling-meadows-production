import { dedupCheck } from './clientService';
import { saveStore } from './store';
import type { MockClient, MockStore } from './types';

export type DuplicatePair = {
  /** `"idA::idB"` with ids sorted — the dismissal key shared with the store meta bag. */
  key: string;
  a: MockClient;
  b: MockClient;
  score: number;
  matchedFields: string[];
};

export function pairKey(idA: string, idB: string): string {
  return [idA, idB].sort().join('::');
}

function dismissedPairKeys(store: MockStore): string[] {
  return store.meta?.dismissedDuplicatePairs ?? [];
}

/** Candidate duplicate pairs across the whole client list, each pair listed once. */
export function listDuplicatePairs(store: MockStore): DuplicatePair[] {
  const dismissed = new Set(dismissedPairKeys(store));
  const pairs: DuplicatePair[] = [];

  store.clients.forEach((client, index) => {
    const matches = dedupCheck(
      store,
      { name: client.name, phone: client.phone, dob: client.dob },
      client.id,
    );
    store.clients.slice(index + 1).forEach((other) => {
      const key = pairKey(client.id, other.id);
      if (dismissed.has(key)) return;
      const hit = matches.find((m) => m.client.id === other.id && m.score >= 25);
      if (hit) {
        pairs.push({ key, a: client, b: other, score: hit.score, matchedFields: hit.matchedFields });
      }
    });
  });

  return pairs;
}

/** Keeps the two records separate so the pair stops surfacing for review. */
export function dismissPair(store: MockStore, idA: string, idB: string, actor: string): void {
  const key = pairKey(idA, idB);
  const dismissed = dismissedPairKeys(store);
  if (!dismissed.includes(key)) {
    store.meta = { ...store.meta, dismissedDuplicatePairs: [...dismissed, key] };
  }
  store.auditLog.push({
    id: `aud-dup-dismiss-${Date.now()}`,
    timestamp: new Date().toISOString(),
    actor,
    action: 'duplicate_review',
    entityRef: `client:${idA}`,
    detail: key,
  });
  saveStore(store);
}

/** Reassigns every record of `duplicateId` to `primaryId`, then removes the duplicate. */
export function mergeClients(
  store: MockStore,
  primaryId: string,
  duplicateId: string,
  actor: string,
): void {
  if (!primaryId || !duplicateId || primaryId === duplicateId) return;

  const owned: { clientId: string }[][] = [
    store.referrals,
    store.intakes,
    store.assessments,
    store.carePlans,
    store.enrollments,
    store.cboReferrals,
    store.notes,
    store.reassessments,
    store.closures,
    store.documents,
    store.cases,
  ];
  owned.forEach((records) => {
    records.forEach((record) => {
      if (record.clientId === duplicateId) record.clientId = primaryId;
    });
  });

  store.clients = store.clients.filter((c) => c.id !== duplicateId);
  store.meta = {
    ...store.meta,
    dismissedDuplicatePairs: dismissedPairKeys(store).filter(
      (key) => !key.split('::').includes(duplicateId),
    ),
  };

  store.auditLog.push({
    id: `aud-dup-merge-${Date.now()}`,
    timestamp: new Date().toISOString(),
    actor,
    action: 'merge_duplicate',
    entityRef: `client:${duplicateId}`,
    detail: primaryId,
  });
  saveStore(store);
}
