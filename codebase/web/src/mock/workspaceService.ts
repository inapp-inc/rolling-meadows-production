import type { CaseWorkspace } from '../api/client';
import { viewForCase, findUser, latestAssessment } from './caseService';
import {
  cadenceForRisk,
  calcComposite,
  eventLabel,
  getAllStageStatuses,
  ratingDomainKeys,
  SERVICE_EVENTS,
  stagesForClient,
  tabsForClient,
  workflowForClient,
} from './caseWorkflow';
import { saveStore } from './store';
import { normalizeUrl } from './documentService';
import type { IntakeQuestionAnswers, MockDocument, MockStore } from './types';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Fallback label for a risk domain key. The UI translates via `i18n.domainLabel`,
 * which looks up `forms.domains.<key>`; this is only the untranslated backstop.
 */
function humanizeDomain(key: string): string {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase());
}

function domainList(keys: string[]): { key: string; label: string }[] {
  return keys.map((key) => ({ key, label: humanizeDomain(key) }));
}

/**
 * Audit entries for a case: those tagged with the case or client directly, plus
 * entries tagged against child records (`enrollment:…`, `carePlan:…`, `note:…`)
 * that belong to this case. Mirrors the prototype's `Audit.findForClient`.
 */
function activityForCase(store: MockStore, caseId: string, clientId: string) {
  const childRefs = new Set<string>();
  store.enrollments.filter((e) => e.caseId === caseId).forEach((e) => childRefs.add(`enrollment:${e.id}`));
  store.carePlans.filter((cp) => cp.caseId === caseId).forEach((cp) => childRefs.add(`carePlan:${cp.id}`));
  store.notes.filter((n) => n.caseId === caseId).forEach((n) => childRefs.add(`note:${n.id}`));

  return store.auditLog
    .filter(
      (a) =>
        a.entityRef === caseId ||
        a.entityRef === `case:${caseId}` ||
        a.entityRef === `client:${clientId}` ||
        childRefs.has(a.entityRef),
    )
    .sort((a, b) => (b.timestamp > a.timestamp ? 1 : -1))
    .map((a) => ({
      timestamp: a.timestamp,
      actorName: a.actor,
      action: a.action,
      detail: a.detail,
      reason: a.reason,
    }));
}

let auditSeq = 0;

/** Appends an audit entry, mirroring the prototype's `RM.Audit.record`. */
function recordAudit(
  store: MockStore,
  entityRef: string,
  action: string,
  detail?: string,
  reason?: string,
): void {
  auditSeq += 1;
  store.auditLog.push({
    id: `aud-${Date.now()}-${auditSeq}`,
    timestamp: new Date().toISOString(),
    actor: 'Case Manager',
    action,
    entityRef,
    detail,
    reason,
  });
}

function caseForStore(store: MockStore, caseId: string) {
  const view = viewForCase(store, caseId);
  if (!view) throw new Error('Case not found');
  return view;
}

