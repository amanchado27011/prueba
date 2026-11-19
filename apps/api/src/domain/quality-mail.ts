import { QUALITY_LABEL, QUALITY_RECOMMENDATION, type QualityKind } from './quality';

export interface QualityRow {
  key: string;
  summary: string;
  sprint: string;
  assignee: string;
  url: string;
  reason: QualityKind;
}

export interface QualityMessage {
  subject: string;
  text: string;
  html: string;
  total: number;
  rows: QualityRow[];
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildQualityEmail(rows: QualityRow[]): QualityMessage {
  const unique = new Set(rows.map((row) => row.key));
  const subject = `Calidad Jira: ${unique.size} historias o tareas con datos incompletos`;
  const lines = rows.map(
    (row) =>
      `${row.key}\t${row.summary}\t${row.sprint || '—'}\t${row.assignee || '—'}\t${QUALITY_LABEL[row.reason]}\t${row.url}`,
  );
  const text = [
    'Resumen de calidad de la proyección Jira.',
    `Historias o tareas afectadas: ${unique.size}.`,
    `Filas (una issue puede tener más de un motivo): ${rows.length}.`,
    '',
    'Clave\tResumen\tSprint\tResponsable\tMotivo\tEnlace',
    ...lines,
    '',
    QUALITY_RECOMMENDATION,
  ].join('\n');
  const bodyRows = rows
    .map(
      (row) => `<tr>
<td>${escapeHtml(row.key)}</td>
<td>${escapeHtml(row.summary)}</td>
<td>${escapeHtml(row.sprint || '—')}</td>
<td>${escapeHtml(row.assignee || '—')}</td>
<td>${escapeHtml(QUALITY_LABEL[row.reason])}</td>
<td><a href="${escapeHtml(row.url)}">${escapeHtml(row.url)}</a></td>
</tr>`,
    )
    .join('');
  const html = `<p>Resumen de calidad de la proyección Jira.</p>
<p>Historias o tareas afectadas: <strong>${unique.size}</strong>. Filas: ${rows.length}.</p>
<table border="1" cellpadding="6" cellspacing="0">
<thead><tr><th>Clave</th><th>Resumen</th><th>Sprint</th><th>Responsable</th><th>Motivo</th><th>Enlace</th></tr></thead>
<tbody>${bodyRows}</tbody>
</table>
<p>${escapeHtml(QUALITY_RECOMMENDATION)}</p>`;
  return { subject, text, html, total: unique.size, rows };
}

export type DeliveryDecision = 'DRY_RUN' | 'SENT' | 'FAILED';

export function decideDelivery(input: { dryRun: boolean; smtpConfigured: boolean; recipient: string | null }): {
  result: DeliveryDecision;
  error: string | null;
} {
  if (!input.recipient) {
    return { result: 'FAILED', error: 'No hay destinatario IT.PIME configurado' };
  }
  if (input.dryRun) return { result: 'DRY_RUN', error: null };
  if (!input.smtpConfigured) {
    return { result: 'FAILED', error: 'SMTP no configurado' };
  }
  return { result: 'SENT', error: null };
}
