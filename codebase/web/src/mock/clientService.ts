import type { DedupMatch } from '../api/client';
import { saveStore } from './store';
import type { MockClient, MockStore } from './types';
import { findUser } from './caseService';

const PROGRAM_LABELS: Record<string, string> = {
  'prog-senior-services': 'Senior Social Services',
  'prog-community-services': 'Community Social Services',
  'prog-parenting-support': 'Parenting Support Programs',
  'prog-mental-health': 'Mental Health Services',
};

function normalize(value?: string): string {
  return (value ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function normalizePhone(phone?: string): string {
  return (phone ?? '').replace(/\D/g, '');
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

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export type RegisterClientPayload = {
  name: string;
  phone: string;
  address: string;
  dob?: string;
  contactReason?: string;
  screeningNotes?: string;
  emergencyTrigger?: string;
  serviceNeed?: boolean;
};

export function dedupCheck(
  store: MockStore,
  partial: { name?: string; phone?: string; dob?: string },
  excludeClientId?: string,
): DedupMatch[] {
  const name = normalize(partial.name);
  const phone = normalizePhone(partial.phone);
  const dob = partial.dob ?? '';
  const matches: DedupMatch[] = [];

  store.clients.forEach((client) => {
    if (excludeClientId && client.id === excludeClientId) return;
    let score = 0;
    const matchedFields: string[] = [];
    const cName = normalize(client.name);
    const cPhone = normalizePhone(client.phone);

    if (name && cName) {
      const dist = levenshtein(name, cName);
      if (dist === 0) {
        score += 50;
        matchedFields.push('name');
      } else if (dist <= 2) {
        score += 35;
        matchedFields.push('name');
      } else if (cName.includes(name) || name.includes(cName)) {
        score += 25;
        matchedFields.push('name');
      }
    }
    if (phone && cPhone && (cPhone.includes(phone) || phone.includes(cPhone))) {
      score += 40;
      matchedFields.push('phone');
    }
    if (dob && client.dob === dob) {
      score += 30;
      matchedFields.push('dob');
    }

    if (score >= 25) {
      matches.push({
        client: {
          id: client.id,
          name: client.name,
          phone: client.phone,
          address: client.address,
          dob: client.dob,
          status: client.status ?? 'registered',
          registeredAt: client.registeredAt,
        },
        score,
        matchedFields,
      });
    }
  });

  return matches.sort((a, b) => b.score - a.score);
}

export function crossProgramFlag(
  store: MockStore,
  partial: { name?: string; phone?: string; dob?: string },
): {
  programLabel: string;
  caseManagerName: string;
  caseManagerPhone: string;
  clientName: string;
} | null {
  const matches = dedupCheck(store, partial);
  for (const match of matches) {
    const openCase = store.cases.find((c) => c.clientId === match.client.id && c.status !== 'closed');
    if (openCase) {
      const cm = findUser(store, openCase.caseManagerId);
      return {
        clientName: match.client.name,
        programLabel: PROGRAM_LABELS[openCase.programId] ?? openCase.programId,
        caseManagerName: cm?.name ?? 'Unassigned',
        caseManagerPhone: cm?.contactPhone ?? '—',
      };
    }
  }
  return null;
}

export function registerClient(store: MockStore, payload: RegisterClientPayload): MockClient {
  const client: MockClient = {
    id: `cli-${Date.now()}`,
    name: payload.name.trim(),
    dob: payload.dob ?? '',
    phone: payload.phone.trim(),
    address: payload.address.trim(),
    registeredAt: today(),
    registrationSource: 'walk_in',
    contactReason: payload.contactReason ?? 'information',
    screeningNotes: payload.screeningNotes ?? '',
    emergencyTrigger: payload.emergencyTrigger ?? '',
    serviceNeed: Boolean(payload.serviceNeed),
    status: 'registered',
    crossProgramActive: Boolean(crossProgramFlag(store, payload)),
  };
  store.clients.push(client);
  store.auditLog.push({
    id: `aud-reg-${client.id}`,
    timestamp: new Date().toISOString(),
    actor: 'Case Manager',
    action: 'client_registered',
    entityRef: client.id,
    reason: client.name,
  });
  saveStore(store);
  return client;
}

export function getClient(store: MockStore, clientId: string): MockClient | null {
  return store.clients.find((c) => c.id === clientId) ?? null;
}

export function shouldRouteToCaseCreation(payload: RegisterClientPayload): boolean {
  return (
    Boolean(payload.serviceNeed) ||
    payload.contactReason === 'emergency' ||
    Boolean(payload.emergencyTrigger?.trim())
  );
}

export function listClients(store: MockStore, q?: string) {
  if (!q?.trim()) return store.clients;
  const needle = q.trim().toLowerCase();
  return store.clients.filter(
    (c) => c.name.toLowerCase().includes(needle) || c.phone.includes(needle) || c.address.toLowerCase().includes(needle),
  );
}
