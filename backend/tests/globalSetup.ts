/**
 * Runs once before the test run: creates the test database if needed and applies migrations.
 */
import 'dotenv/config';
import { execSync } from 'node:child_process';
import { Client } from 'pg';

export default async function globalSetup() {
  const baseUrl = process.env.DATABASE_URL;
  if (!baseUrl) throw new Error('DATABASE_URL must be set');
  const testUrl = process.env.DATABASE_URL_TEST ?? deriveTestUrl(baseUrl);

  await ensureDatabase(baseUrl, testUrl);

  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: testUrl },
    cwd: new URL('..', import.meta.url),
  });
}

function deriveTestUrl(url: string): string {
  const u = new URL(url);
  u.pathname = `${u.pathname.replace(/\/$/, '')}_test`;
  return u.toString();
}

async function ensureDatabase(adminUrl: string, testUrl: string) {
  const dbName = new URL(testUrl).pathname.replace(/^\//, '');
  const admin = new URL(adminUrl);
  admin.pathname = '/postgres';
  admin.search = '';
  const client = new Client({ connectionString: admin.toString() });
  await client.connect();
  try {
    const exists = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
    if (exists.rowCount === 0) {
      await client.query(`CREATE DATABASE "${dbName.replace(/"/g, '""')}"`);
    }
  } finally {
    await client.end();
  }
}
