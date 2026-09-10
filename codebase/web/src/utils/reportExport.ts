import type { CustomReportPreviewData } from '../api/client';

export function downloadReportCsv(
  filename: string,
  preview: CustomReportPreviewData,
): void {
  if (!preview.columns?.length || !preview.rows?.length) return;
  const header = preview.columns.map((c) => c.label).join(',');
  const body = preview.rows
    .map((row) =>
      preview.columns!
        .map((col) => `"${String(row[col.key] ?? '').replace(/"/g, '""')}"`)
        .join(','),
    )
    .join('\n');
  const blob = new Blob([`${header}\n${body}`], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, `${sanitizeFilename(filename)}.csv`);
}

export function downloadChartPreviewPng(filename: string, preview: CustomReportPreviewData): void {
  if (!preview.points?.length) return;
  const width = 640;
  const height = preview.chartType === 'donut' ? 360 : 40 + preview.points.length * 36;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#111827';
  ctx.font = '600 16px system-ui, sans-serif';
  ctx.fillText(`${preview.yLabel ?? 'Count'} by ${preview.xLabel ?? ''}`, 24, 28);

  if (preview.chartType === 'donut') {
    const cx = 160;
    const cy = height / 2 + 10;
    const radius = 90;
    const total = preview.points.reduce((sum, p) => sum + p.value, 0) || 1;
    let start = -Math.PI / 2;
    preview.points.forEach((point) => {
      const slice = (point.value / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, start, start + slice);
      ctx.closePath();
      ctx.fillStyle = point.color ?? '#2563eb';
      ctx.fill();
      start += slice;
    });
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.55, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.fillStyle = '#111827';
    ctx.font = '700 22px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(String(total), cx, cy + 8);
    ctx.textAlign = 'left';
    ctx.font = '13px system-ui, sans-serif';
    preview.points.forEach((point, i) => {
      const y = 56 + i * 22;
      ctx.fillStyle = point.color ?? '#2563eb';
      ctx.fillRect(320, y - 10, 12, 12);
      ctx.fillStyle = '#374151';
      ctx.fillText(`${point.label} — ${point.value}`, 340, y);
    });
  } else {
    const max = Math.max(...preview.points.map((p) => p.value), 1);
    preview.points.forEach((point, i) => {
      const y = 48 + i * 36;
      ctx.fillStyle = '#374151';
      ctx.font = '13px system-ui, sans-serif';
      ctx.fillText(point.label, 24, y + 12);
      const barX = 180;
      const barW = 360;
      const fillW = Math.max(4, Math.round((point.value / max) * barW));
      ctx.fillStyle = '#e5e7eb';
      ctx.fillRect(barX, y, barW, 18);
      ctx.fillStyle = point.color ?? '#2563eb';
      ctx.fillRect(barX, y, fillW, 18);
      ctx.fillStyle = '#111827';
      ctx.fillText(String(point.value), barX + barW + 12, y + 14);
    });
  }

  canvas.toBlob((blob) => {
    if (blob) triggerDownload(blob, `${sanitizeFilename(filename)}.png`);
  }, 'image/png');
}

export type ExportColumn = { key: string; label: string };
export type ExportRow = Record<string, unknown>;
export type ExportBar = { label: string; value: number; color?: string };

export function downloadTableCsv<T extends object>(
  filename: string,
  columns: ExportColumn[],
  rows: T[],
): void {
  if (!columns.length || !rows.length) return;
  const header = columns.map((col) => `"${col.label.replace(/"/g, '""')}"`).join(',');
  const body = rows
    .map((row) =>
      columns
        .map((col) => `"${String((row as ExportRow)[col.key] ?? '').replace(/"/g, '""')}"`)
        .join(','),
    )
    .join('\n');
  const blob = new Blob([`${header}\n${body}`], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, `${sanitizeFilename(filename)}.csv`);
}

export function downloadBarChartPng(filename: string, title: string, bars: ExportBar[]): void {
  if (!bars.length) return;
  const width = 720;
  const height = 56 + bars.length * 36;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#111827';
  ctx.font = '600 16px system-ui, sans-serif';
  ctx.fillText(title, 24, 28);

  const max = Math.max(...bars.map((bar) => bar.value), 1);
  bars.forEach((bar, i) => {
    const y = 52 + i * 36;
    ctx.fillStyle = '#374151';
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillText(bar.label, 24, y + 13);
    const barX = 240;
    const barW = 400;
    const fillW = Math.max(4, Math.round((bar.value / max) * barW));
    ctx.fillStyle = '#e5e7eb';
    ctx.fillRect(barX, y, barW, 18);
    ctx.fillStyle = bar.color ?? '#2563eb';
    ctx.fillRect(barX, y, fillW, 18);
    ctx.fillStyle = '#111827';
    ctx.fillText(String(bar.value), barX + barW + 12, y + 14);
  });

  canvas.toBlob((blob) => {
    if (blob) triggerDownload(blob, `${sanitizeFilename(filename)}.png`);
  }, 'image/png');
}

export function downloadTablePng<T extends object>(
  filename: string,
  title: string,
  columns: ExportColumn[],
  rows: T[],
  subtitle?: string,
): void {
  if (!columns.length || !rows.length) return;
  const colWidth = 180;
  const rowHeight = 28;
  const headerY = subtitle ? 76 : 56;
  const width = Math.max(480, 48 + columns.length * colWidth);
  const height = headerY + rowHeight * (rows.length + 1) + 24;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#111827';
  ctx.font = '600 16px system-ui, sans-serif';
  ctx.fillText(title, 24, 30);
  if (subtitle) {
    ctx.fillStyle = '#6b7280';
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillText(subtitle, 24, 52);
  }

  ctx.fillStyle = '#f3f4f6';
  ctx.fillRect(24, headerY, width - 48, rowHeight);
  ctx.fillStyle = '#111827';
  ctx.font = '600 12px system-ui, sans-serif';
  columns.forEach((col, i) => {
    ctx.fillText(col.label, 32 + i * colWidth, headerY + 19);
  });

  ctx.font = '12px system-ui, sans-serif';
  rows.forEach((row, r) => {
    const y = headerY + rowHeight * (r + 1);
    if (r % 2 === 1) {
      ctx.fillStyle = '#fafafa';
      ctx.fillRect(24, y, width - 48, rowHeight);
    }
    ctx.fillStyle = '#374151';
    columns.forEach((col, i) => {
      const text = String((row as ExportRow)[col.key] ?? '');
      ctx.fillText(text.length > 26 ? `${text.slice(0, 25)}…` : text, 32 + i * colWidth, y + 19);
    });
  });

  canvas.toBlob((blob) => {
    if (blob) triggerDownload(blob, `${sanitizeFilename(filename)}.png`);
  }, 'image/png');
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^\w\s-]/g, '').trim() || 'report';
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
