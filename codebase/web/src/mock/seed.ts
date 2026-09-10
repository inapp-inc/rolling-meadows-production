const PROGRAM_ID = 'prog-senior-services';
const CM_ID = 'usr-case-manager';

const SENIOR_NAMES = [
  { id: 'cli-john-davis', name: 'John Davis', dob: '1938-07-22', phone: '(847) 555-0201', address: '88 Oak Street, Rolling Meadows, IL', risk: 'High' },
  { id: 'cli-elena-rodriguez', name: 'Elena Rodriguez', dob: '1940-11-03', phone: '(847) 555-0202', address: '15 Pine Court, Rolling Meadows, IL', risk: 'Medium' },
  { id: 'cli-robert-kim', name: 'Robert Kim', dob: '1935-04-18', phone: '(847) 555-0203', address: '902 Central Rd, Rolling Meadows, IL', risk: 'Low' },
  { id: 'cli-dorothy-williams', name: 'Dorothy Williams', dob: '1944-09-30', phone: '(847) 555-0204', address: '77 Birch Ave, Rolling Meadows, IL', risk: 'Medium' },
  { id: 'cli-frank-miller', name: 'Frank Miller', dob: '1939-01-12', phone: '(847) 555-0205', address: '203 Willow Dr, Rolling Meadows, IL', risk: 'High' },
  { id: 'cli-helen-chen', name: 'Helen Chen', dob: '1941-06-25', phone: '(847) 555-0206', address: '44 Maple St, Rolling Meadows, IL', risk: 'Medium' },
  { id: 'cli-george-patel', name: 'George Patel', dob: '1937-12-08', phone: '(847) 555-0207', address: '561 Elm Way, Rolling Meadows, IL', risk: 'Low' },
  { id: 'cli-ruth-anderson', name: 'Ruth Anderson', dob: '1943-02-14', phone: '(847) 555-0208', address: '19 Cedar Ln, Rolling Meadows, IL', risk: 'Medium' },
  { id: 'cli-james-wilson', name: 'James Wilson', dob: '1936-08-19', phone: '(847) 555-0209', address: '330 Park Blvd, Rolling Meadows, IL', risk: 'High' },
  { id: 'cli-margaret-lee', name: 'Margaret Lee', dob: '1945-05-07', phone: '(847) 555-0210', address: '67 Spruce Ct, Rolling Meadows, IL', risk: 'Medium' },
  { id: 'cli-william-brown', name: 'William Brown', dob: '1934-10-31', phone: '(847) 555-0211', address: '118 Ash St, Rolling Meadows, IL', risk: 'Low' },
  { id: 'cli-betty-taylor', name: 'Betty Taylor', dob: '1942-07-04', phone: '(847) 555-0212', address: '245 Hickory Rd, Rolling Meadows, IL', risk: 'Medium' },
];

const SUBCATEGORIES = ['sub-seniors-at-risk', 'sub-in-home-support', 'sub-nutrition-programs'];

import { seedCustomReports } from './customReportService';
import { buildSampleDocument, buildSampleLink } from './documentService';
import en from '../i18n/locales/en.json';
import type {
  MockAssessment,
  MockCarePlan,
  MockCboReferral,
  MockClient,
  MockCase,
  MockDocument,
  MockEnrollment,
  MockNote,
  MockStore,
  MockUser,
} from './types';

function seedUsers(): MockUser[] {
  return [
    { id: 'usr-platform-admin', name: 'Platform Administrator', role: 'platform_admin', programId: PROGRAM_ID, status: 'Active', contactPhone: '—' },
    { id: 'usr-tenant-admin', name: 'Tenant Administrator', role: 'tenant_admin', programId: PROGRAM_ID, status: 'Active', contactPhone: '—' },
    { id: CM_ID, name: 'Case Manager', role: 'case_manager', programId: PROGRAM_ID, status: 'Active', contactPhone: '(847) 555-0101' },
    { id: 'usr-supervisor', name: 'Supervisor / Dept Admin', role: 'supervisor', programId: PROGRAM_ID, status: 'Active', contactPhone: '(847) 555-0102' },
    { id: 'usr-cross-program-liaison', name: 'Cross-Program Liaison', role: 'cross_program_liaison', programId: 'prog-community-services', status: 'Active', contactPhone: '(847) 555-0103' },
    { id: 'usr-auditor', name: 'Auditor', role: 'auditor', programId: PROGRAM_ID, status: 'Active', contactPhone: '—' },
  ];
}

