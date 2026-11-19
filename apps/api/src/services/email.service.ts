import nodemailer from 'nodemailer';
import { getEnv } from '../config/env';
import { buildQualityEmail, decideDelivery, type QualityRow } from '../domain/quality-mail';
import { prisma } from '../lib/prisma';
import { getRecipient } from './settings.service';

export async function previewQualityEmail(rows: QualityRow[]) {
  const recipient = await getRecipient();
  const message = buildQualityEmail(rows);
  return { recipient: recipient.email, recipientSource: recipient.source, ...message };
}

export async function deliverQualityEmail(input: {
  rows: QualityRow[];
  kinds: string[];
  dryRun: boolean;
  userId: string;
}) {
  const env = getEnv();
  const recipient = await getRecipient();
  const message = buildQualityEmail(input.rows);
  let decision = decideDelivery({
    dryRun: input.dryRun,
    smtpConfigured: env.smtpConfigured,
    recipient: recipient.email,
  });
  if (decision.result === 'SENT' && recipient.email) {
    try {
      const transport = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_SECURE === 'true',
        auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD ?? '' } : undefined,
      });
      await transport.sendMail({
        from: env.SMTP_FROM,
        to: recipient.email,
        subject: message.subject,
        text: message.text,
        html: message.html,
      });
    } catch (error) {
      decision = {
        result: 'FAILED',
        error: error instanceof Error ? error.message : 'No se pudo enviar el correo',
      };
    }
  }
  const saved = await prisma.emailDispatch.create({
    data: {
      recipient: recipient.email ?? '',
      userId: input.userId,
      issueCount: message.total,
      result: decision.result,
      error: decision.error,
      kinds: input.kinds.join(','),
    },
  });
  return { id: saved.id, result: decision.result, error: decision.error, total: message.total, recipient: recipient.email };
}
