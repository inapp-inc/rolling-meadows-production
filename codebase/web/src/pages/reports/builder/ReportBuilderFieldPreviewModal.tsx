import { useMemo } from 'react';
import type { UserProfile } from '../../../api/client';
import { EmptyState } from '../../../components/EmptyState';
import { Modal } from '../../../components/Modal';
import { useI18n } from '../../../i18n/I18nContext';
import { previewFieldData, toReportI18n, type ReportI18n } from '../../../mock/customReportService';
import type { MockStore } from '../../../mock/types';
import { parseFieldRef } from './reportBuilderModel';

type ReportBuilderFieldPreviewModalProps = {
  open: boolean;
  fieldKey: string | null;
  primaryEntity: string;
  store: MockStore;
  user: UserProfile | null;
  onClose: () => void;
};

export function ReportBuilderFieldPreviewModal({
  open,
  fieldKey,
  primaryEntity,
  store,
  user,
  onClose,
}: ReportBuilderFieldPreviewModalProps) {
  const i18n = useI18n();
  const reportI18n = useMemo(() => toReportI18n(i18n), [i18n]);

  if (!open || !fieldKey) return null;

  const ref =
    fieldKey === '__count__'
      ? { entity: primaryEntity, field: '__count__' }
      : parseFieldRef(fieldKey);

  const preview = previewFieldData(store, ref.entity, ref.field, user, { primaryEntityId: primaryEntity, limit: 25 }, reportI18n);

  return (
    <Modal open={open} title={preview.label} modalClass="rb-field-preview-modal" onClose={onClose}>
      <FieldPreviewBody preview={preview} reportI18n={reportI18n} />
    </Modal>
  );
}

function FieldPreviewBody({
  preview,
  reportI18n,
}: {
  preview: ReturnType<typeof previewFieldData>;
  reportI18n: ReportI18n;
}) {
  const { t } = reportI18n;

  if (!preview.totalRows) {
    return (
      <EmptyState title={t('pages.reportBuilder.fieldPreviewNoData')} hint={t('pages.reportBuilder.fieldPreviewNoDataHint')} />
    );
  }

  const metaBits = [
    t('pages.reportBuilder.fieldPreviewEntity', { entity: preview.entityLabel }),
    t('pages.reportBuilder.fieldPreviewType', { type: preview.type }),
    t('pages.reportBuilder.fieldPreviewDistinct', { count: preview.distinctCount }),
  ];
  if (preview.emptyCount) {
    metaBits.push(t('pages.reportBuilder.fieldPreviewEmpty', { count: preview.emptyCount }));
  }

  const summary = preview.isRecordCount
    ? t('pages.reportBuilder.fieldPreviewRecordCountLead', {
        total: preview.totalRows,
        entity: preview.entityLabel,
      })
    : t('pages.reportBuilder.fieldPreviewLead', { total: preview.totalRows });

  return (
    <>
      <p className="text-muted rb-field-preview-lead">{summary}</p>
      <p className="rb-field-preview-meta">{metaBits.join(' · ')}</p>
      {preview.values.length ? (
        <div className="table-responsive">
          <table className="data-table rb-field-preview-table">
            <thead>
              <tr>
                <th>{t('pages.reportBuilder.fieldPreviewValue')}</th>
                <th>{t('pages.reportBuilder.fieldPreviewCount')}</th>
              </tr>
            </thead>
            <tbody>
              {preview.values.map((row) => (
                <tr key={row.value}>
                  <td>{row.value ?? ''}</td>
                  <td>
                    <strong>{row.count}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </>
  );
}