function addClientCase(
  store: MockStore,
  client: MockClient,
  caseRecord: MockCase,
  extras?: {
    assessment?: Partial<MockAssessment>;
    enrollments?: MockEnrollment[];
    cbo?: MockCboReferral;
    carePlans?: MockCarePlan[];
    notes?: MockNote[];
    documents?: MockDocument[];
  },
): void {
  store.clients.push(client);
  store.cases.push(caseRecord);
  if (extras?.assessment) {
    store.assessments.push({
      id: extras.assessment.id ?? `ra-${client.id}`,
      clientId: client.id,
      caseId: caseRecord.id,
      date: extras.assessment.date ?? '2026-01-20',
      overallRisk: extras.assessment.overallRisk ?? 'Medium',
      compositeScore: extras.assessment.compositeScore ?? 50,
      ratings: extras.assessment.ratings ?? {},
    });
  }
  extras?.enrollments?.forEach((e) => store.enrollments.push(e));
  if (extras?.cbo) store.cboReferrals.push(extras.cbo);
  extras?.carePlans?.forEach((cp) => store.carePlans.push(cp));
  extras?.notes?.forEach((n) => store.notes.push(n));
  extras?.documents?.forEach((d) => store.documents.push(d));
}

export function createSeedStore(): MockStore {
  const store: MockStore = {
    users: seedUsers(),
    clients: [],
    cases: [],
    assessments: [],
    enrollments: [],
    cboReferrals: [],
    documents: [],
    carePlans: [],
    notes: [],
    referrals: [],
    intakes: [],
    reassessments: [],
    closures: [],
    initiatives: [],
    auditLog: [],
    customReports: [],
    reportSubscriptions: [],
    meta: { dismissedDuplicatePairs: [] },
  };

  // Mary Smith — flagship demo client
  addClientCase(
    store,
    {
      id: 'cli-mary-smith',
      name: 'Mary Smith',
      dob: '1942-03-15',
      phone: '(847) 555-0142',
      address: '412 Meadow Lane, Rolling Meadows, IL 60008',
      registeredAt: '2026-02-01',
    },
    {
      id: 'case-mary-smith',
      clientId: 'cli-mary-smith',
      caseNumber: 'C-2026-001',
      programId: PROGRAM_ID,
      caseCategoryId: 'cat-senior-services',
      caseSubcategoryId: 'sub-seniors-at-risk',
      caseManagerId: CM_ID,
      status: 'active',
      currentStage: 6,
      incompleteIntake: false,
      openDate: '2026-02-01',
      createdAt: '2026-02-01',
    },
    {
      assessment: {
        id: 'ra-mary-1',
        date: '2026-02-05',
        overallRisk: 'High',
        compositeScore: 72,
        ratings: { falls: 'High', nutrition: 'Medium', isolation: 'High', housing: 'Low', abuseRisk: 'Medium' },
      },
      enrollments: [
        { id: 'enr-mary-meals', clientId: 'cli-mary-smith', caseId: 'case-mary-smith', serviceOrEventId: 'evt-meals', dateEnrolled: '2026-03-01' },
        { id: 'enr-mary-holiday', clientId: 'cli-mary-smith', caseId: 'case-mary-smith', serviceOrEventId: 'evt-holiday', dateEnrolled: '2026-06-15' },
      ],
      cbo: { id: 'cbo-mary-1', clientId: 'cli-mary-smith', caseId: 'case-mary-smith', cboName: 'Meals on Wheels Northwest', status: 'Confirmed', date: '2026-03-02' },
      carePlans: [
        { id: 'cp-mary-1', clientId: 'cli-mary-smith', caseId: 'case-mary-smith', issue: 'Fall Risk', goal: 'Prevent future falls', service: 'Home safety assessment', status: 'In Progress' },
        { id: 'cp-mary-2', clientId: 'cli-mary-smith', caseId: 'case-mary-smith', issue: 'Nutrition', goal: 'Improve nutritional intake', service: 'Meals on Wheels referral', status: 'In Progress' },
      ],
      notes: [
        { id: 'note-mary-1', clientId: 'cli-mary-smith', caseId: 'case-mary-smith', date: '2026-03-10', type: 'home visit', text: 'Home visit completed. Client reports dizziness when standing.' },
        { id: 'note-mary-2', clientId: 'cli-mary-smith', caseId: 'case-mary-smith', date: '2026-07-08', type: 'phone call', text: 'Follow-up call — client missed morning medication dose yesterday.' },
      ],
    },
  );

  // Senior caseload
  SENIOR_NAMES.forEach((s, i) => {
    const caseId = `case-${s.id.replace('cli-', '')}`;
    addClientCase(
      store,
      { id: s.id, name: s.name, dob: s.dob, phone: s.phone, address: s.address, registeredAt: '2026-01-15' },
      {
        id: caseId,
        clientId: s.id,
        caseNumber: `C-2026-${String(i + 10).padStart(3, '0')}`,
        programId: PROGRAM_ID,
        caseCategoryId: 'cat-senior-services',
        caseSubcategoryId: SUBCATEGORIES[i % SUBCATEGORIES.length],
        caseManagerId: CM_ID,
        status: 'active',
        currentStage: 3 + (i % 4),
        incompleteIntake: false,
        openDate: '2026-01-15',
        createdAt: '2026-01-15',
      },
      {
        assessment: { id: `ra-${s.id}`, overallRisk: s.risk, compositeScore: 40 + i * 3, ratings: {} },
        enrollments: i < 10 ? [{ id: `enr-${s.id}`, clientId: s.id, caseId, serviceOrEventId: 'evt-holiday', dateEnrolled: '2026-06-10' }] : [],
        cbo:
          i === 1
            ? { id: `cbo-${s.id}`, clientId: s.id, caseId, cboName: 'Northwest Community Center', status: 'Pending', date: '2026-06-01' }
            : i === 4
              ? { id: `cbo-${s.id}`, clientId: s.id, caseId, cboName: 'Area Agency on Aging', status: 'Sent', date: '2026-05-28' }
              : undefined,
        carePlans: i % 2 === 0 ? [{ id: `cp-${s.id}`, clientId: s.id, caseId, issue: 'Safety', goal: 'Reduce fall risk', service: 'Home visit monitoring', status: 'In Progress' }] : [],
        notes: [{ id: `note-${s.id}`, clientId: s.id, caseId, date: '2026-07-10', type: 'phone call', text: 'Routine follow-up completed.' }],
      },
    );
  });

  // Incomplete intake
  addClientCase(
    store,
    { id: 'cli-incomplete-1', name: 'Robert J Smith', dob: '', phone: '(847) 555-0199', address: 'Unknown — police referral', registeredAt: '2026-07-01' },
    {
      id: 'case-incomplete-1',
      clientId: 'cli-incomplete-1',
      caseNumber: 'C-2026-098',
      programId: PROGRAM_ID,
      caseCategoryId: 'cat-senior-services',
      caseSubcategoryId: 'sub-seniors-at-risk',
      caseManagerId: CM_ID,
      status: 'active',
      currentStage: 2,
      incompleteIntake: true,
      openDate: '2026-07-01',
      createdAt: '2026-07-01',
    },
    { assessment: { overallRisk: 'High', compositeScore: 65 } },
  );

  // Cross-program flag demo
  store.clients.push({
    id: 'cli-flag-demo',
    name: 'Susan Taylor',
    dob: '1946-03-20',
    phone: '(847) 555-0300',
    address: '100 Main St, Rolling Meadows, IL',
    registeredAt: '2026-06-01',
    registrationSource: 'referral',
  });
  store.cases.push({
    id: 'case-flag-demo',
    clientId: 'cli-flag-demo',
    caseNumber: 'C-2026-099',
    programId: 'prog-community-services',
    caseCategoryId: 'cat-community-services',
    caseSubcategoryId: 'sub-general-intake',
    caseManagerId: 'usr-cross-program-liaison',
    status: 'active',
    currentStage: 3,
    openDate: '2026-06-01',
    createdAt: '2026-06-01',
  });

  // Duplicate candidates
  [
    { id: 'cli-oconnor-a', name: "Patrick O'Connor", dob: '1940-05-12', phone: '(847) 555-0401', address: '12 Lakeview Dr, Rolling Meadows, IL' },
    { id: 'cli-oconnor-b', name: "Pat O'Connor", dob: '1940-05-12', phone: '(847) 555-0401', address: '12 Lakeview Drive, Rolling Meadows, IL' },
    { id: 'cli-walsh-a', name: 'Margaret Walsh', dob: '1939-11-22', phone: '(847) 555-0402', address: '55 Center St, Rolling Meadows, IL' },
    { id: 'cli-walsh-b', name: 'Maggie Walsh', dob: '1939-11-22', phone: '(847) 555-0402', address: '55 Center Street, Rolling Meadows, IL' },
  ].forEach((c, i) => {
    store.clients.push({ ...c, registeredAt: '2026-05-01' });
    if (i % 2 === 0) {
      store.cases.push({
        id: `case-${c.id}`,
        clientId: c.id,
        caseNumber: `C-2026-${110 + i}`,
        programId: PROGRAM_ID,
        caseCategoryId: 'cat-senior-services',
        caseSubcategoryId: 'sub-seniors-at-risk',
        caseManagerId: CM_ID,
        status: 'active',
        currentStage: 2,
        openDate: '2026-05-01',
        createdAt: '2026-05-01',
      });
    }
  });

  // Registration-only clients
  ['cli-reg-only-1', 'cli-reg-only-2'].forEach((id, i) => {
    store.clients.push({
      id,
      name: i === 0 ? 'Alice Nguyen' : 'Carlos Mendez',
      dob: i === 0 ? '1955-08-01' : '1962-03-14',
      phone: i === 0 ? '(847) 555-0501' : '(847) 555-0502',
      address: i === 0 ? '200 Main St, Rolling Meadows, IL' : '301 Oak Ave, Rolling Meadows, IL',
      registeredAt: '2026-08-01',
      registrationSource: 'walk_in',
    });
  });

  seedReferralsIntakes(store);
  seedInitiatives(store);
  seedAuditLog(store);
  seedSampleDocuments(store);
  store.customReports = seedCustomReports();

  return store;
}