export function buildWorkspace(store: MockStore, caseId: string): CaseWorkspace {
  const view = caseForStore(store, caseId);
  const caseRecord = store.cases.find((c) => c.id === caseId)!;
  const client = store.clients.find((c) => c.id === view.id)!;
  const referral = store.referrals.find((r) => r.caseId === caseId) ?? null;
  const intake = store.intakes.find((i) => i.caseId === caseId) ?? null;
  const assessment = store.assessments.filter((a) => a.caseId === caseId).sort((a, b) => (b.date > a.date ? 1 : -1))[0];
  const closure = store.closures.find((c) => c.caseId === caseId) ?? null;
  const wf = workflowForClient(view);
  const stageStatuses = [
    ...getAllStageStatuses(store, view).map((s) => ({
      tabId: s.tabId,
      label: s.label,
      stage: s.stage,
      deliverable: s.deliverable,
      status: (s.status === 'not_started' ? 'pending' : s.status) as 'complete' | 'in_progress' | 'pending',
    })),
    { tabId: 'documents', label: 'Documents', stage: null, deliverable: '', status: 'available' as const },
    { tabId: 'activity', label: 'Activity', stage: null, deliverable: '', status: 'available' as const },
  ];

  const notes = store.notes.filter((n) => n.caseId === caseId);
  const lastNote = notes.sort((a, b) => (b.date > a.date ? 1 : -1))[0];
  const daysSince = lastNote ? Math.round((Date.now() - new Date(lastNote.date).getTime()) / 86400000) : null;
  const cadence = cadenceForRisk(assessment?.overallRisk);
  const cadenceDays = cadence.days;
  const domainKeys = ratingDomainKeys(view, assessment?.ratings);

  return {
    case: {
      id: caseId,
      caseNumber: caseRecord.caseNumber,
      clientId: client.id,
      clientName: client.name,
      programId: caseRecord.programId,
      caseCategoryId: caseRecord.caseCategoryId,
      caseSubcategoryId: caseRecord.caseSubcategoryId,
      caseManagerId: caseRecord.caseManagerId,
      status: caseRecord.status,
      incompleteIntake: Boolean(caseRecord.incompleteIntake),
      currentStage: caseRecord.currentStage,
      openDate: caseRecord.openDate,
    },
    client: {
      id: client.id,
      name: client.name,
      dob: client.dob,
      phone: client.phone,
      address: client.address,
      status: view.status,
      registeredAt: client.registeredAt,
    },
    workflow: {
      ...wf,
      stages: stagesForClient(view),
    },
    stageStatuses,
    currentStage: caseRecord.currentStage,
    referral: referral
      ? { source: referral.source, reason: referral.reason, referrerName: referral.referredBy, dateReceived: referral.dateReceived }
      : null,
    intake: intake
      ? {
          consentOnFile: intake.consentOnFile,
          livingArrangement: intake.livingArrangement,
          medicalHistory: intake.medicalHistory,
          comprehensiveAssessmentNotes: intake.comprehensiveAssessmentNotes,
          completeness: intake.completeness,
        }
      : null,
    riskAssessment: assessment
      ? {
          id: assessment.id,
          date: assessment.date,
          ratings: assessment.ratings,
          compositeScore: assessment.compositeScore,
          overallRisk: assessment.overallRisk,
          overrideNote: assessment.overrideNote,
          domains: domainList(domainKeys),
        }
      : null,
    carePlanItems: store.carePlans.filter((cp) => cp.caseId === caseId).map((cp) => ({
      id: cp.id,
      issue: cp.issue,
      goal: cp.goal,
      service: cp.service,
      status: cp.status,
      voided: Boolean(cp.voided),
      voidReason: cp.voidReason,
    })),
    enrollments: store.enrollments.filter((e) => e.caseId === caseId).map((e) => ({
      id: e.id,
      serviceOrEventId: e.serviceOrEventId,
      serviceLabel: eventLabel(e.serviceOrEventId),
      dateEnrolled: e.dateEnrolled,
      status: e.status ?? 'Active',
      voided: Boolean(e.voided),
      voidReason: e.voidReason,
    })),
    cboReferrals: store.cboReferrals.filter((r) => r.caseId === caseId).map((r) => ({
      id: r.id,
      cboName: r.cboName,
      status: r.status,
      date: r.date,
    })),
    notes: notes.map((n) => ({
      id: n.id,
      date: n.date,
      type: n.type,
      text: n.text,
      voided: Boolean(n.voided),
      voidReason: n.voidReason,
    })),
    reassessments: store.reassessments.filter((r) => r.caseId === caseId).map((r) => ({
      id: r.id,
      date: r.date,
      trigger: r.trigger,
      previousRatings: r.previousRatings,
      newRatings: r.newRatings,
    })),
    closure: closure
      ? { date: closure.date, reason: closure.reason, outcomesSummary: closure.outcomesSummary }
      : null,
    documents: store.documents.filter((d) => d.clientId === client.id).map((d) => ({
      id: d.id,
      filename: d.name,
      sourceType: d.type,
      uploadedAt: d.uploadedAt,
      uploadedBy: d.uploadedBy,
      externalUrl: d.externalUrl,
      mimeType: d.mimeType,
      dataUrl: d.dataUrl,
      size: d.size,
      stageContext: d.stageContext,
    })),
    assignmentHistory: [
      {
        caseManagerName: findUser(store, caseRecord.caseManagerId)?.name,
        assignedAt: caseRecord.openDate,
        reason: 'Initial assignment',
      },
    ],
    activity: activityForCase(store, caseId, client.id),
    followUpCadence: {
      days: cadenceDays,
      label: cadence.key,
      daysSinceLastContact: daysSince,
      overdue: daysSince != null && daysSince > cadenceDays,
      daysOverdue: daysSince != null && daysSince > cadenceDays ? daysSince - cadenceDays : undefined,
    },
    riskDomains: domainList(domainKeys),
    readOnly: caseRecord.status === 'closed' || Boolean(closure),
  };
}

