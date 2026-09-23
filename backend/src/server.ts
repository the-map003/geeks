import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { prisma } from './utils/prisma.js';

import { requeueStale } from './modules/submissions/submissions.service.js';
import { pruneRefreshTokens } from './modules/auth/auth.service.js';

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(`API listening on http://localhost:${env.PORT}/api (${env.NODE_ENV})`);
});

// Housekeeping: re-judge submissions interrupted by a restart and prune old refresh tokens.
setTimeout(() => {
  requeueStale()
    .then((n) => n && logger.info({ count: n }, 'Re-queued stale submissions'))
    .catch((err) => logger.warn({ err }, 'Failed to re-queue stale submissions'));
}, 5_000).unref();
setInterval(
  () => {
    pruneRefreshTokens().catch((err) => logger.warn({ err }, 'Failed to prune refresh tokens'));
  },
  6 * 60 * 60 * 1000,
).unref();

async function shutdown(signal: string) {
  logger.info(`${signal} received, shutting down`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
