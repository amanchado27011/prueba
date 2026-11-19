import ExcelJS from 'exceljs';
import type { DemandStatus, Priority } from '@prisma/client';
import { parseDemandCsv, type DemandCsvRow } from '../domain/demand-csv';
import { HttpError } from '../lib/http-error';
import { prisma } from '../lib/prisma';

export interface DemandInput {
  title: string;
  description?: string | null;
  requester: string;
  occurredAt: string;
  priority?: Priority;
  estimatedHours?: number;
  initiativeId?: string | null;
  objectiveId?: string | null;
  subareaId?: string | null;
  serviceFamilyId?: string | null;
  status?: DemandStatus;
  epicId?: string | null;
  jiraKey?: string | null;
  notes?: string | null;
}

function day(value: string): Date {
  return new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
}

export async function createDemand(input: DemandInput) {
  return prisma.impulsiveDemand.create({
    data: {
      title: input.title,
      description: input.description ?? null,
      requester: input.requester,
      occurredAt: day(input.occurredAt),
      priority: input.priority ?? 'MEDIUM',
      estimatedHours: input.estimatedHours ?? 0,
      initiativeId: input.initiativeId ?? null,
      objectiveId: input.objectiveId ?? null,
      subareaId: input.subareaId ?? null,
      serviceFamilyId: input.serviceFamilyId ?? null,
      status: input.status ?? 'NEW',
      epicId: input.epicId ?? null,
      jiraKey: input.jiraKey ?? null,
      notes: input.notes ?? null,
    },
  });
}

export async function importDemandRows(rows: DemandCsvRow[], parseErrors: Array<{ row: number; message: string }>) {
  const [initiatives, objectives, subareas, families] = await Promise.all([
    prisma.initiative.findMany(),
    prisma.objective.findMany(),
    prisma.subarea.findMany(),
    prisma.serviceFamily.findMany(),
  ]);
  const errors = [...parseErrors];
  let created = 0;
  for (const [index, row] of rows.entries()) {
    const rowNumber = index + 2;
    try {
      const initiativeId = match(initiatives, row.initiativeName, 'iniciativa', rowNumber);
      const objectiveId = match(objectives, row.objectiveName, 'objetivo', rowNumber);
      const subareaId = match(subareas, row.subareaName, 'subárea', rowNumber);
      const familyId = match(families, row.familyName, 'familia', rowNumber);
      await createDemand({
        title: row.title,
        description: row.description,
        requester: row.requester,
        occurredAt: row.occurredAt.slice(0, 10),
        priority: row.priority,
        estimatedHours: row.estimatedHours,
        initiativeId,
        objectiveId,
        subareaId,
        serviceFamilyId: familyId,
        status: row.status,
        jiraKey: row.jiraKey,
        notes: row.notes,
      });
      created += 1;
    } catch (error) {
      errors.push({ row: rowNumber, message: error instanceof Error ? error.message : 'Fila no importada' });
    }
  }
  return { created, errors };
}

function match<T extends { id: string; name: string }>(rows: T[], name: string | null, label: string, _row: number): string | null {
  if (!name) return null;
  const found = rows.find((row) => row.name.localeCompare(name, 'es', { sensitivity: 'accent' }) === 0);
  if (!found) throw new HttpError(400, `No existe ${label} «${name}»`);
  return found.id;
}

export async function tableFromUpload(filename: string, buffer: Buffer): Promise<string> {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.csv') || lower.endsWith('.txt')) return buffer.toString('utf8');
  if (!lower.endsWith('.xlsx')) throw new HttpError(400, 'Solo se admite CSV o XLSX');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new HttpError(400, 'El libro no tiene hojas');
  const lines: string[] = [];
  sheet.eachRow((row) => {
    const values = (row.values as unknown[]).slice(1).map((value) => {
      if (value instanceof Date) return value.toISOString().slice(0, 10);
      return quote(value == null ? '' : String(value));
    });
    lines.push(values.join(','));
  });
  return lines.join('\n');
}

function quote(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export async function importDemandText(text: string) {
  const parsed = parseDemandCsv(text);
  return importDemandRows(parsed.rows, parsed.errors);
}
