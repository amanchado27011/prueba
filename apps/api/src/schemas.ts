import { z } from 'zod';
import { QUALITY_KINDS } from './domain/quality';

export const analysisQuerySchema = z.object({
  sprintId: z.string().min(1).optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  personId: z.string().min(1).optional(),
  subareaId: z.string().min(1).optional(),
  serviceFamilyId: z.string().min(1).optional(),
  initiativeId: z.string().min(1).optional(),
  objectiveId: z.string().min(1).optional(),
  epicId: z.string().min(1).optional(),
  maintenanceType: z.enum(['ADAPTIVE', 'CORRECTIVE', 'EVOLUTIVE']).optional(),
  activityTypeId: z.string().min(1).optional(),
  q: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
  kind: z.enum(QUALITY_KINDS).optional(),
});

export const objectiveSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(20000).nullable().optional(),
  active: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export const namedSchema = z.object({
  name: z.string().min(1).max(200),
  active: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export const initiativeSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(20000).nullable().optional(),
  objectiveId: z.string().nullable().optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'DONE', 'CANCELLED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  notes: z.string().max(20000).nullable().optional(),
});

export const epicPatchSchema = z.object({
  initiativeId: z.string().nullable().optional(),
  objectiveId: z.string().nullable().optional(),
  objectiveExplicit: z.boolean().optional(),
  maintenanceType: z.enum(['ADAPTIVE', 'CORRECTIVE', 'EVOLUTIVE']).nullable().optional(),
  activityTypeId: z.string().nullable().optional(),
});

export const personPatchSchema = z.object({
  subareaId: z.string().nullable().optional(),
  serviceFamilyId: z.string().nullable().optional(),
  active: z.boolean().optional(),
});

export const demandSchema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().max(20000).nullable().optional(),
  requester: z.string().min(1).max(200),
  occurredAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  estimatedHours: z.number().min(0).max(100000).optional(),
  initiativeId: z.string().nullable().optional(),
  objectiveId: z.string().nullable().optional(),
  subareaId: z.string().nullable().optional(),
  serviceFamilyId: z.string().nullable().optional(),
  status: z.enum(['NEW', 'TRIAGED', 'IN_PROGRESS', 'DONE', 'DISCARDED']).optional(),
  epicId: z.string().nullable().optional(),
  jiraKey: z.string().max(40).nullable().optional(),
  notes: z.string().max(20000).nullable().optional(),
});

export const demandImportSchema = z.object({
  csv: z.string().min(1).max(2_000_000),
});

export const syncSchema = z.object({
  mode: z.enum(['cloud', 'fixture']).optional(),
});

export const emailSchema = z.object({
  kinds: z.array(z.enum(QUALITY_KINDS)).min(1),
  dryRun: z.boolean().optional(),
});

export const recipientSchema = z.object({
  recipient: z.string().email().nullable(),
});

export const loginSchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(1).max(128),
});
