/**
 * Runs inside every Vitest worker before test files. Points Prisma at the dedicated
 * test database so tests never touch development data.
 */
import 'dotenv/config';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL_TEST ?? deriveTestUrl(process.env.DATABASE_URL);
process.env.JWT_ACCESS_SECRET ??= 'test-access-secret-0123456789abcdef0123456789abcdef';
process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret-0123456789abcdef0123456789abcdef';
process.env.ACCESS_TOKEN_TTL ??= '15m';

function deriveTestUrl(url: string | undefined): string {
  if (!url) throw new Error('DATABASE_URL (or DATABASE_URL_TEST) must be set to run tests');
  const u = new URL(url);
  u.pathname = `${u.pathname.replace(/\/$/, '')}_test`;
  return u.toString();
}