function seedT(key: string, params?: Record<string, string | number>): string {
  let node: unknown = en;
  for (const part of key.split('.')) {
    if (!node || typeof node !== 'object' || !(part in (node as object))) return key;
    node = (node as Record<string, unknown>)[part];
  }
  let text = typeof node === 'string' ? node : key;
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      text = text.replace(`{${k}}`, String(v));
    });
  }
  return text;
}

function seedSampleDocuments(store: MockStore) {
  const samples: { id: string; clientId: string; caseId?: string; kind?: 'consent' | 'assessment'; link?: ReturnType<typeof buildSampleLink> }[] = [
    { id: 'doc-mary-consent', clientId: 'cli-mary-smith', caseId: 'case-mary-smith', kind: 'consent' },
    { id: 'doc-mary-assessment', clientId: 'cli-mary-smith', caseId: 'case-mary-smith', kind: 'assessment' },
    { id: 'doc-john-consent', clientId: 'cli-john-davis', caseId: 'case-john-davis', kind: 'consent' },
  ];

  samples.forEach((entry) => {
    const client = store.clients.find((c) => c.id === entry.clientId);
    if (!client || !entry.kind) return;
    const doc = buildSampleDocument(seedT, client.name, client.registeredAt, entry.kind);
    store.documents.push({
      id: entry.id,
      clientId: entry.clientId,
      caseId: entry.caseId,
      ...doc,
    });
  });

  const link = buildSampleLink(
    'Hospital discharge summary (SharePoint)',
    'https://contoso.sharepoint.com/sites/seniors/documents/mary-smith-discharge.pdf',
    'intake',
    '2026-02-03T09:00:00.000Z',
  );
  store.documents.push({
    id: 'doc-mary-discharge-link',
    clientId: 'cli-mary-smith',
    caseId: 'case-mary-smith',
    ...link,
  });
}

