import request from 'supertest';
import type { Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { createApp } from '../src/app.js';
import { prisma } from '../src/utils/prisma.js';

export const app = createApp();
export const api = () => request(app);

let counter = 0;

/** Removes every row from every application table. */
export async function resetDatabase() {
  const rows = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
  `;
  if (rows.length === 0) return;
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${rows.map((r) => `"${r.tablename}"`).join(', ')} RESTART IDENTITY CASCADE`);
}

export interface TestUser {
  id: string;
  email: string;
  username: string;
  password: string;
  role: Role;
  accessToken: string;
  refreshCookie: string;
}

/** Creates a user directly in the database and logs in to obtain tokens. */
export async function createUser(role: Role = 'USER', overrides: Partial<{ email: string; username: string; password: string }> = {}): Promise<TestUser> {
  counter++;
  const username = overrides.username ?? `user${counter}_${Date.now().toString(36)}`;
  const email = overrides.email ?? `${username}@example.com`;
  const password = overrides.password ?? 'Passw0rd!';
  const user = await prisma.user.create({
    data: {
      email,
      username,
      role,
      passwordHash: await bcrypt.hash(password, 4),
      profile: { create: { displayName: username } },
    },
  });
  const res = await api().post('/api/auth/login').send({ emailOrUsername: email, password });
  if (res.status !== 200) throw new Error(`Login failed in test helper: ${res.status} ${JSON.stringify(res.body)}`);
  return {
    id: user.id,
    email,
    username,
    password,
    role,
    accessToken: res.body.data.accessToken as string,
    refreshCookie: extractCookie(res, 'gfg_refresh'),
  };
}

export function extractCookie(res: request.Response, name: string): string {
  const raw = res.headers['set-cookie'];
  const list: string[] = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const match = list.find((c) => c.startsWith(`${name}=`));
  if (!match) return '';
  return match.split(';')[0]!;
}

export function auth(user: TestUser) {
  return { Authorization: `Bearer ${user.accessToken}` };
}