export function saveIntake(store: MockStore, caseId: string, payload: {
  name: string;
  dob?: string;
  phone: string;
  address: string;
  referral: { source: string; reason: string; referrerName?: string };
  intake: {
    consentOnFile?: boolean;
    livingArrangement?: string;
    medicalHistory?: string;
    comprehensiveAssessmentNotes?: string;
    intakeQuestions?: IntakeQuestionAnswers;
  };
}): CaseWorkspace {
  const caseRecord = store.cases.find((c) => c.id === caseId);
  const client = store.clients.find((c) => c.id === caseRecord?.clientId);
  if (!caseRecord || !client) throw new Error('Case not found');

  client.name = payload.name;
  client.dob = payload.dob ?? '';
  client.phone = payload.phone;
  client.address = payload.address;
  const incomplete = !payload.dob || !payload.intake.consentOnFile;
  caseRecord.incompleteIntake = incomplete;

  let referral = store.referrals.find((r) => r.caseId === caseId);
  if (referral) {
    referral.source = payload.referral.source;
    referral.reason = payload.referral.reason;
    referral.referredBy = payload.referral.referrerName;
  } else {
    store.referrals.push({
      id: `ref-${caseId}`,
      clientId: client.id,
      caseId,
      source: payload.referral.source,
      reason: payload.referral.reason,
      referredBy: payload.referral.referrerName,
      dateReceived: today(),
    });
  }

  const intake = store.intakes.find((i) => i.caseId === caseId);
  const intakeData = {
    consentOnFile: payload.intake.consentOnFile,
    livingArrangement: payload.intake.livingArrangement,
    medicalHistory: payload.intake.medicalHistory,
    comprehensiveAssessmentNotes: payload.intake.comprehensiveAssessmentNotes,
    intakeQuestions: payload.intake.intakeQuestions,
    completeness: incomplete ? 'incomplete' : 'complete',
  };
  if (intake) Object.assign(intake, intakeData);
  else store.intakes.push({ id: `int-${caseId}`, clientId: client.id, caseId, ...intakeData });

  // Screening answers also live on the client so later registrations can prefill.
  if (payload.intake.intakeQuestions) {
    client.screening = { ...client.screening, intakeQuestions: payload.intake.intakeQuestions };
  }

  if (!incomplete && caseRecord.currentStage < 2) caseRecord.currentStage = 2;
  recordAudit(store, caseId, 'intake_updated', client.name);
  saveStore(store);
  return buildWorkspace(store, caseId);
}

export function saveAssessmentNotes(store: MockStore, caseId: string, notes: string): CaseWorkspace {
  const intake = store.intakes.find((i) => i.caseId === caseId);
  if (intake) intake.comprehensiveAssessmentNotes = notes;
  const caseRecord = store.cases.find((c) => c.id === caseId);
  if (caseRecord && caseRecord.currentStage < 3) caseRecord.currentStage = 3;
  saveStore(store);
  return buildWorkspace(store, caseId);
}

export function saveRisk(
  store: MockStore,
  caseId: string,
  ratings: Record<string, string>,
  overrideNote?: string,
  assessorId?: string,
): CaseWorkspace {
  const view = caseForStore(store, caseId);
  const calc = calcComposite(ratings);
  const existing = store.assessments.find((a) => a.caseId === caseId);
  if (existing) {
    existing.ratings = ratings;
    existing.compositeScore = calc.compositeScore;
    existing.overallRisk = calc.overallRisk;
    existing.overrideNote = overrideNote;
    existing.assessorId = assessorId ?? existing.assessorId;
    existing.date = today();
  } else {
    store.assessments.push({
      id: `ra-${caseId}`,
      clientId: view.id,
      caseId,
      date: today(),
      ratings,
      compositeScore: calc.compositeScore,
      overallRisk: calc.overallRisk,
      overrideNote,
      assessorId,
    });
  }
  const caseRecord = store.cases.find((c) => c.id === caseId);
  if (caseRecord && caseRecord.currentStage < 4) caseRecord.currentStage = 4;
  recordAudit(store, caseId, 'risk_assessment_saved', view.name);
  saveStore(store);
  return buildWorkspace(store, caseId);
}

