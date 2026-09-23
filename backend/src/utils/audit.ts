import type { Prisma } from '@prisma/client';
import type { Request } from 'express';
import { prisma } from './prisma.js';
import { logger } from './logger.js';

export interface AuditInput {
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue;
}

/** Records an administrative action. Failures are logged and never break the request. */
export async function audit(req: Request, input: AuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: req.user?.id ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        metadata: input.metadata,
        ip: req.ip ?? null,
      },
    });
  } catch (err) {
    logger.error({ err, action: input.action }, 'Failed to write audit log');
  }
}
