import { buildExportBook, EXPORT_SHEETS } from '../apps/api/src/domain/export-book';
import { epicRollup, initiativeRollup, issueMetrics, productivity } from '../apps/api/src/domain/metrics';
import { buildQualityEmail, decideDelivery } from '../apps/api/src/domain/quality-mail';
import { fixtureSnapshot, metricsModel } from '../apps/api/src/domain/scenario';
import { buildProjection } from '../apps/api/src/domain/project';
import { createFixtureReader } from '../apps/api/src/jira/fixture';
import { MemoryProjectionStore } from '../apps/api/src/jira/memory-store';
import { runSync } from '../apps/api/src/jira/sync';
import { renderWorkbook } from '../apps/api/src/services/excel.service';

async function main() {
  const checks: string[] = [];
  const ok = (label: string) => checks.push(`OK  ${label}`);
  const raw = fixtureSnapshot();
  const projection = buildProjection(raw, 'https://jira.local');
  if (projection.httpMethods.some((method) => method !== 'GET')) throw new Error('la foto simulada no es solo lectura');
  if (projection.issues.some((issue) => issue.issueType === 'Sub-task')) throw new Error('se proyectó una subtarea');
  ok('proyección simulada sin subtareas y solo GET');

  const store = new MemoryProjectionStore();
  await runSync(createFixtureReader(), store, 'https://jira.local');
  const before = store.stats();
  await runSync(createFixtureReader(), store, 'https://jira.local');
  if (JSON.stringify(store.stats()) !== JSON.stringify(before)) throw new Error('la segunda sincronización no es idempotente');
  ok('sincronización simulada idempotente');

  const model = metricsModel();
  const issue = model.issues.find((item) => item.key === 'GD-1');
  if (!issue) throw new Error('falta GD-1');
  const total = issueMetrics(model, issue, {}).loggedHours;
  const split = issueMetrics(model, issue, { sprintId: 'sprint-a' }).loggedHours + issueMetrics(model, issue, { sprintId: 'sprint-b' }).loggedHours;
  if (total !== 10 || split !== 10) throw new Error(`horas de issue ${total} / ${split}`);
  const epic1 = model.epics.find((item) => item.id === 'epic-1');
  const epic2 = model.epics.find((item) => item.id === 'epic-2');
  if (!epic1 || !epic2) throw new Error('faltan épicas');
  const epicHours = epicRollup(model, epic1, {}).loggedHours + epicRollup(model, epic2, {}).loggedHours;
  const initiativeHours = initiativeRollup(model, 'ini-1', {}).loggedHours;
  if (epicHours !== initiativeHours) throw new Error(`épicas ${epicHours} iniciativa ${initiativeHours}`);
  ok(`sumatorios historia 10 h, épicas ${epicHours} h = iniciativa`);

  const people = productivity(model, {}).byPerson.map((person) => person.name);
  if (people.join(',') !== 'Ana,Luis,Zoe') throw new Error(`orden ${people.join(',')}`);
  ok('personas en orden alfabético');

  const preview = buildQualityEmail([{ key: 'GD-3', summary: 'Sin épica', sprint: 'Sprint A', assignee: 'Ana', url: 'https://jira.local/browse/GD-3', reason: 'no_epic' }]);
  if (preview.total !== 1 || !preview.text.includes('GD-3')) throw new Error('preview incompleto');
  if (decideDelivery({ dryRun: true, smtpConfigured: true, recipient: 'it@example.com' }).result !== 'DRY_RUN') {
    throw new Error('el modo de prueba iba a enviar');
  }
  ok('previsualización de correo sin envío');

  const book = buildExportBook(model, {}, [['Criterio', 'Solo lectura', 'Jira']]);
  if (book.sheets.map((sheet) => sheet.name).join('|') !== EXPORT_SHEETS.join('|')) throw new Error('hojas distintas');
  const buffer = await renderWorkbook(book);
  if (buffer.subarray(0, 2).toString() !== 'PK') throw new Error('el excel no es un xlsx');
  ok('excel de diez hojas');

  console.log(checks.join('\n'));
  console.log('Verificación simulada completada.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
