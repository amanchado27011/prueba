import { prisma } from '../lib/prisma';

const RECIPIENT_KEY = 'it_pime_email';

export async function getRecipient(): Promise<{ email: string | null; source: 'database' | 'env' | 'missing' }> {
  const { getEnv } = await import('../config/env');
  const stored = await prisma.appSetting.findUnique({ where: { key: RECIPIENT_KEY } });
  if (stored?.value) return { email: stored.value, source: 'database' };
  const env = getEnv();
  if (env.IT_PIME_EMAIL) return { email: env.IT_PIME_EMAIL, source: 'env' };
  return { email: null, source: 'missing' };
}

export async function setRecipient(email: string | null): Promise<void> {
  if (!email) {
    await prisma.appSetting.deleteMany({ where: { key: RECIPIENT_KEY } });
    return;
  }
  await prisma.appSetting.upsert({
    where: { key: RECIPIENT_KEY },
    create: { key: RECIPIENT_KEY, value: email },
    update: { value: email },
  });
}
