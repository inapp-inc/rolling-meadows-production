import type { MockDocument } from './types';

export const MAX_UPLOAD_BYTES = 512_000;
export const ACCEPTED_FILE_TYPES = '.pdf,.png,.jpg,.jpeg,.svg';

export type DocumentTranslate = (key: string, params?: Record<string, string | number>) => string;

/** Mirrors the prototype's `RM.DocumentService.isLink`. */
export function isLink(doc: MockDocument): boolean {
  return doc.type === 'link' || Boolean(doc.externalUrl);
}

export function normalizeUrl(raw: string): string | null {
  let url = raw.trim();
  if (!url) return null;
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return parsed.href;
  } catch {
    return null;
  }
}

export function linkHostname(url: string | undefined, fallback: string): string {
  try {
    return new URL(url ?? '').hostname.replace(/^www\./, '');
  } catch {
    return fallback;
  }
}

export function isPdf(doc: MockDocument): boolean {
  return doc.mimeType === 'application/pdf' || /\.pdf$/i.test(doc.name);
}

export function isImage(doc: MockDocument): boolean {
  return /^image\//.test(doc.mimeType ?? '') || Boolean(doc.dataUrl?.startsWith('data:image'));
}

export function sizeInKb(doc: MockDocument): number {
  return Math.max(1, Math.round((doc.size ?? 0) / 1024));
}

export function openDocumentLink(doc: MockDocument): void {
  if (!doc.externalUrl) return;
  window.open(doc.externalUrl, '_blank', 'noopener,noreferrer');
}

export function downloadDocument(doc: MockDocument): void {
  if (isLink(doc)) {
    openDocumentLink(doc);
    return;
  }
  if (!doc.dataUrl) return;
  const anchor = document.createElement('a');
  anchor.href = doc.dataUrl;
  anchor.download = doc.name;
  anchor.click();
}

