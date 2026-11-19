import type { AnalysisFilter, DistributionSlice, RollupMetrics, WorkModel } from './metrics';
import { demandInScope, epicRollup, hours, initiativeRollup, issueMetrics, productivity, scopedIssues } from './metrics';
import { qualityKinds } from './quality';

export const EXPORT_SHEETS = [
  'Resumen ejecutivo',
  'Trabajo en curso',
  'Iniciativas',
  'Épicas',
  'Historias y tareas',
  'Worklogs por persona',
  'Productividad',
  'Trabajo sin épica',
  'Demanda impulsiva',
  'Catálogos y criterios',
] as const;

export interface ExportBook {
  sheets: Array<{ name: string; headers: string[]; rows: Array<Array<string | number>> }>;
}

function slices(items: DistributionSlice[]): string {
  return items.map((item) => `${item.label}: ${item.hours} h`).join(' | ');
}

function filterLabel(filter: AnalysisFilter): string {
  const parts = [
    filter.sprintId ? `sprint ${filter.sprintId}` : '',
    filter.from || filter.to ? `periodo ${filter.from ?? '…'} a ${filter.to ?? '…'}` : '',
    filter.initiativeId ? `iniciativa ${filter.initiativeId}` : '',
    filter.epicId ? `épica ${filter.epicId}` : '',
    filter.objectiveId ? `objetivo ${filter.objectiveId}` : '',
    filter.personAccountId ? `persona ${filter.personAccountId}` : '',
    filter.maintenanceType ?? '',
    filter.q ? `texto ${filter.q}` : '',
  ].filter(Boolean);
  return parts.length ? parts.join(', ') : 'sin filtros';
}