function seedReferralsIntakes(store: MockStore) {
  const sources = ['Hospital', 'Physician', 'Police', 'Self', 'Neighbor'];
  const reasons = ['Falls', 'Isolation', 'Medication issues', 'Food insecurity', 'Self-neglect'];
  store.cases.forEach((caseRecord, i) => {
    store.referrals.push({
      id: `ref-${caseRecord.id}`,
      clientId: caseRecord.clientId,
      caseId: caseRecord.id,
      source: sources[i % sources.length],
      reason: reasons[i % reasons.length],
      referredBy: 'Rolling Meadows community referral',
      dateReceived: caseRecord.openDate,
    });
    store.intakes.push({
      id: `int-${caseRecord.id}`,
      clientId: caseRecord.clientId,
      caseId: caseRecord.id,
      consentOnFile: !caseRecord.incompleteIntake,
      completeness: caseRecord.incompleteIntake ? 'incomplete' : 'complete',
      livingArrangement: caseRecord.incompleteIntake ? '' : 'Lives alone',
      medicalHistory: caseRecord.incompleteIntake ? '' : 'Chronic conditions managed with PCP',
      comprehensiveAssessmentNotes: caseRecord.id === 'case-mary-smith'
        ? 'Holistic review completed — fall risk and nutrition concerns documented for care planning.'
        : '',
    });
  });
  store.reassessments.push({
    id: 're-mary-1',
    clientId: 'cli-mary-smith',
    caseId: 'case-mary-smith',
    date: '2026-07-01',
    trigger: '6-month timer',
    previousRatings: { falls: 'High', nutrition: 'Medium', isolation: 'High', housing: 'Low', abuseRisk: 'Medium' },
    newRatings: { falls: 'Medium', nutrition: 'Medium', isolation: 'Medium', housing: 'Low', abuseRisk: 'Low' },
  });
}