function escapeSvgText(text: string): string {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function svgDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function consentFormSvg(t: DocumentTranslate, clientName: string, signedDate: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="612" height="792" viewBox="0 0 612 792">` +
    `<rect width="612" height="792" fill="#ffffff"/>` +
    `<rect x="48" y="48" width="516" height="696" fill="none" stroke="#1a3a5c" stroke-width="2"/>` +
    `<text x="306" y="96" text-anchor="middle" font-family="Georgia, serif" font-size="22" fill="#1a3a5c">${escapeSvgText(t('documents.svgOrgTitle'))}</text>` +
    `<text x="306" y="124" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="#555555">${escapeSvgText(t('documents.svgConsentTitle'))}</text>` +
    `<line x1="72" y1="140" x2="540" y2="140" stroke="#c5d4e8" stroke-width="1"/>` +
    `<text x="72" y="176" font-family="Arial, sans-serif" font-size="13" fill="#333333">${escapeSvgText(t('documents.svgClientName'))}</text>` +
    `<text x="180" y="176" font-family="Arial, sans-serif" font-size="13" fill="#1a3a5c">${clientName}</text>` +
    `<text x="72" y="210" font-family="Arial, sans-serif" font-size="12" fill="#333333">${escapeSvgText(t('documents.svgAuthorizeIntro'))}</text>` +
    `<text x="88" y="236" font-family="Arial, sans-serif" font-size="12" fill="#333333">• ${escapeSvgText(t('documents.svgAuthorize1'))}</text>` +
    `<text x="88" y="258" font-family="Arial, sans-serif" font-size="12" fill="#333333">• ${escapeSvgText(t('documents.svgAuthorize2'))}</text>` +
    `<text x="88" y="280" font-family="Arial, sans-serif" font-size="12" fill="#333333">• ${escapeSvgText(t('documents.svgAuthorize3'))}</text>` +
    `<text x="72" y="330" font-family="Arial, sans-serif" font-size="12" fill="#333333">${escapeSvgText(t('documents.svgConsentDuration'))}</text>` +
    `<text x="72" y="420" font-family="Arial, sans-serif" font-size="12" fill="#333333">${escapeSvgText(t('documents.svgSignature'))}</text>` +
    `<path d="M 180 450 Q 220 430 260 448 T 340 442" fill="none" stroke="#1a3a5c" stroke-width="2"/>` +
    `<text x="72" y="490" font-family="Arial, sans-serif" font-size="12" fill="#333333">${escapeSvgText(t('documents.svgDateSigned'))}</text>` +
    `<text x="160" y="490" font-family="Arial, sans-serif" font-size="12" fill="#1a3a5c">${signedDate}</text>` +
    `<text x="72" y="540" font-family="Arial, sans-serif" font-size="12" fill="#333333">${escapeSvgText(t('documents.svgWitness'))}</text>` +
    `<text x="210" y="540" font-family="Arial, sans-serif" font-size="12" fill="#1a3a5c">${escapeSvgText(t('role.case_manager'))}</text>` +
    `<text x="72" y="700" font-family="Arial, sans-serif" font-size="10" fill="#888888">${escapeSvgText(t('documents.svgDemoFooter'))}</text>` +
    `</svg>`;
}

function assessmentReportSvg(t: DocumentTranslate, clientName: string, reportDate: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="612" height="792" viewBox="0 0 612 792">` +
    `<rect width="612" height="792" fill="#fafbfc"/>` +
    `<rect x="48" y="48" width="516" height="696" fill="#ffffff" stroke="#dde4ec" stroke-width="1"/>` +
    `<text x="72" y="92" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#1a3a5c">${escapeSvgText(t('documents.svgAssessmentTitle'))}</text>` +
    `<text x="72" y="118" font-family="Arial, sans-serif" font-size="12" fill="#555555">${escapeSvgText(t('documents.svgAssessmentClient'))} ${clientName} · ${escapeSvgText(t('documents.svgAssessmentDate'))} ${reportDate}</text>` +
    `<rect x="72" y="140" width="468" height="28" fill="#eef4fb"/>` +
    `<text x="84" y="159" font-family="Arial, sans-serif" font-size="11" font-weight="bold" fill="#1a3a5c">${escapeSvgText(t('documents.svgArea'))}</text>` +
    `<text x="300" y="159" font-family="Arial, sans-serif" font-size="11" font-weight="bold" fill="#1a3a5c">${escapeSvgText(t('documents.svgFinding'))}</text>` +
    `<text x="84" y="188" font-family="Arial, sans-serif" font-size="11" fill="#333333">${escapeSvgText(t('documents.svgBathroom'))}</text>` +
    `<text x="300" y="188" font-family="Arial, sans-serif" font-size="11" fill="#333333">${escapeSvgText(t('documents.svgBathroomFinding'))}</text>` +
    `<text x="84" y="212" font-family="Arial, sans-serif" font-size="11" fill="#333333">${escapeSvgText(t('documents.svgStairs'))}</text>` +
    `<text x="300" y="212" font-family="Arial, sans-serif" font-size="11" fill="#333333">${escapeSvgText(t('documents.svgStairsFinding'))}</text>` +
    `<text x="84" y="236" font-family="Arial, sans-serif" font-size="11" fill="#333333">${escapeSvgText(t('documents.svgKitchen'))}</text>` +
    `<text x="300" y="236" font-family="Arial, sans-serif" font-size="11" fill="#333333">${escapeSvgText(t('documents.svgKitchenFinding'))}</text>` +
    `<text x="84" y="260" font-family="Arial, sans-serif" font-size="11" fill="#333333">${escapeSvgText(t('documents.svgMedications'))}</text>` +
    `<text x="300" y="260" font-family="Arial, sans-serif" font-size="11" fill="#333333">${escapeSvgText(t('documents.svgMedicationsFinding'))}</text>` +
    `<text x="72" y="320" font-family="Arial, sans-serif" font-size="12" fill="#333333">${escapeSvgText(t('documents.svgFollowUp'))}</text>` +
    `<rect x="72" y="360" width="200" height="120" fill="#f0f4f8" stroke="#c5d4e8" stroke-width="1" rx="4"/>` +
    `<text x="172" y="410" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" fill="#888888">${escapeSvgText(t('documents.svgPhotoPlaceholder'))}</text>` +
    `<text x="172" y="430" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="#888888">${escapeSvgText(t('documents.svgDemoPlaceholder'))}</text>` +
    `<text x="72" y="700" font-family="Arial, sans-serif" font-size="10" fill="#888888">${escapeSvgText(t('documents.svgDemoFooter'))}</text>` +
    `</svg>`;
}

export function buildSampleDocument(
  t: DocumentTranslate,
  clientName: string,
  clientRegisteredAt: string | undefined,
  kind: 'consent' | 'assessment',
): Omit<MockDocument, 'id' | 'clientId' | 'caseId'> {
  const safeName = escapeSvgText(clientName);
  const signedDate = escapeSvgText(
    clientRegisteredAt ? clientRegisteredAt.slice(0, 10) : '2026-02-02',
  );

  if (kind === 'assessment') {
    const svg = assessmentReportSvg(t, safeName, '2026-02-08');
    return {
      name: t('documents.assessmentFilename', { name: clientName }),
      type: 'upload',
      mimeType: 'image/svg+xml',
      size: svg.length,
      dataUrl: svgDataUrl(svg),
      uploadedBy: t('documents.demoSeed'),
      uploadedAt: '2026-02-08T14:30:00.000Z',
      stageContext: 'assessment',
    };
  }

  const svg = consentFormSvg(t, safeName, signedDate);
  return {
    name: t('documents.consentFilename', { name: clientName }),
    type: 'upload',
    mimeType: 'image/svg+xml',
    size: svg.length,
    dataUrl: svgDataUrl(svg),
    uploadedBy: t('documents.demoSeed'),
    uploadedAt: '2026-02-02T10:15:00.000Z',
    stageContext: 'intake',
  };
}

export function buildSampleLink(
  title: string,
  url: string,
  stageContext: string,
  uploadedAt?: string,
): Omit<MockDocument, 'id' | 'clientId' | 'caseId'> {
  return {
    name: title,
    type: 'link',
    externalUrl: url,
    mimeType: 'application/x-url',
    size: 0,
    uploadedBy: 'Demo seed',
    uploadedAt: uploadedAt ?? new Date().toISOString(),
    stageContext,
  };
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('read_failed'));
    reader.readAsDataURL(file);
  });
}

export function linkDisplayName(
  t: DocumentTranslate,
  title: string,
  normalizedUrl: string,
): string {
  const trimmed = title.trim();
  if (trimmed) return trimmed;
  return t('documents.documentOnHost', { host: linkHostname(normalizedUrl, t('documents.externalLinkHost')) });
}