export function buildExportBook(
  model: WorkModel,
  filter: AnalysisFilter,
  catalogs: Array<Array<string | number>>,
): ExportBook {
  const issues = scopedIssues(model, filter);
  const report = productivity(model, filter);
  const initiativeIds = [...new Set(model.epics.map((epic) => epic.initiativeId).filter((id): id is string => Boolean(id)))];
  const visibleInitiativeIds = new Set<string>();
  const epicRows: Array<Array<string | number>> = [];
  for (const epic of model.epics) {
    if (filter.initiativeId && epic.initiativeId !== filter.initiativeId) continue;
    if (filter.epicId && epic.id !== filter.epicId) continue;
    if (filter.objectiveId && epic.objectiveId !== filter.objectiveId) continue;
    if (filter.maintenanceType && epic.maintenanceType !== filter.maintenanceType) continue;
    if (filter.activityTypeId && epic.activityTypeId !== filter.activityTypeId) continue;
    const children = issues.filter((issue) => issue.epicId === epic.id);
    if (children.length === 0 && (filter.sprintId || filter.from || filter.to || filter.q || filter.personAccountId)) continue;
    const metrics = epicRollup(model, epic, filter);
    if (epic.initiativeId) visibleInitiativeIds.add(epic.initiativeId);
    epicRows.push([
      epic.key,
      epic.summary,
      epic.initiativeName ?? '',
      epic.objectiveName ?? '',
      epic.maintenanceType ?? '',
      epic.activityName ?? '',
      metrics.issueCount,
      metrics.done,
      metrics.inProgress,
      metrics.pending,
      metrics.originalHours,
      metrics.loggedHours,
      metrics.remainingHours,
      metrics.executedPct ?? '',
      metrics.storyPoints,
    ]);
  }

  const initiativeRows = initiativeIds
    .filter((id) => !filter.initiativeId || id === filter.initiativeId)
    .filter((id) => visibleInitiativeIds.size === 0 || visibleInitiativeIds.has(id) || id === filter.initiativeId)
    .map((id) => {
      const epic = model.epics.find((item) => item.initiativeId === id);
      const metrics: RollupMetrics = initiativeRollup(model, id, filter);
      return [
        epic?.initiativeName ?? id,
        epic?.objectiveName ?? '',
        metrics.issueCount,
        metrics.originalHours,
        metrics.loggedHours,
        metrics.remainingHours,
        metrics.executedPct ?? '',
        metrics.people.map((person) => person.name).join(', '),
        slices(metrics.byActivity),
        slices(metrics.byFamily),
      ];
    });

  const issueRows = issues.map((issue) => {
    const metrics = issueMetrics(model, issue, filter);
    const epic = model.epics.find((item) => item.id === issue.epicId);
    return [
      issue.key,
      issue.summary,
      issue.issueType,
      issue.statusName,
      epic?.key ?? '',
      epic?.initiativeName ?? '',
      epic?.objectiveName ?? '',
      issue.assigneeName ?? '',
      issue.currentSprintName ?? '',
      metrics.originalHours,
      metrics.loggedHours,
      metrics.remainingHours,
      metrics.consumedPct ?? '',
      metrics.done ? 'sí' : 'no',
      metrics.workers.map((person) => `${person.name} ${person.hours}h`).join(', '),
      issue.jiraUrl,
    ];
  });

  const worklogRows = model.worklogs
    .filter((worklog) => issues.some((issue) => issue.id === worklog.issueId) || model.issues.some((issue) => issue.kind === 'EPIC' && issue.id === worklog.issueId && issues.some((child) => child.epicId && model.epics.find((epic) => epic.id === child.epicId)?.jiraIssueId === issue.jiraIssueId)))
    .map((worklog) => {
      const issue = model.issues.find((item) => item.id === worklog.issueId);
      return [
        issue?.key ?? '',
        worklog.displayName,
        hours(worklog.seconds),
        worklog.startedAt.slice(0, 10),
        model.sprints.find((sprint) => sprint.id === worklog.sprintId)?.name ?? '',
      ];
    });

  const without = issues.filter((issue) => !issue.epicId);
  const demand = model.demands.filter((item) => demandInScope(item, filter));

  const summary: Array<Array<string | number>> = [
    ['Filtros', filterLabel(filter)],
    ['Historias y tareas', issues.length],
    ['Horas imputadas', report.hours],
    ['Historias terminadas', report.storiesDone],
    ['Historias en curso', report.storiesInProgress],
    ['Estimación terminada (h)', report.estimateDoneHours],
    ['Estimación pendiente (h)', report.estimatePendingHours],
    ['Sin épica', report.unplanned.issuesWithoutEpic],
    ['Demanda impulsiva', report.unplanned.demandCount],
    ['Horas de demanda impulsiva', report.unplanned.demandHours],
  ];

  const productivityRows: Array<Array<string | number>> = [
    ['Horas imputadas', report.hours],
    ['Terminadas', report.storiesDone],
    ['En curso', report.storiesInProgress],
    ...report.byPerson.map((person) => [`Persona ${person.name}`, `${person.hours} h`, person.subareaName ?? '', person.familyName ?? '']),
    ...report.sprintTrend.map((sprint) => [`Sprint ${sprint.sprintName}`, `${sprint.hours} h`, `terminadas ${sprint.done}`]),
  ];

  return {
    sheets: [
      { name: 'Resumen ejecutivo', headers: ['Indicador', 'Valor'], rows: summary },
      {
        name: 'Trabajo en curso',
        headers: ['Iniciativa', 'Épica', 'Clave', 'Resumen', 'Estado', 'Horas'],
        rows: issueRows.map((row) => [row[5], row[4], row[0], row[1], row[3], row[10]]),
      },
      {
        name: 'Iniciativas',
        headers: ['Iniciativa', 'Objetivo', 'Historias', 'Estimación', 'Imputadas', 'Restantes', 'Progreso', 'Personas', 'Actividad', 'Familia'],
        rows: initiativeRows,
      },
      {
        name: 'Épicas',
        headers: ['Clave', 'Resumen', 'Iniciativa', 'Objetivo', 'Mantenimiento', 'Actividad', 'Historias', 'Terminadas', 'En curso', 'Pendientes', 'Estimación', 'Imputadas', 'Restantes', 'Ejecutado %', 'Story points'],
        rows: epicRows,
      },
      {
        name: 'Historias y tareas',
        headers: ['Clave', 'Resumen', 'Tipo', 'Estado', 'Épica', 'Iniciativa', 'Objetivo', 'Asignada', 'Sprint', 'Estimación', 'Imputadas', 'Restantes', 'Consumido %', 'Terminada', 'Personas', 'URL'],
        rows: issueRows,
      },
      {
        name: 'Worklogs por persona',
        headers: ['Issue', 'Persona', 'Horas', 'Fecha', 'Sprint'],
        rows: worklogRows,
      },
      { name: 'Productividad', headers: ['Concepto', 'Valor', 'Detalle', 'Extra'], rows: productivityRows },
      {
        name: 'Trabajo sin épica',
        headers: ['Clave', 'Resumen', 'Estado', 'Asignada', 'Motivos'],
        rows: without.map((issue) => {
          const metrics = issueMetrics(model, issue, filter);
          return [issue.key, issue.summary, issue.statusName, issue.assigneeName ?? '', qualityKinds(issue, metrics).join(', ')];
        }),
      },
      {
        name: 'Demanda impulsiva',
        headers: ['Título', 'Solicitante', 'Fecha', 'Prioridad', 'Horas', 'Iniciativa', 'Objetivo', 'Estado', 'Clave Jira'],
        rows: demand.map((item) => [
          item.title,
          item.requester,
          item.occurredAt.slice(0, 10),
          item.priority,
          item.estimatedHours,
          item.initiativeName ?? '',
          item.objectiveName ?? '',
          item.status,
          item.jiraKey ?? '',
        ]),
      },
      {
        name: 'Catálogos y criterios',
        headers: ['Tipo', 'Nombre', 'Detalle'],
        rows: catalogs,
      },
    ],
  };
}