export function addCarePlanItem(store: MockStore, caseId: string, item: { issue: string; goal: string; service: string; status: string }) {
  const view = caseForStore(store, caseId);
  store.carePlans.push({
    id: `cp-${caseId}-${store.carePlans.length + 1}`,
    clientId: view.id,
    caseId,
    ...item,
  });
  saveStore(store);
  return buildWorkspace(store, caseId);
}

/** Returns false without changing anything when the client is already enrolled. */
export function addEnrollment(store: MockStore, caseId: string, eventId: string): CaseWorkspace {
  const view = caseForStore(store, caseId);
  const already = store.enrollments.some(
    (e) => e.clientId === view.id && e.serviceOrEventId === eventId && !e.voided,
  );
  if (already) return buildWorkspace(store, caseId);

  store.enrollments.push({
    id: `enr-${caseId}-${Date.now()}`,
    clientId: view.id,
    caseId,
    serviceOrEventId: eventId,
    dateEnrolled: today(),
    status: 'Active',
  });
  recordAudit(store, caseId, 'service_enrolled', eventLabel(eventId));
  saveStore(store);
  return buildWorkspace(store, caseId);
}

export function voidEnrollment(store: MockStore, caseId: string, enrollmentId: string, reason: string): CaseWorkspace {
  const enrollment = store.enrollments.find((e) => e.id === enrollmentId && e.caseId === caseId);
  if (!enrollment) throw new Error('Enrollment not found');
  enrollment.voided = true;
  enrollment.voidReason = reason;
  recordAudit(store, `enrollment:${enrollmentId}`, 'service_enrollment_voided', eventLabel(enrollment.serviceOrEventId), reason);
  saveStore(store);
  return buildWorkspace(store, caseId);
}

export function voidNote(store: MockStore, caseId: string, noteId: string, reason: string): CaseWorkspace {
  const note = store.notes.find((n) => n.id === noteId && n.caseId === caseId);
  if (!note) throw new Error('Note not found');
  note.voided = true;
  note.voidReason = reason;
  recordAudit(store, `note:${noteId}`, 'case_note_voided', note.type, reason);
  saveStore(store);
  return buildWorkspace(store, caseId);
}

export function addCboReferral(store: MockStore, caseId: string, cboName: string, status = 'Pending') {
  const view = caseForStore(store, caseId);
  store.cboReferrals.push({
    id: `cbo-${caseId}-${Date.now()}`,
    clientId: view.id,
    caseId,
    cboName,
    status,
    date: today(),
  });
  recordAudit(store, caseId, 'cbo_referral_created', cboName);
  saveStore(store);
  return buildWorkspace(store, caseId);
}

export function addNote(store: MockStore, caseId: string, type: string, text: string) {
  const view = caseForStore(store, caseId);
  store.notes.push({
    id: `note-${caseId}-${Date.now()}`,
    clientId: view.id,
    caseId,
    date: today(),
    type,
    text,
  });
  saveStore(store);
  return buildWorkspace(store, caseId);
}

export function addReassessment(store: MockStore, caseId: string, trigger: string, newRatings: Record<string, string>) {
  const view = caseForStore(store, caseId);
  const prev = latestAssessment(store, view.id);
  store.reassessments.push({
    id: `re-${caseId}-${Date.now()}`,
    clientId: view.id,
    caseId,
    date: today(),
    trigger,
    previousRatings: prev?.ratings,
    newRatings,
  });
  if (prev) {
    const calc = calcComposite(newRatings);
    prev.ratings = newRatings;
    prev.compositeScore = calc.compositeScore;
    prev.overallRisk = calc.overallRisk;
    prev.date = today();
  }
  saveStore(store);
  return buildWorkspace(store, caseId);
}

export function closeCase(store: MockStore, caseId: string, reason: string, outcomesSummary: Record<string, string>) {
  const view = caseForStore(store, caseId);
  store.closures.push({
    id: `close-${caseId}`,
    clientId: view.id,
    caseId,
    date: today(),
    reason,
    outcomesSummary,
  });
  const caseRecord = store.cases.find((c) => c.id === caseId);
  if (caseRecord) {
    caseRecord.status = 'closed';
    caseRecord.currentStage = 8;
  }
  recordAudit(store, caseId, 'case_closed', view.name);
  saveStore(store);
  return buildWorkspace(store, caseId);
}

