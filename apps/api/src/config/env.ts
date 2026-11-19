import { config as loadDotenv } from 'dotenv';
import { resolve } from 'path';
import { z } from 'zod';

const rootEnv = resolve(__dirname, '../../../..', '.env');
loadDotenv({ path: rootEnv });
loadDotenv();

const empty = (value: unknown) => (typeof value === 'string' && value.trim() === '' ? undefined : value);

const envSchema = z.object({
  NODE_ENV: z.string().optional().default('development'),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z.string().optional().default('8h'),
  PORT: z.coerce.number().int().min(1).max(65535).optional().default(3000),
  BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).optional().default(10),
  CORS_ORIGIN: z.string().optional().default('http://localhost:5173'),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().min(1).optional().default(30),
  AUTH_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1000).optional().default(60_000),
  JIRA_BASE_URL: z.preprocess(empty, z.string().url().optional()),
  JIRA_EMAIL: z.preprocess(empty, z.string().email().optional()),
  JIRA_API_TOKEN: z.preprocess(empty, z.string().min(1).optional()),
  JIRA_PROJECT_KEYS: z.string().optional().default(''),
  JIRA_MAX_PROJECTS: z.coerce.number().int().min(1).max(200).optional().default(30),
  JIRA_MAX_ISSUES: z.coerce.number().int().min(1).max(20000).optional().default(5000),
  JIRA_PAGE_SIZE: z.coerce.number().int().min(1).max(100).optional().default(50),
  JIRA_MIN_INTERVAL_MS: z.coerce.number().int().min(0).max(10_000).optional().default(150),
  JIRA_ALLOW_FIXTURE: z.string().optional(),
  STALE_AFTER_HOURS: z.coerce.number().int().min(1).max(24 * 30).optional().default(24),
  IT_PIME_EMAIL: z.preprocess(empty, z.string().email().optional()),
  SMTP_HOST: z.preprocess(empty, z.string().min(1).optional()),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).optional().default(587),
  SMTP_USER: z.preprocess(empty, z.string().optional()),
  SMTP_PASSWORD: z.preprocess(empty, z.string().optional()),
  SMTP_FROM: z.preprocess(empty, z.string().optional()),
  SMTP_SECURE: z.string().optional(),
});

export type Env = z.infer<typeof envSchema> & {
  projectKeys: string[];
  allowFixture: boolean;
  smtpConfigured: boolean;
  jiraConfigured: boolean;
};

let cached: Env | null = null;

export function getEnv(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Invalid environment: ${JSON.stringify(parsed.error.flatten().fieldErrors)}`);
  }
  const data = parsed.data;
  const allowFixture = data.JIRA_ALLOW_FIXTURE === 'true' || (data.JIRA_ALLOW_FIXTURE == null && data.NODE_ENV !== 'production');
  const smtpConfigured = Boolean(data.SMTP_HOST && data.SMTP_FROM);
  const jiraConfigured = Boolean(data.JIRA_BASE_URL && data.JIRA_EMAIL && data.JIRA_API_TOKEN);
  cached = {
    ...data,
    projectKeys: data.JIRA_PROJECT_KEYS.split(',').map((key) => key.trim()).filter(Boolean),
    allowFixture,
    smtpConfigured,
    jiraConfigured,
  };
  return cached;
}

export function resetEnvCache(): void {
  cached = null;
}