function seedInitiatives(store: MockStore) {
  store.initiatives.push(
    {
      id: 'init-flu-2026',
      name: 'Flu Awareness Outreach 2026',
      startDate: '2026-01-01',
      endDate: '2026-03-31',
      status: 'Complete',
      targetOutreach: 120,
      referralsGenerated: 34,
      enrollments: 28,
      completions: 22,
    },
    {
      id: 'init-summer-meals',
      name: 'Summer Meals Enrollment Drive',
      startDate: '2026-05-01',
      endDate: '2026-08-31',
      status: 'Active',
      targetOutreach: 80,
      referralsGenerated: 41,
      enrollments: 36,
      completions: 12,
    },
  );
}

function seedAuditLog(store: MockStore) {
  store.auditLog.push(
    { id: 'aud-1', timestamp: '2026-07-15T14:22:00Z', actor: 'Case Manager', action: 'intake_updated', entityRef: 'case-mary-smith', reason: 'Mary Smith' },
    { id: 'aud-2', timestamp: '2026-07-14T09:10:00Z', actor: 'Supervisor / Dept Admin', action: 'duplicate_review', entityRef: 'admin-duplicates', reason: 'Reviewed O\'Connor pair' },
    { id: 'aud-3', timestamp: '2026-07-12T16:45:00Z', actor: 'Case Manager', action: 'enrollment_void', entityRef: 'enr-mary-transport-voided', reason: 'Duplicate enrollment corrected' },
    { id: 'aud-4', timestamp: '2026-07-10T11:00:00Z', actor: 'System', action: 'demo_reset', entityRef: 'system', reason: 'Seed data loaded' },
  );
}

export const ROLE_OPTIONS = [
  { userId: 'usr-platform-admin', label: 'Platform Administrator' },
  { userId: 'usr-tenant-admin', label: 'Tenant Administrator' },
  { userId: CM_ID, label: 'Case Manager' },
  { userId: 'usr-supervisor', label: 'Supervisor / Dept Admin' },
  { userId: 'usr-cross-program-liaison', label: 'Cross-Program Liaison' },
  { userId: 'usr-auditor', label: 'Auditor (Aggregate reports only)' },
];

export function landingPathForRole(role: string): string {
  if (role === 'platform_admin') return '/platform/tenants';
  if (role === 'tenant_admin') return '/admin';
  if (role === 'cross_program_liaison') return '/liaison';
  if (role === 'auditor') return '/reports?tier=integrity';
  return '/cases/new';
}
