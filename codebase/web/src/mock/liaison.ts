import { findUser } from './caseService';
import type { MockStore } from './types';

const PROGRAM_LABELS: Record<string, string> = {
  'prog-senior-services': 'Senior Social Services',
  'prog-community-services': 'Community Social Services',
  'prog-parenting-support': 'Parenting Support Programs',
  'prog-mental-health': 'Mental Health Services',
};

function normalize(value?: string): string {
  return (value ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const matrix = Array.from({ length: b.length + 1 }, (_, i) => [i]);
  for (let j = 0; j <= a.length; j += 1) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i += 1) {
    for (let j = 1; j <= a.length; j += 1) {
      const cost = b.charAt(i - 1) === a.charAt(j - 1) ? 0 : 1;
      matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost);
    }
  }
  return matrix[b.length][a.length];
}

export type LiaisonContact = {
  clientName: string;
  programLabel: string;
  caseManagerName: string;
  caseManagerStatus: string;
  /** Case manager's line — liaisons must never be handed the client's number. */
  contactPhone: string;
};

/** Name / phone / address search with the prototype's fuzzy name matching. */
function matchesQuery(client: { name: string; phone: string; address: string }, q: string): boolean {
  const needle = normalize(q);
  if (!needle) return false;

  const name = normalize(client.name);
  if (name.includes(needle)) return true;
  if (normalize(client.address).includes(needle)) return true;
  if (client.phone.replace(/\D/g, '').includes(needle.replace(/\D/g, '')) && /\d/.test(needle)) {
    return true;
  }
  // Fuzzy fallback so single-character typos still surface the record.
  return needle.length >= 4 && levenshtein(needle, name) <= 2;
}

export function lookupContacts(store: MockStore, query: string): LiaisonContact[] {
  const q = query.trim();
  if (!q) return [];

  return store.cases
    .filter((c) => c.status === 'active' || c.status === 'open')
    .map((caseRecord) => {
      const client = store.clients.find((cl) => cl.id === caseRecord.clientId);
      if (!client || !matchesQuery(client, q)) return null;

      const cm = findUser(store, caseRecord.caseManagerId);
      return {
        clientName: client.name,
        programLabel: PROGRAM_LABELS[caseRecord.programId] ?? caseRecord.programId,
        caseManagerName: cm?.name ?? '—',
        caseManagerStatus: cm?.status ?? 'active',
        contactPhone: cm?.contactPhone ?? '—',
      };
    })
    .filter((row): row is LiaisonContact => row !== null)
    .sort((a, b) => a.clientName.localeCompare(b.clientName));
}
