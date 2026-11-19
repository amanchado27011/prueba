export const DEMAND_CSV_HEADERS = [
  'titulo',
  'descripcion',
  'solicitante',
  'fecha',
  'prioridad',
  'esfuerzo_horas',
  'iniciativa',
  'objetivo',
  'subarea',
  'familia',
  'estado',
  'clave_jira',
  'observaciones',
] as const;

export interface DemandCsvRow {
  title: string;
  description: string | null;
  requester: string;
  occurredAt: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  estimatedHours: number;
  initiativeName: string | null;
  objectiveName: string | null;
  subareaName: string | null;
  familyName: string | null;
  status: 'NEW' | 'TRIAGED' | 'IN_PROGRESS' | 'DONE' | 'DISCARDED';
  jiraKey: string | null;
  notes: string | null;
}

const PRIORITY: Record<string, DemandCsvRow['priority']> = {
  baja: 'LOW',
  low: 'LOW',
  media: 'MEDIUM',
  medium: 'MEDIUM',
  alta: 'HIGH',
  high: 'HIGH',
  critica: 'CRITICAL',
  crítica: 'CRITICAL',
  critical: 'CRITICAL',
};

const STATUS: Record<string, DemandCsvRow['status']> = {
  nueva: 'NEW',
  new: 'NEW',
  clasificada: 'TRIAGED',
  triaged: 'TRIAGED',
  'en curso': 'IN_PROGRESS',
  in_progress: 'IN_PROGRESS',
  hecha: 'DONE',
  done: 'DONE',
  descartada: 'DISCARDED',
  discarded: 'DISCARDED',
};

export function demandTemplateCsv(): string {
  const example = [
    'Informe urgente de cierre',
    'Petición fuera de sprint',
    'Dirección General',
    '2026-03-01',
    'alta',
    '4',
    'Continuidad',
    'Reducir riesgo',
    'soporte',
    'corporativos',
    'nueva',
    '',
    'Entró por correo',
  ];
  return `${DEMAND_CSV_HEADERS.join(',')}\n${example.map(csvCell).join(',')}\n`;
}

export function parseDemandCsv(text: string): { rows: DemandCsvRow[]; errors: Array<{ row: number; message: string }> } {
  const table = parseCsv(text);
  if (table.length === 0) return { rows: [], errors: [{ row: 1, message: 'El fichero está vacío' }] };
  const header = table[0].map((cell) => cell.trim().toLowerCase());
  const index = new Map(header.map((name, position) => [name, position]));
  for (const required of ['titulo', 'solicitante', 'fecha']) {
    if (!index.has(required)) {
      return { rows: [], errors: [{ row: 1, message: `Falta la columna ${required}` }] };
    }
  }
  const rows: DemandCsvRow[] = [];
  const errors: Array<{ row: number; message: string }> = [];
  table.slice(1).forEach((cells, offset) => {
    const rowNumber = offset + 2;
    if (cells.every((cell) => cell.trim() === '')) return;
    const read = (name: string) => {
      const position = index.get(name);
      return position == null ? '' : (cells[position] ?? '').trim();
    };
    const title = read('titulo');
    const requester = read('solicitante');
    const date = read('fecha');
    if (!title || !requester || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      errors.push({ row: rowNumber, message: 'Título, solicitante y fecha YYYY-MM-DD son obligatorios' });
      return;
    }
    const priorityRaw = read('prioridad').toLowerCase();
    const statusRaw = read('estado').toLowerCase();
    const effort = Number(read('esfuerzo_horas').replace(',', '.') || '0');
    if (Number.isNaN(effort) || effort < 0) {
      errors.push({ row: rowNumber, message: 'El esfuerzo debe ser un número de horas' });
      return;
    }
    rows.push({
      title,
      description: read('descripcion') || null,
      requester,
      occurredAt: `${date}T00:00:00.000Z`,
      priority: PRIORITY[priorityRaw] ?? 'MEDIUM',
      estimatedHours: effort,
      initiativeName: read('iniciativa') || null,
      objectiveName: read('objetivo') || null,
      subareaName: read('subarea') || null,
      familyName: read('familia') || null,
      status: STATUS[statusRaw] ?? 'NEW',
      jiraKey: read('clave_jira') || null,
      notes: read('observaciones') || null,
    });
  });
  return { rows, errors };
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  const source = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    if (quoted) {
      if (char === '"') {
        if (source[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else quoted = false;
      } else cell += char;
      continue;
    }
    if (char === '"') {
      quoted = true;
      continue;
    }
    if (char === ',') {
      row.push(cell);
      cell = '';
      continue;
    }
    if (char === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      continue;
    }
    if (char !== '\r') cell += char;
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

function csvCell(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function toCsv(header: string[], rows: string[][]): string {
  return [header, ...rows].map((line) => line.map(csvCell).join(',')).join('\n') + '\n';
}