export function voidCarePlanItem(store: MockStore, caseId: string, itemId: string, reason: string): CaseWorkspace {
  const item = store.carePlans.find((cp) => cp.id === itemId && cp.caseId === caseId);
  if (!item) throw new Error('Care plan item not found');
  item.voided = true;
  item.voidReason = reason;
  recordAudit(store, `carePlan:${itemId}`, 'care_plan_voided', item.goal, reason);
  saveStore(store);
  return buildWorkspace(store, caseId);
}

export function addDocumentLink(
  store: MockStore,
  caseId: string,
  filename: string,
  externalUrl: string,
  stageContext: string,
  uploadedBy: string,
) {
  const normalized = normalizeUrl(externalUrl);
  if (!normalized) throw new Error('invalid_url');
  const view = caseForStore(store, caseId);
  store.documents.push({
    id: `doc-${caseId}-${Date.now()}`,
    clientId: view.id,
    caseId,
    name: filename,
    type: 'link',
    externalUrl: normalized,
    mimeType: 'application/x-url',
    size: 0,
    uploadedAt: new Date().toISOString(),
    uploadedBy,
    stageContext,
  });
  recordAudit(store, caseId, 'document_linked', filename);
  saveStore(store);
  return buildWorkspace(store, caseId);
}

export function addDocumentUpload(
  store: MockStore,
  caseId: string,
  file: { name: string; mimeType: string; size: number; dataUrl: string },
  stageContext: string,
  uploadedBy: string,
) {
  const view = caseForStore(store, caseId);
  store.documents.push({
    id: `doc-${caseId}-${Date.now()}`,
    clientId: view.id,
    caseId,
    name: file.name,
    type: 'upload',
    mimeType: file.mimeType,
    size: file.size,
    dataUrl: file.dataUrl,
    uploadedAt: new Date().toISOString(),
    uploadedBy,
    stageContext,
  });
  recordAudit(store, caseId, 'document_uploaded', file.name);
  saveStore(store);
  return buildWorkspace(store, caseId);
}

export function addSampleDocument(
  store: MockStore,
  caseId: string,
  sample: Omit<MockDocument, 'id' | 'clientId' | 'caseId'>,
  uploadedBy: string,
) {
  const view = caseForStore(store, caseId);
  store.documents.push({
    id: `doc-${caseId}-${Date.now()}`,
    clientId: view.id,
    caseId,
    ...sample,
    uploadedBy,
    uploadedAt: new Date().toISOString(),
  });
  recordAudit(store, caseId, 'document_uploaded', sample.name);
  saveStore(store);
  return buildWorkspace(store, caseId);
}

export function deleteDocument(store: MockStore, caseId: string, documentId: string) {
  const index = store.documents.findIndex((d) => d.id === documentId);
  if (index >= 0) {
    const [removed] = store.documents.splice(index, 1);
    recordAudit(store, caseId, 'document_removed', removed.name);
    saveStore(store);
  }
  return buildWorkspace(store, caseId);
}

/**
 * Enrolls many clients into one service event, skipping anyone already enrolled.
 * Mirrors the prototype's `ServiceEnrollmentRepository.bulkEnroll`.
 */
export function bulkEnroll(
  store: MockStore,
  clientIds: string[],
  eventId: string,
): { enrolled: number; alreadyEnrolled: number } {
  let enrolled = 0;
  let alreadyEnrolled = 0;

  clientIds.forEach((clientId, index) => {
    const already = store.enrollments.some(
      (e) => e.clientId === clientId && e.serviceOrEventId === eventId && !e.voided,
    );
    if (already) {
      alreadyEnrolled += 1;
      return;
    }
    const caseRecord = store.cases.find((c) => c.clientId === clientId && c.status !== 'closed');
    store.enrollments.push({
      id: `enr-bulk-${Date.now()}-${index}`,
      clientId,
      caseId: caseRecord?.id ?? '',
      serviceOrEventId: eventId,
      dateEnrolled: today(),
      status: 'Active',
    });
    enrolled += 1;
  });

  if (enrolled) {
    recordAudit(store, `event:${eventId}`, 'bulk_enrollment', `${enrolled} clients`);
    saveStore(store);
  }
  return { enrolled, alreadyEnrolled };
}

export { SERVICE_EVENTS, tabsForClient };
